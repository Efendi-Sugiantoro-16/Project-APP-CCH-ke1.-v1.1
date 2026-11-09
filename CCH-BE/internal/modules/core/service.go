package core

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"
)

var statusMap = map[string]string{
	"101": "101 - ENTRI (Baru Diterbitkan)",
	"102": "102 - TERIMA (Diterima UPT)",
	"103": "103 - PROSES (Sedang Ditangani)",
	"104": "104 - KONFIRMASI (Menunggu Pelanggan)",
	"105": "105 - INVESTIGASI (Pemeriksaan Lapangan)",
	"106": "106 - GANTI RUGI (Klaim Disetujui)",
	"108": "108 - SELESAI (Tuntas & Terkirim)",
	"109": "109 - DITUTUP (Kasus Selesai)",
}

type Service struct {
	db      *sql.DB
	mu      sync.RWMutex
	readIDs map[string]bool
}

func NewService(db *sql.DB) *Service {
	return &Service{
		db:      db,
		readIDs: make(map[string]bool),
	}
}

func nullStringVal(s sql.NullString, def string) string {
	if s.Valid && strings.TrimSpace(s.String) != "" {
		return strings.TrimSpace(s.String)
	}
	return def
}

func formatTimeAgo(t time.Time, now time.Time) string {
	if t.IsZero() {
		return "Terbaru"
	}
	diff := now.Sub(t)
	if diff < 0 {
		return "Baru saja"
	}
	mins := int(diff.Minutes())
	if mins < 1 {
		return "Baru saja"
	}
	if mins < 60 {
		return fmt.Sprintf("%d mnt lalu", mins)
	}
	hours := int(diff.Hours())
	if hours < 24 {
		return fmt.Sprintf("%d jam lalu", hours)
	}
	days := hours / 24
	return fmt.Sprintf("%d hari lalu", days)
}

func analyzeUrgencyAndSentiment(text string) (urgency string, sentiment string) {
	lower := strings.ToLower(text)

	// P1 Kritis keywords
	p1Keywords := []string{
		"obat", "kanker", "darurat", "somasi", "polisi", "ijazah", "paspor",
		"sidang", "viral", "racun", "hukum", "meninggal", "nyawa", "urgent", "kritis",
	}
	for _, kw := range p1Keywords {
		if strings.Contains(lower, kw) {
			return "P1_KRITIS", "Sangat Marah"
		}
	}

	// P2 Tinggi keywords
	p2Keywords := []string{
		"rusak", "pecah", "basah", "hilang", "hancur", "basi", "terlambat",
		"melebihi sla", "kemana", "belum sampai", "hancur lebur", "kecewa",
	}
	for _, kw := range p2Keywords {
		if strings.Contains(lower, kw) {
			return "P2_TINGGI", "Kecewa"
		}
	}

	// Positif keywords
	posKeywords := []string{"terima kasih", "mantap", "puas", "bagus", "cepat", "suka", "terima kasih banyak"}
	for _, kw := range posKeywords {
		if strings.Contains(lower, kw) {
			return "P3_NORMAL", "Puas"
		}
	}

	return "P3_NORMAL", "Netral"
}

