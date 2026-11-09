import re
from typing import Optional, Tuple
from app.domain.models import ExtractedComplaint

# Known POSIND tracking patterns
RESI_PATTERNS = [
    r"\b(P\d{11,13})\b",             # P2408290039578
    r"\b(POS\w{8,15})\b",            # POS123456789ID
    r"\b([A-Z]{2}\d{9}[A-Z]{2})\b",  # EE123456789ID (EMS), CP123456789ID
    r"\b(PID\w{8,14})\b",            # Kantong PID055412527
    r"\b(\d{11,16})\b",              # Resi angka murni 11-16 digit
]

PHONE_PATTERN = r"\b(08\d{8,12}|628\d{8,12}|\+62\s?8\d{8,12})\b"
EMAIL_PATTERN = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"

# Major City / Kantor Pos Routing Mapping
OFFICE_MAP = {
    "bandung": ("40000", "BANDUNG"),
    "pusat": ("40005", "KANTOR PUSAT BANDUNG"),
    "kantor pusat": ("40005", "KANTOR PUSAT BANDUNG"),
    "surabaya": ("60000", "SURABAYA"),
    "jakarta": ("10000", "JAKARTA PUSAT"),
    "bandara": ("19430", "JAKARTASOEKARNO-HATTA"),
    "soekarno": ("19430", "JAKARTASOEKARNO-HATTA"),
    "cengkareng": ("19430", "JAKARTASOEKARNO-HATTA"),
    "kediri": ("64100", "KEDIRI"),
    "medan": ("20000", "MEDAN"),
    "semarang": ("50000", "SEMARANG"),
    "makassar": ("90000", "MAKASSAR"),
    "denpasar": ("80000", "DENPASAR"),
    "bali": ("80000", "DENPASAR"),
    "jogja": ("55000", "YOGYAKARTA"),
    "yogyakarta": ("55000", "YOGYAKARTA"),
    "malang": ("65100", "MALANG"),
    "banyuwangi": ("68400", "BANYUWANGI"),
    "kebumen": ("54300", "KEBUMEN"),
    "batu": ("65300", "BATU"),
}


class PosExtractor:
    """
    Ekstraktor NLU Entitas Pos Indonesia.
    Mendeteksi nomor resi pos, kontak pelanggan, kantor asal/tujuan,
    serta mengklasifikasikan ke 43 jenis masalah aduan CCH.
    """

    @staticmethod
    def extract_shipment_number(text: str) -> Optional[str]:
        if not text:
            return None
        upper_text = text.upper()
        for pat in RESI_PATTERNS:
            match = re.search(pat, upper_text)
            if match:
                return match.group(1).strip()
        return None

    @staticmethod
    def extract_phone(text: str) -> Optional[str]:
        if not text:
            return None
        match = re.search(PHONE_PATTERN, text)
        if match:
            raw = match.group(1).replace(" ", "").replace("-", "")
            if raw.startswith("+62"):
                return "0" + raw[3:]
            elif raw.startswith("62"):
                return "0" + raw[2:]
            return raw
        return None

    @staticmethod
    def extract_email(text: str) -> Optional[str]:
        if not text:
            return None
        match = re.search(EMAIL_PATTERN, text)
        if match:
            return match.group(0).lower().strip()
        return None

    @staticmethod
    def classify_complaint_type(text: str) -> Tuple[int, str]:
        """
        Klasifikasi teks aduan ke daftar 43 Jenis Pengaduan CCH Pos Indonesia.
        """
        lower = text.lower() if text else ""

        if any(w in lower for w in ["x-ray", "xray", "bandara", "baterai", "aerosol", "cairan", "ditolak bandara", "gagal terbang"]):
            return 12, "Kiriman Gagal X-Ray Bandara"
        elif any(w in lower for w in ["rusak", "pecah", "bocor", "hancur", "basah", "penyok", "terbuka", "sobek"]):
            return 2, "Kerusakan Kiriman / Isi Kiriman Rusak"
        elif any(w in lower for w in ["hilang", "lenyap", "tidak sampai", "tidak kunjung tiba", "raib", "belum terima"]):
            return 3, "Kehilangan Kiriman / Kiriman Tidak Sampai"
        elif any(w in lower for w in ["salah alamat", "salah antar", "salah orang", "diterima orang lain", "salah rumah"]):
            return 4, "Kiriman Salah Antar / Salah Alamat"
        elif any(w in lower for w in ["sikap", "petugas", "kasar", "cuek", "kurir judes", "pelayanan buruk"]):
            return 13, "Keluhan Sikap Petugas / Layanan"
        elif any(w in lower for w in ["lama", "telat", "keterlambatan", "lelet", "stagnan", "mandek", "nyangkut", "berhari-hari", "lewat estimasi"]):
            return 1, "Keterlambatan Kiriman (Melebihi Standar Waktu Penyerahan)"
        else:
            return 43, "Lain-Lain (Permintaan Informasi / Tracking Khusus)"

    @staticmethod
    def detect_office_hints(text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Mendeteksi kantor pos asal atau tujuan dari nama kota.
        """
        if not text:
            return None, None
        lower = text.lower()
        found_offices = []
        for city, (code, name) in OFFICE_MAP.items():
            if city in lower:
                found_offices.append((code, name))

        source = None
        target = None
        if len(found_offices) == 1:
            target = f"{found_offices[0][0]} - {found_offices[0][1]}"
        elif len(found_offices) >= 2:
            source = f"{found_offices[0][0]} - {found_offices[0][1]}"
            target = f"{found_offices[1][0]} - {found_offices[1][1]}"

        return source, target

    @classmethod
    def extract_all(cls, text: str, customer_name: Optional[str] = None, customer_phone: Optional[str] = None) -> ExtractedComplaint:
        shipment = cls.extract_shipment_number(text)
        phone = customer_phone or cls.extract_phone(text)
        email = cls.extract_email(text)
        type_code, type_name = cls.classify_complaint_type(text)
        source_hint, dest_hint = cls.detect_office_hints(text)

        # Cek kelengkapan tiket
        is_complete = bool(shipment and (phone or customer_name or len(text.strip()) > 15))

        # Ringkasan otomatis
        summary = text[:120].strip() + ("..." if len(text) > 120 else "")

        return ExtractedComplaint(
            shipment_number=shipment,
            customer_name=customer_name or "Pelanggan POS",
            customer_phone=phone or "-",
            customer_email=email,
            complaint_type_code=type_code,
            complaint_type_name=type_name,
            shipping_service_code="000",
            source_office_hint=source_hint or "40005 - KANTOR PUSAT BANDUNG",
            destination_office_hint=dest_hint or "64100 - KEDIRI",
            summary=summary,
            description=text,
            is_complete_for_ticket=is_complete
        )

