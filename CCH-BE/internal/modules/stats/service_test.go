package stats

import (
	"context"
	"errors"
	"testing"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type accessLoaderStub struct {
	access authorization.AccountAccess
	table  string
}

func (loader *accessLoaderStub) Load(_ context.Context, _ authentication.VerifiedIdentity, table string) (authorization.AccountAccess, error) {
	loader.table = table
	return loader.access, nil
}

type repositoryStub struct {
	called string
}

func (repo *repositoryStub) GetSummary(_ context.Context) (Summary, error) {
	repo.called = "summary"
	return Summary{TotalHits: 100, TotalUniqueVisitors: 50}, nil
}

func (repo *repositoryStub) GetHourly(_ context.Context, _, _, _ int) ([]HourlyStat, error) {
	repo.called = "hourly"
	return []HourlyStat{{Hour: 10, Hits: 5}}, nil
}

func (repo *repositoryStub) GetDaily(_ context.Context, _, _ int) ([]DailyStat, error) {
	repo.called = "daily"
	return []DailyStat{{Year: 2026, Month: 10, Date: 30, Hits: 20}}, nil
}

func (repo *repositoryStub) GetMonthly(_ context.Context, _ int) ([]MonthlyStat, error) {
	repo.called = "monthly"
	return []MonthlyStat{{Year: 2026, Month: 10, Hits: 100}}, nil
}

func (repo *repositoryStub) GetYearly(_ context.Context) ([]YearlyStat, error) {
	repo.called = "yearly"
	return []YearlyStat{{Year: 2026, Hits: 1000}}, nil
}

func (repo *repositoryStub) ListVisitorLogs(_ context.Context, _, _ int, _ string) (VisitorLogPage, error) {
	repo.called = "visitors"
	return VisitorLogPage{Data: []VisitorLog{{IPAddress: "127.0.0.1", Counter: 10}}, Total: 1}, nil
}

func (repo *repositoryStub) RecordHit(_ context.Context, _, _ string) error {
	repo.called = "record_hit"
	return nil
}

func TestServiceAuthorizedAndUnauthorized(t *testing.T) {
	admin := authentication.VerifiedIdentity{Username: "superadmin", UserLevelID: "-1"}
	viewer := authentication.VerifiedIdentity{Username: "viewer"}

	loader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{3}, PermissionMask: int64(authorization.ActionView)}}
	repo := &repositoryStub{}
	service := NewService(authorization.NewAccessService(loader), repo)

	// Admin access to summary
	summary, err := service.GetSummary(context.Background(), admin)
	if err != nil {
		t.Fatalf("Admin GetSummary failed: %v", err)
	}
	if summary.TotalHits != 100 || repo.called != "summary" {
		t.Fatalf("Admin GetSummary unexpected: %#v", summary)
	}

	// Viewer with ActionView access to trends
	trends, err := service.GetTrends(context.Background(), viewer, "hourly", 2026, 10, 30)
	if err != nil {
		t.Fatalf("Viewer GetTrends failed: %v", err)
	}
	if len(trends.Hourly) != 1 || repo.called != "hourly" {
		t.Fatalf("Viewer GetTrends unexpected: %#v", trends)
	}

	// Unauthorized user without ActionView
	unauthLoader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{3}, PermissionMask: 0}}
	unauthService := NewService(authorization.NewAccessService(unauthLoader), repo)
	_, err = unauthService.GetSummary(context.Background(), viewer)
	if !errors.Is(err, authorization.ErrPermissionDenied) {
		t.Fatalf("Unauth GetSummary got %v, want ErrPermissionDenied", err)
	}

	// Record hit needs no auth
	if err := service.RecordHit(context.Background(), "127.0.0.1", "Chrome"); err != nil {
		t.Fatalf("RecordHit failed: %v", err)
	}
	if repo.called != "record_hit" {
		t.Fatalf("RecordHit called = %s, want record_hit", repo.called)
	}
}
