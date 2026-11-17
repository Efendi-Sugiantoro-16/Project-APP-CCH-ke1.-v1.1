package gagalxray

import (
	"errors"
	"strings"
	"time"
)

const TableVariable = "cch_kiriman_gagal_xray"
const KantorTableVariable = "cch_kantor"

const (
	DefaultPageSize = 25
	MaxPageSize     = 100
)

var (
	ErrNotFound               = errors.New("kiriman gagal xray not found")
	ErrAlreadyExists          = errors.New("kiriman gagal xray already exists with this composite key")
	ErrInvalidInput           = errors.New("invalid kiriman gagal xray input")
	ErrCompositeKeyRequired   = errors.New("kantor asal, kantor tujuan, id kiriman, and id kantong lama are required")
	ErrGagalXrayNotConfigured = errors.New("gagal xray service is not configured")
)

// KirimanGagalXray represents a package that failed airport X-ray inspection
type KirimanGagalXray struct {
	KantorAsal            string     `json:"kantor_asal"`
	NamaKantorAsal        string     `json:"nama_kantor_asal,omitempty"`
	KantorTujuan          string     `json:"kantor_tujuan"`
	NamaKantorTujuan      string     `json:"nama_kantor_tujuan,omitempty"`
	IDKiriman             string     `json:"id_kiriman"`
	IDKantongLama         string     `json:"id_kantong_lama"`
	IDKantongBaru         string     `json:"id_kantong_baru"`
	IsiKiriman            string     `json:"isi_kiriman"`
	Berat                 float64    `json:"berat"`
	Keterangan            string     `json:"keterangan"`
	KeteranganText        string     `json:"keterangan_text"`
	Tanggal               string     `json:"tanggal"` // YYYY-MM-DD
	KantorPenerbangan     string     `json:"kantor_penerbangan"`
	NamaKantorPenerbangan string     `json:"nama_kantor_penerbangan,omitempty"`
	FileBeritaAcara       string     `json:"file_berita_acara,omitempty"`
	TanggalTambah         *time.Time `json:"tanggal_tambah,omitempty"`
	DitambahOleh          string     `json:"ditambah_oleh,omitempty"`
	TanggalUbah           *time.Time `json:"tanggal_ubah,omitempty"`
	DiubahOleh            string     `json:"diubah_oleh,omitempty"`
}

// KeteranganLabel returns the human-readable description for Keterangan code
func KeteranganLabel(keterangan string) string {
	switch strings.TrimSpace(keterangan) {
	case "1":
		return "Diteruskan via Darat/Laut"
	case "2":
		return "Retour"
	case "3":
		return "Disita oleh Pihak Berwenang"
	case "4":
		return "Penerusan dengan Freighter"
	default:
		return keterangan
	}
}

// ListQuery represents filtering and pagination parameters
type ListQuery struct {
	Search            string `json:"search"`
	KantorAsal        string `json:"kantor_asal"`
	KantorTujuan      string `json:"kantor_tujuan"`
	KantorPenerbangan string `json:"kantor_penerbangan"`
	Keterangan        string `json:"keterangan"`
	StartDate         string `json:"start_date"`
	EndDate           string `json:"end_date"`
	Limit             int    `json:"limit"`
	Offset            int    `json:"offset"`
}

// Normalize validates and applies bounds to ListQuery
func (q ListQuery) Normalize() (ListQuery, error) {
	if q.Limit == 0 {
		q.Limit = DefaultPageSize
	}
	if q.Limit < 1 || q.Limit > MaxPageSize || q.Offset < 0 {
		return ListQuery{}, ErrInvalidInput
	}
	q.Search = strings.TrimSpace(q.Search)
	q.KantorAsal = strings.TrimSpace(q.KantorAsal)
	q.KantorTujuan = strings.TrimSpace(q.KantorTujuan)
	q.KantorPenerbangan = strings.TrimSpace(q.KantorPenerbangan)
	q.Keterangan = strings.TrimSpace(q.Keterangan)
	q.StartDate = strings.TrimSpace(q.StartDate)
	q.EndDate = strings.TrimSpace(q.EndDate)
	return q, nil
}

// Page represents paginated result
type Page struct {
	Items  []KirimanGagalXray `json:"items"`
	Total  int                `json:"total"`
	Limit  int                `json:"limit"`
	Offset int                `json:"offset"`
}

// Stats represents overall aggregated statistics
type Stats struct {
	TotalRecords   int `json:"total_records"`
	DaratLautCount int `json:"darat_laut_count"`
	RetourCount    int `json:"retour_count"`
	DisitaCount    int `json:"disita_count"`
	FreighterCount int `json:"freighter_count"`
}

// CreateCommand defines payload for creating a new record
type CreateCommand struct {
	KantorAsal        string  `json:"kantor_asal"`
	KantorTujuan      string  `json:"kantor_tujuan"`
	IDKiriman         string  `json:"id_kiriman"`
	IDKantongLama     string  `json:"id_kantong_lama"`
	IDKantongBaru     string  `json:"id_kantong_baru"`
	IsiKiriman        string  `json:"isi_kiriman"`
	Berat             float64 `json:"berat"`
	Keterangan        string  `json:"keterangan"`
	Tanggal           string  `json:"tanggal"`
	KantorPenerbangan string  `json:"kantor_penerbangan"`
	FileBeritaAcara   string  `json:"file_berita_acara"`
}

// Validate ensures all required keys and fields are present
func (c CreateCommand) Validate() error {
	if strings.TrimSpace(c.KantorAsal) == "" ||
		strings.TrimSpace(c.KantorTujuan) == "" ||
		strings.TrimSpace(c.IDKiriman) == "" ||
		strings.TrimSpace(c.IDKantongLama) == "" {
		return ErrCompositeKeyRequired
	}
	if strings.TrimSpace(c.Tanggal) == "" {
		return errors.New("tanggal is required")
	}
	return nil
}

// UpdateCommand defines payload for modifying an existing record
type UpdateCommand struct {
	IDKantongBaru     string  `json:"id_kantong_baru"`
	IsiKiriman        string  `json:"isi_kiriman"`
	Berat             float64 `json:"berat"`
	Keterangan        string  `json:"keterangan"`
	Tanggal           string  `json:"tanggal"`
	KantorPenerbangan string  `json:"kantor_penerbangan"`
	FileBeritaAcara   string  `json:"file_berita_acara"`
}

// Validate checks update command fields
func (u UpdateCommand) Validate() error {
	if strings.TrimSpace(u.Tanggal) == "" {
		return errors.New("tanggal is required")
	}
	return nil
}
