import datetime
import random
import logging
from typing import Optional, Dict, Any, Tuple
import mysql.connector
from app.core.config import settings
from app.domain.models import ExtractedComplaint, SentimentResult, TicketInfo

logger = logging.getLogger("cch_ai_engine.backend_client")


class CCHBackendClient:
    """
    Klien Layanan Backend CCH & Basis Data MariaDB.
    Melakukan operasi ACID untuk pengecekan resi, penerbitan tiket resmi (Status 101),
    pencatatan audit trail cchentrimas, dan penugasan UPT cchentridet.
    """

    def __init__(self):
        self.db_config = {
            "host": "127.0.0.1",
            "port": 3306,
            "user": "root",
            "password": "",
            "database": "cch"
        }

    def _get_connection(self):
        return mysql.connector.connect(**self.db_config)

    def track_shipment(self, shipment_number: str) -> Optional[Dict[str, Any]]:
        """
        Cari tahu apakah nomor resi ini sudah pernah diadukan di cchentri
        atau tercatat di kiriman gagal x-ray bandara.
        """
        if not shipment_number:
            return None

        clean_number = shipment_number.strip().upper()
        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=True)

            # Cek di cchentri
            cursor.execute(
                """
                SELECT ID_Pengaduan, Nomor_Kiriman, Status_Akhir, Tanggal_Pengaduan,
                       Kantor_Asal, Kantor_Tujuan, Ringkasan_Pengaduan
                FROM cchentri
                WHERE UPPER(Nomor_Kiriman) = %s
                ORDER BY Tanggal_Pengaduan DESC
                LIMIT 1
                """,
                (clean_number,)
            )
            ticket = cursor.fetchone()
            if ticket:
                cursor.close()
                conn.close()
                return {
                    "found": True,
                    "type": "existing_complaint",
                    "ticket_id": ticket["ID_Pengaduan"],
                    "status_code": str(ticket["Status_Akhir"]),
                    "created_at": str(ticket["Tanggal_Pengaduan"]),
                    "origin_office": ticket["Kantor_Asal"],
                    "target_office": ticket["Kantor_Tujuan"],
                    "summary": ticket["Ringkasan_Pengaduan"]
                }

            # Cek di cch_kiriman_gagal_xray
            cursor.execute(
                """
                SELECT ID_Kiriman, Kantor_Penerbangan, Isi_Kiriman, Keterangan,
                       Berat, Tanggal
                FROM cch_kiriman_gagal_xray
                WHERE UPPER(ID_Kiriman) = %s
                LIMIT 1
                """,
                (clean_number,)
            )
            xray = cursor.fetchone()
            cursor.close()
            conn.close()

            if xray:
                return {
                    "found": True,
                    "type": "gagal_xray",
                    "barcode": xray["ID_Kiriman"],
                    "airport": xray["Kantor_Penerbangan"],
                    "detected_item": xray["Isi_Kiriman"],
                    "status_action": xray["Keterangan"] or "Diteruskan Darat/Laut",
                    "weight": xray["Berat"],
                    "created_at": str(xray["Tanggal"])
                }

            return None
        except Exception as e:
            logger.error(f"Error querying tracking DB: {e}")
            return None

    def create_autonomous_ticket(
        self,
        extracted: ExtractedComplaint,
        sentiment: SentimentResult
    ) -> TicketInfo:
        """
        Menerbitkan tiket pengaduan resmi CCH (Status 101 ENTRI) secara otonom 24/7.
        Eksekusi transaksi ACID pada tabel cchentricus, cchentrimas, cchentridet, dan cchentri.
        """
        now = datetime.datetime.now()
        origin_office_code = "40005"
        if extracted.source_office_hint:
            parts = extracted.source_office_hint.split("-")
            origin_office_code = parts[0].strip()[:5]

        target_office_code = "64100"
        target_office_name = "KEDIRI"
        if extracted.destination_office_hint:
            parts = extracted.destination_office_hint.split("-")
            target_office_code = parts[0].strip()[:5]
            if len(parts) > 1:
                target_office_name = parts[1].strip()

        # Format ID Tiket POSIND: [Kantor 5 Digit]CC[YYYYMMDD][HHMMSS][Seq 2 Digit]
        date_str = now.strftime("%Y%m%d%H%M%S")
        seq_str = f"{random.randint(10, 99)}"
        ticket_id = f"{origin_office_code}CC{date_str}{seq_str}"

        conn = self._get_connection()
        conn.autocommit = False
        cursor = conn.cursor()

        try:
            # 1. Cari atau buat customer profile di cchentricus
            customer_name = (extracted.customer_name or "Pelanggan POS").strip()
            customer_phone = (extracted.customer_phone or "-").strip()
            customer_email = (extracted.customer_email or "").strip()
            customer_address = (extracted.customer_address or "-").strip()

            cursor.execute(
                "SELECT ID_Pelanggan FROM cchentricus WHERE Nomor_HP = %s AND Nama_Lengkap = %s LIMIT 1",
                (customer_phone, customer_name)
            )
            row = cursor.fetchone()
            if row:
                customer_id = row[0]
            else:
                cursor.execute(
                    """
                    INSERT INTO cchentricus (Nama_Lengkap, Nomor_HP, Email, Alamat, Kantor_Tambah, Tanggal_Tambah, Ditambah_Oleh)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (customer_name, customer_phone, customer_email, customer_address, origin_office_code, now, "SYSTEM_AI_CS")
                )
                customer_id = cursor.lastrowid or random.randint(1000, 9999)

            # 2. Insert Histori Status Awal (Status 101 ENTRI) ke cchentrimas
            audit_note = (
                f"Tiket diterbitkan otomatis 24 Jam oleh CS Virtual AI. "
                f"Sentimen: {sentiment.sentiment.upper()} (Skor: {sentiment.score}), "
                f"Urgensi: {sentiment.urgency_level}. Ringkasan: {extracted.summary[:80]}"
            )
            cursor.execute(
                """
                INSERT INTO cchentrimas
                (ID_Pengaduan, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update, Tanggal_Update, Deskripsi_Update, Petugas_Update, Durasi_Antar_Status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (ticket_id, 101, origin_office_code, target_office_code, now, audit_note, "SYSTEM_AI_CS", 0)
            )
            history_id = cursor.lastrowid or 1

            # 3. Insert Penugasan Kantor ke cchentridet
            cursor.execute(
                """
                INSERT INTO cchentridet
                (ID_Pengaduan, ID_Histori, Status_Update, Kantor_Asal_Update, Kantor_Tujuan_Update)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (ticket_id, history_id, 101, origin_office_code, target_office_code)
            )

            # 4. Insert Tiket Utama ke cchentri
            shipment_num = extracted.shipment_number or f"NON-RESI-{now.strftime('%d%H%M')}"
            cursor.execute(
                """
                INSERT INTO cchentri
                (ID_Pengaduan, ID_Histori, ID_Pelanggan, Nama_Pelanggan, Email_Pelanggan, Nomor_HP_Pelanggan, Alamat_Pelanggan,
                 Kantor_Asal, Kantor_Tujuan, Jenis_Pengaduan, Sumber_Pengaduan, Jenis_Kiriman, Nomor_Kiriman,
                 Tanggal_Pengaduan, Kantor_Asal_Kiriman, Kantor_Tujuan_Kiriman, Ringkasan_Pengaduan, Uraian_Pengaduan,
                 Status_Akhir, Tanggal_Status, Kantor_Status, Tanggal_Tambah, Ditambah_Oleh, Already_Validated)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s,
                 %s, %s, %s, %s, %s, %s)
                """,
                (
                    ticket_id, history_id, customer_id, customer_name, customer_email, customer_phone, customer_address,
                    origin_office_code, target_office_code, extracted.complaint_type_code or 1, 7, extracted.shipping_service_code or "000", shipment_num,
                    now, origin_office_code, target_office_code, extracted.summary, extracted.description,
                    101, now, origin_office_code, now, "SYSTEM_AI_CS", 1
                )
            )

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(f"Successfully created autonomous CCH ticket: {ticket_id}")

            return TicketInfo(
                ticket_id=ticket_id,
                status_code="101",
                status_name="101 - ENTRI (Tiket Resmi Terbit)",
                created_at=now.strftime("%Y-%m-%d %H:%M:%S"),
                target_office_code=target_office_code,
                target_office_name=target_office_name,
                sla_hours=24 if sentiment.urgency_level == "P1_KRITIS" else 48,
                priority=sentiment.urgency_level
            )
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            logger.error(f"Failed to create autonomous ticket: {e}")
            raise e


backend_client = CCHBackendClient()
