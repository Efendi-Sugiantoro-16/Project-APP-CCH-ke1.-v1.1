package controller

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/content"
)

type mockService struct {
	aboutFunc  func(ctx context.Context, language string) (content.AboutContent, error)
	termsFunc  func(ctx context.Context, language string) (content.TermsContent, error)
	helpFunc   func(ctx context.Context, page string, language string) (content.HelpContext, error)
	topicsFunc func(ctx context.Context, language string) ([]content.HelpTopicItem, error)
}

func (m *mockService) GetAbout(ctx context.Context, language string) (content.AboutContent, error) {
	if m.aboutFunc != nil {
		return m.aboutFunc(ctx, language)
	}
	return content.AboutContent{LanguageCode: language, AboutText: "About Pos Indonesia CCH"}, nil
}

func (m *mockService) GetTerms(ctx context.Context, language string) (content.TermsContent, error) {
	if m.termsFunc != nil {
		return m.termsFunc(ctx, language)
	}
	return content.TermsContent{LanguageCode: language, TermsText: "Terms and conditions 123"}, nil
}

func (m *mockService) GetHelpContext(ctx context.Context, page string, language string) (content.HelpContext, error) {
	if m.helpFunc != nil {
		return m.helpFunc(ctx, page, language)
	}
	return content.HelpContext{DisplayInPage: page, Topic: "Pengaduan", Description: "Panduan Pengaduan CCH"}, nil
}

func (m *mockService) ListHelpTopics(ctx context.Context, language string) ([]content.HelpTopicItem, error) {
	if m.topicsFunc != nil {
		return m.topicsFunc(ctx, language)
	}
	return []content.HelpTopicItem{{ID: 1, Topic: "Dashboard", DisplayInPage: "dashboard2"}}, nil
}

func TestContentControllerJsonEndpoints(t *testing.T) {
	app := fiber.New()
	ctrl := New(&mockService{})
	apiGroup := app.Group("/api/v1")
	ctrl.RegisterApi(apiGroup)

	// 1. Test /api/v1/content/about
	req := httptest.NewRequest(http.MethodGet, "/api/v1/content/about", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	// 2. Test /api/v1/content/terms
	req = httptest.NewRequest(http.MethodGet, "/api/v1/content/terms", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	// 3. Test /api/v1/content/help
	req = httptest.NewRequest(http.MethodGet, "/api/v1/content/help?page=cchentrilist", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
}

func TestContentControllerLegacyCompatibilityEndpoints(t *testing.T) {
	app := fiber.New()
	ctrl := New(&mockService{})
	ctrl.RegisterLegacy(app)

	// 1. Test /loadaboutus
	req := httptest.NewRequest(http.MethodGet, "/loadaboutus", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "About Pos Indonesia CCH") {
		t.Errorf("expected body to contain about text, got: %s", string(body))
	}

	// 2. Test /loadtermsconditions
	req = httptest.NewRequest(http.MethodGet, "/loadtermsconditions", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	body, _ = io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "Terms and conditions 123") {
		t.Errorf("expected body to contain terms text, got: %s", string(body))
	}

	// 3. Test /loadhelponline (Legacy Topic~~~Description contract)
	req = httptest.NewRequest(http.MethodGet, "/loadhelponline?page=cchentrilist", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	body, _ = io.ReadAll(resp.Body)
	if string(body) != "Pengaduan~~~Panduan Pengaduan CCH" {
		t.Errorf("expected legacy format 'Topic~~~Description', got: %s", string(body))
	}

	// 4. Test /printtermsconditions
	req = httptest.NewRequest(http.MethodGet, "/printtermsconditions", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	body, _ = io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "window.print()") {
		t.Errorf("expected print view HTML, got: %s", string(body))
	}
}
