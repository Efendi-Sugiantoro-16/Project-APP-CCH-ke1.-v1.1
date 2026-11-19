"""
Layanan Integrasi Live Telegram Bot AI (@cch_posind_ai_bot)
PT Pos Indonesia (Persero) - Customer Complaint Handling (CCH Baru)
Implementasi: Long-Polling Asinkron Non-Blocking + Deduplikasi Resi + Transaksi ACID.
"""

import asyncio
import logging
import re
from typing import Optional, Dict, Any, List
import httpx

from app.core.config import settings
from app.services.pos_extractor import pos_extractor
from app.services.cch_backend_client import backend_client
from app.services.social_listener import social_listener
from app.domain.models import SocialIngestRequest, SocialPlatformType

logger = logging.getLogger("cch_ai_engine.telegram_service")

STATUS_LABELS: Dict[str, str] = {
    "101": "101 - ENTRI (Tiket Baru Diterbitkan)",
    "102": "102 - RESPON (Sedang Diinvestigasi Petugas Cabang)",
    "103": "103 - KONFIRMASI (Koordinasi Lapangan / Alamat)",
    "104": "104 - RESOLVED (Paket Dalam Proses Serah Terima)",
    "109": "109 - SELESAI (Tiket Ditutup Resmi & Tuntas)",
}


