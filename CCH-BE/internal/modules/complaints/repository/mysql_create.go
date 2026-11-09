package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cch.local/backend/internal/modules/complaints"
)

const insertComplaintSQL = `INSERT INTO cchentri (
	ID_Pengaduan,
	ID_Histori,
	ID_Pelanggan,
	Nama_Pelanggan,
	Email_Pelanggan,
	Nomor_HP_Pelanggan,
	Alamat_Pelanggan,
	Kantor_Asal,
	Kantor_Tujuan,
	Kantor_Tembusan,
	Semua_Tujuan,
	Jenis_Pengaduan,
	Sumber_Pengaduan,
	Jenis_Kiriman,
	Nomor_Kiriman,
	Tanggal_Pengaduan,
	Kantor_Asal_Kiriman,
	Kantor_Tujuan_Kiriman,
	Ringkasan_Pengaduan,
	Uraian_Pengaduan,
	Status_Akhir,
	Tanggal_Status,
	Kantor_Status,
	Request_Status,
	Tanggal_Tambah,
	Ditambah_Oleh,
	Diubah_Oleh,
	Tanggal_Ubah
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

const insertComplaintHistorySQL = `INSERT INTO cchentrimas (
	ID_Pengaduan,
	ID_Histori,
	Status_Update,
	Kantor_Asal_Update,
	Kantor_Tujuan_Update,
	Tanggal_Update,
	Deskripsi_Update,
	Petugas_Update,
	Durasi_Antar_Status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

const insertComplaintCaseSQL = `INSERT INTO cchmas (
	ID_Kasus,
	Ringkasan_Kasus
) VALUES (?, ?)`

const insertComplaintTargetSQL = `INSERT IGNORE INTO cchentridet (
	ID_Pengaduan,
	ID_Histori,
	Status_Update,
	Kantor_Asal_Update,
	Kantor_Tujuan_Update
) VALUES (?, ?, ?, ?, ?)`

// CreateComplaint creates a new complaint in the database with full CCH Legacy schema parity
func (repository *MySQLComplaintRepository) CreateComplaint(ctx context.Context, cmd complaints.CreateComplaintCommand) (complaints.CreateComplaintResult, error) {
	if repository == nil || repository.db == nil {
		return complaints.CreateComplaintResult{}, ErrRepositoryNotConfigured
	}

	now := time.Now()

	// 1. Determine origin office (fallback to creating office from JWT or default 40005CC)
	originOffice := cmd.OriginOffice
	if originOffice == "" {
		originOffice = cmd.CreatingOfficeCode
	}
	if originOffice == "" {
		originOffice = "40005CC"
	}

	// 2. Generate legacy format ID_Histori (16 char: YYYYMMDDHHMMSS + 2-digit msec)
	msec := fmt.Sprintf("%02d", (now.Nanosecond()/10000000)%100)
	historyID := now.Format("20060102150405") + msec

	// 3. Generate legacy format ID_Pengaduan: [Kantor_Asal][ID_Histori]
	complaintID := originOffice + historyID

	// 4. Initial status (101 = Diterima/Entri Baru)
	initialStatus := "101"
	initialStatusDescription := cmd.Description
	if initialStatusDescription == "" {
		initialStatusDescription = "Pengaduan diterima dan sedang diproses"
	}

	// 5. Determine investigation destination office
	destinationOffice := cmd.TargetOffice
	if destinationOffice == "" {
		destinationOffice = cmd.ShipmentTargetOffice
	}
	if destinationOffice == "" {
		destinationOffice = originOffice
	}

	// 6. Determine copy offices (Kantor_Tembusan) & auto-include Central Office 40005
	copyOffices := cmd.CcOffice
	if copyOffices == "" {
		copyOffices = "40005"
	} else if !strings.Contains(copyOffices, "40005") {
		copyOffices = copyOffices + ",40005"
	}

	// 7. Determine all target offices (Semua_Tujuan)
	targetSet := make(map[string]struct{})
	targetList := []string{destinationOffice}
	targetSet[destinationOffice] = struct{}{}

	// Auto-include origin office, creating office, and CC counterparts in Semua_Tujuan
	candidates := []string{
		destinationOffice,
		originOffice,
		cmd.CreatingOfficeCode,
		strings.TrimSuffix(originOffice, "CC") + "CC",
		strings.TrimSuffix(destinationOffice, "CC") + "CC",
		"40005", "40005CC",
	}
	for _, cand := range candidates {
		clean := strings.TrimSpace(cand)
		if clean != "" {
			if _, exists := targetSet[clean]; !exists {
				targetSet[clean] = struct{}{}
				targetList = append(targetList, clean)
			}
		}
	}

	for _, office := range strings.Split(copyOffices, ",") {
		clean := strings.TrimSpace(office)
		if clean != "" {
			if _, exists := targetSet[clean]; !exists {
				targetSet[clean] = struct{}{}
				targetList = append(targetList, clean)
			}
		}
	}
	allTargets := strings.Join(targetList, ",")

	// 8. Determine shipment route offices
	shipmentOriginOffice := cmd.ShipmentOriginOffice
	if shipmentOriginOffice == "" {
		shipmentOriginOffice = originOffice
	}
	shipmentTargetOffice := cmd.ShipmentTargetOffice
	if shipmentTargetOffice == "" {
		shipmentTargetOffice = destinationOffice
	}

	// 9. Resolve ID_Pelanggan (must be non-null integer in cchentri)
	customerID := cmd.CustomerID
	if customerID <= 0 {
		// Try finding existing customer by phone number
		if cmd.CustomerPhone != "" {
			_ = repository.db.QueryRowContext(ctx,
				"SELECT ID_Pelanggan FROM cchentricus WHERE Nomor_HP = ? LIMIT 1",
				cmd.CustomerPhone,
			).Scan(&customerID)
		}

		// If still not found, auto-register customer profile into cchentricus
		if customerID <= 0 {
			res, insertErr := repository.db.ExecContext(ctx,
				"INSERT INTO cchentricus (Nama_Lengkap, Email, Nomor_HP, Alamat, Tanggal_Tambah, Ditambah_Oleh) VALUES (?, ?, ?, ?, NOW(), ?)",
				cmd.CustomerName, cmd.CustomerEmail, cmd.CustomerPhone, cmd.CustomerAddress, cmd.CreatingUsername,
			)
			if insertErr == nil {
				newID, _ := res.LastInsertId()
				if newID > 0 {
					customerID = newID
				}
			}
		}

		// Fallback to default ID 1 if table insert fails
		if customerID <= 0 {
			customerID = 1
		}
	}

	// Start database transaction
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return complaints.CreateComplaintResult{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	// 10. Insert main complaint into cchentri
	_, err = tx.ExecContext(ctx, insertComplaintSQL,
		complaintID,             // ID_Pengaduan
		historyID,               // ID_Histori
		customerID,              // ID_Pelanggan
		cmd.CustomerName,        // Nama_Pelanggan
		cmd.CustomerEmail,       // Email_Pelanggan
		cmd.CustomerPhone,       // Nomor_HP_Pelanggan
		cmd.CustomerAddress,     // Alamat_Pelanggan
		originOffice,            // Kantor_Asal
		destinationOffice,       // Kantor_Tujuan
		copyOffices,             // Kantor_Tembusan
		allTargets,              // Semua_Tujuan
		cmd.ComplaintTypeCode,   // Jenis_Pengaduan
		cmd.ComplaintSourceCode, // Sumber_Pengaduan
		cmd.ShipmentTypeCode,    // Jenis_Kiriman
		cmd.ShipmentNumber,      // Nomor_Kiriman
		now,                     // Tanggal_Pengaduan
		shipmentOriginOffice,    // Kantor_Asal_Kiriman
		shipmentTargetOffice,    // Kantor_Tujuan_Kiriman
		cmd.Summary,             // Ringkasan_Pengaduan
		cmd.Description,         // Uraian_Pengaduan
		initialStatus,           // Status_Akhir
		now,                     // Tanggal_Status
		originOffice,            // Kantor_Status
		"0",                     // Request_Status (0 = Normal)
		now,                     // Tanggal_Tambah
		cmd.CreatingUsername,    // Ditambah_Oleh
		cmd.CreatingUsername,    // Diubah_Oleh
		now,                     // Tanggal_Ubah
	)
	if err != nil {
		return complaints.CreateComplaintResult{}, fmt.Errorf("insert complaint: %w", err)
	}

	// 11. Insert initial status history into cchentrimas
	_, err = tx.ExecContext(ctx, insertComplaintHistorySQL,
		complaintID,              // ID_Pengaduan
		historyID,                // ID_Histori
		initialStatus,            // Status_Update
		originOffice,             // Kantor_Asal_Update
		allTargets,               // Kantor_Tujuan_Update
		now,                      // Tanggal_Update
		initialStatusDescription, // Deskripsi_Update
		cmd.CreatingUsername,     // Petugas_Update
		0,                        // Durasi_Antar_Status (0 for initial)
	)
	if err != nil {
		return complaints.CreateComplaintResult{}, fmt.Errorf("insert initial history: %w", err)
	}

	// 12. Insert case summary into cchmas
	_, _ = tx.ExecContext(ctx, insertComplaintCaseSQL, complaintID, cmd.Summary)

	// 13. Insert destination tracking entries into cchentridet
	for _, target := range targetList {
		if target != "" {
			_, _ = tx.ExecContext(ctx, insertComplaintTargetSQL,
				complaintID,
				historyID,
				initialStatus,
				originOffice,
				target,
			)
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return complaints.CreateComplaintResult{}, fmt.Errorf("commit transaction: %w", err)
	}

	return complaints.CreateComplaintResult{
		ComplaintID:   complaintID,
		CreatedAt:     now,
		InitialStatus: initialStatus,
	}, nil
}
