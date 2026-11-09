package complaints

import (
	"context"
	"errors"
	"strings"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

var (
	ErrInvalidStatusTransition      = errors.New("invalid complaint status transition")
	ErrStatusTransitionNotAvailable = errors.New("complaint status transition is not available")
	ErrStatusTransitionConflict     = errors.New("complaint status changed concurrently")
	ErrIdempotencyConflict          = errors.New("idempotency key was already used for another request")
)

type StatusTransitionRequest struct {
	ComplaintID        string
	ExpectedStatusCode string
	StatusCode         string
	Description        string
	IdempotencyKey     string
}

func (request StatusTransitionRequest) Normalize() (StatusTransitionRequest, error) {
	request.ComplaintID = strings.TrimSpace(request.ComplaintID)
	request.ExpectedStatusCode = strings.TrimSpace(request.ExpectedStatusCode)
	request.StatusCode = strings.TrimSpace(request.StatusCode)
	request.Description = strings.TrimSpace(request.Description)
	request.IdempotencyKey = strings.TrimSpace(request.IdempotencyKey)
	if request.ComplaintID == "" || len(request.ComplaintID) > 25 || strings.Contains(request.ComplaintID, ",") ||
		!validStatusCode(request.ExpectedStatusCode) || request.ExpectedStatusCode == "109" ||
		!IsValidStatusTransition(request.ExpectedStatusCode, request.StatusCode) ||
		request.Description == "" || len([]rune(request.Description)) > 5000 ||
		!validIdempotencyKey(request.IdempotencyKey) {
		return StatusTransitionRequest{}, ErrInvalidStatusTransition
	}
	return request, nil
}

func IsValidStatusTransition(expected, target string) bool {
	if expected == target || expected == "109" {
		return false
	}
	switch expected {
	case "101":
		return target == "102" || target == "103" || target == "109"
	case "102":
		return target == "103" || target == "104" || target == "109"
	case "103":
		return target == "102" || target == "104" || target == "109"
	case "104":
		return target == "103" || target == "109"
	default:
		return target == "102" || target == "103" || target == "104" || target == "109"
	}
}

type StatusTransitionCommand struct {
	StatusTransitionRequest
	OfficeCode string
	Actor      string
}

type StatusTransitionResult struct {
	ComplaintID string
	HistoryID   string
	StatusCode  string
	UpdatedAt   string
	Replayed    bool
}

type CallCenterStatusTransitionRepository interface {
	ApplyCallCenterStatusTransition(context.Context, StatusTransitionCommand) (StatusTransitionResult, error)
}

type StatusTransitionService struct {
	authorization *authorization.AccessService
	repository    CallCenterStatusTransitionRepository
}

func NewStatusTransitionService(accessService *authorization.AccessService, repository CallCenterStatusTransitionRepository) *StatusTransitionService {
	return &StatusTransitionService{authorization: accessService, repository: repository}
}

func (service *StatusTransitionService) ApplyForCallCenter(ctx context.Context, identity authentication.VerifiedIdentity, request StatusTransitionRequest) (StatusTransitionResult, error) {
	if service == nil || service.authorization == nil || service.repository == nil {
		return StatusTransitionResult{}, ErrComplaintServiceNotConfigured
	}
	request, err := request.Normalize()
	if err != nil {
		return StatusTransitionResult{}, err
	}
	ticketAccess, err := service.authorization.Authorize(ctx, identity, cchComplaintTable, authorization.ActionView)
	if err != nil {
		return StatusTransitionResult{}, err
	}
	historyAccess, err := service.authorization.Authorize(ctx, identity, "cchentrimas", authorization.ActionAdd)
	if err != nil {
		return StatusTransitionResult{}, err
	}
	if !isCallCenter(ticketAccess.UserLevelIDs) || !isCallCenter(historyAccess.UserLevelIDs) {
		return StatusTransitionResult{}, ErrCallCenterRoleRequired
	}
	if ticketAccess.OfficeCode == "" || ticketAccess.OfficeCode != historyAccess.OfficeCode ||
		!sameRoleIDs(ticketAccess.UserLevelIDs, historyAccess.UserLevelIDs) {
		return StatusTransitionResult{}, authorization.ErrIdentityMismatch
	}
	if ticketAccess.Username == "" || len(ticketAccess.Username) > 20 || len(ticketAccess.OfficeCode) > 7 {
		return StatusTransitionResult{}, authorization.ErrIdentityMismatch
	}
	return service.repository.ApplyCallCenterStatusTransition(ctx, StatusTransitionCommand{
		StatusTransitionRequest: request,
		OfficeCode:              ticketAccess.OfficeCode,
		Actor:                   ticketAccess.Username,
	})
}

func (service *StatusTransitionService) ApplyStatusTransition(ctx context.Context, identity authentication.VerifiedIdentity, request StatusTransitionRequest) (StatusTransitionResult, error) {
	if service == nil || service.authorization == nil || service.repository == nil {
		return StatusTransitionResult{}, ErrComplaintServiceNotConfigured
	}
	request, err := request.Normalize()
	if err != nil {
		return StatusTransitionResult{}, err
	}
	ticketAccess, err := service.authorization.Authorize(ctx, identity, cchComplaintTable, authorization.ActionView)
	if err != nil {
		return StatusTransitionResult{}, err
	}
	historyAccess, err := service.authorization.Authorize(ctx, identity, "cchentrimas", authorization.ActionAdd)
	if err != nil {
		return StatusTransitionResult{}, err
	}
	if !isAllowedStatusTransitionRole(ticketAccess.UserLevelIDs) || !isAllowedStatusTransitionRole(historyAccess.UserLevelIDs) {
		return StatusTransitionResult{}, authorization.ErrPermissionDenied
	}
	if ticketAccess.OfficeCode == "" || ticketAccess.OfficeCode != historyAccess.OfficeCode ||
		!sameRoleIDs(ticketAccess.UserLevelIDs, historyAccess.UserLevelIDs) {
		return StatusTransitionResult{}, authorization.ErrIdentityMismatch
	}
	if ticketAccess.Username == "" || len(ticketAccess.Username) > 20 || len(ticketAccess.OfficeCode) > 7 {
		return StatusTransitionResult{}, authorization.ErrIdentityMismatch
	}
	return service.repository.ApplyCallCenterStatusTransition(ctx, StatusTransitionCommand{
		StatusTransitionRequest: request,
		OfficeCode:              ticketAccess.OfficeCode,
		Actor:                   ticketAccess.Username,
	})
}

func isAllowedStatusTransitionRole(userLevelIDs []int64) bool {
	if len(userLevelIDs) == 0 {
		return false
	}
	for _, id := range userLevelIDs {
		switch id {
		case -1, 1, 2, 3, 9, 10, 19, 20, 29:
			return true
		}
	}
	return false
}

func validStatusCode(value string) bool {
	if len(value) != 3 {
		return false
	}
	for _, character := range value {
		if character < '0' || character > '9' {
			return false
		}
	}
	return true
}

func validIdempotencyKey(value string) bool {
	if len(value) < 16 || len(value) > 128 {
		return false
	}
	for _, character := range value {
		if !((character >= 'A' && character <= 'Z') || (character >= 'a' && character <= 'z') ||
			(character >= '0' && character <= '9') || strings.ContainsRune("-_.:", character)) {
			return false
		}
	}
	return true
}
