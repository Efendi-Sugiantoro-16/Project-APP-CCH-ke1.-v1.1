package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type stubComplaintUpdater struct {
	result complaints.UpdateComplaintResult
	err    error
	called bool
	cmd    complaints.UpdateComplaintCommand
}

func (s *stubComplaintUpdater) UpdateComplaint(_ context.Context, _ authentication.VerifiedIdentity, cmd complaints.UpdateComplaintCommand) (complaints.UpdateComplaintResult, error) {
	s.called = true
	s.cmd = cmd
	return s.result, s.err
}

func updateTestApp(identity authentication.VerifiedIdentity, updater ComplaintUpdater) *fiber.App {
	registrar := httpapi.AuthenticatedRouteModule(stubTokenVerifier{identity: identity}, NewUpdateController(updater))
	return httpapi.NewServer(nil, nil, registrar)
}

func TestUpdateController(t *testing.T) {
	identity := authentication.VerifiedIdentity{Username: "cs.officer", OfficeCode: "40005CC"}
	now := time.Now()

	validBody := `{
		"customerName": "Budi Santoso",
		"customerPhone": "081234567890",
		"complaintTypeCode": 1,
		"complaintSourceCode": 2,
		"shipmentTypeCode": "POS_KILAT",
		"shipmentNumber": "P2610230001",
		"summary": "Paket kilat terlambat datang",
		"description": "Kiriman dokumen penting melewati SLA estimasi tiba."
	}`

	t.Run("successful update returns 200", func(t *testing.T) {
		updater := &stubComplaintUpdater{
			result: complaints.UpdateComplaintResult{
				ComplaintID:   "CCH-20261023-00001",
				UpdatedAt:     now,
				CurrentStatus: "101",
			},
		}
		app := updateTestApp(identity, updater)
		req := httptest.NewRequest(http.MethodPut, "/api/v1/complaints/CCH-20261023-00001", strings.NewReader(validBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Authorization", "Bearer valid-token")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
		}
		if !updater.called {
			t.Error("expected service to be called")
		}
		if updater.cmd.ComplaintID != "CCH-20261023-00001" {
			t.Errorf("expected complaint ID CCH-20261023-00001, got %s", updater.cmd.ComplaintID)
		}
	})

	t.Run("complaint not found returns 404", func(t *testing.T) {
		updater := &stubComplaintUpdater{
			err: complaints.ErrComplaintNotFound,
		}
		app := updateTestApp(identity, updater)
		req := httptest.NewRequest(http.MethodPut, "/api/v1/complaints/NOTFOUND-001", strings.NewReader(validBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Authorization", "Bearer valid-token")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404 Not Found, got %d", resp.StatusCode)
		}
	})

	t.Run("closed complaint returns 409 conflict", func(t *testing.T) {
		updater := &stubComplaintUpdater{
			err: complaints.ErrComplaintClosed,
		}
		app := updateTestApp(identity, updater)
		req := httptest.NewRequest(http.MethodPut, "/api/v1/complaints/CLOSED-001", strings.NewReader(validBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Authorization", "Bearer valid-token")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if resp.StatusCode != http.StatusConflict {
			t.Fatalf("expected 409 Conflict, got %d", resp.StatusCode)
		}
	})
}
