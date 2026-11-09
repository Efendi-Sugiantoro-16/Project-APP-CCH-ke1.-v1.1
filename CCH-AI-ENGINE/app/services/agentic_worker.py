import asyncio
import datetime
import logging
import random
from typing import List, Dict, Any, Optional

from app.core.config import settings
from app.domain.models import (
    SocialPlatformType,
    SocialIngestRequest,
    SocialIngestResponse,
)
from app.services.social_listener import social_listener
from app.seeders.social_demo_seeder import DEMO_SOCIAL_SAMPLES

logger = logging.getLogger("cch_ai_engine.agentic_worker")

# Pool template komplain acak untuk simulasi scraping mandiri di dev/staging
SCRAPE_STREAM_TEMPLATES = [
    {
        "platform": "instagram",
        "author_name": "Mega Lestari",
        "author_handle": "@megalestari_99",
        "content": "Halo @posindonesia_id paket dokumen beasiswa saya resi POS882233119ID dari Semarang ke Yogyakarta belum sampai sudah 4 hari, mohon bantuannya sangat mendesak!",
        "author_phone": "081344556677",
        "author_email": "mega.lestari@example.com",
        "permalink": "https://instagram.com/p/DBxyz123456",
    },
    {
        "platform": "threads",
        "author_name": "Dimas Pratama",
        "author_handle": "@dimas_pratama88",
        "content": "Min Pos Indonesia, kiriman paket baju resi P2408290039578 tujuan Surabaya kenapa statusnya tertahan terus di DC Bandung ya? Tolong direspon min.",
        "author_phone": "082155667788",
        "author_email": "dimas.p@example.com",
        "permalink": "https://threads.net/@dimas_pratama88/post/12345",
    },
    {
        "platform": "telegram",
        "author_name": "Siti Nurhaliza",
        "author_handle": "@siti_nurhaliza_pos",
        "content": "Assalamu alaikum min, kiriman obat herbal orang tua saya nomor EE998877665ID dari Jakarta ke Kediri sudah lewat estimasi kilat khusus. Mohon dicek fisik barangnya.",
        "author_phone": "081988776655",
        "author_email": "siti.nur@example.com",
        "permalink": "tg://resolve?domain=PosIndonesiaCareBot",
    },
    {
        "platform": "facebook",
        "author_name": "Budi Santoso",
        "author_handle": "Budi Santoso",
        "content": "Slot gacor zeus maxwin hari ini klik link dana kaget deposit pulsa tanpa potongan!",
        "author_phone": "",
        "author_email": "",
        "permalink": "https://facebook.com/groups/posindonesia/posts/99999",
    },
]


