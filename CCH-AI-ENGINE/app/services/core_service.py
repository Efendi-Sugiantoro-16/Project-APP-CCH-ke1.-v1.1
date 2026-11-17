import datetime
import logging
from typing import List, Dict, Any, Optional
import mysql.connector
from app.services.sentiment_engine import SentimentEngine

logger = logging.getLogger("cch_ai_engine.core_service")

STATUS_MAP = {
    "101": "101 - ENTRI (Baru Diterbitkan)",
    "102": "102 - PENERUSAN (Dalam Perjalanan UPT)",
    "103": "103 - PENANGANAN (Investigasi Lapangan)",
    "104": "104 - PENJELASAN (Konfirmasi Pelanggan)",
    "105": "105 - GANTI RUGI (Proses Klaim)",
    "106": "106 - SELESAI GANTI RUGI",
    "108": "108 - PENOLAKAN KLAIM",
    "109": "109 - SELESAI (Tuntas & Terkirim)"
}


class CoreService:
    """
    Layanan Core Search Global & Notifikasi Real-Time CCH.
    Terhubung langsung ke basis data MariaDB cch.
    """

    def __init__(self):
        self.db_config = {
            "host": "127.0.0.1",
            "port": 3306,
            "user": "root",
            "password": "",
            "database": "cch"
        }
        self._read_notification_ids = set()

    def _get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def search_complaints(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Pencarian cepat multi-kriteria pada tabel cchentri:
        - Berdasarkan ID Pengaduan (contoh: 40005CC...)
        - Berdasarkan Nomor Resi Pos (contoh: P240..., POS..., EE...ID)
        - Berdasarkan Nama Pelanggan
        - Berdasarkan Ringkasan Aduan
        """
        clean_q = (query or "").strip()
        if not clean_q:
            return []

        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)

            search_param = f"%{clean_q}%"
            cursor.execute(
                """
                SELECT 
                    ID_Pengaduan,
                    Nomor_Kiriman,
                    Nama_Pelanggan,
                    Nomor_HP_Pelanggan,
                    Kantor_Asal,
                    Kantor_Tujuan,
                    Ringkasan_Pengaduan,
                    Uraian_Pengaduan,
                    Tanggal_Pengaduan,
                    Status_Akhir,
                    Ditambah_Oleh
                FROM cchentri
                WHERE ID_Pengaduan LIKE %s 
                   OR Nomor_Kiriman LIKE %s 
                   OR Nama_Pelanggan LIKE %s 
                   OR Ringkasan_Pengaduan LIKE %s
                ORDER BY 
                    (ID_Pengaduan LIKE %s) DESC,
                    (Nomor_Kiriman LIKE %s) DESC,
                    Tanggal_Pengaduan DESC
                LIMIT %s
                """,
                (search_param, search_param, search_param, search_param, f"{clean_q}%", f"{clean_q}%", limit)
            )
            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            results = []
            for r in rows:
                desc = f"{r.get('Ringkasan_Pengaduan') or ''} {r.get('Uraian_Pengaduan') or ''}"
                sent = SentimentEngine.analyze(desc)
                status_code = str(r.get("Status_Akhir") or "101")
                is_completed = status_code in ("106", "108", "109")

                results.append({
                    "ticket_id": r.get("ID_Pengaduan"),
                    "shipment_number": r.get("Nomor_Kiriman") or "-",
                    "customer_name": r.get("Nama_Pelanggan") or "Pelanggan POS",
                    "customer_phone": r.get("Nomor_HP_Pelanggan") or "-",
                    "origin_office": r.get("Kantor_Asal") or "40005",
                    "target_office": r.get("Kantor_Tujuan") or "40005",
                    "summary": (r.get("Ringkasan_Pengaduan") or desc)[:120],
                    "status_code": status_code,
                    "status_name": STATUS_MAP.get(status_code, f"{status_code} - DALAM PROSES"),
                    "is_completed": is_completed,
                    "created_at": r.get("Tanggal_Pengaduan").strftime("%Y-%m-%d %H:%M") if r.get("Tanggal_Pengaduan") else "-",
                    "urgency_level": sent.urgency_level,
                    "sentiment": sent.sentiment,
                    "is_ai_created": (r.get("Ditambah_Oleh") in ("SYSTEM_AI_CS", "AI_SOCIAL_LISTENER")),
                    "detail_url": f"/workspace/complaints/{'completed' if is_completed else 'open'}/{r.get('ID_Pengaduan')}"
                })

            return results
        except Exception as e:
            logger.error(f"Search complaints error: {e}")
            return []

    def get_realtime_notifications(self) -> Dict[str, Any]:
        """
        Mengumpulkan feed notifikasi real-time dari 4 sumber:
        1. Aduan P1 Kritis Masuk (Obat Kanker, Ijazah, Somasi/Viral)
        2. Follow-Up Kadaluarsa (Overdue)
        3. Tiket AI Baru (CS Virtual & Medsos Listener)
        4. Kiriman Gagal X-Ray Bandara Terbaru
        """
        notifications = []
        now = datetime.datetime.now()

        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)

            # 1. Ambil Aduan P1 Kritis & Tiket AI Terbaru (20 Terakhir)
            cursor.execute(
                """
                SELECT 
                    ID_Pengaduan,
                    Nomor_Kiriman,
                    Nama_Pelanggan,
                    Kantor_Tujuan,
                    Ringkasan_Pengaduan,
                    Uraian_Pengaduan,
                    Tanggal_Pengaduan,
                    Status_Akhir,
                    Ditambah_Oleh
                FROM cchentri
                ORDER BY Tanggal_Pengaduan DESC
                LIMIT 25
                """
            )
            recent_tickets = cursor.fetchall()

            for t in recent_tickets:
                desc = f"{t.get('Ringkasan_Pengaduan') or ''} {t.get('Uraian_Pengaduan') or ''}"
                sent = SentimentEngine.analyze(desc)
                t_id = t.get("ID_Pengaduan")
                dt = t.get("Tanggal_Pengaduan") or now
                diff_mins = max(1, int((now - dt).total_seconds() / 60))
                
                time_ago = f"{diff_mins} mnt lalu" if diff_mins < 60 else f"{diff_mins // 60} jam lalu" if diff_mins < 1440 else f"{diff_mins // 1440} hari lalu"

                # P1 Kritis Alert
                if sent.urgency_level == "P1_KRITIS":
                    nid = f"p1_{t_id}"
                    notifications.append({
                        "id": nid,
                        "type": "p1_kritis",
                        "category": "P1 Kritis",
                        "title": f"🚨 Aduan P1 Kritis: {t.get('Nama_Pelanggan') or 'Pelanggan POS'}",
                        "message": f"Resi {t.get('Nomor_Kiriman') or '-'}: {(t.get('Ringkasan_Pengaduan') or desc)[:90]}",
                        "timestamp": dt.strftime("%Y-%m-%d %H:%M"),
                        "time_ago": time_ago,
                        "urgency": "P1_KRITIS",
                        "link": f"/workspace/complaints/open/{t_id}",
                        "is_read": nid in self._read_notification_ids
                    })

                # AI / Social Ingest Alert
                elif t.get("Ditambah_Oleh") in ("SYSTEM_AI_CS", "AI_SOCIAL_LISTENER"):
                    nid = f"ai_{t_id}"
                    src_label = "Medsos & Telegram" if t.get("Ditambah_Oleh") == "AI_SOCIAL_LISTENER" else "CS Virtual 24H"
                    notifications.append({
                        "id": nid,
                        "type": "ai_intake",
                        "category": "AI CS Virtual",
                        "title": f"🤖 Tiket Baru Diterbitkan ({src_label})",
                        "message": f"Tiket {t_id} (Resi: {t.get('Nomor_Kiriman') or '-'}) diterbitkan otonom ke Kantor Pos {t.get('Kantor_Tujuan') or '-'}.",
                        "timestamp": dt.strftime("%Y-%m-%d %H:%M"),
                        "time_ago": time_ago,
                        "urgency": sent.urgency_level,
                        "link": f"/workspace/complaints/open/{t_id}",
                        "is_read": nid in self._read_notification_ids
                    })

            # 2. Ambil Rekap Follow-Up Overdue
            cursor.execute(
                """
                SELECT COUNT(*) as overdue_cnt
                FROM cchfu
                WHERE Tanggal_Realisasi IS NULL AND Tanggal_Rencana < NOW()
                """
            )
            fu_row = cursor.fetchone() or {}
            overdue_cnt = int(fu_row.get("overdue_cnt") or 0)

            if overdue_cnt > 0:
                nid = "fu_overdue_alert"
                notifications.append({
                    "id": nid,
                    "type": "followup_overdue",
                    "category": "Follow-Up SLA",
                    "title": f"⚠️ {overdue_cnt} Follow-Up Kadaluarsa (Overdue)!",
                    "message": "Terdapat tindak lanjut kantor yang melewati batas tanggal rencana dan memerlukan penanganan segera.",
                    "timestamp": now.strftime("%Y-%m-%d %H:%M"),
                    "time_ago": "Hari ini",
                    "urgency": "P2_TINGGI",
                    "link": "/workspace/follow-ups/due-today",
                    "is_read": nid in self._read_notification_ids
                })

            # 3. Ambil Kiriman Gagal X-Ray Terbaru
            cursor.execute(
                """
                SELECT ID_Kiriman, Kantor_Penerbangan, Isi_Kiriman, Keterangan, Tanggal
                FROM cch_kiriman_gagal_xray
                ORDER BY Tanggal DESC
                LIMIT 2
                """
            )
            xray_rows = cursor.fetchall()
            for x in xray_rows:
                barcode = x.get("ID_Kiriman")
                nid = f"xray_{barcode}"
                notifications.append({
                    "id": nid,
                    "type": "gagal_xray",
                    "category": "Gagal X-Ray",
                    "title": f"📦 Gagal X-Ray Bandara: {barcode}",
                    "message": f"Bandara {x.get('Kantor_Penerbangan')}: Terdeteksi '{x.get('Isi_Kiriman')}'. Tindakan: {x.get('Keterangan') or 'Dialihkan'}.",
                    "timestamp": x.get("Tanggal").strftime("%Y-%m-%d %H:%M") if x.get("Tanggal") else "-",
                    "time_ago": "Terbaru",
                    "urgency": "P2_TINGGI",
                    "link": "/workspace/gagal-xray",
                    "is_read": nid in self._read_notification_ids
                })

            cursor.close()
            conn.close()

            # Hitung jumlah belum dibaca
            unread_count = sum(1 for n in notifications if not n["is_read"])

            return {
                "unread_count": unread_count,
                "total_count": len(notifications),
                "items": notifications[:20],
                "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
            }

        except Exception as e:
            logger.error(f"Error fetching notifications: {e}")
            return {
                "unread_count": 0,
                "total_count": 0,
                "items": [],
                "updated_at": now.strftime("%Y-%m-%d %H:%M:%S")
            }

    def mark_all_notifications_read(self) -> Dict[str, Any]:
        """Tandai semua notifikasi telah dibaca"""
        res = self.get_realtime_notifications()
        for item in res.get("items", []):
            self._read_notification_ids.add(item["id"])
        return {"success": True, "marked_count": len(self._read_notification_ids)}


core_service = CoreService()

