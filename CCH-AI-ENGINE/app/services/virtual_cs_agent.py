import uuid
import logging
from typing import Optional, Dict, Any, List
from app.domain.models import (
    VirtualCSChatRequest,
    VirtualCSChatResponse,
    SentimentResult,
    ExtractedComplaint,
    TicketInfo
)
from app.services.sentiment_engine import SentimentEngine
from app.services.pos_extractor import PosExtractor
from app.services.cch_backend_client import backend_client
from app.services.llm_client import llm_client

logger = logging.getLogger("cch_ai_engine.virtual_cs")

# In-memory session context cache
SESSIONS: Dict[str, Dict[str, Any]] = {}


class VirtualCSAgent:
    """
    Virtual Customer Service Officer Pos Indonesia (Agentic AI).
    Menggabungkan analisis sentimen bahasa Indonesia, ekstraksi entitas resi,
    pengecekan basis data CCH secara real-time, dan penerbitan tiket resmi (Status 101).
    """

    @classmethod
    async def process_chat(cls, req: VirtualCSChatRequest) -> VirtualCSChatResponse:
        session_id = req.session_id or f"sess_{uuid.uuid4().hex[:12]}"

        # Ambil atau inisialisasi state sesi
        if session_id not in SESSIONS:
            SESSIONS[session_id] = {
                "history": [],
                "extracted": ExtractedComplaint(),
                "created_ticket": None
            }
        session_state = SESSIONS[session_id]

        text = req.message.strip()

        # 1. Analisis Sentimen & Urgensi Real-time
        sentiment: SentimentResult = SentimentEngine.analyze(text)

        # 2. Ekstraksi Entitas Pos (Nomor Resi, Kontak, Jenis Aduan)
        extracted: ExtractedComplaint = PosExtractor.extract_all(
            text=text,
            customer_name=req.customer_name,
            customer_phone=req.customer_phone
        )

        # Gabungkan data resi dari sesi sebelumnya jika pesan saat ini tidak menyebutkan resi lagi
        if not extracted.shipment_number and session_state["extracted"].shipment_number:
            extracted.shipment_number = session_state["extracted"].shipment_number

        session_state["extracted"] = extracted

        # 3. Decision Loop & Tool Execution (Agentic Reasoning)
        action_taken = "CONVERSING"
        ticket_info: Optional[TicketInfo] = session_state.get("created_ticket")
        tracking_data: Optional[Dict[str, Any]] = None

        # Cek apakah ada nomor resi untuk di-track
        if extracted.shipment_number:
            tracking_data = backend_client.track_shipment(extracted.shipment_number)

        # Tentukan respon & aksi
        reply = ""

        # Kondisi 1: Kiriman terdeteksi di Gagal X-Ray Bandara
        if tracking_data and tracking_data.get("type") == "gagal_xray":
            action_taken = "TRACKING_CHECKED_XRAY"
            airport = tracking_data.get("airport", "Bandara")
            item = tracking_data.get("detected_item", "Kiriman Khusus")

            # Jika belum ada tiket dan pelanggan komplain/marah, terbitkan tiket resmi
            if not ticket_info and (sentiment.urgency_level in ["P1_KRITIS", "P2_TINGGI"] or len(text) > 25):
                ticket_info = backend_client.create_autonomous_ticket(extracted, sentiment)
                session_state["created_ticket"] = ticket_info
                action_taken = "TICKET_CREATED_XRAY"

            apology = "Mohon maaf yang sebesar-besarnya atas kendala yang terjadi. " if sentiment.score < 0 else ""
            ticket_msg = (
                f"\n\n🎫 **Tiket Pengaduan Resmi CCH Berhasil Diterbitkan:**\n"
                f"• Nomor Tiket: `{ticket_info.ticket_id}`\n"
                f"• Status: **101 - ENTRI (Dalam Penanganan)**\n"
                f"• Kantor Tujuan: `{ticket_info.target_office_code} - {ticket_info.target_office_name}`\n"
                f"• Target SLA Investigasi: **{ticket_info.sla_hours} Jam Kerja**"
            ) if ticket_info else ""

            reply = (
                f"{apology}Berdasarkan penelusuran sistem kami pada nomor resi `{extracted.shipment_number}`, "
                f"kiriman sempat tertahan pada pemeriksaan keamanan X-Ray di Bandara `{airport}` karena terdeteksi `{item}`. "
                f"Sesuai regulasi keselamatan penerbangan, kiriman ini dialihkan melalui rute darat/freighter menuju kantor tujuan.{ticket_msg}"
            )

        # Kondisi 2: Resi ditemukan tapi sudah ada pengaduan aktif
        elif tracking_data and tracking_data.get("type") == "existing_complaint":
            action_taken = "EXISTING_TICKET_FOUND"
            exist_id = tracking_data.get("ticket_id")
            st_code = tracking_data.get("status_code")
            reply = (
                f"Nomor resi `{extracted.shipment_number}` sudah terdaftar dalam sistem pengaduan CCH kami "
                f"dengan nomor tiket `{exist_id}` (Status saat ini: **{st_code}**). "
                f"Kantor penanganan `{tracking_data.get('target_office')}` sedang melakukan tindak lanjut aktif."
            )

        # Kondisi 3: Pelanggan memberikan resi baru & keluhan lengkap ➔ Terbitkan Tiket Otomatis!
        elif extracted.shipment_number and extracted.is_complete_for_ticket and not ticket_info:
            action_taken = "TICKET_CREATED_AUTOMATIC"
            ticket_info = backend_client.create_autonomous_ticket(extracted, sentiment)
            session_state["created_ticket"] = ticket_info

            apology = (
                "Kami sangat memahami kekecewaan dan urgensi yang Bapak/Ibu alami, dan kami memohon maaf yang sebesar-besarnya. "
                if sentiment.score <= -0.4 else "Terima kasih atas laporan Anda. "
            )

            reply = (
                f"{apology}Pengaduan Anda untuk resi `{extracted.shipment_number}` ({extracted.complaint_type_name}) "
                f"telah kami daftarkan secara resmi ke sistem operasional Pos Indonesia.\n\n"
                f"📋 **Detail Tiket Pengaduan CCH:**\n"
                f"• Nomor Tiket: `{ticket_info.ticket_id}`\n"
                f"• Status Awal: **{ticket_info.status_name}**\n"
                f"• Kantor Penanggung Jawab: `{ticket_info.target_office_code} - {ticket_info.target_office_name}`\n"
                f"• Prioritas Penanganan: **{ticket_info.priority}** (SLA {ticket_info.sla_hours} Jam)\n\n"
                f"Petugas investigasi lapangan kantor tujuan telah menerima notifikasi penugasan tiket ini."
            )

        # Kondisi 4: Pelanggan marah tapi belum menyertakan nomor resi
        elif sentiment.urgency_level == "P1_KRITIS" and not extracted.shipment_number:
            action_taken = "DEESCALATE_ASK_RESI"
            reply = (
                "Mohon maaf yang sebesar-besarnya atas ketidaknyamanan dan kekecewaan mendalam yang Bapak/Ibu alami. "
                "Kami menganggap laporan ini sangat serius. "
                "Agar kami dapat langsung melacak posisi paket dan menerbitkan tiket penanganan darurat detik ini juga, "
                "mohon tuliskan **Nomor Resi / Barcode kiriman Anda** (contoh: P2408290039578 atau POS123456789ID)."
            )

        # Kondisi 5: Sapaan atau pertanyaan awal
        else:
            action_taken = "GREETING_INQUIRY"
            reply = (
                "Halo, selamat datang di Layanan Pelanggan CS Virtual Pos Indonesia (Sahabat POS). "
                "Ada yang bisa kami bantu terkait kiriman paket Anda hari ini? "
                "Silakan sertakan nomor resi kiriman (misal: P2408290039578 atau POS...) dan kendala yang dialami."
            )

        # Simpan ke riwayat sesi
        session_state["history"].append({"role": "user", "content": text})
        session_state["history"].append({"role": "assistant", "content": reply})

        return VirtualCSChatResponse(
            session_id=session_id,
            reply=reply,
            sentiment=sentiment,
            extracted=extracted,
            action_taken=action_taken,
            ticket=ticket_info,
            ready_for_cs_handover=sentiment.urgency_level == "P1_KRITIS"
        )

