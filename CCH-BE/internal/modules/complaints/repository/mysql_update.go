package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cch.local/backend/internal/modules/complaints"
)

// updateComplaintSQL memperbarui data pengaduan pada tabel `cchentri`.
//
// PENTING: nama kolom harus persis sama dengan skema `cchentri`. Tiga kolom
// berikut pernah salah tulis dan menyebabkan HTTP 400 (MySQL error 1054
// "Unknown column") pada setiap upaya ubah data:
//
//	Telepon_Pelanggan -> Nomor_HP_Pelanggan
//	Jenis_Aduan       -> Jenis_Pengaduan
//	Sumber_Aduan      -> Sumber_Pengaduan
//
// Jalur create di mysql_create.go sudah memakai nama yang benar; jalur update
// ini yang tertinggal. Jangan mengubah nama kolom di sini tanpa memverifikasi
// lawan `SHOW COLUMNS FROM cchentri`.
const updateComplaintSQL = `UPDATE cchentri SET
	Nama_Pelanggan = ?,
	Email_Pelanggan = ?,
	Nomor_HP_Pelanggan = ?,
	Alamat_Pelanggan = ?,
	Jenis_Pengaduan = ?,
	Sumber_Pengaduan = ?,
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
	ID_Histori,
	Status_Update,
	Kantor_Asal_Update,
	Kantor_Tujuan_Update,
	Deskripsi_Update,
	Tanggal_Update,
	Petugas_Update,
	Durasi_Antar_Status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

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
	var allTargets string
	checkQuery := `SELECT Status_Akhir, Kantor_Asal, COALESCE(Semua_Tujuan, '') FROM cchentri WHERE ID_Pengaduan = ? FOR UPDATE`
	err = tx.QueryRowContext(ctx, checkQuery, cmd.ComplaintID).Scan(&currentStatus, &originOffice, &allTargets)
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

	// Generate unique legacy format ID_Histori (16 char: YYYYMMDDHHMMSS + 2-digit msec)
	msec := fmt.Sprintf("%02d", (now.Nanosecond()/10000000)%100)
	historyID := now.Format("20060102150405") + msec

	actingOffice := cmd.UpdatingOfficeCode
	if actingOffice == "" {
		actingOffice = originOffice
	}

	// Append audit history log in cchentrimas
	historyDesc := fmt.Sprintf("Data pengaduan diperbarui oleh %s", cmd.UpdatingUsername)
	_, err = tx.ExecContext(ctx, insertUpdateHistorySQL,
		cmd.ComplaintID,
		historyID,
		currentStatus,
		actingOffice,
		allTargets,
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
