package repository

import (
	"context"
	"database/sql"
	"fmt"

	"cch.local/backend/internal/modules/complaints"
)

func (repository *MySQLComplaintRepository) ListStatusComplaints(ctx context.Context, query complaints.StatusListQuery, userOfficeCode string) (complaints.StatusListResult, error) {
	if repository == nil || repository.db == nil {
		return complaints.StatusListResult{}, ErrRepositoryNotConfigured
	}
	query, err := query.Normalize()
	if err != nil {
		return complaints.StatusListResult{}, err
	}

	// 1. Build Base WHERE Clause for active status category
	var statusCondition string
	switch query.StatusCategory {
	case "masih_terbuka":
		statusCondition = "e.Status_Akhir <> '109'"
	case "sudah_respon":
		statusCondition = "e.Status_Akhir <> '101'"
	case "sudah_selesai":
		statusCondition = "e.Status_Akhir = '109'"
	default: // "belum_respon"
		statusCondition = "e.Status_Akhir = '101'"
	}

	// 2. Build common filter conditions and arguments (shared between data query and counts query)
	var filterConditions []string
	var commonArgs []any

	if query.Direction == "received" {
		filterConditions = append(filterConditions, "d.Status_Update = '101'")
	}

	if query.From != nil && query.To != nil {
		filterConditions = append(filterConditions, "e.Tanggal_Tambah BETWEEN ? AND ?")
		commonArgs = append(commonArgs, *query.From, *query.To)
	}

	if query.ProductCode != "" {
		filterConditions = append(filterConditions, "e.Jenis_Kiriman = ?")
		commonArgs = append(commonArgs, query.ProductCode)
	}

	if query.ComplaintType != "" {
		filterConditions = append(filterConditions, "e.Jenis_Pengaduan = ?")
		commonArgs = append(commonArgs, query.ComplaintType)
	}

	// Office or Regional scoping
	if query.OfficeCode != "" {
		if query.Direction == "sent" {
			filterConditions = append(filterConditions, "e.Kantor_Asal = ?")
		} else {
			filterConditions = append(filterConditions, "d.Kantor_Tujuan_Update = ?")
		}
		commonArgs = append(commonArgs, query.OfficeCode)
	} else if query.RegionalCode != "" {
		if query.Direction == "sent" {
			filterConditions = append(filterConditions, "e.Kantor_Asal IN (SELECT k.Kode_Kantor FROM cch_kantor AS k WHERE k.Regional = ? OR k.Kode_Kantor = ?)")
		} else {
			filterConditions = append(filterConditions, "d.Kantor_Tujuan_Update IN (SELECT k.Kode_Kantor FROM cch_kantor AS k WHERE k.Regional = ? OR k.Kode_Kantor = ?)")
		}
		commonArgs = append(commonArgs, query.RegionalCode, query.RegionalCode)
	} else if userOfficeCode != "" && userOfficeCode != "40005CC" && userOfficeCode != "40000" && userOfficeCode != "10000" {
		if query.Direction == "sent" {
			filterConditions = append(filterConditions, "e.Kantor_Asal = ?")
		} else {
			filterConditions = append(filterConditions, "d.Kantor_Tujuan_Update = ?")
		}
		commonArgs = append(commonArgs, userOfficeCode)
	}

	// Search keyword
	if query.Search != "" {
		filterConditions = append(filterConditions, "(e.ID_Pengaduan LIKE ? OR e.Nomor_Kiriman LIKE ? OR e.Ringkasan_Pengaduan LIKE ?)")
		searchTerm := "%" + query.Search + "%"
		commonArgs = append(commonArgs, searchTerm, searchTerm, searchTerm)
	}

	// 3. FROM & JOIN clauses
	var fromClause string
	var targetUpdateOfficeCol string
	if query.Direction == "sent" {
		fromClause = `FROM cchentri AS e
		LEFT JOIN cch_jenis_pengaduan AS jp ON jp.Kode_Jenis = e.Jenis_Pengaduan
		LEFT JOIN cch_jenis_layanan AS jl ON jl.Kode_Layanan = e.Jenis_Kiriman
		LEFT JOIN cch_jenis_penanganan AS js ON js.ID_Status = e.Status_Akhir
		LEFT JOIN cch_kantor AS ko ON ko.Kode_Kantor = e.Kantor_Asal
		LEFT JOIN cch_kantor AS kd ON kd.Kode_Kantor = e.Kantor_Tujuan
		LEFT JOIN cch_kantor AS ks ON ks.Kode_Kantor = e.Kantor_Status`
		targetUpdateOfficeCol = "'' AS TargetUpdateOffice"
	} else {
		fromClause = `FROM cchentridet AS d
		INNER JOIN cchentri AS e ON e.ID_Pengaduan = d.ID_Pengaduan
		LEFT JOIN cch_jenis_pengaduan AS jp ON jp.Kode_Jenis = e.Jenis_Pengaduan
		LEFT JOIN cch_jenis_layanan AS jl ON jl.Kode_Layanan = e.Jenis_Kiriman
		LEFT JOIN cch_jenis_penanganan AS js ON js.ID_Status = e.Status_Akhir
		LEFT JOIN cch_kantor AS ko ON ko.Kode_Kantor = e.Kantor_Asal
		LEFT JOIN cch_kantor AS kd ON kd.Kode_Kantor = e.Kantor_Tujuan
		LEFT JOIN cch_kantor AS ks ON ks.Kode_Kantor = e.Kantor_Status`
		targetUpdateOfficeCol = "COALESCE(d.Kantor_Tujuan_Update, '') AS TargetUpdateOffice"
	}

	// 4. Query Summary Counts across all status categories
	countsWhere := ""
	if len(filterConditions) > 0 {
		countsWhere = "WHERE " + joinSQLConditions(filterConditions)
	}
	var countFromClause string
	if query.Direction == "sent" {
		countFromClause = "FROM cchentri AS e"
	} else {
		countFromClause = "FROM cchentridet AS d INNER JOIN cchentri AS e ON e.ID_Pengaduan = d.ID_Pengaduan"
	}

	countsSQL := fmt.Sprintf(`SELECT
		COUNT(DISTINCT e.ID_Pengaduan) AS total,
		COUNT(DISTINCT CASE WHEN e.Status_Akhir = '101' THEN e.ID_Pengaduan END) AS belum_respon,
		COUNT(DISTINCT CASE WHEN e.Status_Akhir <> '109' THEN e.ID_Pengaduan END) AS masih_terbuka,
		COUNT(DISTINCT CASE WHEN e.Status_Akhir <> '101' THEN e.ID_Pengaduan END) AS sudah_respon,
		COUNT(DISTINCT CASE WHEN e.Status_Akhir = '109' THEN e.ID_Pengaduan END) AS sudah_selesai
	%s %s`, countFromClause, countsWhere)

	var counts complaints.StatusListSummaryCounts
	if err := repository.db.QueryRowContext(ctx, countsSQL, commonArgs...).Scan(
		&counts.Total,
		&counts.BelumRespon,
		&counts.MasihTerbuka,
		&counts.SudahRespon,
		&counts.SudahSelesai,
	); err != nil {
		return complaints.StatusListResult{}, err
	}

	// 5. Query Filtered Data Items
	dataConditions := append([]string{}, filterConditions...)
	dataConditions = append(dataConditions, statusCondition)
	dataWhere := "WHERE " + joinSQLConditions(dataConditions)

	dataArgs := append([]any{}, commonArgs...)
	dataArgs = append(dataArgs, query.Limit, query.Offset)

	dataSQL := fmt.Sprintf(`SELECT DISTINCT
		e.ID_Pengaduan,
		e.Kantor_Asal,
		COALESCE(ko.Nama_Kantor, ''),
		e.Kantor_Tujuan,
		COALESCE(kd.Nama_Kantor, ''),
		COALESCE(e.Kantor_Tembusan, ''),
		COALESCE(e.Jenis_Pengaduan, ''),
		COALESCE(jp.Deskripsi, ''),
		COALESCE(e.Jenis_Kiriman, ''),
		COALESCE(jl.Deskripsi, ''),
		COALESCE(e.Nomor_Kiriman, ''),
		COALESCE(e.Status_Akhir, '101'),
		COALESCE(js.Deskripsi_Status, ''),
		e.Tanggal_Status,
		COALESCE(e.Kantor_Status, ''),
		COALESCE(ks.Nama_Kantor, ''),
		%s,
		COALESCE(e.Ringkasan_Pengaduan, ''),
		e.Tanggal_Tambah,
		CASE 
			WHEN e.Status_Akhir = '109' THEN GREATEST(0, DATEDIFF(DATE(COALESCE(e.Tanggal_Status, e.Tanggal_Tambah)), DATE(e.Tanggal_Tambah)))
			ELSE GREATEST(0, DATEDIFF(CURRENT_DATE, DATE(e.Tanggal_Tambah)))
		END AS DurationDays
	%s
	%s
	ORDER BY e.Tanggal_Tambah DESC, e.ID_Pengaduan DESC
	LIMIT ? OFFSET ?`, targetUpdateOfficeCol, fromClause, dataWhere)

	rows, err := repository.db.QueryContext(ctx, dataSQL, dataArgs...)
	if err != nil {
		return complaints.StatusListResult{}, err
	}
	defer rows.Close()

	items := make([]complaints.StatusListItem, 0, query.Limit)
	for rows.Next() {
		var item complaints.StatusListItem
		var statusDate, complaintDate sql.NullTime

		if err := rows.Scan(
			&item.ComplaintID,
			&item.OriginOfficeCode,
			&item.OriginOfficeName,
			&item.DestinationOfficeCode,
			&item.DestinationOfficeName,
			&item.CopyOfficeCodes,
			&item.ComplaintTypeCode,
			&item.ComplaintTypeName,
			&item.ShipmentTypeCode,
			&item.ShipmentTypeName,
			&item.ShipmentNumber,
			&item.FinalStatusCode,
			&item.FinalStatusName,
			&statusDate,
			&item.StatusOfficeCode,
			&item.StatusOfficeName,
			&item.TargetUpdateOffice,
			&item.Summary,
			&complaintDate,
			&item.DurationDays,
		); err != nil {
			return complaints.StatusListResult{}, err
		}

		if statusDate.Valid {
			t := statusDate.Time.UTC()
			item.StatusDate = &t
		}
		if complaintDate.Valid {
			t := complaintDate.Time.UTC()
			item.ComplaintDate = &t
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return complaints.StatusListResult{}, err
	}

	var totalForCategory int64
	switch query.StatusCategory {
	case "masih_terbuka":
		totalForCategory = counts.MasihTerbuka
	case "sudah_respon":
		totalForCategory = counts.SudahRespon
	case "sudah_selesai":
		totalForCategory = counts.SudahSelesai
	default:
		totalForCategory = counts.BelumRespon
	}

	return complaints.StatusListResult{
		Items:      items,
		TotalCount: totalForCategory,
		Counts:     counts,
	}, nil
}

func joinSQLConditions(conditions []string) string {
	if len(conditions) == 0 {
		return "1=1"
	}
	res := conditions[0]
	for i := 1; i < len(conditions); i++ {
		res += "\n\tAND " + conditions[i]
	}
	return res
}
