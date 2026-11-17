from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.virtual_cs import router as virtual_cs_router
from app.api.routes.social_monitor import router as social_monitor_router
from app.api.routes.core import router as core_router
from app.core.config import settings
from app.services.telegram_service import telegram_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Aktifkan Telegram Poller otomatis
    telegram_service.start_poller()
    yield
    # Shutdown: Matikan poller dan tutup koneksi HTTP
    await telegram_service.stop_poller()


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Layanan Agentic AI Virtual Customer Service & Otomasi CCH Baru 24 Jam Nonstop PT Pos Indonesia (Persero).",
        lifespan=lifespan
    )

    # Enable CORS for React frontend (port 5173 / localhost)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    application.include_router(health_router)
    application.include_router(virtual_cs_router)
    application.include_router(social_monitor_router)
    application.include_router(core_router)

    return application


app = create_app()
