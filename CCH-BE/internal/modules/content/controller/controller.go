package controller

import (
	"context"
	"errors"
	"fmt"
	"html"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/content"
)

type Service interface {
	GetAbout(ctx context.Context, language string) (content.AboutContent, error)
	GetTerms(ctx context.Context, language string) (content.TermsContent, error)
	GetHelpContext(ctx context.Context, page string, language string) (content.HelpContext, error)
	ListHelpTopics(ctx context.Context, language string) ([]content.HelpTopicItem, error)
}

type Controller struct {
	service Service
}

func New(service Service) *Controller {
	return &Controller{service: service}
}

// RegisterApi registers modern JSON endpoints under /api/v1
func (c *Controller) RegisterApi(router fiber.Router) {
	router.Get("/content/about", c.GetAbout)
	router.Get("/content/terms", c.GetTerms)
	router.Get("/content/help", c.GetHelpContext)
	router.Get("/content/help/topics", c.ListHelpTopics)
}

// RegisterLegacy registers legacy root routes for 100% backward compatibility
func (c *Controller) RegisterLegacy(router fiber.Router) {
	router.Get("/loadaboutus", c.LegacyLoadAboutUs)
	router.Get("/loadtermsconditions", c.LegacyLoadTermsConditions)
	router.Get("/loadhelponline", c.LegacyLoadHelpOnline)
	router.Get("/printtermsconditions", c.LegacyPrintTermsConditions)
}

// RegisterPublic registers both legacy root routes and public /api/v1/content/* endpoints
func (c *Controller) RegisterPublic(router fiber.Router) {
	c.RegisterLegacy(router)
	router.Get("/api/v1/content/about", c.GetAbout)
	router.Get("/api/v1/content/terms", c.GetTerms)
	router.Get("/api/v1/content/help", c.GetHelpContext)
	router.Get("/api/v1/content/help/topics", c.ListHelpTopics)
}

func (c *Controller) GetAbout(ctx fiber.Ctx) error {
	lang := ctx.Query("lang", ctx.Query("language", "id"))
	data, err := c.service.GetAbout(ctx.Context(), lang)
	if err != nil {
		if errors.Is(err, content.ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "tentang aplikasi tidak ditemukan")
		}
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

func (c *Controller) GetTerms(ctx fiber.Ctx) error {
	lang := ctx.Query("lang", ctx.Query("language", "id"))
	data, err := c.service.GetTerms(ctx.Context(), lang)
	if err != nil {
		if errors.Is(err, content.ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "syarat dan ketentuan tidak ditemukan")
		}
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

func (c *Controller) GetHelpContext(ctx fiber.Ctx) error {
	page := ctx.Query("page", ctx.Query("display_in_page", "dashboard2"))
	lang := ctx.Query("lang", ctx.Query("language", "id"))
	data, err := c.service.GetHelpContext(ctx.Context(), page, lang)
	if err != nil {
		if errors.Is(err, content.ErrNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "panduan bantuan untuk halaman ini belum tersedia")
		}
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

func (c *Controller) ListHelpTopics(ctx fiber.Ctx) error {
	lang := ctx.Query("lang", ctx.Query("language", "id"))
	data, err := c.service.ListHelpTopics(ctx.Context(), lang)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}
	return ctx.JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}

// LegacyLoadAboutUs returns raw HTML string matching legacy views/Loadaboutus.php
func (c *Controller) LegacyLoadAboutUs(ctx fiber.Ctx) error {
	data, err := c.service.GetAbout(ctx.Context(), "id")
	if err != nil {
		ctx.Set("Content-Type", "text/html; charset=utf-8")
		return ctx.SendString("Tentang CCH tidak tersedia")
	}
	ctx.Set("Content-Type", "text/html; charset=utf-8")
	return ctx.SendString(data.AboutText)
}

// LegacyLoadTermsConditions returns raw HTML string matching legacy views/Loadtermsconditions.php
func (c *Controller) LegacyLoadTermsConditions(ctx fiber.Ctx) error {
	data, err := c.service.GetTerms(ctx.Context(), "id")
	if err != nil {
		ctx.Set("Content-Type", "text/html; charset=utf-8")
		return ctx.SendString("Syarat dan Ketentuan tidak tersedia")
	}
	ctx.Set("Content-Type", "text/html; charset=utf-8")
	return ctx.SendString(data.TermsText)
}

// LegacyLoadHelpOnline returns Topic~~~Description matching legacy views/Loadhelponline.php
func (c *Controller) LegacyLoadHelpOnline(ctx fiber.Ctx) error {
	page := ctx.Query("page", "")
	if page == "" {
		ctx.Set("Content-Type", "text/plain; charset=utf-8")
		return ctx.SendString("Bantuan~~~Panduan tidak tersedia")
	}
	data, err := c.service.GetHelpContext(ctx.Context(), page, "id")
	if err != nil {
		ctx.Set("Content-Type", "text/plain; charset=utf-8")
		return ctx.SendString("Bantuan~~~Panduan untuk halaman ini belum tersedia")
	}
	ctx.Set("Content-Type", "text/plain; charset=utf-8")
	return ctx.SendString(fmt.Sprintf("%s~~~%s", data.Topic, data.Description))
}

// LegacyPrintTermsConditions returns printable HTML view matching legacy views/Printtermsconditions.php
func (c *Controller) LegacyPrintTermsConditions(ctx fiber.Ctx) error {
	data, err := c.service.GetTerms(ctx.Context(), "id")
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Syarat dan ketentuan tidak ditemukan")
	}
	pageHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
	<meta charset="utf-8">
	<title>Syarat dan Ketentuan - %s</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
		.header { border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between; }
		.title { font-size: 20px; font-weight: bold; color: #0f172a; }
		.content { font-size: 14px; text-align: justify; }
		.btn-print { background: #ea580c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-bottom: 20px; }
		@media print {
			.no-print { display: none; }
			body { padding: 0; }
		}
	</style>
</head>
<body>
	<div class="no-print">
		<button class="btn-print" onclick="window.print()">🖨️ Cetak Dokumen</button>
	</div>
	<div class="header">
		<div class="title">%s - Syarat dan Ketentuan</div>
		<div>PT Pos Indonesia</div>
	</div>
	<div class="content">
		%s
	</div>
</body>
</html>`, html.EscapeString(data.SiteTitle), html.EscapeString(data.SiteTitle), data.TermsText)

	ctx.Set("Content-Type", "text/html; charset=utf-8")
	return ctx.SendString(pageHTML)
}
