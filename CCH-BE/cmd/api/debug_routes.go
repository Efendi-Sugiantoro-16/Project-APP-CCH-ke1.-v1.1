package main

import (
	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/config"
)

// debugConfigRoutes provides a temporary debug endpoint to inspect configuration
// THIS SHOULD BE REMOVED BEFORE PRODUCTION!
// debugConfigRoutes provides temporary debug endpoints to inspect configuration
// THIS SHOULD BE REMOVED BEFORE PRODUCTION!
func debugConfigRoutes(settings config.Settings) func(fiber.Router) {
	return func(app fiber.Router) {
		app.Get("/debug/config", func(c fiber.Ctx) error {
			return c.JSON(fiber.Map{
				"jwt_secret_length": len(settings.JWT.Secret),
				"jwt_issuer":        settings.JWT.Issuer,
				"jwt_configured":    settings.JWT.Configured(),
				"devauth_enabled":   settings.DevAuth.Enabled,
			})
		})

		// Debug endpoint to test token verification
		app.Post("/debug/verify-token", func(c fiber.Ctx) error {
			var req struct {
				Token string `json:"token"`
			}
			if err := c.Bind().JSON(&req); err != nil {
				return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
			}

			verifier, err := authentication.NewJWTVerifier(settings.JWT)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "verifier creation failed", "detail": err.Error()})
			}

			identity, err := verifier.Verify(req.Token)
			if err != nil {
				return c.Status(401).JSON(fiber.Map{"error": "verification failed", "detail": err.Error()})
			}

			return c.JSON(fiber.Map{
				"success":       true,
				"username":      identity.Username,
				"office_code":   identity.OfficeCode,
				"user_level_id": identity.UserLevelID,
				"permission":    identity.Permission,
			})
		})
	}
}
