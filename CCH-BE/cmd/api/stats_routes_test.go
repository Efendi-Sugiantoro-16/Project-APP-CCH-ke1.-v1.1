package main

import (
	"database/sql"
	"testing"

	"cch.local/backend/internal/platform/config"
)

func TestStatsRoutesAreDisabledByDefault(t *testing.T) {
	registrar, publicRegistrar, err := statsRoutes(config.Settings{}, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if registrar != nil {
		t.Fatal("expected registrar to be nil when disabled")
	}
	if publicRegistrar != nil {
		t.Fatal("expected publicRegistrar to be nil when disabled")
	}
}

func TestStatsRoutesRequireDatabase(t *testing.T) {
	settings := config.Settings{
		StatsAPIEnabled: true,
	}
	_, _, err := statsRoutes(settings, nil)
	if err != errStatsRouteRequiresDatabase {
		t.Fatalf("got %v, want errStatsRouteRequiresDatabase", err)
	}
}

func TestStatsRoutesRequireJWT(t *testing.T) {
	db := &sql.DB{}
	settings := config.Settings{
		StatsAPIEnabled: true,
	}
	_, _, err := statsRoutes(settings, db)
	if err == nil {
		t.Fatal("expected error when JWT secret missing")
	}
}
