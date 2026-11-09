package controller_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/gagalxray"
	"cch.local/backend/internal/modules/gagalxray/controller"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type stubTokenVerifier struct {
	identity authentication.VerifiedIdentity
}

func (s stubTokenVerifier) Verify(string) (authentication.VerifiedIdentity, error) {
	return s.identity, nil
}

type mockGagalXrayService struct {
	listFunc   func(ctx context.Context, identity authentication.VerifiedIdentity, query gagalxray.ListQuery) (gagalxray.Page, error)
	getFunc    func(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) (gagalxray.KirimanGagalXray, error)
	createFunc func(ctx context.Context, identity authentication.VerifiedIdentity, cmd gagalxray.CreateCommand) (gagalxray.KirimanGagalXray, error)
	updateFunc func(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string, cmd gagalxray.UpdateCommand) (gagalxray.KirimanGagalXray, error)
	deleteFunc func(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) error
	statsFunc  func(ctx context.Context, identity authentication.VerifiedIdentity) (gagalxray.Stats, error)
}

func (m *mockGagalXrayService) List(ctx context.Context, identity authentication.VerifiedIdentity, query gagalxray.ListQuery) (gagalxray.Page, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, identity, query)
	}
	return gagalxray.Page{}, nil
}

func (m *mockGagalXrayService) Get(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) (gagalxray.KirimanGagalXray, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, identity, asal, tujuan, idKiriman, kantongLama)
	}
	return gagalxray.KirimanGagalXray{}, nil
}

func (m *mockGagalXrayService) Create(ctx context.Context, identity authentication.VerifiedIdentity, cmd gagalxray.CreateCommand) (gagalxray.KirimanGagalXray, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, identity, cmd)
	}
	return gagalxray.KirimanGagalXray{}, nil
}

func (m *mockGagalXrayService) Update(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string, cmd gagalxray.UpdateCommand) (gagalxray.KirimanGagalXray, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, identity, asal, tujuan, idKiriman, kantongLama, cmd)
	}
	return gagalxray.KirimanGagalXray{}, nil
}

func (m *mockGagalXrayService) Delete(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, identity, asal, tujuan, idKiriman, kantongLama)
	}
	return nil
}

func (m *mockGagalXrayService) Stats(ctx context.Context, identity authentication.VerifiedIdentity) (gagalxray.Stats, error) {
	if m.statsFunc != nil {
		return m.statsFunc(ctx, identity)
	}
	return gagalxray.Stats{}, nil
}

func testApp(identity authentication.VerifiedIdentity, service controller.Service) *fiber.App {
	registrar := httpapi.AuthenticatedRouteModule(stubTokenVerifier{identity: identity}, controller.New(service))
	return httpapi.NewServer(nil, nil, registrar)
}

func TestGagalXrayController(t *testing.T) {
	staffIdentity := authentication.VerifiedIdentity{Username: "petugas.mwehehe", UserLevelID: "3", OfficeCode: "40005CC"}

	t.Run("GET /api/v1/gagal-xray returns 200 and page", func(t *testing.T) {
		svc := &mockGagalXrayService{
			listFunc: func(_ context.Context, _ authentication.VerifiedIdentity, _ gagalxray.ListQuery) (gagalxray.Page, error) {
				return gagalxray.Page{
					Items: []gagalxray.KirimanGagalXray{
						{IDKiriman: "P2201040023584", KantorAsal: "10000", KantorTujuan: "20000", IDKantongLama: "UNKNOWN"},
					},
					Total: 1,
				}, nil
			},
		}
		app := testApp(staffIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gagal-xray?limit=10&offset=0", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("GET /api/v1/gagal-xray/stats returns stats", func(t *testing.T) {
		svc := &mockGagalXrayService{
			statsFunc: func(_ context.Context, _ authentication.VerifiedIdentity) (gagalxray.Stats, error) {
				return gagalxray.Stats{
					TotalRecords:   31855,
					DaratLautCount: 27033,
				}, nil
			},
		}
		app := testApp(staffIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gagal-xray/stats", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("GET /api/v1/gagal-xray/:asal/:tujuan/:id/:kantong returns item", func(t *testing.T) {
		svc := &mockGagalXrayService{
			getFunc: func(_ context.Context, _ authentication.VerifiedIdentity, asal, tujuan, id, kantong string) (gagalxray.KirimanGagalXray, error) {
				return gagalxray.KirimanGagalXray{
					KantorAsal:    asal,
					KantorTujuan:  tujuan,
					IDKiriman:     id,
					IDKantongLama: kantong,
					IsiKiriman:    "AEROSOL",
				}, nil
			},
		}
		app := testApp(staffIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/gagal-xray/10000/20000/P2201/K01", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("POST /api/v1/gagal-xray creates new record", func(t *testing.T) {
		svc := &mockGagalXrayService{
			createFunc: func(_ context.Context, _ authentication.VerifiedIdentity, cmd gagalxray.CreateCommand) (gagalxray.KirimanGagalXray, error) {
				return gagalxray.KirimanGagalXray{
					KantorAsal:    cmd.KantorAsal,
					KantorTujuan:  cmd.KantorTujuan,
					IDKiriman:     cmd.IDKiriman,
					IDKantongLama: cmd.IDKantongLama,
					IsiKiriman:    cmd.IsiKiriman,
				}, nil
			},
		}
		app := testApp(staffIdentity, svc)
		body, _ := json.Marshal(gagalxray.CreateCommand{
			KantorAsal:    "10000",
			KantorTujuan:  "20000",
			IDKiriman:     "P240901",
			IDKantongLama: "KL01",
			Tanggal:       "2026-10-29",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/gagal-xray", bytes.NewReader(body))
		req.Header.Set("Authorization", "Bearer token")
		req.Header.Set("Content-Type", "application/json")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("expected 201, got %d", res.StatusCode)
		}
	})

	t.Run("DELETE /api/v1/gagal-xray/:asal/:tujuan/:id/:kantong deletes record", func(t *testing.T) {
		svc := &mockGagalXrayService{
			deleteFunc: func(_ context.Context, _ authentication.VerifiedIdentity, asal, tujuan, id, kantong string) error {
				return nil
			},
		}
		app := testApp(staffIdentity, svc)
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/gagal-xray/10000/20000/P2201/K01", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})
}
