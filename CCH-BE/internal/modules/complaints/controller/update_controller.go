package controller

import (
	"context"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

// UpdateController handles complaint update HTTP requests
type UpdateController struct {
	service ComplaintUpdater
}

// ComplaintUpdater defines the interface for complaint update service
type ComplaintUpdater interface {
	UpdateComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd complaints.UpdateComplaintCommand) (complaints.UpdateComplaintResult, error)
}

// NewUpdateController creates a new complaint update controller
func NewUpdateController(service ComplaintUpdater) *UpdateController {
	return &UpdateController{service: service}
}

// Register registers the update complaint routes
func (controller *UpdateController) Register(router fiber.Router) {
	if controller == nil {
		return
	}
	// Support both RESTful and legacy frontend route patterns
	router.Put("/complaints/call-center/:id", controller.UpdateComplaint)
	router.Put("/complaints/:id", controller.UpdateComplaint)
	router.Put("/complaint/:id", controller.UpdateComplaint)
}

// UpdateComplaint handles PUT requests to update a complaint
func (controller *UpdateController) UpdateComplaint(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}

	// Extract verified identity from JWT middleware
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}

	complaintID := ctx.Params("id")
	if complaintID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "complaint ID is required in URL path")
	}

	// Parse request body
	var cmd complaints.UpdateComplaintCommand
	if err := ctx.Bind().JSON(&cmd); err != nil {
		return fiber.ErrBadRequest
	}

	cmd.ComplaintID = complaintID

	// Call service to update complaint
	result, err := controller.service.UpdateComplaint(ctx.Context(), identity, cmd)
	if err != nil {
		return handleUpdateError(ctx, err)
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data":    result,
		"message": "Complaint updated successfully",
	})
}

// handleUpdateError converts update service errors to appropriate HTTP responses
func handleUpdateError(ctx fiber.Ctx, err error) error {
	switch err {
	case complaints.ErrComplaintNotFound:
		return fiber.NewError(fiber.StatusNotFound, "complaint not found")
	case complaints.ErrComplaintClosed:
		return fiber.NewError(fiber.StatusConflict, "complaint is already closed (status 109) and cannot be updated")
	case complaints.ErrCustomerNameRequired,
		complaints.ErrCustomerPhoneRequired,
		complaints.ErrInvalidComplaintType,
		complaints.ErrInvalidComplaintSource,
		complaints.ErrInvalidShipmentType,
		complaints.ErrShipmentNumberRequired,
		complaints.ErrSummaryTooShort,
		complaints.ErrDescriptionTooShort:
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	case complaints.ErrCallCenterRoleRequired:
		return fiber.NewError(fiber.StatusForbidden, "only authorized staff can update complaints")
	case complaints.ErrComplaintUpdateNotConfigured,
		complaints.ErrComplaintUpdateServiceNotAvail:
		return fiber.ErrServiceUnavailable
	default:
		if err != nil && err.Error() != "" {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to update complaint")
	}
}
