package content

import "errors"

var (
	ErrNotFound             = errors.New("content not found")
	ErrRepositoryNotReady   = errors.New("content repository is not configured")
	ErrServiceNotConfigured = errors.New("content service is not configured")
)

type AboutContent struct {
	LanguageCode string `json:"language_code"`
	LanguageName string `json:"language_name"`
	SiteTitle    string `json:"site_title"`
	AboutText    string `json:"about_text"`
}

type TermsContent struct {
	LanguageCode string `json:"language_code"`
	LanguageName string `json:"language_name"`
	SiteTitle    string `json:"site_title"`
	TermsText    string `json:"terms_text"`
}

type HelpContext struct {
	ID            int64  `json:"id"`
	LanguageCode  string `json:"language_code"`
	Topic         string `json:"topic"`
	Description   string `json:"description"`
	DisplayInPage string `json:"display_in_page"`
	Order         int    `json:"order"`
}

type HelpTopicItem struct {
	ID            int64  `json:"id"`
	Topic         string `json:"topic"`
	DisplayInPage string `json:"display_in_page"`
}
