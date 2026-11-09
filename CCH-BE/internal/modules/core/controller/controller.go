package controller

import (
	"strconv"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/core"
)

type Controller struct {
	service *core.Service
}

func New(service *core.Service) *Controller {
	return &Controller{service: service}
}

// Register registers endpoints under an existing group like /api/v1
func (c *Controller) Register(router fiber.Router) {
	router.Get("/core/search", c.GetSearch)
	router.Get("/core/notifications", c.GetNotifications)
	router.Post("/core/notifications/mark-read", c.MarkNotificationsRead)
}

// RegisterPublic registers full paths on the root app
func (c *Controller) RegisterPublic(router fiber.Router) {
	router.Get("/api/v1/core/search", c.GetSearch)
	router.Get("/api/v1/core/notifications", c.GetNotifications)
	router.Post("/api/v1/core/notifications/mark-read", c.MarkNotificationsRead)
}

func (c *Controller) GetSearch(ctx fiber.Ctx) error {
	query := ctx.Query("q", "")
	limitStr := ctx.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	resp, err := c.service.SearchComplaints(ctx.Context(), query, limit)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Gagal melakukan pencarian aduan",
			"details": err.Error(),
		})
	}

	return ctx.JSON(resp)
}

func (c *Controller) GetNotifications(ctx fiber.Ctx) error {
	resp, err := c.service.GetNotifications(ctx.Context())
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Gagal memuat feed notifikasi",
			"details": err.Error(),
		})
	}

	return ctx.JSON(resp)
}

func (c *Controller) MarkNotificationsRead(ctx fiber.Ctx) error {
	resp, err := c.service.MarkAllRead(ctx.Context())
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Gagal menandai notifikasi telah dibaca",
			"details": err.Error(),
		})
	}

	return ctx.JSON(resp)
}

