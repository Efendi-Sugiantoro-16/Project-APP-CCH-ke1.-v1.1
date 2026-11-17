package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"cch.local/backend/internal/modules/complaints"
)

func (repository *MySQLComplaintRepository) DeleteComplaint(ctx context.Context, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error) {
	if repository == nil || repository.db == nil {
		return complaints.DeleteComplaintResult{}, ErrRepositoryNotConfigured
	}

	if err := cmd.Validate(); err != nil {
		return complaints.DeleteComplaintResult{}, err
	}

	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return complaints.DeleteComplaintResult{}, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock complaint row and check existence
	var currentStatus string
	var originOffice string
	var currentRequestStatus sql.NullString
	checkQuery := `SELECT Status_Akhir, Kantor_Asal, Request_Status FROM cchentri WHERE ID_Pengaduan = ? FOR UPDATE`
	err = tx.QueryRowContext(ctx, checkQuery, cmd.ComplaintID).Scan(&currentStatus, &originOffice, &currentRequestStatus)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return complaints.DeleteComplaintResult{}, complaints.ErrComplaintNotFound
		}
		return complaints.DeleteComplaintResult{}, fmt.Errorf("query complaint for deletion: %w", err)
	}

	now := time.Now()

	// If Hard Delete (Force) is requested (e.g. Superadmin or purging erroneously created ticket)
	if cmd.Force {
		// Clean up related rows in proper order
		if _, err := tx.ExecContext(ctx, `DELETE FROM cchentridet WHERE ID_Pengaduan = ?`, cmd.ComplaintID); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("delete cchentridet: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM cchentrimas WHERE ID_Pengaduan = ?`, cmd.ComplaintID); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("delete cchentrimas: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM cchentridok WHERE ID_Pengaduan = ?`, cmd.ComplaintID); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("delete cchentridok: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM cchfu WHERE ID_Pengaduan = ?`, cmd.ComplaintID); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("delete cchfu: %w", err)
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM cchentri WHERE ID_Pengaduan = ?`, cmd.ComplaintID); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("delete cchentri: %w", err)
		}

		if err := tx.Commit(); err != nil {
			return complaints.DeleteComplaintResult{}, fmt.Errorf("commit transaction: %w", err)
		}

		return complaints.DeleteComplaintResult{
			ComplaintID: cmd.ComplaintID,
			Mode:        "deleted",
			DeletedAt:   now,
			Message:     fmt.Sprintf("Pengaduan %s berhasil dihapus permanen.", cmd.ComplaintID),
		}, nil
	}

	// Soft-delete / Cancellation
	// Completed tickets (109) cannot be cancelled without formal audit procedure
	if currentStatus == "109" {
		return complaints.DeleteComplaintResult{}, complaints.ErrCannotDeleteCompletedComplaint
	}

	// Update cchentri request status to '1' (Mohon Ditutup / Dibatalkan)
	updateSQL := `UPDATE cchentri SET Request_Status = '1', Diubah_Oleh = ?, Tanggal_Ubah = ? WHERE ID_Pengaduan = ?`
	if _, err := tx.ExecContext(ctx, updateSQL, cmd.ActorUsername, now, cmd.ComplaintID); err != nil {
		return complaints.DeleteComplaintResult{}, fmt.Errorf("update complaint request status: %w", err)
	}

	// Insert audit record into cchentrimas
	insertHistorySQL := `INSERT INTO cchentrimas (
		ID_Pengaduan,
		Status_Update,
		Kantor_Asal_Update,
		Deskripsi_Update,
		Tanggal_Update,
		Petugas_Update,
		Durasi_Antar_Status
	) VALUES (?, ?, ?, ?, ?, ?, ?)`

	historyDesc := fmt.Sprintf("Pengaduan dibatalkan: %s", cmd.Reason)
	actorOffice := cmd.ActorOfficeCode
	if actorOffice == "" {
		actorOffice = originOffice
	}

	if _, err := tx.ExecContext(ctx, insertHistorySQL,
		cmd.ComplaintID,
		"109", // Status Selesai / Ditutup
		actorOffice,
		historyDesc,
		now,
		cmd.ActorUsername,
		0,
	); err != nil {
		return complaints.DeleteComplaintResult{}, fmt.Errorf("insert cancellation history: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return complaints.DeleteComplaintResult{}, fmt.Errorf("commit cancellation transaction: %w", err)
	}

	return complaints.DeleteComplaintResult{
		ComplaintID: cmd.ComplaintID,
		Mode:        "cancelled",
		DeletedAt:   now,
		Message:     fmt.Sprintf("Pengaduan %s berhasil dibatalkan dan ditutup.", cmd.ComplaintID),
	}, nil
}
