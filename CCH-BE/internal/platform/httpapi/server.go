package httpapi

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/health"
	healthcontroller "cch.local/backend/internal/modules/health/controller"
)

const serviceName = "cch-be"

type VersionedRouteRegistrar func(fiber.Router)

// NewServer creates a new server with versioned API routes under /api/v1
func NewServer(database health.ReadinessChecker, routeRegistrars ...VersionedRouteRegistrar) *fiber.App {
	return NewServerWithRoot(database, nil, routeRegistrars...)
}

// NewServerWithRoot creates a server with optional root-level routes (e.g. dev auth, debug endpoints)
func NewServerWithRoot(database health.ReadinessChecker, rootRegistrar VersionedRouteRegistrar, routeRegistrars ...VersionedRouteRegistrar) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:         serviceName,
		Immutable:       true,
		ReadBufferSize:  64 * 1024,
		WriteBufferSize: 64 * 1024,
		ReadTimeout:     5 * time.Second,
		WriteTimeout:    10 * time.Second,
		IdleTimeout:     120 * time.Second,
		ErrorHandler:    handleError,
	})
	app.Use(requestIDMiddleware)

	healthcontroller.NewController(serviceName, database).Register(app)

	// Register root-level routes (no JWT protection)
	if rootRegistrar != nil {
		rootRegistrar(app)
	}

	api := app.Group("/api/v1")
	api.Get("/", func(ctx fiber.Ctx) error {
		return ctx.JSON(map[string]string{
			"name":    serviceName,
			"version": "v1",
		})
	})
	for _, registerRoutes := range routeRegistrars {
		if registerRoutes != nil {
			registerRoutes(api)
		}
	}

	return app
}
