import datetime
import random
import logging
from typing import List, Dict, Any, Optional
import mysql.connector
from app.domain.models import (
    SocialPlatformType,
    SocialPostItem,
    SocialIngestRequest,
    SocialIngestResponse,
    SocialFeedResponse,
    SentimentResult,
    ExtractedComplaint,
    TicketInfo
)
from app.services.sentiment_engine import SentimentEngine
from app.services.pos_extractor import PosExtractor
from app.core.config import settings

logger = logging.getLogger("cch_ai_engine.social_listener")

# Kamus Kata Kunci Spam / Iklan yang wajib dibuang
SPAM_KEYWORDS = [
    "slot gacor", "judi online", "zeus", "pragmatic", "maxwin", "pinjol",
    "dana kaget", "followers murah", "beli centang", "open bo", "promo pulsa",
    "giveaway iphone", "poker", "togel", "situs resmi gacor"
]

# Pemetaan ID Sumber Pengaduan di basis data CCH (tabel cch_sumber_pengaduan)
PLATFORM_SOURCE_MAP = {
    "instagram": 4,
    "threads": 4,    # Threads berada di bawah payung ekosistem Instagram Meta
    "facebook": 6,
    "telegram": 13,
    "whatsapp": 14
}


class SocialListenerService:
    """
    Layanan Omnichannel Social Media & Telegram Ingestion Engine.
    Mendengarkan, memfilter spam, mengekstrak nomor resi, menilai sentimen emosi,
    dan menerbitkan tiket resmi CCH (Status 101 ENTRI) secara otonom 24 Jam.
    """

    def __init__(self):
        self.db_config = {
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "user": settings.DB_USER,
            "password": settings.DB_PASSWORD,
            "database": settings.DB_NAME
        }
        # Buffer memori untuk feed real-time terkini
        self._feed_cache: List[SocialPostItem] = []
        self._init_feed()

    def _get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def is_spam(self, text: str) -> bool:
        """Cek apakah teks mengandung konten spam, judi, atau giveaway"""
        if not text:
            return True
        lower = text.lower()
        return any(kw in lower for kw in SPAM_KEYWORDS)

    def generate_de_escalation_reply(
        self,
        platform: SocialPlatformType,
        author_handle: str,
        shipment_number: Optional[str],
        ticket_id: Optional[str],
        urgency: str
    ) -> str:
        """Membuat balasan de-eskalasi otomatis yang sopan dan menenangkan sesuai platform"""
        resi_str = f"kiriman `{shipment_number}`" if shipment_number and shipment_number != "-" else "kiriman Kakak"
        
        if platform == "telegram":
            return (
                f"Salam hormat Kak {author_handle}! 📮\n"
                f"Pengaduan terkait {resi_str} telah resmi diterbitkan ke sistem CCH Pos Indonesia:\n"
                f"🎫 *No. Tiket CCH:* `{ticket_id}`\n"
                f"⏱️ *Prioritas SLA:* {'24 Jam (Eskalasi Darurat)' if urgency == 'P1_KRITIS' else '48 Jam'}\n\n"
                f"Tim operasional regional kami sedang menindaklanjuti penelusuran fisik. "
                f"Terima kasih telah mempercayai Pos Indonesia."
            )
        elif platform in ("instagram", "threads"):
            return (
                f"Halo Kak @{author_handle.lstrip('@')}, mohon maaf mendalam atas kendala {resi_str}. "
                f"Laporan Kakak telah tercatat resmi di sistem CCH Pos Indonesia dengan No. Tiket: {ticket_id}. "
                f"Tim kami segera menindaklanjuti investigasi ke kantor pos tujuan. Terima kasih."
            )
        else: # facebook / whatsapp
            return (
                f"Halo Kak {author_handle}, kami memohon maaf atas ketidaknyamanan terkait {resi_str}. "
                f"Pengaduan Kakak telah resmi diproses di sistem CCH Pos Indonesia (No. Tiket: {ticket_id}). "
                f"Petugas regional kami segera melakukan pengecekan ke lokasi kiriman."
            )

    def create_cch_social_ticket(
        self,
        platform: SocialPlatformType,
        author_name: str,
        author_handle: str,
        author_phone: Optional[str],
        author_email: Optional[str],
        content: str,
        permalink: Optional[str],
        extracted: ExtractedComplaint,
        sentiment: SentimentResult
    ) -> TicketInfo:
        """
        Menerbitkan tiket resmi CCH (Status 101 ENTRI) dari aduan media sosial ke MariaDB.
        Operasi ACID pada 4 tabel: cchentricus, cchentrimas, cchentridet, dan cchentri.
        """
        now = datetime.datetime.now()
        source_id = PLATFORM_SOURCE_MAP.get(platform, 4)
        origin_office = "40005"
        target_office = "10000"
        target_office_name = "JAKARTA PUSAT"

        if extracted.destination_office_hint:
            parts = extracted.destination_office_hint.split("-")
            target_office = parts[0].strip()[:5]
            if len(parts) > 1:
                target_office_name = parts[1].strip()

        # Generate Nomor Tiket Format POSIND: [Kantor 5 Digit]CC[YYYYMMDDHHMMSS][Seq]
        date_str = now.strftime("%Y%m%d%H%M%S")
        seq_str = f"{random.randint(10, 99)}"
        ticket_id = f"{origin_office}CC{date_str}{seq_str}"

        conn = self._get_connection()
        conn.autocommit = False
        cursor = conn.cursor()

        try:
            # 1. Simpan Profil Pelanggan di cchentricus
            phone = (author_phone or "-").strip()
            email = (author_email or "").strip()
            alamat = f"Akun {platform.upper()}: {author_handle}"
            if permalink:
                alamat += f" (Link: {permalink[:60]})"

            cursor.execute(
                """
                INSERT INTO cchentricus 
                (Nama_Lengkap, Nomor_HP, Email, Alamat, Kantor_Tambah, Tanggal_Tambah, Ditambah_Oleh)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (author_name[:100], phone, email, alamat[:200], origin_office, now, "AI_SOCIAL_LISTENER")
            )
            customer_id = cursor.lastrowid or random.randint(1000, 9999)

            # 2. Simpan Histori Status Awal di cchentrimas (Status 101 ENTRI)
            audit_note = (
                f"Tiket diterbitkan otomatis oleh AI Social Listener [{platform.upper()}]. "
                f"Akun: {author_handle}. Sentimen: {sentiment.sentiment.upper()} (Skor: {sentiment.score}), "
                f"Urgensi: {sentiment.urgency_level}. Ringkasan: {content[:100]}"
            )
            cursor.execute(
                """
                INSERT INTO cchentrimas
                (ID_Pengaduan, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update, Tanggal_Update, Deskripsi_Update, Petugas_Update, Durasi_Antar_Status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (ticket_id, 101, origin_office, target_office, now, audit_note, "SYSTEM_AI_CS", 0)
            )
            history_id = cursor.lastrowid or 1

            # 3. Simpan Penugasan Kantor ke cchentridet
            cursor.execute(
                """
                INSERT INTO cchentridet
                (ID_Pengaduan, ID_Histori, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (ticket_id, history_id, 101, origin_office, target_office)
            )

            # 4. Simpan Tiket Utama ke cchentri
            shipment_num = extracted.shipment_number or f"NON-RESI-MEDSOS-{now.strftime('%d%H%M')}"
            summary_text = (extracted.summary or content)[:200]
            desc_full = (
                f"[Sumber: {platform.upper()} | Akun: {author_handle}]\n"
                f"Permalink: {permalink or '-'}\n\n"
                f"Isi Komplain:\n{content}"
            )
            semua_tujuan = f"{target_office},{target_office}CC,{origin_office},{origin_office}CC,40005,40005CC,40000,40000CC,10000,10000CC,20000,20000CC,50000,50000CC,90000,90000CC"

            cursor.execute(
                """
                INSERT INTO cchentri
                (ID_Pengaduan, ID_Histori, ID_Pelanggan, Nama_Pelanggan, Email_Pelanggan, Nomor_HP_Pelanggan, Alamat_Pelanggan,
                 Kantor_Asal, Kantor_Tujuan, Semua_Tujuan, Jenis_Pengaduan, Sumber_Pengaduan, Jenis_Kiriman, Nomor_Kiriman,
                 Tanggal_Pengaduan, Kantor_Asal_Kiriman, Kantor_Tujuan_Kiriman, Ringkasan_Pengaduan, Uraian_Pengaduan,
                 Status_Akhir, Tanggal_Status, Kantor_Status, Tanggal_Tambah, Ditambah_Oleh, Already_Validated)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s)
                """,
                (
                    ticket_id, history_id, customer_id, author_name[:100], email, phone, alamat[:200],
                    origin_office, target_office, semua_tujuan, extracted.complaint_type_code or 1, source_id, extracted.shipping_service_code or "000", shipment_num,
                    now, origin_office, target_office, summary_text, desc_full,
                    101, now, origin_office, now, "AI_SOCIAL_LISTENER", 1
                )
            )

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"Successfully created CCH social ticket: {ticket_id} from {platform}")

            return TicketInfo(
                ticket_id=ticket_id,
                status_code="101",
                status_name="101 - ENTRI (Tiket Medsos Terbit)",
                created_at=now.strftime("%Y-%m-%d %H:%M:%S"),
                target_office_code=target_office,
                target_office_name=target_office_name,
                sla_hours=24 if sentiment.urgency_level == "P1_KRITIS" else 48,
                priority=sentiment.urgency_level
            )

        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            logger.error(f"Error creating CCH social ticket: {e}")
            raise e

    def ingest_post(self, req: SocialIngestRequest) -> SocialIngestResponse:
        """
        Memproses satu postingan media sosial / telegram:
        1. Cek Spam
        2. Ekstraksi Resi & Entitas
        3. Analisis Sentimen & Urgensi
        4. Terbitkan Tiket CCH jika memenuhi syarat
        5. Buat Balasan De-Eskalasi
        """
        # 1. Cek Spam
        if self.is_spam(req.content):
            empty_sent = SentimentResult(sentiment="netral", score=0.0, urgency_level="P3_NORMAL")
            empty_ext = ExtractedComplaint(summary="Spam terdeteksi")
            return SocialIngestResponse(
                success=False,
                is_spam=True,
                platform=req.platform,
                sentiment=empty_sent,
                extracted=empty_ext,
                ticket=None,
                de_escalation_reply="Postingan diabaikan karena terindikasi spam.",
                audit_message="Ditolak oleh filter spam"
            )

        # 2. Ekstraksi Entitas Pos
        extracted = PosExtractor.extract_all(req.content)
        if not extracted.customer_name:
            extracted.customer_name = req.author_name

        # 3. Analisis Sentimen & Urgensi
        sentiment = SentimentEngine.analyze(req.content)

        # 4. Terbitkan Tiket Resmi jika diminta
        ticket_info = None
        if req.auto_create_ticket:
            ticket_info = self.create_cch_social_ticket(
                platform=req.platform,
                author_name=req.author_name,
                author_handle=req.author_handle,
                author_phone=req.author_phone,
                author_email=req.author_email,
                content=req.content,
                permalink=req.permalink,
                extracted=extracted,
                sentiment=sentiment
            )

        # 5. Balasan De-Eskalasi
        reply = self.generate_de_escalation_reply(
            platform=req.platform,
            author_handle=req.author_handle,
            shipment_number=extracted.shipment_number,
            ticket_id=ticket_info.ticket_id if ticket_info else None,
            urgency=sentiment.urgency_level
        )

        # Simpan ke cache feed
        post_item = SocialPostItem(
            id=f"{req.platform[:2]}_{datetime.datetime.now().strftime('%m%d%H%M%S')}_{random.randint(10,99)}",
            platform=req.platform,
            author_name=req.author_name,
            author_handle=req.author_handle,
            content=req.content,
            permalink=req.permalink,
            timestamp=datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            shipment_number=extracted.shipment_number,
            sentiment=sentiment,
            urgency_level=sentiment.urgency_level,
            is_spam=False,
            ticket_id=ticket_info.ticket_id if ticket_info else None,
            ticket_status="101 - ENTRI" if ticket_info else None,
            de_escalation_reply=reply
        )
        self._feed_cache.insert(0, post_item)

        return SocialIngestResponse(
            success=True,
            is_spam=False,
            platform=req.platform,
            sentiment=sentiment,
            extracted=extracted,
            ticket=ticket_info,
            de_escalation_reply=reply,
            audit_message=f"Tiket resmi berhasil diterbitkan: {ticket_info.ticket_id}" if ticket_info else "Data tersaring tanpa penerbitan tiket"
        )

    def get_feed(
        self,
        platform: Optional[str] = None,
        urgency: Optional[str] = None,
        has_ticket: Optional[bool] = None,
        limit: int = 50
    ) -> SocialFeedResponse:
        """Mengambil stream feed media sosial terkini dengan filter"""
        items = list(self._feed_cache)

        if platform and platform != "ALL":
            items = [i for i in items if i.platform.lower() == platform.lower()]

        if urgency and urgency != "ALL":
            items = [i for i in items if i.urgency_level.upper() == urgency.upper()]

        if has_ticket is not None:
            if has_ticket:
                items = [i for i in items if i.ticket_id]
            else:
                items = [i for i in items if not i.ticket_id]

        platform_counts = {
            "all": len(self._feed_cache),
            "facebook": sum(1 for i in self._feed_cache if i.platform == "facebook"),
            "instagram": sum(1 for i in self._feed_cache if i.platform == "instagram"),
            "threads": sum(1 for i in self._feed_cache if i.platform == "threads"),
            "telegram": sum(1 for i in self._feed_cache if i.platform == "telegram"),
            "whatsapp": sum(1 for i in self._feed_cache if i.platform == "whatsapp")
        }

        urgency_counts = {
            "P1_KRITIS": sum(1 for i in self._feed_cache if i.urgency_level == "P1_KRITIS"),
            "P2_TINGGI": sum(1 for i in self._feed_cache if i.urgency_level == "P2_TINGGI"),
            "P3_NORMAL": sum(1 for i in self._feed_cache if i.urgency_level == "P3_NORMAL")
        }

        return SocialFeedResponse(
            total=len(items),
            items=items[:limit],
            platform_counts=platform_counts,
            urgency_counts=urgency_counts
        )

    def _init_feed(self):
        """
        Inisialisasi antrean feed monitoring awal.
        Memuat item feed secara terstruktur dari modul seeder eksternal (app.seeders.social_demo_seeder)
        sehingga service layer produksi tetap bersih, profesional, dan bebas dari data dummy hardcoded.
        """
        try:
            from app.seeders.social_demo_seeder import build_demo_feed_items
            self._feed_cache = build_demo_feed_items()
            logger.info(f"Loaded {len(self._feed_cache)} feed items from social demo seeder.")
        except Exception as e:
            logger.warning(f"Failed to load feed items from seeder: {e}")
            self._feed_cache = []


social_listener = SocialListenerService()

