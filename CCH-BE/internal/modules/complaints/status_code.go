package complaints

import (
	"errors"
	"strings"
)

var (
	// ErrInvalidStatusFormat dikembalikan ketika kode status bukan tiga digit
	// numerik. Ini mempertahankan aturan lama `validStatusCode`.
	ErrInvalidStatusFormat = errors.New("complaint status code must be three digits")

	// ErrUnknownStatus dikembalikan ketika kode berformat sah tetapi berada di
	// luar katalog aktif `cch_jenis_penanganan`.
	ErrUnknownStatus = errors.New("unknown complaint status code")
)

// StatusCode adalah Value Object untuk kode status penanganan pengaduan CCH.
//
// # Katalog aktif
//
// Lima kode berikut aktif pada tabel referensi `cch_jenis_penanganan`
// (semuanya Aktif='Y'):
//
//	101 ENTRI       — tiket baru terbit, menunggu disposisi
//	102 RESPON      — kantor tujuan mengakui dan mulai menelusuri
//	103 KONFIRMASI  — butuh klarifikasi pelanggan / kantor transit
//	104 RESOLVED    — solusi fisik / ganti rugi disepakati
//	109 SELESAI     — kasus ditutup permanen (terminal, tidak bisa diubah)
//
// # Mengapa menerima tiga digit apa pun, bukan hanya lima kode di atas
//
// Validasi lama (`validStatusCode`) hanya menuntut tiga digit numerik, dan
// aturan transisi lama memiliki cabang `default` yang mengizinkan kode di luar
// 101..104 menuju 102/103/104/109. Data produksi memang memuat kode di luar
// katalog (105 sebanyak 2 tiket dan 106 sebanyak 4 tiket). Karena itu Value
// Object ini SENGAJA menerima kode tiga digit apa pun agar refactor tidak
// mengubah perilaku aplikasi terhadap tiket historis. Gunakan IsKnownStatus
// untuk membedakan kode katalog, dan IsValidStatusTransition untuk validasi
// transisi yang kompatibel dengan pemanggil lama.
//
// Tipe ini immutable: tidak ada method yang mengubah nilai setelah dibuat.
type StatusCode struct {
	code string
}

// Kode status katalog aktif sebagai nilai siap pakai.
var (
	StatusEntri      = StatusCode{code: "101"}
	StatusRespon     = StatusCode{code: "102"}
	StatusKonfirmasi = StatusCode{code: "103"}
	StatusResolved   = StatusCode{code: "104"}
	StatusSelesai    = StatusCode{code: "109"}
)

// StatusSelesaiCode adalah kode status terminal.
const StatusSelesaiCode = "109"

// knownStatusCodes adalah katalog aktif. Kode di luar daftar ini tetap sah
// sebagai format, tetapi dianggap di luar katalog (lihat IsKnownStatus).
var knownStatusCodes = []StatusCode{
	StatusEntri,
	StatusRespon,
	StatusKonfirmasi,
	StatusResolved,
	StatusSelesai,
}

// NewStatusCode membuat StatusCode dari string mentah. Hanya format tiga digit
// numerik yang diterima; sisanya ditolak dengan ErrInvalidStatusFormat.
func NewStatusCode(raw string) (StatusCode, error) {
	trimmed := strings.TrimSpace(raw)
	if !isThreeDigitNumeric(trimmed) {
		return StatusCode{}, ErrInvalidStatusFormat
	}
	return StatusCode{code: trimmed}, nil
}

// MustStatusCode membuat StatusCode dari literal yang sudah pasti sah.
// Gunakan hanya untuk literal di kode program, jangan untuk input pengguna.
func MustStatusCode(raw string) StatusCode {
	code, err := NewStatusCode(raw)
	if err != nil {
		panic("complaints: MustStatusCode dipanggil dengan kode tidak sah: " + raw)
	}
	return code
}

// String mengembalikan kode status mentah untuk penyimpanan atau respons API.
func (code StatusCode) String() string {
	return code.code
}

// IsZero melaporkan apakah StatusCode belum diisi.
func (code StatusCode) IsZero() bool {
	return code.code == ""
}

// IsKnownStatus melaporkan apakah kode termasuk katalog aktif
// 101/102/103/104/109. Kode historis di luar katalog (mis. 105, 106)
// mengembalikan false.
func (code StatusCode) IsKnownStatus() bool {
	for _, known := range knownStatusCodes {
		if known.code == code.code {
			return true
		}
	}
	return false
}

// IsTerminal melaporkan apakah status mengunci tiket secara permanen.
// Hanya 109 SELESAI yang bersifat terminal.
func (code StatusCode) IsTerminal() bool {
	return code.code == StatusSelesaiCode
}

// KnownStatusCodes mengembalikan salinan katalog kode status aktif.
func KnownStatusCodes() []StatusCode {
	copied := make([]StatusCode, len(knownStatusCodes))
	copy(copied, knownStatusCodes)
	return copied
}

// CanTransitionTo melaporkan apakah perpindahan dari status ini ke `target` sah.
//
// Ini adalah satu-satunya sumber kebenaran transisi status dan menggantikan
// fungsi bebas IsValidStatusTransition. Perilaku yang dijaga persis seperti
// aturan lama:
//
//   - status yang sama tidak dapat ditransisikan ke dirinya sendiri,
//   - status 109 tidak memiliki transisi keluar,
//   - 101 hanya dapat menuju 102, 103, atau 109,
//   - 102 hanya dapat menuju 103, 104, atau 109,
//   - 103 hanya dapat menuju 102, 104, atau 109,
//   - 104 hanya dapat menuju 103 atau 109,
//   - kode berformat sah di luar 101..104 (termasuk 105 dan 106 yang ada di
//     data produksi) dapat menuju 102, 103, 104, atau 109. Cabang ini
//     mempertahankan perilaku `default` aturan lama agar tiket historis tetap
//     dapat ditangani.
func (code StatusCode) CanTransitionTo(target StatusCode) bool {
	if code.code == "" || target.code == "" {
		return false
	}
	if code.code == target.code || code.IsTerminal() {
		return false
	}
	switch code.code {
	case "101":
		return target.code == "102" || target.code == "103" || target.code == "109"
	case "102":
		return target.code == "103" || target.code == "104" || target.code == "109"
	case "103":
		return target.code == "102" || target.code == "104" || target.code == "109"
	case "104":
		return target.code == "103" || target.code == "109"
	default:
		return target.code == "102" || target.code == "103" || target.code == "104" || target.code == "109"
	}
}

// IsValidStatusTransition dipertahankan untuk kompatibilitas pemanggil lama
// (mis. pemindaian baris SQL). Deklarasi baru sebaiknya memakai
// StatusCode.CanTransitionTo.
func IsValidStatusTransition(expected, target string) bool {
	expectedCode, err := NewStatusCode(expected)
	if err != nil {
		return false
	}
	targetCode, err := NewStatusCode(target)
	if err != nil {
		return false
	}
	return expectedCode.CanTransitionTo(targetCode)
}

// isThreeDigitNumeric melaporkan apakah nilai terdiri tepat dari tiga digit.
func isThreeDigitNumeric(value string) bool {
	if len(value) != 3 {
		return false
	}
	for _, character := range value {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}
