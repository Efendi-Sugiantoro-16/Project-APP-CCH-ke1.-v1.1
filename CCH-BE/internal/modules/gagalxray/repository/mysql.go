package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"cch.local/backend/internal/modules/gagalxray"
)

var ErrRepositoryNotConfigured = errors.New("gagal xray repository is not configured")

type MySQLRepository struct {
	db *sql.DB
}

func NewMySQLRepository(database *sql.DB) *MySQLRepository {
	return &MySQLRepository{db: database}
}

func (r *MySQLRepository) List(ctx context.Context, query gagalxray.ListQuery) (gagalxray.Page, error) {
	if r == nil || r.db == nil {
		return gagalxray.Page{}, ErrRepositoryNotConfigured
	}

	normQuery, err := query.Normalize()
	if err != nil {
		return gagalxray.Page{}, err
	}

	var whereClauses []string
	var args []any

	if normQuery.Search != "" {
		whereClauses = append(whereClauses, "(g.ID_Kiriman LIKE ? OR g.ID_Kantong_Lama LIKE ? OR g.ID_Kantong_Baru LIKE ? OR g.Isi_Kiriman LIKE ?)")
		pattern := "%" + normQuery.Search + "%"
		args = append(args, pattern, pattern, pattern, pattern)
	}

	if normQuery.KantorAsal != "" {
		whereClauses = append(whereClauses, "g.Kantor_Asal = ?")
		args = append(args, normQuery.KantorAsal)
	}

	if normQuery.KantorTujuan != "" {
		whereClauses = append(whereClauses, "g.Kantor_Tujuan = ?")
		args = append(args, normQuery.KantorTujuan)
	}

	if normQuery.KantorPenerbangan != "" {
		whereClauses = append(whereClauses, "g.Kantor_Penerbangan = ?")
		args = append(args, normQuery.KantorPenerbangan)
	}

	if normQuery.Keterangan != "" {
		whereClauses = append(whereClauses, "g.Keterangan = ?")
		args = append(args, normQuery.Keterangan)
	}

	if normQuery.StartDate != "" {
		whereClauses = append(whereClauses, "g.Tanggal >= ?")
		args = append(args, normQuery.StartDate)
	}

	if normQuery.EndDate != "" {
		whereClauses = append(whereClauses, "g.Tanggal <= ?")
		args = append(args, normQuery.EndDate)
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM cch_kiriman_gagal_xray g" + whereSQL
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return gagalxray.Page{}, fmt.Errorf("count gagal xray: %w", err)
	}

	dataQuery := `
		SELECT 
			g.Kantor_Asal,
			COALESCE(k_asal.Nama_Kantor, ''),
			g.Kantor_Tujuan,
			COALESCE(k_tujuan.Nama_Kantor, ''),
			g.ID_Kiriman,
			g.ID_Kantong_Lama,
			COALESCE(g.ID_Kantong_Baru, ''),
			COALESCE(g.Isi_Kiriman, ''),
			COALESCE(g.Berat, 0),
			COALESCE(g.Keterangan, ''),
			COALESCE(DATE_FORMAT(g.Tanggal, '%Y-%m-%d'), ''),
			COALESCE(g.Kantor_Penerbangan, ''),
			COALESCE(k_penerbangan.Nama_Kantor, ''),
			COALESCE(g.File_Berita_Acara, ''),
			g.Tanggal_Tambah,
			COALESCE(g.Ditambah_Oleh, ''),
			g.Tanggal_Ubah,
			COALESCE(g.Diubah_Oleh, '')
		FROM cch_kiriman_gagal_xray g
		LEFT JOIN cch_kantor k_asal ON g.Kantor_Asal = k_asal.Kode_Kantor
		LEFT JOIN cch_kantor k_tujuan ON g.Kantor_Tujuan = k_tujuan.Kode_Kantor
		LEFT JOIN cch_kantor k_penerbangan ON g.Kantor_Penerbangan = k_penerbangan.Kode_Kantor` +
		whereSQL +
		" ORDER BY g.Tanggal DESC, g.Tanggal_Tambah DESC LIMIT ? OFFSET ?"

	argsWithPaging := append(args, normQuery.Limit, normQuery.Offset)
	rows, err := r.db.QueryContext(ctx, dataQuery, argsWithPaging...)
	if err != nil {
		return gagalxray.Page{}, fmt.Errorf("query gagal xray: %w", err)
	}
	defer rows.Close()

	items := make([]gagalxray.KirimanGagalXray, 0, normQuery.Limit)
	for rows.Next() {
		var item gagalxray.KirimanGagalXray
		var tTambah, tUbah sql.NullTime
		if err := rows.Scan(
			&item.KantorAsal,
			&item.NamaKantorAsal,
			&item.KantorTujuan,
			&item.NamaKantorTujuan,
			&item.IDKiriman,
			&item.IDKantongLama,
			&item.IDKantongBaru,
			&item.IsiKiriman,
			&item.Berat,
			&item.Keterangan,
			&item.Tanggal,
			&item.KantorPenerbangan,
			&item.NamaKantorPenerbangan,
			&item.FileBeritaAcara,
			&tTambah,
			&item.DitambahOleh,
			&tUbah,
			&item.DiubahOleh,
		); err != nil {
			return gagalxray.Page{}, fmt.Errorf("scan gagal xray: %w", err)
		}
		if tTambah.Valid {
			item.TanggalTambah = &tTambah.Time
		}
		if tUbah.Valid {
			item.TanggalUbah = &tUbah.Time
		}
		item.KeteranganText = gagalxray.KeteranganLabel(item.Keterangan)
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return gagalxray.Page{}, fmt.Errorf("iterate gagal xray rows: %w", err)
	}

	return gagalxray.Page{
		Items:  items,
		Total:  total,
		Limit:  normQuery.Limit,
		Offset: normQuery.Offset,
	}, nil
}

