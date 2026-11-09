package content

import (
	"context"
	"strings"
)

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) GetAbout(ctx context.Context, language string) (AboutContent, error) {
	if s == nil || s.repository == nil {
		return AboutContent{}, ErrServiceNotConfigured
	}
	language = strings.TrimSpace(language)
	if language == "" {
		language = "id"
	}
	return s.repository.GetAbout(ctx, language)
}

func (s *Service) GetTerms(ctx context.Context, language string) (TermsContent, error) {
	if s == nil || s.repository == nil {
		return TermsContent{}, ErrServiceNotConfigured
	}
	language = strings.TrimSpace(language)
	if language == "" {
		language = "id"
	}
	return s.repository.GetTerms(ctx, language)
}

func (s *Service) GetHelpContext(ctx context.Context, page string, language string) (HelpContext, error) {
	if s == nil || s.repository == nil {
		return HelpContext{}, ErrServiceNotConfigured
	}
	page = strings.TrimSpace(page)
	if page == "" {
		page = "dashboard2"
	}
	language = strings.TrimSpace(language)
	if language == "" {
		language = "id"
	}
	return s.repository.GetHelpContext(ctx, page, language)
}

func (s *Service) ListHelpTopics(ctx context.Context, language string) ([]HelpTopicItem, error) {
	if s == nil || s.repository == nil {
		return nil, ErrServiceNotConfigured
	}
	language = strings.TrimSpace(language)
	if language == "" {
		language = "id"
	}
	return s.repository.ListHelpTopics(ctx, language)
}
