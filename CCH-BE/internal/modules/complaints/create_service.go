package complaints

import (
	"context"
	"fmt"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

// CreateComplaintService handles the business logic for complaint creation
type CreateComplaintService struct {
	authorization *authorization.AccessService
	repository    ComplaintCreationRepository
}

// NewCreateComplaintService creates a new complaint creation service
func NewCreateComplaintService(accessService *authorization.AccessService, repository ComplaintCreationRepository) *CreateComplaintService {
	return &CreateComplaintService{
		authorization: accessService,
		repository:    repository,
	}
}

// CreateComplaint creates a new complaint with authorization checks
func (service *CreateComplaintService) CreateComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd CreateComplaintCommand) (CreateComplaintResult, error) {
	if service == nil || service.authorization == nil || service.repository == nil {
		return CreateComplaintResult{}, ErrComplaintServiceNotConfigured
	}

	// Authorize: user must have CREATE/ADD permission on complaints table
	access, err := service.authorization.Authorize(ctx, identity, cchComplaintTable, authorization.ActionAdd)
	if err != nil {
		return CreateComplaintResult{}, fmt.Errorf("authorization failed: %w", err)
	}

	// Only authorized operational staff can create complaints
	if !isAllowedStatusTransitionRole(access.UserLevelIDs) {
		return CreateComplaintResult{}, ErrCallCenterRoleRequired
	}

	// Enrich command with officer context from verified identity
	cmd.CreatingOfficeCode = access.OfficeCode
	cmd.CreatingUsername = identity.Username

	// Validate the command
	cmd, err = cmd.Validate()
	if err != nil {
		return CreateComplaintResult{}, fmt.Errorf("validation failed: %w", err)
	}

	// Create the complaint via repository
	result, err := service.repository.CreateComplaint(ctx, cmd)
	if err != nil {
		return CreateComplaintResult{}, fmt.Errorf("failed to create complaint: %w", err)
	}

	return result, nil
}
