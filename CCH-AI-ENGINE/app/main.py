from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.health import router as health_router
from app.api.routes.virtual_cs import router as virtual_cs_router
from app.api.routes.social_monitor import router as social_monitor_router
from app.api.routes.core import router as core_router
from app.core.config import settings


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Layanan Agentic AI Virtual Customer Service & Otomasi CCH Baru 24 Jam Nonstop PT Pos Indonesia (Persero)."
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
