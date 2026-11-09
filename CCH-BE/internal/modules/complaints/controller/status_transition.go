package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/modules/complaints"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

const maxStatusTransitionBodyBytes = 16 * 1024

type CallCenterStatusTransitionApplier interface {
	ApplyForCallCenter(context.Context, authentication.VerifiedIdentity, complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error)
}

type StatusTransitionController struct {
	service CallCenterStatusTransitionApplier
}

type statusTransitionPayload struct {
	ExpectedStatusCode string `json:"expected_status_code"`
	StatusCode         string `json:"status_code"`
	Description        string `json:"description"`
}

type statusTransitionResponse struct {
	ComplaintID string `json:"complaint_id"`
	HistoryID   string `json:"history_id"`
	StatusCode  string `json:"status_code"`
	UpdatedAt   string `json:"updated_at"`
	Replayed    bool   `json:"replayed"`
}

func NewStatusTransitionController(service CallCenterStatusTransitionApplier) *StatusTransitionController {
	return &StatusTransitionController{service: service}
}

func (controller *StatusTransitionController) Register(router fiber.Router) {
	router.Post("/complaints/call-center/:id/status", controller.ApplyForCallCenter)
	router.Post("/complaints/:id/status", controller.ApplyStatusTransition)
}

func (controller *StatusTransitionController) ApplyForCallCenter(ctx fiber.Ctx) error {
	return controller.apply(ctx, func(c context.Context, id authentication.VerifiedIdentity, req complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error) {
		res, err := controller.service.ApplyForCallCenter(c, id, req)
		if errors.Is(err, complaints.ErrCallCenterRoleRequired) {
			if multiApplier, ok := controller.service.(interface {
				ApplyStatusTransition(context.Context, authentication.VerifiedIdentity, complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error)
			}); ok {
				return multiApplier.ApplyStatusTransition(c, id, req)
			}
		}
		return res, err
	})
}

func (controller *StatusTransitionController) ApplyStatusTransition(ctx fiber.Ctx) error {
	return controller.apply(ctx, func(c context.Context, id authentication.VerifiedIdentity, req complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error) {
		if multiApplier, ok := controller.service.(interface {
			ApplyStatusTransition(context.Context, authentication.VerifiedIdentity, complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error)
		}); ok {
			return multiApplier.ApplyStatusTransition(c, id, req)
		}
		return controller.service.ApplyForCallCenter(c, id, req)
	})
}

func (controller *StatusTransitionController) apply(ctx fiber.Ctx, execute func(context.Context, authentication.VerifiedIdentity, complaints.StatusTransitionRequest) (complaints.StatusTransitionResult, error)) error {
	if controller == nil || controller.service == nil {
		return fiber.ErrServiceUnavailable
	}
	ctx.Set("Cache-Control", "no-store")
	ctx.Set("Pragma", "no-cache")
	identity, ok := httpapi.VerifiedIdentityFromContext(ctx)
	if !ok {
		return fiber.ErrUnauthorized
	}
	if rawLength := ctx.Get("Content-Length"); rawLength != "" {
		length, err := strconv.ParseInt(rawLength, 10, 64)
		if err != nil || length < 0 || length > maxStatusTransitionBodyBytes {
			return fiber.ErrRequestEntityTooLarge
		}
	}
	body := ctx.Body()
	if len(body) == 0 {
		return fiber.ErrBadRequest
	}
	if len(body) > maxStatusTransitionBodyBytes {
		return fiber.ErrRequestEntityTooLarge
	}
	mediaType, _, err := mime.ParseMediaType(ctx.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return fiber.ErrUnsupportedMediaType
	}
	var payload statusTransitionPayload
	decoder := json.NewDecoder(bytes.NewReader(body))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		return fiber.ErrBadRequest
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return fiber.ErrBadRequest
	}
	result, err := execute(ctx.Context(), identity, complaints.StatusTransitionRequest{
		ComplaintID:        ctx.Params("id"),
		ExpectedStatusCode: payload.ExpectedStatusCode,
		StatusCode:         payload.StatusCode,
		Description:        payload.Description,
		IdempotencyKey:     strings.TrimSpace(ctx.Get("Idempotency-Key")),
	})
	if err != nil {
		return statusTransitionControllerError(err)
	}
	response := statusTransitionResponse{
		ComplaintID: result.ComplaintID,
		HistoryID:   result.HistoryID,
		StatusCode:  result.StatusCode,
		UpdatedAt:   result.UpdatedAt,
		Replayed:    result.Replayed,
	}
	if result.Replayed {
		return ctx.Status(fiber.StatusOK).JSON(response)
	}
	return ctx.Status(fiber.StatusCreated).JSON(response)
}

func statusTransitionControllerError(err error) error {
	switch {
	case errors.Is(err, complaints.ErrInvalidStatusTransition):
		return fiber.ErrBadRequest
	case errors.Is(err, complaints.ErrStatusTransitionNotAvailable):
		return fiber.ErrNotFound
	case errors.Is(err, complaints.ErrStatusTransitionConflict), errors.Is(err, complaints.ErrIdempotencyConflict):
		return fiber.ErrConflict
	case errors.Is(err, complaints.ErrCallCenterRoleRequired),
		errors.Is(err, authorization.ErrSystemAdministratorUnsupported),
		errors.Is(err, authorization.ErrInvalidUserLevels),
		errors.Is(err, authorization.ErrPermissionDenied):
		return fiber.ErrForbidden
	default:
		return httpapi.AuthorizationHTTPError(err)
	}
}
