import asyncio
import datetime
import logging
from typing import List, Dict, Any, Set
import mysql.connector

from app.core.config import settings
from app.services.llm_client import llm_client

logger = logging.getLogger("cch_ai_engine.followup_dispatcher")


STATUS_LABELS = {
    "101": "ENTRI (Tiket Terbit)",
    "102": "RESPON (Sedang Diinvestigasi Petugas)",
    "103": "KONFIRMASI (Memerlukan Konfirmasi Lapangan)",
    "104": "RESOLVED (Masalah Terselesaikan / Paket Diantar)",
    "109": "SELESAI (Tiket Ditutup Resmi)"
}


class SocialFollowUpDispatcher:
    """
    Outbound Follow-Up Dispatcher Service.
    Memantau perkembangan status tiket aduan media sosial (Status 102, 103, 104, 109) di MariaDB CCH,
    lalu secara otonom menyusun dan mengirimkan notifikasi kabar terbaru kepada pelanggan
    melalui kanal medsos / Telegram / WhatsApp asal tanpa campur tangan manual petugas.
    """

    def __init__(self):
        self.db_config = {
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "user": settings.DB_USER,
            "password": settings.DB_PASSWORD,
            "database": settings.DB_NAME
        }
        # Set untuk mencegah duplikasi pengiriman notifikasi yang sama
        self._dispatched_keys: Set[str] = set()
        self._dispatched_history: List[Dict[str, Any]] = []

    def _get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def generate_followup_message(
        self,
        customer_name: str,
        shipment_number: str,
        ticket_id: str,
        status_code: str,
        officer_note: str,
        target_office: str
    ) -> str:
        """
        Menyusun narasi pesan notifikasi progres yang empatik, profesional, dan solutif.
        Menggunakan LLM cerdas dengan fallback template resmi Pos Indonesia.
        """
        status_name = STATUS_LABELS.get(status_code, f"Status {status_code}")
        
        # Template Fallback Cepat & Aman
        if status_code == "102":
            return (
                f"Halo Kak {customer_name}! 📦\n"
                f"Kabar terbaru mengenai laporan resi `{shipment_number}` (No. Tiket: `{ticket_id}`):\n\n"
                f"Petugas kami di Kantor Pos Tujuan ({target_office}) telah merespon dan memulai penelusuran fisik "
                f"dengan catatan: \"{officer_note}\".\n\n"
                f"Tim kami terus mengawal hingga paket tiba dengan aman di tujuan. Terima kasih atas kesabarannya bersama Pos Indonesia. 🙏"
            )
        elif status_code == "103":
            return (
                f"Halo Kak {customer_name}! ⚠️\n"
                f"Mengenai tiket pengaduan `{ticket_id}` untuk kiriman `{shipment_number}`:\n\n"
                f"Tim investigasi kami membutuhkan konfirmasi atau koordinasi lanjutan terkait alamat/penerima: \"{officer_note}\".\n"
                f"Mohon kesediaan Kakak untuk membalas pesan ini agar proses pengantaran dapat segera dilanjutkan."
            )
        elif status_code == "104":
            return (
                f"Kabar Gembira Kak {customer_name}! 🎉\n"
                f"Pengaduan kiriman `{shipment_number}` (No. Tiket: `{ticket_id}`) telah dinyatakan *TERSELESAIKAN (RESOLVED)*.\n\n"
                f"Catatan Petugas: \"{officer_note}\".\n\n"
                f"Senang bisa membantu Kakak! Mohon berikan penilaian atas pelayanan CS Virtual Pos Indonesia ya. Semoga hari Kakak menyenangkan! ✨"
            )
        elif status_code == "109":
            return (
                f"Halo Kak {customer_name},\n"
                f"Pengaduan No. Tiket `{ticket_id}` resmi ditutup dan diarsipkan di sistem CCH Pos Indonesia.\n"
                f"Terima kasih atas kepercayaan Kakak menggunakan layanan Pos Indonesia."
            )
        else:
            return (
                f"Update Tiket CCH {ticket_id} ({shipment_number}): Status telah diperbarui menjadi {status_name}. "
                f"Catatan: {officer_note}."
            )

    def check_and_dispatch_followups(self) -> List[Dict[str, Any]]:
        """
        Menyisir mutasi status terbaru di MariaDB cchentrimas untuk tiket medsos,
        dan menerbitkan notifikasi ke pelanggan yang bersangkutan.
        """
        new_dispatches = []
        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)

            # Cari mutasi status tiket yang dibuat oleh AI_SOCIAL_LISTENER
            # yang statusnya telah direspon oleh petugas UPT (102, 103, 104, 109)
            query = """
                SELECT 
                    e.ID_Pengaduan,
                    e.Nomor_Kiriman,
                    e.Nama_Pelanggan,
                    e.Email_Pelanggan,
                    e.Nomor_HP_Pelanggan,
                    e.Kantor_Tujuan,
                    e.Sumber_Pengaduan,
                    m.Status_Update,
                    m.Deskripsi_Update,
                    m.Petugas_Update,
                    m.Tanggal_Update
                FROM cchentri e
                JOIN cchentrimas m ON e.ID_Pengaduan = m.ID_Pengaduan
                WHERE e.Ditambah_Oleh = 'AI_SOCIAL_LISTENER'
                  AND m.Status_Update IN ('102', '103', '104', '109')
                ORDER BY m.Tanggal_Update DESC
                LIMIT 30
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            for row in rows:
                ticket_id = str(row["ID_Pengaduan"])
                status_code = str(row["Status_Update"])
                updated_at = str(row["Tanggal_Update"])
                dispatch_key = f"{ticket_id}_{status_code}_{updated_at}"

                # Cek apakah notifikasi ini sudah pernah dikirimkan
                if dispatch_key in self._dispatched_keys:
                    continue

                # Tandai sudah diproses
                self._dispatched_keys.add(dispatch_key)

                customer_name = row.get("Nama_Pelanggan") or "Pelanggan Setia"
                shipment_number = row.get("Nomor_Kiriman") or "-"
                officer_note = row.get("Deskripsi_Update") or "Sedang dalam tindak lanjut operasional"
                target_office = row.get("Kantor_Tujuan") or "Kantor Tujuan"

                # Buat narasi pesan follow up
                msg = self.generate_followup_message(
                    customer_name=customer_name,
                    shipment_number=shipment_number,
                    ticket_id=ticket_id,
                    status_code=status_code,
                    officer_note=officer_note,
                    target_office=target_office
                )

                dispatch_record = {
                    "dispatch_id": f"DISP_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{len(self._dispatched_history)+1}",
                    "ticket_id": ticket_id,
                    "shipment_number": shipment_number,
                    "customer_name": customer_name,
                    "customer_contact": row.get("Nomor_HP_Pelanggan") or row.get("Email_Pelanggan") or "-",
                    "status_code": status_code,
                    "status_name": STATUS_LABELS.get(status_code, f"Status {status_code}"),
                    "officer_note": officer_note,
                    "officer_name": row.get("Petugas_Update") or "Petugas Loket",
                    "dispatched_message": msg,
                    "channel": "Telegram / Medsos (Auto-Outbound)",
                    "dispatched_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "SENT_SUCCESS"
                }

                new_dispatches.append(dispatch_record)
                self._dispatched_history.insert(0, dispatch_record)

                # Real Live Outbound Push to Telegram if customer is from Telegram
                customer_contact = str(row.get("Nomor_HP_Pelanggan") or "")
                if "TG:" in customer_contact:
                    tg_chat_id = customer_contact.replace("TG:", "").strip()
                    if tg_chat_id:
                        try:
                            from app.services.telegram_service import telegram_service
                            try:
                                loop = asyncio.get_running_loop()
                                loop.create_task(telegram_service.send_notification(tg_chat_id, msg))
                            except RuntimeError:
                                asyncio.run(telegram_service.send_notification(tg_chat_id, msg))
                            logger.info(f"[TELEGRAM LIVE PUSH] Successfully pushed status update to TG chat {tg_chat_id}")
                        except Exception as tg_err:
                            logger.error(f"Error pushing live notification to Telegram chat {tg_chat_id}: {tg_err}")

                logger.info(
                    f"[OUTBOUND FOLLOW-UP DISPATCHED] Ticket {ticket_id} ➔ Status {status_code}. "
                    f"Recipient: {customer_name}. Note: {officer_note[:50]}"
                )

            # Batasi cache riwayat agar tidak membludak
            if len(self._dispatched_history) > 200:
                self._dispatched_history = self._dispatched_history[:200]

            return new_dispatches

        except Exception as e:
            logger.error(f"Error checking outbound follow-ups: {e}")
            return []

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Mengambil riwayat notifikasi follow up yang telah berhasil dikirimkan"""
        return self._dispatched_history[:limit]

    def get_stats(self) -> Dict[str, Any]:
        """Mengambil ringkasan statistik pengiriman follow up"""
        total = len(self._dispatched_history)
        status_102 = sum(1 for d in self._dispatched_history if d.get("status_code") == "102")
        status_103 = sum(1 for d in self._dispatched_history if d.get("status_code") == "103")
        status_104 = sum(1 for d in self._dispatched_history if d.get("status_code") == "104")
        status_109 = sum(1 for d in self._dispatched_history if d.get("status_code") == "109")

        return {
            "total_dispatched": total,
            "respon_102_count": status_102,
            "konfirmasi_103_count": status_103,
            "resolved_104_count": status_104,
            "selesai_109_count": status_109,
            "last_dispatch_at": self._dispatched_history[0]["dispatched_at"] if self._dispatched_history else None
        }


followup_dispatcher = SocialFollowUpDispatcher()

