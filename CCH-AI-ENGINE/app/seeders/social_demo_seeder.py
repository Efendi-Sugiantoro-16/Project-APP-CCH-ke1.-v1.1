"""
==============================================================================
SEEDER: Omnichannel Social Media & Telegram Intake (Development & QA Fixture)
==============================================================================
Modul ini bertugas menyediakan data sampel dan inisialisasi tiket percontohan
untuk pengujian fitur AI Social Listener & Telegram Ingestion Engine.

Sesuai dengan best practice Clean Architecture, seluruh data dummy dan logika
seeding basis data dipisahkan dari Service Layer produksi agar kodingan service
tetap bersih, profesional, dan siap diaudit.
==============================================================================
"""

import datetime
import random
import logging
from typing import List, Dict, Any, Optional
import mysql.connector

from app.domain.models import (
    SocialPlatformType,
    SocialPostItem,
    SentimentResult,
)

logger = logging.getLogger("cch_ai_engine.seeders.social")

DEFAULT_DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "cch"
}

# Routing kantor lengkap untuk akses lintas UPT dan Call Center Nasional
COMPREHENSIVE_OFFICE_ROUTING = "40005,40005CC,40000,40000CC,10000,10000CC,20000,20000CC,50000,50000CC,90000,90000CC"

# Kumpulan Sampel Postingan Medsos & Telegram Representatif
DEMO_SOCIAL_SAMPLES: List[Dict[str, Any]] = [
    {
        "ticket_id": "40005CC2026110511593467",
        "platform": "telegram",
        "author_name": "Rian Ardianto",
        "author_handle": "@rian_ardianto",
        "phone": "081299881122",
        "email": "rian.ardianto@example.com",
        "shipment": "POS991122334ID",
        "origin_office": "40005",
        "target_office": "20000",
        "summary": "Berkas ijazah asli belum tiba 5 hari darurat interview kerja",
        "content": "Halo min Pos Indonesia, berkas ijazah asli saya resi POS991122334ID dari Medan ke Bandung belum tiba sudah 5 hari, tolong dicek dong darurat mau dipakai interview kerja lusa! Terima kasih.",
        "permalink": "tg://resolve?domain=PosIndonesiaCareBot",
        "urgency": "P1_KRITIS",
        "score": -0.88,
        "sentiment": "sangat_marah",
        "mins_ago": 3,
        "is_spam": False
    },
    {
        "ticket_id": "40005CC2026110511500122",
        "platform": "instagram",
        "author_name": "Dr. Rahmat Hidayat",
        "author_handle": "@dr.rahmathidayat",
        "phone": "081234567890",
        "email": "dr.rahmat@example.com",
        "shipment": "P2408290039578",
        "origin_office": "40005",
        "target_office": "50000",
        "summary": "Kiriman obat kanker urgent tertahan di SPP Surabaya",
        "content": "@posindonesia Tolong tanggapannya segera! Kiriman obat kanker urgent resi P2408290039578 tertahan di SPP Surabaya dari kemarin! Pasien membutuhkan obat ini sekarang juga!",
        "permalink": "https://instagram.com/p/DB1902837",
        "urgency": "P1_KRITIS",
        "score": -0.85,
        "sentiment": "sangat_marah",
        "mins_ago": 8,
        "is_spam": False
    },
    {
        "ticket_id": "10000CC2026110511482031",
        "platform": "threads",
        "author_name": "Clarissa Putri",
        "author_handle": "@clarissa.p",
        "phone": "081987654321",
        "email": "clarissa.p@example.com",
        "shipment": "EE192837465ID",
        "origin_office": "10000",
        "target_office": "40005",
        "summary": "Paket paspor asli buat visa belum sampai terancam lapor polisi",
        "content": "Gila sih paket Pos Indonesia resi EE192837465ID isinya paspor asli buat berangkat visa besok pagi masih ga ada update! Kalo ilang beneran bakal gw lapor polisi dan somasi!",
        "permalink": "https://threads.net/@clarissa.p/post/Cz9812739",
        "urgency": "P1_KRITIS",
        "score": -0.92,
        "sentiment": "sangat_marah",
        "mins_ago": 15,
        "is_spam": False
    },
    {
        "ticket_id": "50000CC2026110511451299",
        "platform": "facebook",
        "author_name": "Pakde Joko Widodo",
        "author_handle": "Joko Widodo FB",
        "phone": "081233445566",
        "email": "joko.w@example.com",
        "shipment": "POS889912345ID",
        "origin_office": "50000",
        "target_office": "10000",
        "summary": "Paket makanan oleh-oleh terlambat 4 hari khawatir rusak/basi",
        "content": "Halo admin Pos Indonesia, paket buah dan makanan oleh-oleh resi POS889912345ID dari Semarang ke Jakarta kok sudah 4 hari belum sampai ya? Takutnya keburu basi dan rusak di jalan. Mohon dicek.",
        "permalink": "https://facebook.com/groups/posindonesia/posts/102938472",
        "urgency": "P2_TINGGI",
        "score": -0.38,
        "sentiment": "kecewa",
        "mins_ago": 30,
        "is_spam": False
    },
    {
        "ticket_id": "20000CC2026110511391588",
        "platform": "telegram",
        "author_name": "Budi Santoso",
        "author_handle": "@budisantoso_tg",
        "phone": "081399887766",
        "email": "budisantoso@example.com",
        "shipment": "POS773645129ID",
        "origin_office": "20000",
        "target_office": "40005",
        "summary": "Tanya posisi kiriman POS773645129ID mau ambil sendiri di loket",
        "content": "Selamat siang admin bot, tolong bantu lacak posisi kiriman POS773645129ID sudah sampai kantor pos mana ya? Mau saya ambil sendiri di loket kalau sudah tiba. Terima kasih.",
        "permalink": "tg://resolve?domain=PosIndonesiaCareBot",
        "urgency": "P3_NORMAL",
        "score": 0.15,
        "sentiment": "netral",
        "mins_ago": 45,
        "is_spam": False
    },
    {
        "ticket_id": "40000CC2026110511300944",
        "platform": "instagram",
        "author_name": "Melati Anindita",
        "author_handle": "@melati_anindita",
        "phone": "081266554433",
        "email": "melati.anindita@example.com",
        "shipment": "POS661829304ID",
        "origin_office": "40000",
        "target_office": "20000",
        "summary": "Apresiasi pengiriman cepat dan kurir ramah di Medan",
        "content": "Makasih banget buat kurir Pos Indonesia Medan, paket resi POS661829304ID cepet banget sampainya dan kurirnya super ramah! Good job Pos Indonesia! 👍",
        "permalink": "https://instagram.com/p/DB1829384",
        "urgency": "P3_NORMAL",
        "score": 0.55,
        "sentiment": "positif",
        "mins_ago": 60,
        "is_spam": False
    },
    {
        "ticket_id": "50000CC2026110511250177",
        "platform": "threads",
        "author_name": "Dimas Anggara",
        "author_handle": "@dimas_ang",
        "phone": "081355443322",
        "email": "dimas.ang@example.com",
        "shipment": "POS992381273ID",
        "origin_office": "50000",
        "target_office": "40005",
        "summary": "Paket Pos Sameday belum datang padahal status diantar tadi pagi",
        "content": "Baru pertama kali nyoba Pos Sameday resi POS992381273ID tapi kurir belum dateng padahal statusnya diantar dari tadi pagi. Agak kecewa sih.",
        "permalink": "https://threads.net/@dimas_ang/post/Cz8829103",
        "urgency": "P2_TINGGI",
        "score": -0.35,
        "sentiment": "kecewa",
        "mins_ago": 75,
        "is_spam": False
    },
    {
        "ticket_id": None,
        "platform": "facebook",
        "author_name": "Toko Barokah Jaya",
        "author_handle": "Barokah Jaya Sentosa",
        "phone": "",
        "email": "",
        "shipment": None,
        "origin_office": "40005",
        "target_office": "40005",
        "summary": "Spam iklan judi online",
        "content": "INFO PROMO SLOT GACOR HARI INI DEPOSIT 10RB DAPAT BONUS 50RB HUBUNGI WA...",
        "permalink": "https://facebook.com/comment/19283",
        "urgency": "P3_NORMAL",
        "score": 0.0,
        "sentiment": "netral",
        "mins_ago": 90,
        "is_spam": True
    }
]

