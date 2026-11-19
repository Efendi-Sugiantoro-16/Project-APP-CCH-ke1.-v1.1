package controller

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/modules/stats"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type Service interface {
	GetSummary(context.Context, authentication.VerifiedIdentity) (stats.Summary, error)
	GetTrends(context.Context, authentication.VerifiedIdentity, string, int, int, int) (stats.Trends, error)
	ListVisitorLogs(context.Context, authentication.VerifiedIdentity, int, int, string) (stats.VisitorLogPage, error)
	RecordHit(context.Context, string, string) error
}

type Controller struct {
	service Service
}

func New(service Service) *Controller {
	return &Controller{service: service}
}

func (controller *Controller) Register(router fiber.Router) {
	router.Get("/admin/stats/summary", controller.GetSummary)
	router.Get("/admin/stats/trends", controller.GetTrends)
	router.Get("/admin/stats/visitors", controller.ListVisitorLogs)
	router.Post("/stats/hit", controller.RecordHit)
}

func (controller *Controller) RegisterPublic(router fiber.Router) {
	router.Post("/api/v1/stats/hit", controller.RecordHit)
}

func (controller *Controller) GetSummary(ctx fiber.Ctx) error {
	identity, err := controller.identity(ctx)
	if err != nil {
		return err
	}
	summary, err := controller.service.GetSummary(ctx.Context(), identity)
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(fiber.Map{
		"data": summary,
	})
}

func (controller *Controller) GetTrends(ctx fiber.Ctx) error {
	identity, err := controller.identity(ctx)
	if err != nil {
		return err
	}
	period := strings.TrimSpace(ctx.Query("period"))
	year, _ := strconv.Atoi(strings.TrimSpace(ctx.Query("year")))
	month, _ := strconv.Atoi(strings.TrimSpace(ctx.Query("month")))
	date, _ := strconv.Atoi(strings.TrimSpace(ctx.Query("date")))

	trends, err := controller.service.GetTrends(ctx.Context(), identity, period, year, month, date)
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(fiber.Map{
		"data": trends,
	})
}

func (controller *Controller) ListVisitorLogs(ctx fiber.Ctx) error {
	identity, err := controller.identity(ctx)
	if err != nil {
		return err
	}
	limit, _ := strconv.Atoi(strings.TrimSpace(ctx.Query("limit")))
	offset, _ := strconv.Atoi(strings.TrimSpace(ctx.Query("offset")))
	search := strings.TrimSpace(ctx.Query("search"))

	page, err := controller.service.ListVisitorLogs(ctx.Context(), identity, limit, offset, search)
	if err != nil {
		return controllerError(err)
	}
	return ctx.JSON(page)
}

func (controller *Controller) RecordHit(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	// Extract client IP (check headers first if behind proxy)
	ip := ctx.Get("X-Forwarded-For")
	if ip == "" {
		ip = ctx.Get("X-Real-IP")
	}
	if ip == "" {
		ip = ctx.IP()
	}
	if idx := strings.Index(ip, ","); idx != -1 {
		ip = strings.TrimSpace(ip[:idx])
	}
	userAgent := ctx.Get("User-Agent")

	_ = controller.service.RecordHit(ctx.Context(), ip, userAgent)
	return ctx.JSON(fiber.Map{
		"ok": true,
	})
}

func (controller *Controller) identity(ctx fiber.Ctx) (authentication.VerifiedIdentity, error) {
	if controller == nil || controller.service == nil {
		return authentication.VerifiedIdentity{}, fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "private, no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return authentication.VerifiedIdentity{}, fiber.ErrUnauthorized
	}
	return identity, nil
}

func controllerError(err error) error {
	switch {
	case errors.Is(err, stats.ErrInvalidPeriod):
		return fiber.ErrBadRequest
	case errors.Is(err, authorization.ErrPermissionDenied), errors.Is(err, authorization.ErrSystemAdministratorUnsupported), errors.Is(err, authorization.ErrInvalidUserLevels):
		return fiber.ErrForbidden
	default:
		return httpapi.AuthorizationHTTPError(err)
	}
}