func (s *Service) SearchComplaints(ctx context.Context, query string, limit int) (SearchResponse, error) {
	start := time.Now()
	cleanQ := strings.TrimSpace(query)
	if cleanQ == "" {
		return SearchResponse{Query: "", Total: 0, ElapsedMs: 0, Results: []SearchResultItem{}}, nil
	}
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	searchPattern := "%" + cleanQ + "%"
	prefixPattern := cleanQ + "%"

	sqlQuery := `
		SELECT 
			ID_Pengaduan,
			Nomor_Kiriman,
			Nama_Pelanggan,
			Nomor_HP_Pelanggan,
			Kantor_Asal,
			Kantor_Tujuan,
			Ringkasan_Pengaduan,
			Uraian_Pengaduan,
			Tanggal_Pengaduan,
			Status_Akhir,
			Ditambah_Oleh
		FROM cchentri
		WHERE ID_Pengaduan LIKE ?
		   OR Nomor_Kiriman LIKE ?
		   OR Nama_Pelanggan LIKE ?
		   OR Ringkasan_Pengaduan LIKE ?
		ORDER BY 
			(ID_Pengaduan LIKE ?) DESC,
			(Nomor_Kiriman LIKE ?) DESC,
			Tanggal_Pengaduan DESC
		LIMIT ?
	`

	rows, err := s.db.QueryContext(ctx, sqlQuery,
		searchPattern, searchPattern, searchPattern, searchPattern,
		prefixPattern, prefixPattern, limit,
	)
	if err != nil {
		return SearchResponse{Query: cleanQ, Total: 0, ElapsedMs: 0, Results: []SearchResultItem{}}, err
	}
	defer rows.Close()

	var results []SearchResultItem
	for rows.Next() {
		var (
			idPengaduan  sql.NullString
			nomorKiriman sql.NullString
			namaPelang   sql.NullString
			noHPPelang   sql.NullString
			kantorAsal   sql.NullString
			kantorTujuan sql.NullString
			ringkasan    sql.NullString
			uraian       sql.NullString
			tglPengaduan sql.NullTime
			statusAkhir  sql.NullString
			ditambahOleh sql.NullString
		)

		if err := rows.Scan(
			&idPengaduan,
			&nomorKiriman,
			&namaPelang,
			&noHPPelang,
			&kantorAsal,
			&kantorTujuan,
			&ringkasan,
			&uraian,
			&tglPengaduan,
			&statusAkhir,
			&ditambahOleh,
		); err != nil {
			continue
		}

		ticketID := nullStringVal(idPengaduan, "")
		shipmentNo := nullStringVal(nomorKiriman, "-")
		custName := nullStringVal(namaPelang, "Pelanggan POS")
		custPhone := nullStringVal(noHPPelang, "-")
		origin := nullStringVal(kantorAsal, "40005")
		target := nullStringVal(kantorTujuan, "40005")
		summaryText := nullStringVal(ringkasan, nullStringVal(uraian, "Keluhan Layanan Pos"))
		uraianText := nullStringVal(uraian, "")
		statusCode := nullStringVal(statusAkhir, "101")
		creator := nullStringVal(ditambahOleh, "")

		fullText := summaryText + " " + uraianText
		urgency, sentiment := analyzeUrgencyAndSentiment(fullText)

		isCompleted := statusCode == "106" || statusCode == "108" || statusCode == "109"
		statusLabel := statusMap[statusCode]
		if statusLabel == "" {
			statusLabel = statusCode + " - DALAM PROSES"
		}

		createdAt := "-"
		if tglPengaduan.Valid {
			createdAt = tglPengaduan.Time.Format("2006-01-02 15:04")
		}

		detailFolder := "open"
		if isCompleted {
			detailFolder = "completed"
		}

		if len(summaryText) > 120 {
			summaryText = summaryText[:120] + "..."
		}

		results = append(results, SearchResultItem{
			TicketID:       ticketID,
			ShipmentNumber: shipmentNo,
			CustomerName:   custName,
			CustomerPhone:  custPhone,
			OriginOffice:   origin,
			TargetOffice:   target,
			Summary:        summaryText,
			StatusCode:     statusCode,
			StatusName:     statusLabel,
			IsCompleted:    isCompleted,
			CreatedAt:      createdAt,
			UrgencyLevel:   urgency,
			Sentiment:      sentiment,
			IsAICreated:    creator == "SYSTEM_AI_CS" || creator == "AI_SOCIAL_LISTENER",
			DetailURL:      fmt.Sprintf("/workspace/complaints/%s/%s", detailFolder, ticketID),
		})
	}

	elapsed := time.Since(start).Milliseconds()
	return SearchResponse{
		Query:     cleanQ,
		Total:     len(results),
		ElapsedMs: elapsed,
		Results:   results,
	}, nil
}

