from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.core_service import core_service

router = APIRouter(prefix="/api/v1/core", tags=["core-cch-search-notifications"])


@router.get("/search")
async def search_complaints(
    q: str = Query(..., min_length=1, description="Kata kunci pencarian tiket, resi, nama, atau ringkasan"),
    limit: int = Query(10, ge=1, le=50, description="Batas jumlah hasil")
):
    """
    Pencarian global cepat (quick-search) untuk topbar CCH.
    Mencari pada ID tiket, Nomor Resi, Nama Pelanggan, dan Ringkasan Aduan.
    """
    try:
        results = core_service.search_complaints(query=q, limit=limit)
        return {"total": len(results), "query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan pencarian: {str(e)}")


@router.get("/notifications")
async def get_realtime_notifications():
    """
    Mengambil feed notifikasi real-time untuk icon lonceng (Bell) topbar:
    - Aduan P1 Kritis Masuk
    - Follow-Up Kadaluarsa (Overdue)
    - Tiket Baru Terbit via AI CS Virtual / Medsos
    - Kiriman Gagal X-Ray Bandara
    """
    try:
        data = core_service.get_realtime_notifications()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat notifikasi: {str(e)}")


@router.post("/notifications/mark-read")
async def mark_all_notifications_read():
    """
    Menandai semua notifikasi telah dibaca.
    """
    try:
        res = core_service.mark_all_notifications_read()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menandai notifikasi: {str(e)}")

