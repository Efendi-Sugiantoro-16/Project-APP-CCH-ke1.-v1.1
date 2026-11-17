package controller

import (
	"context"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type ComplaintDeleter interface {
	DeleteComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd complaints.DeleteComplaintCommand) (complaints.DeleteComplaintResult, error)
}

type DeleteController struct {
	service ComplaintDeleter
}

func NewDeleteController(service ComplaintDeleter) *DeleteController {
	return &DeleteController{service: service}
}

func (c *DeleteController) Register(router fiber.Router) {
	if c == nil {
		return
	}
	router.Delete("/complaints/call-center/:id", c.DeleteComplaint)
	router.Delete("/complaints/:id", c.DeleteComplaint)
	router.Delete("/complaint/:id", c.DeleteComplaint)
}

func (c *DeleteController) DeleteComplaint(ctx fiber.Ctx) error {
	if c == nil || c.service == nil {
		return fiber.ErrServiceUnavailable
	}

	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}

	id := strings.TrimSpace(ctx.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "complaint ID is required")
	}

	force := ctx.Query("force") == "true"
	reason := ctx.Query("reason")

	type deleteBody struct {
		Reason string `json:"reason"`
		Force  bool   `json:"force"`
	}
	var body deleteBody
	if len(ctx.Body()) > 0 {
		_ = ctx.Bind().Body(&body)
		if body.Reason != "" {
			reason = body.Reason
		}
		if body.Force {
			force = true
		}
	}

	cmd := complaints.DeleteComplaintCommand{
		ComplaintID: id,
		Reason:      reason,
		Force:       force,
	}

	result, err := c.service.DeleteComplaint(ctx.Context(), identity, cmd)
	if err != nil {
		switch {
		case errors.Is(err, complaints.ErrComplaintNotFound):
			return fiber.NewError(fiber.StatusNotFound, "complaint not found")
		case errors.Is(err, complaints.ErrCannotDeleteCompletedComplaint):
			return fiber.NewError(fiber.StatusConflict, err.Error())
		default:
			return httpapi.AuthorizationHTTPError(err)
		}
	}

	return ctx.JSON(result)
}
