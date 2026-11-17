package content

import "context"

type Repository interface {
	GetAbout(ctx context.Context, language string) (AboutContent, error)
	GetTerms(ctx context.Context, language string) (TermsContent, error)
	GetHelpContext(ctx context.Context, page string, language string) (HelpContext, error)
	ListHelpTopics(ctx context.Context, language string) ([]HelpTopicItem, error)
}