def generate_sample_reply(platform: str, author_handle: str, shipment: Optional[str], ticket_id: Optional[str], urgency: str) -> str:
    """Helper untuk format balasan de-eskalasi otomatis"""
    resi_str = f"kiriman `{shipment}`" if shipment and shipment != "-" else "kiriman Kakak"
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
    else:
        return (
            f"Halo Kak {author_handle}, kami memohon maaf atas ketidaknyamanan terkait {resi_str}. "
            f"Pengaduan Kakak telah resmi diproses di sistem CCH Pos Indonesia (No. Tiket: {ticket_id}). "
            f"Petugas regional kami segera melakukan pengecekan ke lokasi kiriman."
        )

def seed_all_demo_tickets(db_config: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Menyisipkan tiket demo ke tabel MariaDB (cchentri, cchentricus, cchentrimas, cchentridet)
    dengan integritas relasional penuh dan routing kantor lengkap.
    """
    cfg = db_config or DEFAULT_DB_CONFIG
    seeded_ids = []

    try:
        conn = mysql.connector.connect(**cfg)
        conn.autocommit = False
        cur = conn.cursor()
        now = datetime.datetime.now()

        for s in DEMO_SOCIAL_SAMPLES:
            if s.get("is_spam") or not s.get("ticket_id"):
                continue

            ticket_id = s["ticket_id"]
            cur.execute("SELECT COUNT(*) FROM cchentri WHERE ID_Pengaduan = %s", (ticket_id,))
            exists = cur.fetchone()[0] > 0

            if exists:
                # Update Semua_Tujuan agar terjangkau seluruh UPT & Call Center
                cur.execute(
                    "UPDATE cchentri SET Semua_Tujuan = %s WHERE ID_Pengaduan = %s",
                    (COMPREHENSIVE_OFFICE_ROUTING, ticket_id)
                )
                conn.commit()
                seeded_ids.append(ticket_id)
                continue

            # 1. Simpan ke cchentricus
            alamat = f"Akun {s['platform'].upper()}: {s['author_handle']}"
            cur.execute(
                """
                INSERT INTO cchentricus 
                (Nama_Lengkap, Nomor_HP, Email, Alamat, Kantor_Tambah, Tanggal_Tambah, Ditambah_Oleh)
                VALUES (%s, %s, %s, %s, %s, %s, 'AI_SOCIAL_LISTENER')
                """,
                (s["author_name"], s.get("phone", ""), s.get("email", ""), alamat, s["origin_office"], now)
            )
            customer_id = cur.lastrowid or 1

            # 2. Simpan Histori ke cchentrimas
            audit_note = (
                f"Tiket diterbitkan otomatis oleh AI Social Listener [{s['platform'].upper()}]. "
                f"Resi: {s['shipment'] or '-'}. Keluhan: {s['summary']}"
            )
            cur.execute(
                """
                INSERT INTO cchentrimas
                (ID_Pengaduan, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update, Tanggal_Update, Deskripsi_Update, Petugas_Update, Durasi_Antar_Status)
                VALUES (%s, 101, %s, %s, %s, %s, 'SYSTEM_AI_CS', 0)
                """,
                (ticket_id, s["origin_office"], s["target_office"], now, audit_note)
            )
            history_id = cur.lastrowid or 1

            # 3. Simpan Disposisi ke cchentridet
            cur.execute(
                """
                INSERT INTO cchentridet
                (ID_Pengaduan, ID_Histori, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update)
                VALUES (%s, %s, 101, %s, %s)
                """,
                (ticket_id, history_id, s["origin_office"], s["target_office"])
            )

            # 4. Simpan Tiket Utama ke cchentri
            full_desc = (
                f"[Sumber: {s['platform'].upper()} | Akun: {s['author_handle']}]\n"
                f"Permalink: {s['permalink']}\n\n"
                f"Isi Komplain:\n{s['content']}"
            )
            cur.execute(
                """
                INSERT INTO cchentri
                (ID_Pengaduan, ID_Histori, ID_Pelanggan, Nama_Pelanggan, Email_Pelanggan, Nomor_HP_Pelanggan, Alamat_Pelanggan,
                 Kantor_Asal, Kantor_Tujuan, Semua_Tujuan, Jenis_Pengaduan, Sumber_Pengaduan, Jenis_Kiriman, Nomor_Kiriman,
                 Tanggal_Pengaduan, Kantor_Asal_Kiriman, Kantor_Tujuan_Kiriman, Ringkasan_Pengaduan, Uraian_Pengaduan,
                 Status_Akhir, Tanggal_Status, Kantor_Status, Tanggal_Tambah, Ditambah_Oleh, Already_Validated)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, 1, 4, '000', %s,
                 %s, %s, %s, %s, %s,
                 101, %s, %s, %s, 'AI_SOCIAL_LISTENER', 1)
                """,
                (
                    ticket_id, history_id, customer_id, s["author_name"], s.get("email", ""), s.get("phone", ""), alamat,
                    s["origin_office"], s["target_office"], COMPREHENSIVE_OFFICE_ROUTING, s["shipment"] or f"NON-RESI-{ticket_id[-6:]}",
                    now, s["origin_office"], s["target_office"], s["summary"][:150], full_desc,
                    now, s["origin_office"], now
                )
            )
            conn.commit()
            seeded_ids.append(ticket_id)

        cur.close()
        conn.close()
        logger.info(f"Seeder executed successfully. Total tickets checked/seeded: {len(seeded_ids)}")
        return seeded_ids

    except Exception as e:
        logger.error(f"Error seeding demo tickets: {e}")
        return seeded_ids

def build_demo_feed_items() -> List[SocialPostItem]:
    """
    Membangun daftar objek SocialPostItem dari daftar sampel
    (termasuk item spam dan non-spam) untuk tampilan feed monitoring.
    """
    now = datetime.datetime.now()
    items: List[SocialPostItem] = []

    for s in DEMO_SOCIAL_SAMPLES:
        time_str = (now - datetime.timedelta(minutes=s["mins_ago"])).strftime("%Y-%m-%d %H:%M")
        reply = None
        if not s.get("is_spam"):
            reply = generate_sample_reply(
                platform=s["platform"],
                author_handle=s["author_handle"],
                shipment=s.get("shipment"),
                ticket_id=s.get("ticket_id"),
                urgency=s["urgency"]
            )

        sent = SentimentResult(
            sentiment=s["sentiment"],
            score=s["score"],
            urgency_level=s["urgency"],
            is_emergency=(s["urgency"] == "P1_KRITIS"),
            detected_emotions=["ancaman_eskalasi"] if s["urgency"] == "P1_KRITIS" else ["frustrasi"] if s["urgency"] == "P2_TINGGI" else ["netral"]
        )

        ticket_id = s.get("ticket_id")
        status_label = "101 - ENTRI" if ticket_id else None

        items.append(SocialPostItem(
            id=f"{s['platform'][:2]}_{random.randint(1000, 9999)}",
            platform=s["platform"],
            author_name=s["author_name"],
            author_handle=s["author_handle"],
            content=s["content"],
            permalink=s["permalink"],
            timestamp=time_str,
            shipment_number=s.get("shipment"),
            sentiment=sent,
            urgency_level=s["urgency"],
            is_spam=s.get("is_spam", False),
            ticket_id=ticket_id,
            ticket_status=status_label,
            de_escalation_reply=reply
        ))

    return items

if __name__ == "__main__":
    import sys
    print("Memulai seeder demo data medsos & telegram...")
    res = seed_all_demo_tickets()
    print(f"Berhasil menyemai/memvalidasi {len(res)} tiket:")
    for tid in res:
        print(f" - {tid}")
    print("Selesai!")

