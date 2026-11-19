import logging
from typing import Optional, Dict, Any
from app.domain.models import (
    CopilotClassifyResponse,
    CopilotSuggestionRequest,
    CopilotSuggestionResponse,
    SentimentResult,
    ExtractedComplaint
)
from app.services.sentiment_engine import SentimentEngine
from app.services.pos_extractor import PosExtractor
from app.core.prompts import CS_COPILOT_SUGGESTION_PROMPT, CS_CLASSIFIER_PROMPT

logger = logging.getLogger("cch_ai_engine.copilot")


class CopilotService:
    """
    Layanan CS Virtual AI Copilot untuk Petugas Pos Indonesia.
    Menyediakan:
    1. Auto-Klasifikasi Cerdas & Ekstraksi Entitas dari Teks Mentah (Triase Cepat).
    2. Generator Rekomendasi Draf Tanggapan Resmi & Catatan Mutasi Tiket (De-eskalasi).
    """

    @classmethod
    def classify(cls, text: str) -> CopilotClassifyResponse:
        sentiment: SentimentResult = SentimentEngine.analyze(text)
        extracted: ExtractedComplaint = PosExtractor.extract_all(text)

        # Rationale builder
        urgency_note = (
            "Terdeteksi kata kunci darurat (obat/dokumen/ancaman)"
            if sentiment.is_emergency
            else f"Tingkat urgensi {sentiment.urgency_level} berdasarkan analisis sentimen ({sentiment.sentiment})."
        )
        rationale = f"{sentiment.rationale} {urgency_note}".strip()

        return CopilotClassifyResponse(
            shipment_number=extracted.shipment_number,
            customer_name=extracted.customer_name if extracted.customer_name != "Pelanggan POS" else None,
            customer_phone=extracted.customer_phone if extracted.customer_phone != "-" else None,
            complaint_type_code=extracted.complaint_type_code,
            complaint_type_name=extracted.complaint_type_name,
            shipping_service_code=extracted.shipping_service_code,
            origin_office_hint=extracted.source_office_hint,
            destination_office_hint=extracted.destination_office_hint,
            summary=extracted.summary,
            urgency_level=sentiment.urgency_level,
            is_emergency=sentiment.is_emergency,
            sentiment=sentiment,
            rationale=rationale
        )

    @classmethod
    def generate_response_suggestion(cls, req: CopilotSuggestionRequest) -> CopilotSuggestionResponse:
        target_status = str(req.target_status or "102").strip()
        shipment = req.shipment_number or "kiriman terkait"
        cust_name = req.customer_name or "Bapak/Ibu"
        office = req.office_name or "Kantor Pos Cabang"
        summary = req.summary or "keluhan kiriman"

        # Tentukan nada bicara & de-eskalasi berdasarkan target status
        if target_status == "102":  # RESPON / TERIMA
            suggested_response = (
                f"Yth. {cust_name}, pengaduan Anda mengenai {summary} (Resi: {shipment}) telah diterima "
                f"dan teregistrasi secara resmi oleh tim penanganan {office}. "
                f"Saat ini investigasi fisik terhadap manifest antaran dan posisi kantong pos sedang berlangsung. "
                f"Kami berkomitmen memberikan pembaruan status dalam waktu maksimal 24 jam kerja."
            )
            internal_notes = (
                f"1. Lakukan pengecekan fisik manifest kantong masuk di bagian pengolahan/antaran {office}.\n"
                f"2. Hubungi kurir/petugas antaran yang bertugas pada wilayah alamat penerima.\n"
                f"3. Pastikan update status ke 103 atau 104 sebelum batas SLA terlampaui."
            )
            urgency_assessment = "P2_TINGGI"
            de_escalation_tip = "Tunjukkan respon cepat untuk menenangkan kecemasan awal pelanggan."
            recommended_action = "Mulai pelacakan manifest di SPP/Kantor Cabang."

        elif target_status == "103":  # KONFIRMASI / INVESTIGASI
            suggested_response = (
                f"Yth. {cust_name}, menindaklanjuti investigasi untuk nomor resi {shipment}, "
                f"kami sedang melakukan verifikasi silang terhadap fisik kiriman di titik transit. "
                f"Petugas kami memerlukan konfirmasi lanjutan terkait kesesuaian alamat atau kondisi paket saat diterima."
            )
            internal_notes = (
                f"1. Konfirmasi ke kantor asal mengenai kesesuaian data pengirim dan dokumen pendukung (BAP/Adpis).\n"
                f"2. Periksa apakah kiriman terindikasi tertahan pemeriksaan keamanan X-Ray bandara.\n"
                f"3. Jika ada kendala fisik, siapkan dokumentasi foto untuk lampiran cchentridok."
            )
            urgency_assessment = "P2_TINGGI"
            de_escalation_tip = "Jelaskan proses secara transparan agar pelanggan memahami tahapan investigasi."
            recommended_action = "Koordinasi dengan UPT asal/transit dan konfirmasi ke kurir antaran."

        elif target_status == "104":  # RESOLVED / TANGGAPAN
            suggested_response = (
                f"Yth. {cust_name}, investigasi atas kiriman dengan nomor resi {shipment} telah selesai dilaksanakan. "
                f"Kiriman telah berhasil ditindaklanjuti dan diserahkan kepada pihak yang berhak / dialihkan melalui rute yang aman. "
                f"PT Pos Indonesia (Persero) memohon maaf yang sebesar-besarnya atas ketidaknyamanan yang sempat terjadi."
            )
            internal_notes = (
                f"1. Verifikasi bukti serah terima (POD - Proof of Delivery) atau berita acara penyelesaian.\n"
                f"2. Konfirmasi penerimaan yang memuaskan dengan pihak pengadu sebelum tiket ditutup permanen."
            )
            urgency_assessment = "P3_NORMAL"
            de_escalation_tip = "Sampaikan permohonan maaf tulus dan apresiasi atas kesabaran pelanggan."
            recommended_action = "Pastikan penerima mengonfirmasi penyelesaian sebelum status diubah ke 109."

        elif target_status == "109":  # SELESAI / TUTUP
            suggested_response = (
                f"Yth. {cust_name}, pengaduan terkait {summary} (Resi: {shipment}) telah selesai ditangani secara tuntas. "
                f"Terima kasih atas kepercayaan Anda menggunakan layanan Pos Indonesia. "
                f"Tiket resmi ini kini kami tutup dengan status SELESAI. Senang dapat melayani Anda."
            )
            internal_notes = (
                f"1. Tiket ditutup permanen. Seluruh mutasi riwayat tersimpan pada cchentrimas.\n"
                f"2. Kasus memenuhi SLA penyelesaian Pos Indonesia."
            )
            urgency_assessment = "P3_NORMAL"
            de_escalation_tip = "Tutup percakapan dengan nada hangat dan ramah."
            recommended_action = "Penutupan permanen tiket selesai."

        else:
            suggested_response = (
                f"Pengaduan nomor resi {shipment} telah diperbarui ke status {target_status} oleh {office}. "
                f"Tindak lanjut investigasi lapangan terus dipantau sistem CCH Pos Indonesia."
            )
            internal_notes = f"Update status operasional tiket ke kode {target_status}."
            urgency_assessment = "P3_NORMAL"
            de_escalation_tip = "Gunakan bahasa formal dan lugas."
            recommended_action = "Pantau perkembangan investigasi."

        return CopilotSuggestionResponse(
            suggested_response=suggested_response,
            internal_notes=internal_notes,
            urgency_assessment=urgency_assessment,
            de_escalation_tip=de_escalation_tip,
            recommended_action=recommended_action
        )

