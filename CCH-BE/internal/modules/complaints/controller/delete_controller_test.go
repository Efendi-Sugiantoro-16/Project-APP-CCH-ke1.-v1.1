package controller_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/modules/complaints/controller"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type deleteStubVerifier struct {
	identity authentication.VerifiedIdentity
}

func (s deleteStubVerifier) Verify(string) (authentication.VerifiedIdentity, error) {
	return s.identity, nil
}

type mockDeleter struct {
	deleteFunc func(ctx context.Context, identity authentication.VerifiedIdentity, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error)
}

func (m *mockDeleter) DeleteComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error) {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, identity, cmd)
	}
	return complaints.DeleteComplaintResult{}, nil
}

func TestDeleteController(t *testing.T) {
	staffIdentity := authentication.VerifiedIdentity{Username: "petugas.cs", OfficeCode: "40005CC"}

	t.Run("DELETE /api/v1/complaints/:id returns 200", func(t *testing.T) {
		deleter := &mockDeleter{
			deleteFunc: func(_ context.Context, _ authentication.VerifiedIdentity, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error) {
				return complaints.DeleteComplaintResult{
					ComplaintID: cmd.ComplaintID,
					Mode:        "cancelled",
					DeletedAt:   time.Now(),
					Message:     "Cancelled",
				}, nil
			},
		}

		registrar := httpapi.AuthenticatedRouteModule(deleteStubVerifier{identity: staffIdentity}, controller.NewDeleteController(deleter))
		app := httpapi.NewServer(nil, nil, registrar)

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/complaints/CMP123?reason=Test", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("DELETE /api/v1/complaints/:id not found returns 404", func(t *testing.T) {
		deleter := &mockDeleter{
			deleteFunc: func(_ context.Context, _ authentication.VerifiedIdentity, _ complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error) {
				return complaints.DeleteComplaintResult{}, complaints.ErrComplaintNotFound
			},
		}

		registrar := httpapi.AuthenticatedRouteModule(deleteStubVerifier{identity: staffIdentity}, controller.NewDeleteController(deleter))
		app := httpapi.NewServer(nil, nil, registrar)

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/complaints/UNKNOWN", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res.StatusCode)
		}
	})
}