func (r *MySQLRepository) Get(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) (gagalxray.KirimanGagalXray, error) {
	if r == nil || r.db == nil {
		return gagalxray.KirimanGagalXray{}, ErrRepositoryNotConfigured
	}

	query := `
		SELECT 
			g.Kantor_Asal,
			COALESCE(k_asal.Nama_Kantor, ''),
			g.Kantor_Tujuan,
			COALESCE(k_tujuan.Nama_Kantor, ''),
			g.ID_Kiriman,
			g.ID_Kantong_Lama,
			COALESCE(g.ID_Kantong_Baru, ''),
			COALESCE(g.Isi_Kiriman, ''),
			COALESCE(g.Berat, 0),
			COALESCE(g.Keterangan, ''),
			COALESCE(DATE_FORMAT(g.Tanggal, '%Y-%m-%d'), ''),
			COALESCE(g.Kantor_Penerbangan, ''),
			COALESCE(k_penerbangan.Nama_Kantor, ''),
			COALESCE(g.File_Berita_Acara, ''),
			g.Tanggal_Tambah,
			COALESCE(g.Ditambah_Oleh, ''),
			g.Tanggal_Ubah,
			COALESCE(g.Diubah_Oleh, '')
		FROM cch_kiriman_gagal_xray g
		LEFT JOIN cch_kantor k_asal ON g.Kantor_Asal = k_asal.Kode_Kantor
		LEFT JOIN cch_kantor k_tujuan ON g.Kantor_Tujuan = k_tujuan.Kode_Kantor
		LEFT JOIN cch_kantor k_penerbangan ON g.Kantor_Penerbangan = k_penerbangan.Kode_Kantor
		WHERE g.Kantor_Asal = ? AND g.Kantor_Tujuan = ? AND g.ID_Kiriman = ? AND g.ID_Kantong_Lama = ?
		LIMIT 1`

	var item gagalxray.KirimanGagalXray
	var tTambah, tUbah sql.NullTime
	err := r.db.QueryRowContext(ctx, query, asal, tujuan, idKiriman, kantongLama).Scan(
		&item.KantorAsal,
		&item.NamaKantorAsal,
		&item.KantorTujuan,
		&item.NamaKantorTujuan,
		&item.IDKiriman,
		&item.IDKantongLama,
		&item.IDKantongBaru,
		&item.IsiKiriman,
		&item.Berat,
		&item.Keterangan,
		&item.Tanggal,
		&item.KantorPenerbangan,
		&item.NamaKantorPenerbangan,
		&item.FileBeritaAcara,
		&tTambah,
		&item.DitambahOleh,
		&tUbah,
		&item.DiubahOleh,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return gagalxray.KirimanGagalXray{}, gagalxray.ErrNotFound
	}
	if err != nil {
		return gagalxray.KirimanGagalXray{}, fmt.Errorf("get gagal xray: %w", err)
	}
	if tTambah.Valid {
		item.TanggalTambah = &tTambah.Time
	}
	if tUbah.Valid {
		item.TanggalUbah = &tUbah.Time
	}
	item.KeteranganText = gagalxray.KeteranganLabel(item.Keterangan)
	return item, nil
}

