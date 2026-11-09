package devauth

import (
	"database/sql"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/platform/config"
	"cch.local/backend/internal/platform/httpapi"
)

func NewRouteRegistrar(settings config.DevAuthSettings, jwt config.JWTSettings, db *sql.DB) httpapi.VersionedRouteRegistrar {
	if !settings.Enabled {
		return nil
	}

	handler := NewHandler(settings, jwt, db)

	return func(api fiber.Router) {
		dev := api.Group("/dev")
		dev.Post("/login", handler.Login)
		dev.Post("/register", handler.Register)
	}
}
