package complaints

import (
	"context"
	"fmt"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

// ComplaintUpdateRepository defines the data store interface for updating complaints
type ComplaintUpdateRepository interface {
	UpdateComplaint(ctx context.Context, cmd UpdateComplaintCommand) (UpdateComplaintResult, error)
}

// UpdateComplaintService handles the business logic for complaint modification
type UpdateComplaintService struct {
	authorization *authorization.AccessService
	repository    ComplaintUpdateRepository
}

// NewUpdateComplaintService creates a new complaint update service
func NewUpdateComplaintService(accessService *authorization.AccessService, repository ComplaintUpdateRepository) *UpdateComplaintService {
	return &UpdateComplaintService{
		authorization: accessService,
		repository:    repository,
	}
}

// UpdateComplaint updates an existing complaint with authorization and status guards
func (service *UpdateComplaintService) UpdateComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd UpdateComplaintCommand) (UpdateComplaintResult, error) {
	if service == nil || service.authorization == nil || service.repository == nil {
		return UpdateComplaintResult{}, ErrComplaintUpdateNotConfigured
	}

	// Authorize: user must have EDIT permission on complaints table (cchentri)
	access, err := service.authorization.Authorize(ctx, identity, cchComplaintTable, authorization.ActionEdit)
	if err != nil {
		return UpdateComplaintResult{}, fmt.Errorf("authorization failed: %w", err)
	}

	// Only authorized operational staff can update complaints
	if !isAllowedStatusTransitionRole(access.UserLevelIDs) {
		return UpdateComplaintResult{}, ErrCallCenterRoleRequired
	}

	// Enrich command with officer context
	cmd.UpdatingOfficeCode = access.OfficeCode
	cmd.UpdatingUsername = identity.Username

	// Validate the command fields
	cmd, err = cmd.Validate()
	if err != nil {
		return UpdateComplaintResult{}, fmt.Errorf("validation failed: %w", err)
	}

	// Execute update via repository
	result, err := service.repository.UpdateComplaint(ctx, cmd)
	if err != nil {
		return UpdateComplaintResult{}, err
	}

	return result, nil
}
