package main

import (
	"database/sql"

	"cch.local/backend/internal/modules/devauth"
	"cch.local/backend/internal/platform/config"
	"cch.local/backend/internal/platform/httpapi"
)

func devAuthRoutes(settings config.Settings, db *sql.DB) httpapi.VersionedRouteRegistrar {
	if !settings.DevAuth.Enabled {
		return nil
	}

	return devauth.NewRouteRegistrar(settings.DevAuth, settings.JWT, db)
}
