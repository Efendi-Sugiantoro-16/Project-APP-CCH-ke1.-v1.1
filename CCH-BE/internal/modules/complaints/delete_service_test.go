package complaints_test

import (
	"context"
	"testing"
	"time"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
)

type mockDeleteRepo struct {
	lastCmd complaints.DeleteComplaintCommand
}

func (m *mockDeleteRepo) DeleteComplaint(ctx context.Context, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error) {
	m.lastCmd = cmd
	if cmd.ComplaintID == "NOT_FOUND" {
		return complaints.DeleteComplaintResult{}, complaints.ErrComplaintNotFound
	}
	if cmd.ComplaintID == "COMPLETED" {
		return complaints.DeleteComplaintResult{}, complaints.ErrCannotDeleteCompletedComplaint
	}
	mode := "cancelled"
	if cmd.Force {
		mode = "deleted"
	}
	return complaints.DeleteComplaintResult{
		ComplaintID: cmd.ComplaintID,
		Mode:        mode,
		DeletedAt:   time.Now(),
		Message:     "Success",
	}, nil
}

func TestDeleteComplaintService(t *testing.T) {
	repo := &mockDeleteRepo{}
	svc := complaints.NewDeleteComplaintService(nil, repo)
	ctx := context.Background()
	identity := authentication.VerifiedIdentity{
		Username:   "cs.petugas",
		OfficeCode: "40005CC",
	}

	t.Run("Cancel complaint returns cancelled result", func(t *testing.T) {
		res, err := svc.DeleteComplaint(ctx, identity, complaints.DeleteComplaintCommand{
			ComplaintID: "CMP001",
			Reason:      "Salah input nomor resi",
			Force:       false,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Mode != "cancelled" {
			t.Fatalf("expected mode cancelled, got %s", res.Mode)
		}
		if repo.lastCmd.ActorUsername != "cs.petugas" {
			t.Fatalf("expected actor cs.petugas, got %s", repo.lastCmd.ActorUsername)
		}
	})

	t.Run("Force delete returns deleted result", func(t *testing.T) {
		res, err := svc.DeleteComplaint(ctx, identity, complaints.DeleteComplaintCommand{
			ComplaintID: "CMP002",
			Force:       true,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if res.Mode != "deleted" {
			t.Fatalf("expected mode deleted, got %s", res.Mode)
		}
	})

	t.Run("Not found returns ErrComplaintNotFound", func(t *testing.T) {
		_, err := svc.DeleteComplaint(ctx, identity, complaints.DeleteComplaintCommand{
			ComplaintID: "NOT_FOUND",
		})
		if err != complaints.ErrComplaintNotFound {
			t.Fatalf("expected ErrComplaintNotFound, got %v", err)
		}
	})

	t.Run("Completed ticket returns ErrCannotDeleteCompletedComplaint", func(t *testing.T) {
		_, err := svc.DeleteComplaint(ctx, identity, complaints.DeleteComplaintCommand{
			ComplaintID: "COMPLETED",
		})
		if err != complaints.ErrCannotDeleteCompletedComplaint {
			t.Fatalf("expected ErrCannotDeleteCompletedComplaint, got %v", err)
		}
	})
}
