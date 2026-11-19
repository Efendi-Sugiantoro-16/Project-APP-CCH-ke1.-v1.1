package controller

import (
	"context"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

// CreateController handles complaint creation HTTP requests
type CreateController struct {
	service ComplaintCreator
}

// ComplaintCreator defines the interface for complaint creation service
type ComplaintCreator interface {
	CreateComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd complaints.CreateComplaintCommand) (complaints.CreateComplaintResult, error)
}

// NewCreateController creates a new complaint creation controller
func NewCreateController(service ComplaintCreator) *CreateController {
	return &CreateController{service: service}
}

// Register registers the create complaint routes
func (controller *CreateController) Register(router fiber.Router) {
	if controller == nil {
		return
	}
	// POST /complaint/create - Create new complaint
	router.Post("/create", controller.CreateComplaint)
}

// CreateComplaint handles POST /complaint/create
func (controller *CreateController) CreateComplaint(ctx fiber.Ctx) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}

	// Extract verified identity from JWT middleware
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}

	// Parse request body
	var cmd complaints.CreateComplaintCommand
	if err := ctx.Bind().JSON(&cmd); err != nil {
		return fiber.ErrBadRequest
	}

	// Call service to create complaint
	result, err := controller.service.CreateComplaint(ctx.Context(), identity, cmd)
	if err != nil {
		return handleCreateError(ctx, err)
	}

	// Return success response
	return ctx.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data":    result,
		"message": "Complaint created successfully",
	})
}

// handleCreateError converts service errors to appropriate HTTP responses
func handleCreateError(ctx fiber.Ctx, err error) error {
	switch err {
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
		return fiber.NewError(fiber.StatusForbidden, "only call center staff can create complaints")
	case complaints.ErrComplaintServiceNotConfigured,
		complaints.ErrComplaintServiceNotAvailable:
		return fiber.ErrServiceUnavailable
	default:
		// Check if it's a validation error
		if err != nil && err.Error() != "" {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		return fiber.NewError(fiber.StatusInternalServerError, "failed to create complaint")
	}
}