func (r *MySQLRepository) Create(ctx context.Context, item gagalxray.KirimanGagalXray) error {
	if r == nil || r.db == nil {
		return ErrRepositoryNotConfigured
	}

	query := `
		INSERT INTO cch_kiriman_gagal_xray (
			Kantor_Asal,
			Kantor_Tujuan,
			ID_Kiriman,
			ID_Kantong_Lama,
			ID_Kantong_Baru,
			Isi_Kiriman,
			Berat,
			Keterangan,
			Tanggal,
			Kantor_Penerbangan,
			File_Berita_Acara,
			Tanggal_Tambah,
			Ditambah_Oleh,
			Tanggal_Ubah,
			Diubah_Oleh
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	now := time.Now()
	_, err := r.db.ExecContext(
		ctx,
		query,
		item.KantorAsal,
		item.KantorTujuan,
		item.IDKiriman,
		item.IDKantongLama,
		item.IDKantongBaru,
		item.IsiKiriman,
		item.Berat,
		item.Keterangan,
		item.Tanggal,
		item.KantorPenerbangan,
		item.FileBeritaAcara,
		now,
		item.DitambahOleh,
		now,
		item.DitambahOleh,
	)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return gagalxray.ErrAlreadyExists
		}
		return fmt.Errorf("create gagal xray: %w", err)
	}
	return nil
}

func (r *MySQLRepository) Update(ctx context.Context, asal, tujuan, idKiriman, kantongLama string, cmd gagalxray.UpdateCommand, updatedBy string) error {
	if r == nil || r.db == nil {
		return ErrRepositoryNotConfigured
	}

	query := `
		UPDATE cch_kiriman_gagal_xray
		SET 
			ID_Kantong_Baru = ?,
			Isi_Kiriman = ?,
			Berat = ?,
			Keterangan = ?,
			Tanggal = ?,
			Kantor_Penerbangan = ?,
			File_Berita_Acara = ?,
			Tanggal_Ubah = ?,
			Diubah_Oleh = ?
		WHERE Kantor_Asal = ? AND Kantor_Tujuan = ? AND ID_Kiriman = ? AND ID_Kantong_Lama = ?`

	now := time.Now()
	res, err := r.db.ExecContext(
		ctx,
		query,
		cmd.IDKantongBaru,
		cmd.IsiKiriman,
		cmd.Berat,
		cmd.Keterangan,
		cmd.Tanggal,
		cmd.KantorPenerbangan,
		cmd.FileBeritaAcara,
		now,
		updatedBy,
		asal,
		tujuan,
		idKiriman,
		kantongLama,
	)
	if err != nil {
		return fmt.Errorf("update gagal xray: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update rows affected: %w", err)
	}
	if rowsAffected == 0 {
		// Verify if it exists
		var exists int
		checkErr := r.db.QueryRowContext(ctx, "SELECT 1 FROM cch_kiriman_gagal_xray WHERE Kantor_Asal = ? AND Kantor_Tujuan = ? AND ID_Kiriman = ? AND ID_Kantong_Lama = ?", asal, tujuan, idKiriman, kantongLama).Scan(&exists)
		if errors.Is(checkErr, sql.ErrNoRows) {
			return gagalxray.ErrNotFound
		}
	}

	return nil
}

func (r *MySQLRepository) Delete(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) error {
	if r == nil || r.db == nil {
		return ErrRepositoryNotConfigured
	}

	query := `DELETE FROM cch_kiriman_gagal_xray WHERE Kantor_Asal = ? AND Kantor_Tujuan = ? AND ID_Kiriman = ? AND ID_Kantong_Lama = ?`
	res, err := r.db.ExecContext(ctx, query, asal, tujuan, idKiriman, kantongLama)
	if err != nil {
		return fmt.Errorf("delete gagal xray: %w", err)
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return gagalxray.ErrNotFound
	}
	return nil
}

func (r *MySQLRepository) GetStats(ctx context.Context) (gagalxray.Stats, error) {
	if r == nil || r.db == nil {
		return gagalxray.Stats{}, ErrRepositoryNotConfigured
	}

	query := `
		SELECT 
			COUNT(*) AS total,
			COUNT(CASE WHEN Keterangan = '1' THEN 1 END) AS darat_laut,
			COUNT(CASE WHEN Keterangan = '2' THEN 1 END) AS retour,
			COUNT(CASE WHEN Keterangan = '3' THEN 1 END) AS disita,
			COUNT(CASE WHEN Keterangan = '4' THEN 1 END) AS freighter
		FROM cch_kiriman_gagal_xray`

	var stats gagalxray.Stats
	err := r.db.QueryRowContext(ctx, query).Scan(
		&stats.TotalRecords,
		&stats.DaratLautCount,
		&stats.RetourCount,
		&stats.DisitaCount,
		&stats.FreighterCount,
	)
	if err != nil {
		return gagalxray.Stats{}, fmt.Errorf("get gagal xray stats: %w", err)
	}
	return stats, nil
}
