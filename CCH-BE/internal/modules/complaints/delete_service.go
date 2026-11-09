package complaints

import (
	"context"
	"errors"
	"strings"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type DeleteComplaintRepository interface {
	DeleteComplaint(ctx context.Context, cmd DeleteComplaintCommand) (DeleteComplaintResult, error)
}

type DeleteComplaintService struct {
	accessService *authorization.AccessService
	repository    DeleteComplaintRepository
}

func NewDeleteComplaintService(accessService *authorization.AccessService, repository DeleteComplaintRepository) *DeleteComplaintService {
	return &DeleteComplaintService{
		accessService: accessService,
		repository:    repository,
	}
}

func (s *DeleteComplaintService) DeleteComplaint(ctx context.Context, identity authentication.VerifiedIdentity, cmd DeleteComplaintCommand) (DeleteComplaintResult, error) {
	if s == nil || s.repository == nil {
		return DeleteComplaintResult{}, errors.New("delete complaint service is not configured")
	}

	cmd.ActorUsername = strings.TrimSpace(identity.Username)
	if cmd.ActorUsername == "" {
		cmd.ActorUsername = "system"
	}
	cmd.ActorOfficeCode = strings.TrimSpace(identity.OfficeCode)

	// Authorize using cchentri table permission
	if s.accessService != nil {
		if _, err := s.accessService.Authorize(ctx, identity, cchComplaintTable, authorization.ActionDelete); err != nil {
			return DeleteComplaintResult{}, err
		}
	}

	return s.repository.DeleteComplaint(ctx, cmd)
}
