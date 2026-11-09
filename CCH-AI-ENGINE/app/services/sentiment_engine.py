import re
from typing import List, Tuple
from app.domain.models import SentimentResult

# Lexical dictionaries tailored for Indonesian postal & complaint context
EMERGENCY_KEYWORDS = [
    "obat", "vaksin", "resep dokter", "rumah sakit", "darurat", "urgent",
    "ijazah", "paspor", "visa", "surat tanah", "dokumen penting", "kontrak kerja",
    "berkas sidang", "akta", "sidang", "lamaran kerja", "menyangkut nyawa",
    "sekarang juga", "hari ini juga"
]

ANGER_ESCALATION_KEYWORDS = [
    "lapor polisi", "viral", "viralkan", "somasi", "tuntut", "jalur hukum",
    "ganti rugi", "penipu", "maling", "brengsek", "kurang ajar", "bobrok",
    "kapok", "kecewa berat", "kacau", "bego", "tolol", "gila", "bikin emosi",
    "masuk tv", "lapor ylki", "kembalikan uang", "minta ganti", "rusak total"
]

FRUSTRATION_KEYWORDS = [
    "kecewa", "parah", "lama banget", "lelet", "nyangkut", "tertahan",
    "berhari-hari", "seminggu", "sebulan", "gak jelas", "hilang", "lenyap",
    "rusak", "pecah", "basah", "hancur", "terbuka", "salah alamat", "salah antar",
    "kurir gak datang", "bohong", "katanya hari ini", "nunggu seharian"
]

POLITE_POSITIVE_KEYWORDS = [
    "terima kasih", "makasih", "mohon bantuannya", "tolong", "bisa dibantu",
    "selamat pagi", "selamat siang", "selamat sore", "selamat malam", "permisi",
    "halo", "hai", "baik", "siap", "alhamdulillah", "bagus"
]


class SentimentEngine:
    """
    Mesin Analisis Sentimen & Emosi Bahasa Indonesia (Pos Indonesia Domain).
    Mendeteksi tingkat frustrasi, kata kunci bahaya/darurat, serta menentukan
    urgensi penanganan tiket SLA (P1 Kritis, P2 Tinggi, P3 Normal).
    """

    @staticmethod
    def analyze(text: str) -> SentimentResult:
        if not text or not text.strip():
            return SentimentResult(
                sentiment="netral",
                score=0.0,
                urgency_level="P3_NORMAL",
                is_emergency=False,
                detected_emotions=["netral"],
                recommended_tone="ramah_profesional",
                rationale="Teks kosong atau belum ada pesan."
            )

        lower_text = text.lower()

        # 1. Deteksi Emergency & Ancaman Eskalasi
        found_emergency = [kw for kw in EMERGENCY_KEYWORDS if kw in lower_text]
        found_anger = [kw for kw in ANGER_ESCALATION_KEYWORDS if kw in lower_text]
        found_frustration = [kw for kw in FRUSTRATION_KEYWORDS if kw in lower_text]
        found_polite = [kw for kw in POLITE_POSITIVE_KEYWORDS if kw in lower_text]

        # Hitung skor bobot
        score = 0.0
        score -= len(found_anger) * 0.35
        score -= len(found_frustration) * 0.18
        score += len(found_polite) * 0.15

        # Deteksi tanda seru beruntun dan HURUF KAPITAL (SHOUTING)
        exclamation_count = text.count("!")
        # Hanya hitung kata teriak jika murni huruf tanpa angka dan bukan singkatan pos standar
        ignored_caps = {"POS", "RESI", "PAKET", "KANTOR", "KIRIMAN", "STATUS", "ID", "SLA", "CCH", "UPT", "BANDUNG", "JAKARTA", "MEDAN", "SURABAYA", "SEMARANG", "MAKASSAR"}
        words = text.split()
        shouting_words = [
            w for w in words 
            if len(w) > 3 and w.isupper() and w.isalpha() and w not in ignored_caps
        ]
        
        has_shouting = exclamation_count >= 2 and len(shouting_words) >= 2
        if has_shouting:
            score -= 0.25
            if found_anger:
                found_anger.append("nada_berteriak_kapital")

        # Pastikan skor tetap dalam batas -1.0 s.d 1.0
        score = max(-1.0, min(1.0, score))

        # Emosi terkumpul
        emotions: List[str] = []
        if found_anger:
            emotions.append("sangat_marah")
            emotions.append("ancaman_eskalasi")
        if found_frustration:
            emotions.append("frustrasi_kekecewaan")
        if found_emergency:
            emotions.append("kecemasan_darurat")
        if found_polite and not found_anger:
            emotions.append("kooperatif_sopan")
        if not emotions:
            emotions.append("netral_bertanya")

        # Klasifikasi Sentimen & Urgensi
        is_emergency = len(found_emergency) > 0 or any(k in found_anger for k in ["lapor polisi", "viral", "somasi", "jalur hukum", "penipu", "tuntut"])

        if len(found_anger) >= 1 or len(found_emergency) >= 1:
            sentiment_label = "sangat_marah" if len(found_anger) > 0 else "kecewa"
            urgency = "P1_KRITIS"
            recommended_tone = (
                "DE-ESKALASI DARURAT: Buka dengan permohonan maaf mendalam atas nama Pos Indonesia, "
                "akui kekecewaan pelanggan secara tulus, jangan membela diri, dan berikan jaminan "
                "bahwa pengaduan ini diprioritaskan langsung ke investigasi pimpinan pos."
            )
            rationale = f"Terdeteksi kata kunci kemarahan/ancaman ({', '.join(found_anger[:3])}) atau darurat ({', '.join(found_emergency[:3])}). Prioritas dinaikkan ke P1 Kritis."
        elif len(found_frustration) >= 1 or score <= -0.15:
            sentiment_label = "kecewa"
            urgency = "P2_TINGGI"
            recommended_tone = (
                "EMPATI & SOLUTIF: Bersikap tenang, tunjukkan empati bahwa waktu pelanggan berharga, "
                "dan tawarkan solusi langkah konkret penelusuran kiriman."
            )
            rationale = f"Pelanggan mengeluhkan keterlambatan/kendala kiriman ({', '.join(found_frustration[:3])}). Skor negatif ({score:.2f})."
        elif score > 0.2:
            sentiment_label = "positif"
            urgency = "P3_NORMAL"
            recommended_tone = "RAMAH & INFORMATIF: Balas dengan ceria, penuh rasa hormat, dan ucapkan terima kasih telah mempercayai Pos Indonesia."
            rationale = "Pelanggan berkomunikasi dengan sopan dan kooperatif."
        else:
            sentiment_label = "netral"
            urgency = "P3_NORMAL"
            recommended_tone = "PROFESIONAL & CEKATAN: Jelaskan prosedur dengan lugas, ringkas, dan jelas."
            rationale = "Pesan informatif netral tanpa tanda emosi berlebih."

        return SentimentResult(
            sentiment=sentiment_label,
            score=round(score, 2),
            urgency_level=urgency,
            is_emergency=is_emergency,
            detected_emotions=emotions,
            recommended_tone=recommended_tone,
            rationale=rationale
        )