class TelegramService:
    """
    Mengelola siklus hidup interaksi Telegram Bot resmi Pos Indonesia:
    - Long-polling getUpdates tanpa webhook eksternal / tanpa ngrok.
    - Menjawab perintah /start dengan panduan format resmi.
    - Ekstraksi entitas resi cerdas dan deduplikasi tiket aktif.
    - Penerbitan tiket multi-tabel ACID di MariaDB via SocialListener.
    - Pengiriman notifikasi balik (Outbound Push) saat tiket bermutasi.
    """

    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot_username = settings.TELEGRAM_BOT_USERNAME
        self.poll_interval = settings.TELEGRAM_POLL_INTERVAL
        self.is_polling_enabled = settings.TELEGRAM_POLL_ENABLED
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        self.last_update_id = 0
        self.is_running = False
        self._poller_task: Optional[asyncio.Task] = None
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        """Membuat atau menggunakan kembali HTTP Client asinkron."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def validate_token(self) -> Dict[str, Any]:
        """Menguji keabsahan token bot ke endpoint getMe Telegram."""
        if not self.bot_token:
            return {"valid": False, "error": "TELEGRAM_BOT_TOKEN is empty"}
        try:
            client = await self.get_client()
            resp = await client.get(f"{self.base_url}/getMe")
            data = resp.json()
            if resp.status_code == 200 and data.get("ok"):
                bot_info = data.get("result", {})
                logger.info(
                    f"Telegram Bot connected successfully: @{bot_info.get('username')} (ID: {bot_info.get('id')})"
                )
                return {"valid": True, "bot": bot_info}
            else:
                logger.error(f"Telegram token validation failed: {data}")
                return {"valid": False, "error": data.get("description", "Unknown error")}
        except Exception as e:
            logger.error(f"Error connecting to Telegram API: {e}")
            return {"valid": False, "error": str(e)}

    async def send_message(
        self,
        chat_id: int | str,
        text: str,
        parse_mode: str = "Markdown",
        reply_to_message_id: Optional[int] = None
    ) -> bool:
        """Mengirim pesan teks ke pengguna Telegram."""
        if not self.bot_token:
            logger.warning("Cannot send message: TELEGRAM_BOT_TOKEN not configured")
            return False

        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
        }
        if reply_to_message_id:
            payload["reply_to_message_id"] = reply_to_message_id

        try:
            client = await self.get_client()
            resp = await client.post(f"{self.base_url}/sendMessage", json=payload)
            data = resp.json()
            if resp.status_code == 200 and data.get("ok"):
                return True
            else:
                # Jika Markdown formatting gagal, kirim ulang tanpa format Markdown
                if "can't parse entities" in data.get("description", "").lower():
                    payload.pop("parse_mode", None)
                    retry_resp = await client.post(f"{self.base_url}/sendMessage", json=payload)
                    return retry_resp.status_code == 200
                logger.error(f"Failed to send Telegram message to {chat_id}: {data}")
                return False
        except Exception as e:
            logger.error(f"Exception sending Telegram message to {chat_id}: {e}")
            return False

    async def send_notification(self, chat_id: int | str, update_text: str) -> bool:
        """Kirim notifikasi progres tindak lanjut (Outbound Push)."""
        return await self.send_message(chat_id=chat_id, text=update_text)

    async def handle_message(self, message: Dict[str, Any]):
        """Memproses satu pesan masuk dari pengguna Telegram."""
        chat = message.get("chat", {})
        chat_id = chat.get("id")
        text = (message.get("text") or "").strip()
        msg_id = message.get("message_id")
        from_user = message.get("from", {})

        first_name = from_user.get("first_name", "Pelanggan")
        last_name = from_user.get("last_name", "")
        full_name = f"{first_name} {last_name}".strip()
        username = from_user.get("username") or f"user_{chat_id}"

        if not chat_id or not text:
            return

        logger.info(f"[TELEGRAM INTAKE] Chat ID {chat_id} (@{username}): {text[:60]}")

        # Skenario 1: Perintah /start
        if text.startswith("/start"):
            greeting = (
                f"📮 *Halo Kak {first_name}! Selamat Datang di Layanan Resmi CS Virtual AI CCH PT Pos Indonesia (PERSERO)* 🇮🇩\n\n"
                f"Saya adalah asisten cerdas resmi yang melayani penanganan pengaduan kiriman Kakak secara *otonom 24 jam nonstop*.\n\n"
                f"💡 *Panduan Menyampaikan Pengaduan:*\n"
                f"Silakan ketik kendala kiriman Kakak beserta *Nomor Resi Resmi*, contohnya:\n"
                f"👉 `Paket saya resi POS991122334ID dari Bandung ke Kediri belum sampai, mohon dibantu.`\n"
                f"👉 `Kiriman P24012345678 tujuan Surabaya kenapa statusnya belum bergerak ya min?`\n\n"
                f"Silakan ketik keluhan dan nomor resi Kakak di bawah ini ya! 😊📦"
            )
            await self.send_message(chat_id=chat_id, text=greeting, reply_to_message_id=msg_id)
            return

        # Skenario 2: Filter Spam & Konten Terlarang
        if social_listener.is_spam(text):
            logger.warning(f"Ignored spam message from {chat_id}: {text[:40]}")
            warning = (
                f"Mohon maaf Kak {first_name}, pesan Kakak terdeteksi sebagai promosi/spam otomatis. "
                f"Silakan kirimkan keluhan resmi terkait layanan kiriman Pos Indonesia. Terima kasih."
            )
            await self.send_message(chat_id=chat_id, text=warning, reply_to_message_id=msg_id)
            return

        # Skenario 3: Ekstraksi Entitas Resi via PosExtractor
        extracted = pos_extractor.extract(text)
        shipment_number = extracted.shipment_number

        # Skenario 3A: Jika Nomor Resi Tidak Ditemukan
        if not shipment_number:
            lower_text = text.lower().strip()

            # 1. Deteksi Ucapan Terima Kasih, Apresiasi, & Penutup Dialog (Gratitude / Courtesy)
            gratitude_patterns = [
                r"\bterima\s*kasih\b", r"\bterimakasih\b", r"\bmakasih\b", r"\bmakasi\b",
                r"\bthank\s*you\b", r"\bthanks\b", r"\btq\b", r"\bthx\b",
                r"\bmatur\s*nuwun\b", r"\bhatur\s*nuhun\b", r"\bsukron\b"
            ]
            is_gratitude = any(re.search(p, lower_text) for p in gratitude_patterns)

            ack_patterns = [
                r"\bok\s*siap\b", r"\bsiap\s*(min|kak|mas|pak|bu)?\b", r"\bbaik\s*(min|kak|mas|pak|bu)?\b",
                r"\boke\s*(min|kak|mas|pak|bu)?\b", r"\bnoted\b", r"\bsip\b", r"\bmantap\b"
            ]
            is_ack = any(re.search(p, lower_text) for p in ack_patterns) or lower_text in [
                "ok", "oke", "siap", "baik", "sip", "mantap", "okey"
            ]

            complaint_patterns = [
                r"\bhilang\b", r"\brusak\b", r"\bbelum\s*(sampai|tiba|nyampe)\b", r"\bnyangkut\b",
                r"\blama\b", r"\bparah\b", r"\bkecewa\b", r"\bkomplain\b", r"\blapor\b",
                r"\btolong(in)?\b", r"\bkendala\b", r"\bkenapa\b", r"\bkok\b", r"\bmana\b"
            ]
            has_complaint = any(re.search(p, lower_text) for p in complaint_patterns)

            # Jika pengadu hanya mengucapkan terima kasih / konfirmasi ramah tanpa komplain baru:
            if (is_gratitude or is_ack) and not has_complaint:
                courtesy_reply = (
                    f"Sama-sama Kak {first_name}! Senang sekali bisa melayani dan membantu Kakak. 🙏😊\n\n"
                    f"Tim operasional Pos Indonesia senantiasa siap mengawal kiriman Kakak dengan sepenuh hati 24 jam nonstop. "
                    f"Jika nanti ada kendala atau informasi yang ingin ditanyakan lagi, Kakak cukup chat langsung di sini kapan saja ya.\n\n"
                    f"Semoga hari Kakak menyenangkan dan sehat selalu bersama keluarga! 📦✨"
                )
                await self.send_message(chat_id=chat_id, text=courtesy_reply, reply_to_message_id=msg_id)
                return

            # 2. Deteksi Sapaan Ringan / Basa-Basi Awal (Greeting)
            greeting_patterns = [
                r"\bhalo\b", r"\bhello\b", r"\bhai\b", r"\bhi\b",
                r"\bselamat\s*(pagi|siang|sore|malam)\b", r"\b(pagi|siang|sore|malam)\s*min\b",
                r"\bpermisi\b", r"\bassalamu\s*alaikum\b"
            ]
            is_greeting = any(re.search(p, lower_text) for p in greeting_patterns) and len(lower_text.split()) <= 4
            if is_greeting and not has_complaint:
                greeting_reply = (
                    f"Halo juga Kak {first_name}! Selamat datang di Layanan CS Virtual AI CCH PT Pos Indonesia (PERSERO). 😊📮\n\n"
                    f"Ada yang bisa kami bantu terkait layanan kiriman Kakak hari ini?\n"
                    f"Silakan ketik kendala yang dialami beserta *Nomor Resi Resmi*, agar tim kami dapat langsung menindaklanjuti investigasi ya Kak! 📦✨"
                )
                await self.send_message(chat_id=chat_id, text=greeting_reply, reply_to_message_id=msg_id)
                return

            # 3. Murni Pengaduan tapi Belum Menyertakan Nomor Resi
            ask_resi_text = (
                f"Salam hormat Kak {first_name}! 🙏\n\n"
                f"Keluhan Kakak telah kami baca dengan baik, namun kami belum menemukan *Nomor Resi Pengiriman* yang valid pada pesan Kakak.\n\n"
                f"Agar tiket investigasi resmi CCH dapat segera diterbitkan, mohon balas pesan ini dengan menyertakan format resi Pos Indonesia, misalnya:\n"
                f"• `POS123456789ID` (Pos Kilat Khusus)\n"
                f"• `P24012345678` (Pos Reguler Baru)\n"
                f"• `EE123456789ID` (Pos Express)\n\n"
                f"Ditunggu balasannya ya Kak! 📦✨"
            )
            await self.send_message(chat_id=chat_id, text=ask_resi_text, reply_to_message_id=msg_id)
            return

        # Skenario 3B: Nomor Resi Ditemukan ➔ Pengecekan Deduplikasi Tiket Aktif
        existing_ticket = backend_client.check_active_ticket(shipment_number)

        if existing_ticket:
            status_code = existing_ticket.get("status_code", "101")
            status_desc = STATUS_LABELS.get(status_code, f"Status {status_code}")
            ticket_id = existing_ticket.get("ticket_id", "-")
            created_at = existing_ticket.get("created_at", "-")
            target_office = existing_ticket.get("target_office", "Kantor Tujuan")

            existing_reply = (
                f"Salam hormat Kak {first_name}! 📮\n\n"
                f"Pengaduan untuk nomor resi `{shipment_number}` *sudah terdaftar aktif* di sistem CCH Pos Indonesia:\n"
                f"🎫 *Nomor Tiket:* `{ticket_id}`\n"
                f"📊 *Status Penanganan:* `{status_desc}`\n"
                f"🏢 *Kantor Penanganan:* `{target_office}`\n"
                f"⏱️ *Tanggal Registrasi:* `{created_at}`\n\n"
                f"Saat ini tim operasional kami sedang melanjutkan penelusuran fisik. Kakak tidak perlu khawatir, tiket tidak diduplikasi dan setiap perkembangan status akan otomatis kami kabari langsung ke chat ini! 🙏✨"
            )
            await self.send_message(chat_id=chat_id, text=existing_reply, reply_to_message_id=msg_id)
            return

        # Skenario 3B.1: Pengecekan Khusus Kiriman Terkena Cekal Gagal X-Ray Bandara
        xray_info = backend_client.track_shipment(shipment_number)
        is_gagal_xray = bool(xray_info and xray_info.get("type") == "gagal_xray")

        # Skenario 3C: Resi Baru Belum Pernah Diadukan ➔ Penerbitan Tiket Mandiri ACID
        logger.info(f"Creating new autonomous ticket for Telegram resi {shipment_number} (Gagal X-Ray: {is_gagal_xray})...")

        final_content = text
        if is_gagal_xray:
            final_content = (
                f"[CEKAL X-RAY BANDARA: {xray_info.get('detected_item')} di UPT {xray_info.get('airport')}] {text}"
            )

        ingest_req = SocialIngestRequest(
            platform="telegram",
            author_name=full_name,
            author_handle=f"@{username}" if not username.startswith("user_") else f"ID_{chat_id}",
            author_phone=f"TG:{chat_id}",
            content=final_content,
            permalink=f"tg://user?id={chat_id}",
            auto_create_ticket=True
        )

        try:
            ingest_res = social_listener.ingest_post(ingest_req)

            if ingest_res.ticket:
                ticket_id = ingest_res.ticket.ticket_id
                sla_hours = ingest_res.ticket.sla_hours
                priority = ingest_res.sentiment.urgency_level if ingest_res.sentiment else "P2_TINGGI"

                if is_gagal_xray:
                    airport_code = xray_info.get("airport", "19000")
                    item_type = xray_info.get("detected_item", "Dangerous Goods")
                    weight_val = xray_info.get("weight", 0)
                    date_val = xray_info.get("created_at", "-")
                    success_reply = (
                        f"Salam hormat Kak {first_name}! ⚠️✈️\n\n"
                        f"Berdasarkan sistem pelacakan kargo udara Pos Indonesia, kiriman dengan resi `{shipment_number}` "
                        f"terdeteksi *Tertahan Pemeriksaan X-Ray Bandara (Aviation Security / Dangerous Goods)*:\n\n"
                        f"📦 *Kategori Barang:* `{item_type}`\n"
                        f"⚖️ *Berat Terdata:* `{weight_val} Kg`\n"
                        f"🛫 *Lokasi Bandara:* UPT Penerbangan `{airport_code}` (Bandara Hub)\n"
                        f"📅 *Tanggal Pemeriksaan:* `{date_val}`\n\n"
                        f"🎫 *Nomor Tiket Investigasi CCH:* `{ticket_id}`\n"
                        f"⏱️ *Target SLA:* *{sla_hours} Jam*\n\n"
                        f"ℹ️ *Informasi Operasional:*\n"
                        f"Sesuai regulasi keselamatan penerbangan sipil (ICAO/Kemenhub), paket yang mengandung aerosol/cairan/baterai dialihkan penanganannya melalui *armada darat/laut (Surface Transit)* sehingga membutuhkan waktu estimasi tambahan.\n\n"
                        f"Tiket resmi telah kami terbitkan agar petugas kami terus mengawal perjalanan paket Kakak hingga tiba di alamat tujuan. Terima kasih atas pengertian Kakak! 🙏✨"
                    )
                elif priority == "P1_KRITIS":
                    success_reply = (
                        f"Salam hormat Kak {first_name}, kami memohon maaf yang sebesar-besarnya atas ketidaknyamanan dan kekecewaan mendalam yang Kakak alami terkait kiriman `{shipment_number}`. 🙏\n\n"
                        f"Pengaduan Kakak telah kami prioritaskan dengan status *ESKALASI DARURAT (P1 KRITIS)* ke sistem CCH Pos Indonesia:\n\n"
                        f"🎫 *Nomor Tiket Darurat:* `{ticket_id}`\n"
                        f"🚨 *Klasifikasi:* *P1 KRITIS (Prioritas Investigasi Utama)*\n"
                        f"⏱️ *Target Resolusi SLA:* *{sla_hours} Jam (24 Jam Nonstop)*\n"
                        f"📍 *Tujuan Investigasi:* `{ingest_res.ticket.target_office_name}`\n\n"
                        f"Laporan ini telah diteruskan secara langsung ke antrean kerja prioritas pimpinan pos cabang tujuan untuk penelusuran fisik segera. "
                        f"Setiap tindak lanjut petugas akan otomatis kami kabari langsung ke chat ini. Kami berkomitmen menyelesaikan kendala kiriman Kakak secepatnya. Terima kasih atas kesabaran Kakak. 🙏"
                    )
                else:
                    success_reply = (
                        f"Salam hormat Kak {first_name}! 📮\n\n"
                        f"Pengaduan terkait kiriman `{shipment_number}` telah resmi kami terbitkan ke sistem CCH Pos Indonesia:\n\n"
                        f"🎫 *Nomor Tiket Resmi:* `{ticket_id}`\n"
                        f"⏱️ *Target Resolusi SLA:* *{sla_hours} Jam* (Penanganan Standar)\n"
                        f"📍 *Tujuan Investigasi:* `{ingest_res.ticket.target_office_name}`\n\n"
                        f"Laporan Kakak telah masuk ke antrean kerja prioritas petugas kantor pos cabang. "
                        f"Kami akan mengirimkan kabar terbaru secara otomatis ke chat ini saat petugas melakukan investigasi lapangan. Terima kasih atas kepercayaan Kakak! 🙏✨"
                    )
                await self.send_message(chat_id=chat_id, text=success_reply, reply_to_message_id=msg_id)
            else:
                # Balasan fallback jika tiket gagal terbit
                fallback_reply = ingest_res.de_escalation_reply or "Laporan Kakak telah kami terima dan sedang diproses tim kami."
                await self.send_message(chat_id=chat_id, text=fallback_reply, reply_to_message_id=msg_id)

        except Exception as e:
            logger.error(f"Error during ticket creation for Telegram chat {chat_id}: {e}")
            err_msg = (
                f"Mohon maaf Kak {first_name}, terjadi gangguan sementara saat mendaftarkan tiket ke basis data. "
                f"Tim teknis kami sedang memulihkan koneksi. Mohon coba beberapa saat lagi."
            )
            await self.send_message(chat_id=chat_id, text=err_msg, reply_to_message_id=msg_id)

    async def _poll_loop(self):
        """Loop asinkron pengambilan pesan masuk via getUpdates."""
        logger.info(f"Starting Telegram Long-Polling for bot: {self.bot_username}...")
        client = await self.get_client()

        while self.is_running:
            try:
                url = f"{self.base_url}/getUpdates"
                params = {
                    "offset": self.last_update_id + 1,
                    "timeout": 10,
                    "allowed_updates": ["message"]
                }
                resp = await client.get(url, params=params, timeout=25.0)

                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("ok"):
                        updates = data.get("result", [])
                        for update in updates:
                            update_id = update.get("update_id", 0)
                            if update_id > self.last_update_id:
                                self.last_update_id = update_id

                            msg = update.get("message")
                            if msg:
                                # Proses pesan secara asinkron agar tidak memblokir loop
                                asyncio.create_task(self.handle_message(msg))

                elif resp.status_code in (401, 404):
                    logger.error(f"Telegram polling unauthorized/invalid token: {resp.text}")
                    await asyncio.sleep(10)
                else:
                    logger.warning(f"Telegram getUpdates returned {resp.status_code}: {resp.text}")
                    await asyncio.sleep(self.poll_interval)

            except httpx.TimeoutException:
                # Normal behavior on long-polling timeout
                continue
            except asyncio.CancelledError:
                logger.info("Telegram poller loop cancelled.")
                break
            except Exception as e:
                logger.error(f"Unexpected error in Telegram poller loop: {e}")
                await asyncio.sleep(self.poll_interval)

    def start_poller(self):
        """Memulai background task poller."""
        if not self.is_polling_enabled:
            logger.info("Telegram Poller is disabled via TELEGRAM_POLL_ENABLED=false")
            return

        if not self.bot_token:
            logger.warning("Telegram Poller not started: TELEGRAM_BOT_TOKEN is not set")
            return

        if self.is_running:
            logger.warning("Telegram Poller is already running")
            return

        self.is_running = True
        self._poller_task = asyncio.create_task(self._poll_loop())
        logger.info("Telegram Poller background task started successfully.")

    async def stop_poller(self):
        """Menghentikan background task poller secara aman."""
        self.is_running = False
        if self._poller_task and not self._poller_task.done():
            self._poller_task.cancel()
            try:
                await self._poller_task
            except asyncio.CancelledError:
                pass
        if self._client and not self._client.is_closed:
            await self._client.aclose()
        logger.info("Telegram Poller stopped cleanly.")


# Singleton Instance
telegram_service = TelegramService()
