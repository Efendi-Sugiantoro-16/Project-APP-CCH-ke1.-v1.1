package repository

import (
	"context"
	"fmt"
	"time"

	"cch.local/backend/internal/modules/complaints"
)

func (repository *MySQLComplaintRepository) ListDurationSummary(ctx context.Context, query complaints.DurationSummaryQuery, officeCode string) ([]complaints.DurationSummaryRow, error) {
	if repository == nil || repository.db == nil {
		return nil, ErrRepositoryNotConfigured
	}
	query, err := query.Normalize()
	if err != nil {
		return nil, err
	}

	ageExpr := "DATEDIFF(CURRENT_DATE, DATE(e.Tanggal_Tambah))"
	statusWhere := "e.Status_Akhir <> '109'"
	switch query.Status {
	case "belum_respon":
		statusWhere = "e.Status_Akhir <> '109' AND NOT EXISTS (SELECT 1 FROM cchentrimas m WHERE m.ID_Pengaduan = e.ID_Pengaduan AND m.Status_Update > '101')"
	case "sudah_respon":
		statusWhere = "e.Status_Akhir <> '109' AND EXISTS (SELECT 1 FROM cchentrimas m WHERE m.ID_Pengaduan = e.ID_Pengaduan AND m.Status_Update > '101')"
		ageExpr = "DATEDIFF(DATE(COALESCE((SELECT MIN(Tanggal_Update) FROM cchentrimas WHERE ID_Pengaduan = e.ID_Pengaduan AND Status_Update > '101'), CURRENT_DATE)), DATE(e.Tanggal_Tambah))"
	case "sudah_selesai":
		statusWhere = "e.Status_Akhir = '109'"
		ageExpr = "DATEDIFF(DATE(COALESCE(e.Tanggal_Status_Akhir, (SELECT Tanggal_Update FROM cchentrimas WHERE ID_Pengaduan = e.ID_Pengaduan AND Status_Update = '109' ORDER BY Tanggal_Update DESC LIMIT 1), e.Tanggal_Tambah)), DATE(e.Tanggal_Tambah))"
	}

	var innerSQL string
	args := []any{*query.From, *query.To}

	if query.Direction == "sent" {
		innerSQL = fmt.Sprintf(`SELECT DISTINCT
			e.Kantor_Asal AS OfficeCode,
			e.ID_Pengaduan,
			GREATEST(0, %s) AS age_days
		FROM cchentri AS e
		WHERE %s
			AND e.Tanggal_Tambah BETWEEN ? AND ?`, ageExpr, statusWhere)
	} else {
		innerSQL = fmt.Sprintf(`SELECT DISTINCT
			u.Kantor_Tujuan_Update AS OfficeCode,
			e.ID_Pengaduan,
			GREATEST(0, %s) AS age_days
		FROM cchentridet AS u
		INNER JOIN cchentri AS e ON e.ID_Pengaduan = u.ID_Pengaduan
		WHERE u.Status_Update = '101'
			AND %s
			AND e.Tanggal_Tambah BETWEEN ? AND ?`, ageExpr, statusWhere)
	}

	if query.ProductCode != "" {
		innerSQL += "\n\t\t\tAND e.Jenis_Kiriman = ?"
		args = append(args, query.ProductCode)
	}

	statement := fmt.Sprintf(`SELECT
		t.OfficeCode,
		COALESCE(k.Nama_Kantor, t.OfficeCode) AS OfficeName,
		COUNT(DISTINCT t.ID_Pengaduan) AS Total,
		COALESCE(SUM(CASE WHEN t.age_days = 0 THEN 1 ELSE 0 END), 0) AS DayZero,
		COALESCE(SUM(CASE WHEN t.age_days = 1 THEN 1 ELSE 0 END), 0) AS DayOne,
		COALESCE(SUM(CASE WHEN t.age_days = 2 THEN 1 ELSE 0 END), 0) AS DayTwo,
		COALESCE(SUM(CASE WHEN t.age_days = 3 THEN 1 ELSE 0 END), 0) AS DayThree,
		COALESCE(SUM(CASE WHEN t.age_days >= 4 THEN 1 ELSE 0 END), 0) AS DayFourPlus
	FROM (%s
	) AS t
	INNER JOIN cch_kantor AS k ON k.Kode_Kantor = t.OfficeCode`, innerSQL)

	if query.RegionalCode != "" {
		statement += "\n\tAND ((k.Regional = ?) OR (k.Kode_Kantor = ?))"
		args = append(args, query.RegionalCode, query.RegionalCode)
	}

	statement += "\nGROUP BY t.OfficeCode, k.Nama_Kantor\nORDER BY Total DESC, t.OfficeCode ASC\nLIMIT ? OFFSET ?"
	args = append(args, query.Limit, query.Offset)

	rows, err := repository.db.QueryContext(ctx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("list duration summary: %w", err)
	}
	defer rows.Close()

	results := make([]complaints.DurationSummaryRow, 0, query.Limit)
	for rows.Next() {
		var row complaints.DurationSummaryRow
		if err := rows.Scan(
			&row.OfficeCode, &row.OfficeName, &row.Total,
			&row.DayZero, &row.DayOne, &row.DayTwo, &row.DayThree, &row.DayFourPlus,
		); err != nil {
			return nil, fmt.Errorf("scan duration summary row: %w", err)
		}
		results = append(results, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read duration summary: %w", err)
	}
	return results, nil
}

func (repository *MySQLComplaintRepository) ListDurationDetail(ctx context.Context, query complaints.DurationDetailQuery, officeCode string) ([]complaints.DurationDetailRow, error) {
	if repository == nil || repository.db == nil {
		return nil, ErrRepositoryNotConfigured
	}
	query, err := query.Normalize()
	if err != nil {
		return nil, err
	}

	ageExpr := "DATEDIFF(CURRENT_DATE, DATE(e.Tanggal_Tambah))"
	statusWhere := "e.Status_Akhir <> '109'"
	switch query.Status {
	case "belum_respon":
		statusWhere = "e.Status_Akhir <> '109' AND NOT EXISTS (SELECT 1 FROM cchentrimas m WHERE m.ID_Pengaduan = e.ID_Pengaduan AND m.Status_Update > '101')"
	case "sudah_respon":
		statusWhere = "e.Status_Akhir <> '109' AND EXISTS (SELECT 1 FROM cchentrimas m WHERE m.ID_Pengaduan = e.ID_Pengaduan AND m.Status_Update > '101')"
		ageExpr = "DATEDIFF(DATE(COALESCE((SELECT MIN(Tanggal_Update) FROM cchentrimas WHERE ID_Pengaduan = e.ID_Pengaduan AND Status_Update > '101'), CURRENT_DATE)), DATE(e.Tanggal_Tambah))"
	case "sudah_selesai":
		statusWhere = "e.Status_Akhir = '109'"
		ageExpr = "DATEDIFF(DATE(COALESCE(e.Tanggal_Status_Akhir, (SELECT Tanggal_Update FROM cchentrimas WHERE ID_Pengaduan = e.ID_Pengaduan AND Status_Update = '109' ORDER BY Tanggal_Update DESC LIMIT 1), e.Tanggal_Tambah)), DATE(e.Tanggal_Tambah))"
	}

	args := []any{}
	var querySQL string

	if query.Direction == "sent" {
		querySQL = fmt.Sprintf(`SELECT
			e.ID_Pengaduan,
			e.Jenis_Pengaduan,
			COALESCE(e.Nomor_Kiriman, ''),
			COALESCE(e.Jenis_Kiriman, ''),
			COALESCE(e.Ringkasan_Pengaduan, ''),
			e.Kantor_Asal,
			e.Kantor_Tujuan,
			e.Status_Akhir,
			COALESCE(latest.Status_Update, e.Status_Akhir) AS LatestStatusCode,
			COALESCE(latest.Kantor_Asal_Update, e.Kantor_Asal) AS LatestStatusOffice,
			COALESCE(latest.Tanggal_Update, e.Tanggal_Tambah) AS LatestStatusAt,
			e.Tanggal_Tambah,
			GREATEST(0, %s) AS age_days
		FROM cchentri AS e
		LEFT JOIN cchentrimas AS latest ON latest.ID_Pengaduan = e.ID_Pengaduan
			AND latest.ID_Histori = (
				SELECT lm.ID_Histori FROM cchentrimas lm WHERE lm.ID_Pengaduan = e.ID_Pengaduan ORDER BY lm.Tanggal_Update DESC, lm.ID_Histori DESC LIMIT 1
			)
		WHERE e.Kantor_Asal = ?
			AND %s
			AND e.Tanggal_Tambah BETWEEN ? AND ?`, ageExpr, statusWhere)
		args = append(args, query.OfficeCode, *query.From, *query.To)
	} else {
		querySQL = fmt.Sprintf(`SELECT
			e.ID_Pengaduan,
			e.Jenis_Pengaduan,
			COALESCE(e.Nomor_Kiriman, ''),
			COALESCE(e.Jenis_Kiriman, ''),
			COALESCE(e.Ringkasan_Pengaduan, ''),
			e.Kantor_Asal,
			e.Kantor_Tujuan,
			e.Status_Akhir,
			COALESCE(latest.Status_Update, e.Status_Akhir) AS LatestStatusCode,
			COALESCE(latest.Kantor_Asal_Update, u.Kantor_Tujuan_Update) AS LatestStatusOffice,
			COALESCE(latest.Tanggal_Update, e.Tanggal_Tambah) AS LatestStatusAt,
			e.Tanggal_Tambah,
			GREATEST(0, %s) AS age_days
		FROM cchentridet AS u
		INNER JOIN cchentri AS e ON e.ID_Pengaduan = u.ID_Pengaduan
		LEFT JOIN cchentrimas AS latest ON latest.ID_Pengaduan = e.ID_Pengaduan
			AND latest.ID_Histori = (
				SELECT lm.ID_Histori FROM cchentrimas lm WHERE lm.ID_Pengaduan = e.ID_Pengaduan ORDER BY lm.Tanggal_Update DESC, lm.ID_Histori DESC LIMIT 1
			)
		WHERE u.Kantor_Tujuan_Update = ?
			AND u.Status_Update = '101'
			AND %s
			AND e.Tanggal_Tambah BETWEEN ? AND ?`, ageExpr, statusWhere)
		args = append(args, query.OfficeCode, *query.From, *query.To)
	}

	if query.ProductCode != "" {
		querySQL += "\n\tAND e.Jenis_Kiriman = ?"
		args = append(args, query.ProductCode)
	}

	switch query.DurationBucket {
	case "0":
		querySQL += fmt.Sprintf("\n\tAND %s = 0", ageExpr)
	case "1":
		querySQL += fmt.Sprintf("\n\tAND %s = 1", ageExpr)
	case "2":
		querySQL += fmt.Sprintf("\n\tAND %s = 2", ageExpr)
	case "3":
		querySQL += fmt.Sprintf("\n\tAND %s = 3", ageExpr)
	case "4_plus":
		querySQL += fmt.Sprintf("\n\tAND %s >= 4", ageExpr)
	}

	querySQL += "\nORDER BY e.Tanggal_Tambah ASC\nLIMIT ? OFFSET ?"
	args = append(args, query.Limit, query.Offset)

	rows, err := repository.db.QueryContext(ctx, querySQL, args...)
	if err != nil {
		return nil, fmt.Errorf("list duration detail: %w", err)
	}
	defer rows.Close()

	items := make([]complaints.DurationDetailRow, 0, query.Limit)
	for rows.Next() {
		var row complaints.DurationDetailRow
		var latestAt time.Time
		var createdAt time.Time
		if err := rows.Scan(
			&row.ComplaintID, &row.ComplaintType, &row.ShipmentNumber, &row.ProductCode,
			&row.Summary, &row.SourceOfficeCode, &row.TargetOfficeCode, &row.FinalStatusCode,
			&row.LatestStatusCode, &row.LatestStatusOffice, &latestAt, &createdAt,
			&row.DurationDays,
		); err != nil {
			return nil, fmt.Errorf("scan duration detail row: %w", err)
		}
		row.LatestStatusAt = latestAt
		row.CreatedAt = createdAt
		items = append(items, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read duration detail: %w", err)
	}
	return items, nil
}
