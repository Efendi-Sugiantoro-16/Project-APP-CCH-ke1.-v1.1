package content

import (
	"context"
	"testing"
)

type mockRepository struct {
	aboutFunc  func(ctx context.Context, language string) (AboutContent, error)
	termsFunc  func(ctx context.Context, language string) (TermsContent, error)
	helpFunc   func(ctx context.Context, page string, language string) (HelpContext, error)
	topicsFunc func(ctx context.Context, language string) ([]HelpTopicItem, error)
}

func (m *mockRepository) GetAbout(ctx context.Context, language string) (AboutContent, error) {
	if m.aboutFunc != nil {
		return m.aboutFunc(ctx, language)
	}
	return AboutContent{LanguageCode: language, AboutText: "About Pos Indonesia"}, nil
}

func (m *mockRepository) GetTerms(ctx context.Context, language string) (TermsContent, error) {
	if m.termsFunc != nil {
		return m.termsFunc(ctx, language)
	}
	return TermsContent{LanguageCode: language, TermsText: "Terms and conditions"}, nil
}

func (m *mockRepository) GetHelpContext(ctx context.Context, page string, language string) (HelpContext, error) {
	if m.helpFunc != nil {
		return m.helpFunc(ctx, page, language)
	}
	return HelpContext{DisplayInPage: page, LanguageCode: language, Topic: "Test Topic"}, nil
}

func (m *mockRepository) ListHelpTopics(ctx context.Context, language string) ([]HelpTopicItem, error) {
	if m.topicsFunc != nil {
		return m.topicsFunc(ctx, language)
	}
	return []HelpTopicItem{{ID: 1, Topic: "Dashboard", DisplayInPage: "dashboard2"}}, nil
}

func TestContentServiceDefaults(t *testing.T) {
	repo := &mockRepository{}
	svc := NewService(repo)

	// Test GetAbout defaults to "id"
	about, err := svc.GetAbout(context.Background(), "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if about.LanguageCode != "id" {
		t.Errorf("expected default language 'id', got '%s'", about.LanguageCode)
	}

	// Test GetTerms defaults to "id"
	terms, err := svc.GetTerms(context.Background(), "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if terms.LanguageCode != "id" {
		t.Errorf("expected default language 'id', got '%s'", terms.LanguageCode)
	}

	// Test GetHelpContext defaults
	help, err := svc.GetHelpContext(context.Background(), "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if help.DisplayInPage != "dashboard2" || help.LanguageCode != "id" {
		t.Errorf("expected default page 'dashboard2' and 'id', got '%s' and '%s'", help.DisplayInPage, help.LanguageCode)
	}

	// Test ListHelpTopics
	topics, err := svc.ListHelpTopics(context.Background(), "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(topics) != 1 {
		t.Errorf("expected 1 topic, got %d", len(topics))
	}
}

func TestContentServiceNilRepo(t *testing.T) {
	svc := NewService(nil)
	if _, err := svc.GetAbout(context.Background(), "id"); err != ErrServiceNotConfigured {
		t.Errorf("expected ErrServiceNotConfigured, got %v", err)
	}
}