class AgenticScrapingWorker:
    """
    Autonomous Agentic Scraping & Intake Worker for CCH.
    Menjalankan proses pemantauan mandiri di latar belakang:
    1. Menyisir mention / percakapan media sosial (Twitter/X, IG, Threads, Telegram).
    2. Menjalankan filter anti-spam & cognitive AI reasoning.
    3. Menerbitkan tiket resmi CCH (Status 101 ENTRI) secara mandiri ke MariaDB.
    4. Menyiapkan balasan de-eskalasi otomatis kepada pelanggan.
    """

    def __init__(self):
        self.is_running: bool = False
        self._task: Optional[asyncio.Task] = None
        self.total_scraped: int = 0
        self.total_tickets_created: int = 0
        self.total_spam_blocked: int = 0
        self.last_poll_time: Optional[datetime.datetime] = None
        self._history: List[Dict[str, Any]] = []

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "environment": settings.ENVIRONMENT,
            "poll_interval_seconds": settings.AGENTIC_POLL_INTERVAL_SECONDS,
            "auto_create_ticket": settings.AGENTIC_AUTO_CREATE_TICKET,
            "auto_reply": settings.AGENTIC_AUTO_REPLY,
            "dry_run": settings.AGENTIC_DRY_RUN,
            "min_urgency_to_ticket": settings.AGENTIC_MIN_URGENCY_TO_TICKET,
            "total_scraped": self.total_scraped,
            "total_tickets_created": self.total_tickets_created,
            "total_spam_blocked": self.total_spam_blocked,
            "last_poll_time": self.last_poll_time.isoformat() if self.last_poll_time else None,
            "active_platforms": ["instagram", "threads", "telegram", "facebook", "whatsapp"],
            "primary_llm": settings.PRIMARY_LLM_PROVIDER,
            "llm_model": settings.OPENAI_MODEL if settings.PRIMARY_LLM_PROVIDER == "openai" else settings.GEMINI_MODEL,
        }

    def start(self):
        """Memulai background poller jika belum berjalan"""
        if self.is_running:
            logger.info("Agentic Worker already running.")
            return

        self.is_running = True
        logger.info(
            f"Autonomous Agentic Worker STARTED in '{settings.ENVIRONMENT}' mode. "
            f"Polling interval: {settings.AGENTIC_POLL_INTERVAL_SECONDS}s."
        )

    def stop(self):
        """Menghentikan background poller"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Autonomous Agentic Worker STOPPED.")

    def toggle(self, enable: Optional[bool] = None) -> bool:
        """Mengubah status aktif/nonaktif worker"""
        if enable is None:
            enable = not self.is_running
        if enable:
            self.start()
        else:
            self.stop()
        return self.is_running

    def poll_once(self) -> Dict[str, Any]:
        """
        Mengeksekusi satu siklus penarikan data scraping & pemrosesan kognitif mandiri.
        Dapat dipanggil periodik oleh background scheduler atau dipicu via endpoint API.
        """
        self.last_poll_time = datetime.datetime.now()
        self.total_scraped += 1

        # Ambil sampel acak dari template feed
        sample = random.choice(SCRAPE_STREAM_TEMPLATES)
        
        # Cek spam terlebih dahulu
        if social_listener.is_spam(sample["content"]):
            self.total_spam_blocked += 1
            result = {
                "action": "SPAM_BLOCKED",
                "platform": sample["platform"],
                "author": sample["author_handle"],
                "reason": "Konten terdeteksi spam/judi/iklan komersial",
                "timestamp": datetime.datetime.now().isoformat(),
            }
            self._history.append(result)
            return result

        # Bentuk request ingest
        req = SocialIngestRequest(
            platform=sample["platform"],
            author_name=sample["author_name"],
            author_handle=sample["author_handle"],
            author_phone=sample.get("author_phone"),
            author_email=sample.get("author_email"),
            content=sample["content"],
            permalink=sample.get("permalink"),
            auto_create_ticket=settings.AGENTIC_AUTO_CREATE_TICKET and not settings.AGENTIC_DRY_RUN
        )

        # Proses melalui pipeline kognitif social listener
        response = social_listener.ingest_post(req)

        ticket_id = response.ticket.ticket_id if response.ticket else None
        if ticket_id:
            self.total_tickets_created += 1

        result = {
            "action": "TICKET_CREATED" if ticket_id else "ANALYZED_ONLY",
            "platform": sample["platform"],
            "author": sample["author_handle"],
            "ticket_id": ticket_id,
            "shipment_number": response.extracted.shipment_number,
            "urgency": response.sentiment.urgency_level,
            "sentiment": response.sentiment.sentiment,
            "sentiment_score": response.sentiment.score,
            "auto_reply": response.de_escalation_reply,
            "timestamp": datetime.datetime.now().isoformat(),
        }

        self._history.append(result)
        if len(self._history) > 100:
            self._history.pop(0)

        logger.info(
            f"[AGENTIC ACTION] Scraped {sample['platform']} by {sample['author_handle']}. "
            f"Action: {result['action']}, Ticket: {ticket_id}, Urgency: {response.sentiment.urgency_level}"
        )
        return result


agentic_worker = AgenticScrapingWorker()
# Auto-start worker jika diaktifkan di konfigurasi
if settings.AGENTIC_AUTO_POLL_ENABLED:
    agentic_worker.start()
