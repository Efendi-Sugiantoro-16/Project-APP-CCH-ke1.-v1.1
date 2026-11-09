package devauth

import (
	"testing"

	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/config"
)

func TestDevAuthTokenCanBeVerifiedByJWTVerifier(t *testing.T) {
	// Setup DevAuth handler
	settings := config.DevAuthSettings{
		Enabled:       true,
		DefaultOffice: "40005CC",
		DefaultRole:   "CS Officer",
	}
	jwtSettings := config.JWTSettings{
		Secret: "test-secret-with-at-least-32-bytes-long",
		Issuer: "cch-test",
	}
	handler := NewHandler(settings, jwtSettings, nil)

	// Generate token
	user := &DBUser{
		Username:      "pilot.dev",
		Office:        "40005CC",
		UserLevel:     "3",
		UserLevelName: "CS Officer",
		ReportTo:      "",
		Activated:     "Y",
	}
	token, err := handler.generateLegacyFormatJWT(user)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	// Create verifier with same settings
	verifier, err := authentication.NewJWTVerifier(jwtSettings)
	if err != nil {
		t.Fatalf("create verifier: %v", err)
	}

	// Verify the token
	identity, err := verifier.Verify(token)
	if err != nil {
		t.Fatalf("verify token: %v", err)
	}

	// Validate identity
	if identity.Username != "pilot.dev" {
		t.Errorf("username = %q, want %q", identity.Username, "pilot.dev")
	}
	if identity.OfficeCode != "40005CC" {
		t.Errorf("office = %q, want %q", identity.OfficeCode, "40005CC")
	}
	if identity.UserLevelID != "3" {
		t.Errorf("user level = %q, want %q", identity.UserLevelID, "3")
	}
}
