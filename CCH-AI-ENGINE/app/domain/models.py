from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class SentimentResult(BaseModel):
    sentiment: Literal["sangat_marah", "kecewa", "netral", "positif"] = "netral"
    score: float = Field(default=0.0, ge=-1.0, le=1.0, description="Skor polaritas dari -1.0 (sangat negatif) sampai 1.0 (sangat positif)")
    urgency_level: Literal["P1_KRITIS", "P2_TINGGI", "P3_NORMAL"] = "P3_NORMAL"
    is_emergency: bool = Field(default=False, description="True jika berkaitan dengan obat, dokumen penting, atau ancaman lapor polisi/viral")
    detected_emotions: List[str] = Field(default_factory=list, description="Daftar emosi yang terdeteksi: marah, frustrasi, cemas, bingung, puas")
    recommended_tone: str = Field(default="ramah_profesional", description="Rekomendasi gaya bicara de-eskalasi untuk Virtual CS")
    rationale: str = Field(default="", description="Penjelasan singkat mengapa sentimen/urgensi ini dinilai")


class ExtractedComplaint(BaseModel):
    shipment_number: Optional[str] = Field(default=None, description="Nomor resi pos (contoh: P2408290039578, POS123456789ID, EE123456789ID)")
    customer_name: Optional[str] = Field(default=None, description="Nama pelanggan")
    customer_phone: Optional[str] = Field(default=None, description="Nomor WhatsApp/HP pelanggan")
    customer_email: Optional[str] = Field(default=None, description="Alamat email")
    customer_address: Optional[str] = Field(default=None, description="Alamat pelanggan")
    complaint_type_code: Optional[int] = Field(default=None, description="Kode kategori aduan CCH (1..43)")
    complaint_type_name: Optional[str] = Field(default=None, description="Deskripsi kategori aduan CCH")
    shipping_service_code: Optional[str] = Field(default="000", description="Kode layanan pos (Pos Kilat Khusus, Express, dll)")
    source_office_hint: Optional[str] = Field(default=None, description="Perkiraan kantor pos asal")
    destination_office_hint: Optional[str] = Field(default=None, description="Perkiraan kantor pos tujuan")
    summary: str = Field(default="", description="Ringkasan inti keluhan pelanggan")
    description: str = Field(default="", description="Uraian detail keluhan")
    is_complete_for_ticket: bool = Field(default=False, description="Apakah data sudah cukup lengkap untuk langsung terbit tiket")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[str] = None


class VirtualCSChatRequest(BaseModel):
    session_id: Optional[str] = Field(default=None, description="ID sesi obrolan (jika kosong akan dibuatkan baru)")
    message: str = Field(..., description="Pesan atau keluhan dari pelanggan")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Riwayat obrolan sebelumnya")
    customer_name: Optional[str] = Field(default=None, description="Nama pelanggan (jika sudah diketahui)")
    customer_phone: Optional[str] = Field(default=None, description="Nomor telepon (jika sudah diketahui)")


class TicketInfo(BaseModel):
    ticket_id: str
    status_code: str = "101"
    status_name: str = "ENTRI (Tiket Resmi Terbit)"
    created_at: str
    target_office_code: Optional[str] = None
    target_office_name: Optional[str] = None
    sla_hours: int = 48
    priority: str = "NORMAL"


class VirtualCSChatResponse(BaseModel):
    session_id: str
    reply: str
    sentiment: SentimentResult
    extracted: ExtractedComplaint
    action_taken: str = Field(default="CONVERSING", description="Aksi yang dieksekusi: GREETING, TRACKING_CHECKED, TICKET_CREATED, ESCALATED, COLLECTING_INFO")
    ticket: Optional[TicketInfo] = None
    ready_for_cs_handover: bool = False


class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="Teks pesan atau keluhan yang akan dianalisis")


class AnalyzeResponse(BaseModel):
    sentiment: SentimentResult
    extracted: ExtractedComplaint


# ----------------------------------------------------
# Model Data Omnichannel Social Media & Telegram Intake
# ----------------------------------------------------

SocialPlatformType = Literal["facebook", "instagram", "threads", "telegram", "whatsapp"]


class SocialPostItem(BaseModel):
    id: str
    platform: SocialPlatformType
    author_name: str
    author_handle: str
    author_avatar: Optional[str] = None
    content: str
    permalink: Optional[str] = None
    timestamp: str
    media_url: Optional[str] = None
    shipment_number: Optional[str] = None
    sentiment: SentimentResult
    urgency_level: str = "P3_NORMAL"
    is_spam: bool = False
    ticket_id: Optional[str] = None
    ticket_status: Optional[str] = None
    de_escalation_reply: Optional[str] = None


class SocialIngestRequest(BaseModel):
    platform: SocialPlatformType
    author_name: str
    author_handle: str
    content: str
    permalink: Optional[str] = None
    author_phone: Optional[str] = None
    author_email: Optional[str] = None
    auto_create_ticket: bool = True


class SocialIngestResponse(BaseModel):
    success: bool
    is_spam: bool
    platform: SocialPlatformType
    sentiment: SentimentResult
    extracted: ExtractedComplaint
    ticket: Optional[TicketInfo] = None
    de_escalation_reply: str
    audit_message: str


class SocialFeedResponse(BaseModel):
    total: int
    items: List[SocialPostItem]
    platform_counts: Dict[str, int]
    urgency_counts: Dict[str, int]


# ----------------------------------------------------
# Model Data CS Virtual AI Copilot
# ----------------------------------------------------

class CopilotClassifyRequest(BaseModel):
    text: str = Field(..., description="Teks narasi atau pesan keluhan pelanggan mentah")


class CopilotClassifyResponse(BaseModel):
    shipment_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    complaint_type_code: Optional[int] = None
    complaint_type_name: Optional[str] = None
    shipping_service_code: Optional[str] = "000"
    origin_office_hint: Optional[str] = None
    destination_office_hint: Optional[str] = None
    summary: str = ""
    urgency_level: str = "P3_NORMAL"
    is_emergency: bool = False
    sentiment: SentimentResult
    rationale: str = ""


class CopilotSuggestionRequest(BaseModel):
    complaint_id: Optional[str] = None
    shipment_number: Optional[str] = None
    customer_name: Optional[str] = None
    summary: Optional[str] = ""
    description: Optional[str] = ""
    current_status: Optional[str] = "101"
    target_status: Optional[str] = "102"
    office_name: Optional[str] = "Kantor Pos"


class CopilotSuggestionResponse(BaseModel):
    suggested_response: str
    internal_notes: str
    urgency_assessment: str
    de_escalation_tip: str
    recommended_action: str