func (s *Service) GetNotifications(ctx context.Context) (NotificationResponse, error) {
	now := time.Now()
	var notifications []NotificationItem

	s.mu.RLock()
	readMap := make(map[string]bool, len(s.readIDs))
	for k, v := range s.readIDs {
		readMap[k] = v
	}
	s.mu.RUnlock()

	// 1. Ambil 25 tiket cchentri terbaru untuk deteksi P1 Kritis & AI Ingest
	ticketQuery := `
		SELECT 
			ID_Pengaduan,
			Nomor_Kiriman,
			Nama_Pelanggan,
			Kantor_Tujuan,
			Ringkasan_Pengaduan,
			Uraian_Pengaduan,
			Tanggal_Pengaduan,
			Status_Akhir,
			Ditambah_Oleh
		FROM cchentri
		ORDER BY Tanggal_Pengaduan DESC
		LIMIT 25
	`
	rows, err := s.db.QueryContext(ctx, ticketQuery)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var (
				idPengaduan  sql.NullString
				nomorKiriman sql.NullString
				namaPelang   sql.NullString
				kantorTujuan sql.NullString
				ringkasan    sql.NullString
				uraian       sql.NullString
				tglPengaduan sql.NullTime
				statusAkhir  sql.NullString
				ditambahOleh sql.NullString
			)
			if err := rows.Scan(
				&idPengaduan, &nomorKiriman, &namaPelang, &kantorTujuan,
				&ringkasan, &uraian, &tglPengaduan, &statusAkhir, &ditambahOleh,
			); err != nil {
				continue
			}

			tID := nullStringVal(idPengaduan, "")
			shipment := nullStringVal(nomorKiriman, "-")
			cust := nullStringVal(namaPelang, "Pelanggan POS")
			office := nullStringVal(kantorTujuan, "-")
			summary := nullStringVal(ringkasan, nullStringVal(uraian, ""))
			creator := nullStringVal(ditambahOleh, "")

			fullText := summary + " " + nullStringVal(uraian, "")
			urgency, _ := analyzeUrgencyAndSentiment(fullText)

			timeVal := now
			timeStr := "-"
			if tglPengaduan.Valid {
				timeVal = tglPengaduan.Time
				timeStr = timeVal.Format("2006-01-02 15:04")
			}
			timeAgo := formatTimeAgo(timeVal, now)

			if len(summary) > 90 {
				summary = summary[:90] + "..."
			}

			if urgency == "P1_KRITIS" {
				nID := fmt.Sprintf("p1_%s", tID)
				notifications = append(notifications, NotificationItem{
					ID:        nID,
					Type:      "p1_kritis",
					Category:  "P1 Kritis",
					Title:     fmt.Sprintf("🚨 Aduan P1 Kritis: %s", cust),
					Message:   fmt.Sprintf("Resi %s: %s", shipment, summary),
					Timestamp: timeStr,
					TimeAgo:   timeAgo,
					Urgency:   "P1_KRITIS",
					Link:      fmt.Sprintf("/workspace/complaints/open/%s", tID),
					IsRead:    readMap[nID],
				})
			} else if creator == "SYSTEM_AI_CS" || creator == "AI_SOCIAL_LISTENER" {
				nID := fmt.Sprintf("ai_%s", tID)
				srcLabel := "CS Virtual 24H"
				if creator == "AI_SOCIAL_LISTENER" {
					srcLabel = "Medsos & Telegram"
				}
				notifications = append(notifications, NotificationItem{
					ID:        nID,
					Type:      "ai_intake",
					Category:  "AI CS Virtual",
					Title:     fmt.Sprintf("🤖 Tiket Baru Diterbitkan (%s)", srcLabel),
					Message:   fmt.Sprintf("Tiket %s (Resi: %s) diterbitkan otonom ke Kantor Pos %s.", tID, shipment, office),
					Timestamp: timeStr,
					TimeAgo:   timeAgo,
					Urgency:   urgency,
					Link:      fmt.Sprintf("/workspace/complaints/open/%s", tID),
					IsRead:    readMap[nID],
				})
			}
		}
	}

	// 2. Ambil Rekap Follow-Up Overdue dari cchfu
	var overdueCnt int
	fuQuery := `SELECT COUNT(*) FROM cchfu WHERE Tanggal_Realisasi IS NULL AND Tanggal_Rencana < NOW()`
	if err := s.db.QueryRowContext(ctx, fuQuery).Scan(&overdueCnt); err == nil && overdueCnt > 0 {
		nID := "fu_overdue_alert"
		notifications = append(notifications, NotificationItem{
			ID:        nID,
			Type:      "followup_overdue",
			Category:  "Follow-Up SLA",
			Title:     fmt.Sprintf("⚠️ %d Follow-Up Kadaluarsa (Overdue)!", overdueCnt),
			Message:   "Terdapat tindak lanjut kantor yang melewati batas tanggal rencana dan memerlukan penanganan segera.",
			Timestamp: now.Format("2006-01-02 15:04"),
			TimeAgo:   "Hari ini",
			Urgency:   "P2_TINGGI",
			Link:      "/workspace/follow-ups/due-today",
			IsRead:    readMap[nID],
		})
	}

	// 3. Ambil Kiriman Gagal X-Ray Terbaru dari cch_kiriman_gagal_xray
	xrayQuery := `
		SELECT ID_Kiriman, Kantor_Penerbangan, Isi_Kiriman, Keterangan, Tanggal
		FROM cch_kiriman_gagal_xray
		ORDER BY Tanggal DESC
		LIMIT 2
	`
	xRows, err := s.db.QueryContext(ctx, xrayQuery)
	if err == nil {
		defer xRows.Close()
		for xRows.Next() {
			var (
				idKiriman  sql.NullString
				bandara    sql.NullString
				isiKiriman sql.NullString
				keterangan sql.NullString
				tanggal    sql.NullTime
			)
			if err := xRows.Scan(&idKiriman, &bandara, &isiKiriman, &keterangan, &tanggal); err != nil {
				continue
			}

			barcode := nullStringVal(idKiriman, "-")
			bandaraStr := nullStringVal(bandara, "-")
			isiStr := nullStringVal(isiKiriman, "-")
			ketStr := nullStringVal(keterangan, "Dialihkan")

			nID := fmt.Sprintf("xray_%s", barcode)
			timeStr := "-"
			if tanggal.Valid {
				timeStr = tanggal.Time.Format("2006-01-02 15:04")
			}

			notifications = append(notifications, NotificationItem{
				ID:        nID,
				Type:      "gagal_xray",
				Category:  "Gagal X-Ray",
				Title:     fmt.Sprintf("📦 Gagal X-Ray Bandara: %s", barcode),
				Message:   fmt.Sprintf("Bandara %s: Terdeteksi '%s'. Tindakan: %s.", bandaraStr, isiStr, ketStr),
				Timestamp: timeStr,
				TimeAgo:   "Terbaru",
				Urgency:   "P2_TINGGI",
				Link:      "/workspace/gagal-xray",
				IsRead:    readMap[nID],
			})
		}
	}

	unreadCount := 0
	for _, it := range notifications {
		if !it.IsRead {
			unreadCount++
		}
	}

	// Batasi maksimal 20 item
	if len(notifications) > 20 {
		notifications = notifications[:20]
	}

	return NotificationResponse{
		UnreadCount: unreadCount,
		TotalCount:  len(notifications),
		Items:       notifications,
		UpdatedAt:   now.Format("2006-01-02 15:04:05"),
	}, nil
}

func (s *Service) MarkAllRead(ctx context.Context) (MarkReadResponse, error) {
	resp, err := s.GetNotifications(ctx)
	if err != nil {
		return MarkReadResponse{Success: false, MarkedCount: 0}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	for _, it := range resp.Items {
		s.readIDs[it.ID] = true
	}

	return MarkReadResponse{
		Success:     true,
		MarkedCount: len(s.readIDs),
	}, nil
}

