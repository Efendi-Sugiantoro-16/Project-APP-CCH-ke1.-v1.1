package controller

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/users"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

// Service defines business operations required by user controller
type Service interface {
	ListUsers(ctx context.Context, identity authentication.VerifiedIdentity, query users.UserListQuery) (users.UserPage, error)
	GetUser(ctx context.Context, identity authentication.VerifiedIdentity, username string) (users.User, error)
	CreateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.CreateUserCommand) (users.User, error)
	UpdateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateUserCommand) (users.User, error)
	ResetPassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ResetPasswordCommand) error
	ListUserLevels(ctx context.Context, identity authentication.VerifiedIdentity) ([]users.UserLevel, error)
	GetProfile(ctx context.Context, identity authentication.VerifiedIdentity) (users.User, error)
	UpdateProfile(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateProfileCommand) (users.User, error)
	ChangePassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ChangePasswordCommand) error
}

// Controller handles HTTP endpoints for user administration
type Controller struct {
	service Service
}

// New creates a new user controller
func New(service Service) *Controller {
	return &Controller{service: service}
}

// Register mounts user administration routes
func (c *Controller) Register(router fiber.Router) {
	router.Get("/admin/users", c.List)
	router.Get("/admin/users/levels", c.ListLevels)
	router.Get("/admin/users/:username", c.Get)
	router.Post("/admin/users", c.Create)
	router.Put("/admin/users/:username", c.Update)
	router.Post("/admin/users/:username/reset-password", c.ResetPassword)
	router.Get("/users/profile", c.GetProfile)
	router.Put("/users/profile", c.UpdateProfile)
	router.Post("/users/profile/change-password", c.ChangePassword)
}

// List handles user searching and pagination
func (c *Controller) List(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	query := users.UserListQuery{
		OfficeCode:  strings.TrimSpace(ctx.Query("office")),
		UserLevelID: strings.TrimSpace(ctx.Query("level")),
		Search:      strings.TrimSpace(ctx.Query("q")),
	}
	if query.Search == "" {
		query.Search = strings.TrimSpace(ctx.Query("search"))
	}

	if raw := strings.TrimSpace(ctx.Query("limit")); raw != "" {
		if limit, err := strconv.Atoi(raw); err == nil {
			query.Limit = limit
		} else {
			return fiber.ErrBadRequest
		}
	}
	if raw := strings.TrimSpace(ctx.Query("offset")); raw != "" {
		if offset, err := strconv.Atoi(raw); err == nil {
			query.Offset = offset
		} else {
			return fiber.ErrBadRequest
		}
	}

	page, err := c.service.ListUsers(ctx.Context(), identity, query)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(page)
}

// ListLevels returns all available user levels / roles
func (c *Controller) ListLevels(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	levels, err := c.service.ListUserLevels(ctx.Context(), identity)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(levels)
}

// Get returns detail of a single user
func (c *Controller) Get(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	username := strings.TrimSpace(ctx.Params("username"))
	if username == "" {
		return fiber.ErrBadRequest
	}

	user, err := c.service.GetUser(ctx.Context(), identity, username)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(user)
}

// Create registers a new user
func (c *Controller) Create(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	var cmd users.CreateUserCommand
	if err := ctx.Bind().Body(&cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	created, err := c.service.CreateUser(ctx.Context(), identity, cmd)
	if err != nil {
		return controllerError(err)
	}

	return ctx.Status(fiber.StatusCreated).JSON(created)
}

// Update modifies an existing user
func (c *Controller) Update(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	username := strings.TrimSpace(ctx.Params("username"))
	if username == "" {
		return fiber.ErrBadRequest
	}

	var cmd users.UpdateUserCommand
	if err := ctx.Bind().Body(&cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	cmd.Username = username

	updated, err := c.service.UpdateUser(ctx.Context(), identity, cmd)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(updated)
}

// ResetPassword sets a new password for the specified user
func (c *Controller) ResetPassword(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	username := strings.TrimSpace(ctx.Params("username"))
	if username == "" {
		return fiber.ErrBadRequest
	}

	var cmd users.ResetPasswordCommand
	if err := ctx.Bind().Body(&cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	cmd.Username = username

	if err := c.service.ResetPassword(ctx.Context(), identity, cmd); err != nil {
		return controllerError(err)
	}

	return ctx.JSON(fiber.Map{
		"message": "password reset successfully",
		"user":    username,
	})
}

// GetProfile returns the profile of the currently logged-in user (cch_profil_pengguna)
func (c *Controller) GetProfile(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	profile, err := c.service.GetProfile(ctx.Context(), identity)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(profile)
}

// UpdateProfile updates personal information of the currently logged-in user
func (c *Controller) UpdateProfile(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	var cmd users.UpdateProfileCommand
	if err := json.Unmarshal(ctx.Body(), &cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	updated, err := c.service.UpdateProfile(ctx.Context(), identity, cmd)
	if err != nil {
		return controllerError(err)
	}

	return ctx.JSON(updated)
}

// ChangePassword changes the password of the currently logged-in user with old password check
func (c *Controller) ChangePassword(ctx fiber.Ctx) error {
	identity, err := c.identity(ctx)
	if err != nil {
		return err
	}

	var cmd users.ChangePasswordCommand
	if err := json.Unmarshal(ctx.Body(), &cmd); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	if err := c.service.ChangePassword(ctx.Context(), identity, cmd); err != nil {
		return controllerError(err)
	}

	return ctx.JSON(fiber.Map{
		"message": "kata sandi berhasil diubah",
	})
}

func (c *Controller) identity(ctx fiber.Ctx) (authentication.VerifiedIdentity, error) {
	if c == nil || c.service == nil {
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
	case errors.Is(err, users.ErrUserNotFound):
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	case errors.Is(err, users.ErrUserAlreadyExists):
		return fiber.NewError(fiber.StatusConflict, "username already exists")
	case errors.Is(err, users.ErrInvalidUserInput),
		errors.Is(err, users.ErrUsernameRequired),
		errors.Is(err, users.ErrPasswordRequired),
		errors.Is(err, users.ErrUserLevelRequired),
		errors.Is(err, users.ErrInvalidOldPassword):
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	case errors.Is(err, users.ErrAdminRoleRequired):
		return fiber.NewError(fiber.StatusForbidden, "admin role required")
	case errors.Is(err, users.ErrUserServiceNotReady):
		return fiber.ErrServiceUnavailable
	default:
		return httpapi.AuthorizationHTTPError(err)
	}
}
