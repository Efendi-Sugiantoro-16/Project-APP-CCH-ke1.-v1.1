from fastapi import APIRouter, HTTPException, Depends
from app.domain.models import (
    VirtualCSChatRequest,
    VirtualCSChatResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    SentimentResult,
    ExtractedComplaint,
    CopilotClassifyRequest,
    CopilotClassifyResponse,
    CopilotSuggestionRequest,
    CopilotSuggestionResponse
)
from app.services.sentiment_engine import SentimentEngine
from app.services.pos_extractor import PosExtractor
from app.services.virtual_cs_agent import VirtualCSAgent
from app.services.copilot_service import CopilotService
from app.services.cch_backend_client import backend_client
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/api/v1/virtual-cs", tags=["virtual-cs-agent"])



@router.post("/chat", response_model=VirtualCSChatResponse)
async def chat_with_virtual_cs(request: VirtualCSChatRequest):
    """
    Endpoint Obrolan Interaktif dengan Virtual CS Agent (Agentic AI).
    - Menganalisis sentimen & urgensi pelanggan secara real-time.
    - Mengekstrak nomor resi pos dan entitas keluhan.
    - Memeriksa manifest/riwayat kiriman di basis data CCH.
    - Menerbitkan tiket resmi (Status 101 ENTRI) secara otonom 24/7.
    """
    try:
        response = await VirtualCSAgent.process_chat(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses obrolan Virtual CS: {str(e)}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_complaint_text(request: AnalyzeRequest):
    """
    Endpoint Analisis Mandiri Sentimen & Ekstraksi Entitas Pos Indonesia.
    Berguna untuk integrasi widget, audit triase, atau dashboard CS.
    """
    try:
        sentiment = SentimentEngine.analyze(request.text)
        extracted = PosExtractor.extract_all(request.text)
        return AnalyzeResponse(sentiment=sentiment, extracted=extracted)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menganalisis teks: {str(e)}")


@router.get("/track/{shipment_number}")
async def track_shipment_status(shipment_number: str):
    """
    Pengecekan cepat status kiriman di basis data CCH / Gagal X-Ray Bandara.
    """
    res = backend_client.track_shipment(shipment_number)
    if not res:
        return {"found": False, "shipment_number": shipment_number, "message": "Nomor kiriman belum terdaftar dalam sistem pengaduan/gagal x-ray"}
    return res


@router.get("/analytics/sentiment-stats")
async def get_sentiment_analytics():
    """
    Endpoint Dasbor Analitik Sentimen AI, Tingkat Urgensi SLA P1/P2/P3,
    Indeks Kepuasan Pelanggan (CSAT), dan Tren Sebaran Regional Pos Indonesia.
    """
    try:
        data = analytics_service.get_sentiment_analytics()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat analitik sentimen: {str(e)}")


@router.post("/copilot/classify", response_model=CopilotClassifyResponse)
async def copilot_classify(request: CopilotClassifyRequest):
    """
    Endpoint CS Virtual Copilot: Auto-Klasifikasi Cerdas & Ekstraksi Entitas.
    Mengekstrak nomor resi, estimasi rute kantor pos, kategori aduan, sentimen, dan tingkat urgensi SLA.
    """
    try:
        return CopilotService.classify(request.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan klasifikasi copilot: {str(e)}")


@router.post("/copilot/suggest-response", response_model=CopilotSuggestionResponse)
async def copilot_suggest_response(request: CopilotSuggestionRequest):
    """
    Endpoint CS Virtual Copilot: Rekomendasi Draf Tanggapan Resmi & Catatan Mutasi.
    Menyusun kalimat diplomatis de-eskalasi dan panduan investigasi lapangan berbasis target status.
    """
    try:
        return CopilotService.generate_response_suggestion(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyusun rekomendasi balasan copilot: {str(e)}")


