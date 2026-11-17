package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cch.local/backend/internal/modules/complaints"
)

const updateComplaintSQL = `UPDATE cchentri SET
	Nama_Pelanggan = ?,
	Email_Pelanggan = ?,
	Telepon_Pelanggan = ?,
	Alamat_Pelanggan = ?,
	Jenis_Aduan = ?,
	Sumber_Aduan = ?,
	Jenis_Kiriman = ?,
	Nomor_Kiriman = ?,
	Kantor_Asal_Kiriman = ?,
	Kantor_Tujuan_Kiriman = ?,
	Ringkasan_Pengaduan = ?,
	Uraian_Pengaduan = ?,
	Diubah_Oleh = ?,
	Tanggal_Ubah = ?
WHERE ID_Pengaduan = ?`

const insertUpdateHistorySQL = `INSERT INTO cchentrimas (
	ID_Pengaduan,
	Status_Update,
	Kantor_Asal_Update,
	Deskripsi_Update,
	Tanggal_Update,
	Petugas_Update,
	Durasi_Antar_Status
) VALUES (?, ?, ?, ?, ?, ?, ?)`

// UpdateComplaint updates an existing complaint record in MySQL within an atomic transaction
func (repository *MySQLComplaintRepository) UpdateComplaint(ctx context.Context, cmd complaints.UpdateComplaintCommand) (complaints.UpdateComplaintResult, error) {
	if repository == nil || repository.db == nil {
		return complaints.UpdateComplaintResult{}, ErrRepositoryNotConfigured
	}

	now := time.Now()

	// Begin atomic transaction
	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return complaints.UpdateComplaintResult{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Check existing complaint and lock row
	var currentStatus string
	var originOffice string
	checkQuery := `SELECT Status_Akhir, Kantor_Asal FROM cchentri WHERE ID_Pengaduan = ? FOR UPDATE`
	err = tx.QueryRowContext(ctx, checkQuery, cmd.ComplaintID).Scan(&currentStatus, &originOffice)
	if err != nil {
		if err == sql.ErrNoRows {
			return complaints.UpdateComplaintResult{}, complaints.ErrComplaintNotFound
		}
		return complaints.UpdateComplaintResult{}, fmt.Errorf("query existing complaint: %w", err)
	}

	// Guard: Terminal status 109 cannot be modified
	if currentStatus == "109" {
		return complaints.UpdateComplaintResult{}, complaints.ErrComplaintClosed
	}

	// Shipment origin defaults to creating/origin office if blank
	shipmentOrigin := cmd.ShipmentOriginOffice
	if shipmentOrigin == "" {
		shipmentOrigin = originOffice
	}

	// Execute Update on cchentri
	_, err = tx.ExecContext(ctx, updateComplaintSQL,
		cmd.CustomerName,
		cmd.CustomerEmail,
		cmd.CustomerPhone,
		cmd.CustomerAddress,
		cmd.ComplaintTypeCode,
		cmd.ComplaintSourceCode,
		cmd.ShipmentTypeCode,
		cmd.ShipmentNumber,
		shipmentOrigin,
		cmd.ShipmentTargetOffice,
		cmd.Summary,
		cmd.Description,
		cmd.UpdatingUsername,
		now,
		cmd.ComplaintID,
	)
	if err != nil {
		return complaints.UpdateComplaintResult{}, fmt.Errorf("update complaint: %w", err)
	}

	// Append audit history log in cchentrimas
	historyDesc := fmt.Sprintf("Data pengaduan diperbarui oleh %s", cmd.UpdatingUsername)
	_, err = tx.ExecContext(ctx, insertUpdateHistorySQL,
		cmd.ComplaintID,
		currentStatus,
		cmd.UpdatingOfficeCode,
		historyDesc,
		now,
		cmd.UpdatingUsername,
		0,
	)
	if err != nil {
		return complaints.UpdateComplaintResult{}, fmt.Errorf("insert update history: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return complaints.UpdateComplaintResult{}, fmt.Errorf("commit update transaction: %w", err)
	}

	return complaints.UpdateComplaintResult{
		ComplaintID:   cmd.ComplaintID,
		UpdatedAt:     now,
		CurrentStatus: currentStatus,
	}, nil
}
