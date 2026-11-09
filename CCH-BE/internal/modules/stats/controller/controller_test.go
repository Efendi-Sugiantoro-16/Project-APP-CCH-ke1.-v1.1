package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/stats"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type serviceStub struct {
	summary  stats.Summary
	trends   stats.Trends
	page     stats.VisitorLogPage
	hitCalls int
	err      error
}

func (s *serviceStub) GetSummary(_ context.Context, _ authentication.VerifiedIdentity) (stats.Summary, error) {
	return s.summary, s.err
}

func (s *serviceStub) GetTrends(_ context.Context, _ authentication.VerifiedIdentity, _ string, _, _, _ int) (stats.Trends, error) {
	return s.trends, s.err
}

func (s *serviceStub) ListVisitorLogs(_ context.Context, _ authentication.VerifiedIdentity, _, _ int, _ string) (stats.VisitorLogPage, error) {
	return s.page, s.err
}

func (s *serviceStub) RecordHit(_ context.Context, _, _ string) error {
	s.hitCalls++
	return s.err
}

type tokenVerifierStub struct{}

func (tokenVerifierStub) Verify(token string) (authentication.VerifiedIdentity, error) {
	if token != "valid-token" {
		return authentication.VerifiedIdentity{}, authentication.ErrInvalidToken
	}
	return authentication.VerifiedIdentity{Username: "security.admin", UserLevelID: "-1"}, nil
}

func newTestApp(service Service) *fiber.App {
	ctrl := New(service)
	return httpapi.NewServerWithRoot(
		nil,
		func(app fiber.Router) {
			ctrl.RegisterPublic(app)
		},
		httpapi.AuthenticatedRouteModule(tokenVerifierStub{}, ctrl),
	)
}

func authorizedRequest(method, target string) *http.Request {
	req := httptest.NewRequest(method, target, nil)
	req.Header.Set("X-Authorization", "Bearer valid-token")
	return req
}

func TestControllerStatsEndpoints(t *testing.T) {
	stub := &serviceStub{
		summary: stats.Summary{TotalHits: 1234, TotalUniqueVisitors: 567},
		trends:  stats.Trends{Period: "daily", Year: 2026, Month: 10},
		page:    stats.VisitorLogPage{Data: []stats.VisitorLog{{IPAddress: "192.168.1.1"}}, Total: 1},
	}
	app := newTestApp(stub)

	// Summary
	res, err := app.Test(authorizedRequest(http.MethodGet, "/api/v1/admin/stats/summary"))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Summary status = %d, want 200", res.StatusCode)
	}

	// Trends
	res, err = app.Test(authorizedRequest(http.MethodGet, "/api/v1/admin/stats/trends?period=daily&year=2026&month=10"))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Trends status = %d, want 200", res.StatusCode)
	}

	// Visitors
	res, err = app.Test(authorizedRequest(http.MethodGet, "/api/v1/admin/stats/visitors?limit=10&offset=0"))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Visitors status = %d, want 200", res.StatusCode)
	}

	// Public Hit Beacon
	hitReq := httptest.NewRequest(http.MethodPost, "/api/v1/stats/hit", nil)
	hitReq.Header.Set("User-Agent", "Mozilla/5.0 Chrome/120")
	hitReq.Header.Set("X-Forwarded-For", "127.0.0.1")
	res, err = app.Test(hitReq)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK || stub.hitCalls != 1 {
		t.Fatalf("Hit beacon status = %d, calls = %d, want 200/1", res.StatusCode, stub.hitCalls)
	}

	// Unauthenticated admin route
	res, err = app.Test(httptest.NewRequest(http.MethodGet, "/api/v1/admin/stats/summary", nil))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusUnauthorized {
		t.Fatalf("Unauth status = %d, want 401", res.StatusCode)
	}
}
