from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request
from app.domain.models import (
    SocialIngestRequest,
    SocialIngestResponse,
    SocialFeedResponse,
    SocialPlatformType
)
from app.services.social_listener import social_listener
from app.services.agentic_worker import agentic_worker

router = APIRouter(prefix="/api/v1/social", tags=["social-media-intake"])


@router.get("/agent/status")
async def get_agent_status():
    """
    Mengambil status live worker agentic scraping & ingestion CCH.
    Menampilkan status running, konfigurasi environment, statistik tiket dan model AI aktif.
    """
    try:
        return agentic_worker.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat status agentic worker: {str(e)}")


@router.post("/agent/toggle")
async def toggle_agent(enable: Optional[bool] = Query(None)):
    """
    Menghidupkan atau mematikan background scraping otonom.
    Jika parameter 'enable' dikosongkan, status worker akan di-toggle (flip).
    """
    try:
        new_state = agentic_worker.toggle(enable)
        return {
            "status": "success",
            "is_running": new_state,
            "message": f"Autonomous Agentic Scraping sekarang {'AKTIF' if new_state else 'NONAKTIF'}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengubah status agentic worker: {str(e)}")


@router.post("/agent/poll-now")
async def trigger_agent_poll():
    """
    Memicu 1 siklus scraping & pemrosesan kognitif mandiri seketika (on-demand).
    AI menyisir feed, mengekstrak nomor resi, membuat tiket di MariaDB, dan menyiapkan de-eskalasi.
    """
    try:
        result = agentic_worker.poll_once()
        return {
            "status": "success",
            "detail": result,
            "worker_status": agentic_worker.get_status()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menjalankan siklus agentic poll: {str(e)}")


@router.post("/ingest", response_model=SocialIngestResponse)
async def ingest_social_post(request: SocialIngestRequest):
    """
    Ingest postingan / komentar dari Facebook, Threads, Instagram, atau Telegram.
    - Memeriksa filter anti-spam.
    - Mengekstrak nomor resi pos & entitas keluhan.
    - Menganalisis tingkat keparahan sentimen & urgensi (P1/P2/P3).
    - Menerbitkan tiket resmi CCH (Status 101 ENTRI) secara otonom ke MariaDB.
    - Mengembalikan balasan de-eskalasi otomatis.
    """
    try:
        response = social_listener.ingest_post(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses ingestion medsos: {str(e)}")


@router.get("/feed", response_model=SocialFeedResponse)
async def get_social_feed(
    platform: Optional[str] = Query(None, description="Filter platform: ALL, facebook, instagram, threads, telegram, whatsapp"),
    urgency: Optional[str] = Query(None, description="Filter urgensi: ALL, P1_KRITIS, P2_TINGGI, P3_NORMAL"),
    has_ticket: Optional[bool] = Query(None, description="Filter status tiket CCH terbit"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Mengambil live stream feed keluhan media sosial & Telegram terpadu.
    """
    try:
        data = social_listener.get_feed(
            platform=platform,
            urgency=urgency,
            has_ticket=has_ticket,
            limit=limit
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat feed medsos: {str(e)}")


@router.post("/webhook/{platform}")
async def social_platform_webhook(platform: str, request: Request):
    """
    Universal Webhook Endpoint untuk Meta Graph API (FB, IG, Threads) dan Telegram Bot.
    Menerima sinyal event secara real-time.
    """
    try:
        body = await request.json()
        logger_name = f"webhook.{platform}"
        # Jika payload dari Telegram Bot
        if platform == "telegram":
            msg = body.get("message", {})
            text = msg.get("text", "")
            user = msg.get("from", {})
            author_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "Pengguna Telegram"
            author_handle = f"@{user.get('username', 'tg_user')}"
            
            if text:
                ingest_req = SocialIngestRequest(
                    platform="telegram",
                    author_name=author_name,
                    author_handle=author_handle,
                    content=text,
                    permalink="tg://resolve?domain=PosIndonesiaCareBot",
                    auto_create_ticket=True
                )
                res = social_listener.ingest_post(ingest_req)
                return {"status": "ok", "processed": True, "ticket_id": res.ticket.ticket_id if res.ticket else None}

        return {"status": "received", "platform": platform}
    except Exception as e:
        return {"status": "ignored", "error": str(e)}

