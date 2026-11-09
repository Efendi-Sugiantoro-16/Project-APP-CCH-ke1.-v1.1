package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"cch.local/backend/internal/modules/content"
)

type MySQLRepository struct {
	db *sql.DB
}

var _ content.Repository = (*MySQLRepository)(nil)

func NewMySQLRepository(db *sql.DB) *MySQLRepository {
	return &MySQLRepository{db: db}
}

func (r *MySQLRepository) GetAbout(ctx context.Context, language string) (content.AboutContent, error) {
	if r == nil || r.db == nil {
		return content.AboutContent{}, content.ErrRepositoryNotReady
	}
	if language == "" {
		language = "id"
	}

	query := `SELECT Language_Code, Language_Name, Site_Title, About_Text 
FROM cch_languages 
WHERE Language_Code = ? 
LIMIT 1`

	var item content.AboutContent
	err := r.db.QueryRowContext(ctx, query, language).Scan(
		&item.LanguageCode,
		&item.LanguageName,
		&item.SiteTitle,
		&item.AboutText,
	)
	if errors.Is(err, sql.ErrNoRows) {
		// Fallback to default language
		fallbackQuery := `SELECT Language_Code, Language_Name, Site_Title, About_Text 
FROM cch_languages 
WHERE Language_Code = 'id' OR \x60Default\x60 = 'Y' 
ORDER BY CASE WHEN Language_Code = 'id' THEN 0 ELSE 1 END 
LIMIT 1`
		err = r.db.QueryRowContext(ctx, fallbackQuery).Scan(
			&item.LanguageCode,
			&item.LanguageName,
			&item.SiteTitle,
			&item.AboutText,
		)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return content.AboutContent{}, content.ErrNotFound
		}
		return content.AboutContent{}, fmt.Errorf("get about content: %w", err)
	}
	return item, nil
}

func (r *MySQLRepository) GetTerms(ctx context.Context, language string) (content.TermsContent, error) {
	if r == nil || r.db == nil {
		return content.TermsContent{}, content.ErrRepositoryNotReady
	}
	if language == "" {
		language = "id"
	}

	query := `SELECT Language_Code, Language_Name, Site_Title, Terms_And_Condition_Text 
FROM cch_languages 
WHERE Language_Code = ? 
LIMIT 1`

	var item content.TermsContent
	err := r.db.QueryRowContext(ctx, query, language).Scan(
		&item.LanguageCode,
		&item.LanguageName,
		&item.SiteTitle,
		&item.TermsText,
	)
	if errors.Is(err, sql.ErrNoRows) {
		fallbackQuery := `SELECT Language_Code, Language_Name, Site_Title, Terms_And_Condition_Text 
FROM cch_languages 
WHERE Language_Code = 'id' OR \x60Default\x60 = 'Y' 
ORDER BY CASE WHEN Language_Code = 'id' THEN 0 ELSE 1 END 
LIMIT 1`
		err = r.db.QueryRowContext(ctx, fallbackQuery).Scan(
			&item.LanguageCode,
			&item.LanguageName,
			&item.SiteTitle,
			&item.TermsText,
		)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return content.TermsContent{}, content.ErrNotFound
		}
		return content.TermsContent{}, fmt.Errorf("get terms content: %w", err)
	}
	return item, nil
}

func (r *MySQLRepository) GetHelpContext(ctx context.Context, page string, language string) (content.HelpContext, error) {
	if r == nil || r.db == nil {
		return content.HelpContext{}, content.ErrRepositoryNotReady
	}
	if language == "" {
		language = "id"
	}

	query := "SELECT Help_ID, Language, Topic, Description, Display_in_Page, \x60Order\x60 " +
		"FROM cch_help " +
		"WHERE Display_in_Page = ? AND Language = ? " +
		"LIMIT 1"

	var item content.HelpContext
	err := r.db.QueryRowContext(ctx, query, page, language).Scan(
		&item.ID,
		&item.LanguageCode,
		&item.Topic,
		&item.Description,
		&item.DisplayInPage,
		&item.Order,
	)
	if errors.Is(err, sql.ErrNoRows) {
		// Fallback to any language for this page
		fallbackQuery := "SELECT Help_ID, Language, Topic, Description, Display_in_Page, \x60Order\x60 " +
			"FROM cch_help " +
			"WHERE Display_in_Page = ? " +
			"ORDER BY CASE WHEN Language = 'id' THEN 0 ELSE 1 END " +
			"LIMIT 1"
		err = r.db.QueryRowContext(ctx, fallbackQuery, page).Scan(
			&item.ID,
			&item.LanguageCode,
			&item.Topic,
			&item.Description,
			&item.DisplayInPage,
			&item.Order,
		)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return content.HelpContext{}, content.ErrNotFound
		}
		return content.HelpContext{}, fmt.Errorf("get help context: %w", err)
	}
	return item, nil
}

func (r *MySQLRepository) ListHelpTopics(ctx context.Context, language string) ([]content.HelpTopicItem, error) {
	if r == nil || r.db == nil {
		return nil, content.ErrRepositoryNotReady
	}
	if language == "" {
		language = "id"
	}

	query := "SELECT Help_ID, Topic, Display_in_Page " +
		"FROM cch_help " +
		"WHERE (? = '' OR Language = ?) " +
		"ORDER BY \x60Order\x60 ASC, Help_ID ASC"

	rows, err := r.db.QueryContext(ctx, query, language, language)
	if err != nil {
		return nil, fmt.Errorf("list help topics: %w", err)
	}
	defer rows.Close()

	var items []content.HelpTopicItem
	for rows.Next() {
		var item content.HelpTopicItem
		if err := rows.Scan(&item.ID, &item.Topic, &item.DisplayInPage); err != nil {
			return nil, fmt.Errorf("scan help topic: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate help topics: %w", err)
	}
	return items, nil
}
