package main

import (
	"database/sql"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/auth"
	"cch.local/backend/internal/platform/config"
)

// authRoutes configures production authentication routes (username + password login)
func authRoutes(settings config.Settings, db *sql.DB) func(fiber.Router) {
	if db == nil {
		return nil
	}

	handler := auth.NewHandler(db, &settings)

	return func(app fiber.Router) {
		handler.RegisterRoutes(app)
	}
}
