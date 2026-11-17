package auth

import (
	"github.com/gofiber/fiber/v3"
)

// RegisterRoutes registers authentication routes
func (h *Handler) RegisterRoutes(router fiber.Router) {
	// Public authentication endpoints (no JWT middleware)
	auth := router.Group("/auth")
	{
		auth.Post("/login", h.Login)
	}
}
