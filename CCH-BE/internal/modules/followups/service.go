package followups

import (
	"context"
	"database/sql"
	"errors"
	"slices"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

const (
	complaintTableName       = "cchentri"
	followUpViewName         = "cchfual"
	followUpTableName        = "cchfu"
	followUpDueTodayViewName = "cchfuhi"
	callCenterRoleID         = 3
)

type Service struct {
	accessService *authorization.AccessService
	repository    Repository
}

func NewService(accessService *authorization.AccessService, repository Repository) *Service {
	return &Service{accessService: accessService, repository: repository}
}

func (service *Service) ListForCallCenterTicket(ctx context.Context, identity authentication.VerifiedIdentity, query Query) ([]Entry, error) {
	if service == nil || service.accessService == nil || service.repository == nil {
		return nil, ErrServiceNotConfigured
	}
	query.OfficeCode = ""
	query, err := query.NormalizeRequest()
	if err != nil {
		return nil, err
	}
	complaintAccess, err := service.accessService.Authorize(ctx, identity, complaintTableName, authorization.ActionView)
	if err != nil {
		return nil, err
	}
	followUpAccess, err := service.accessService.Authorize(ctx, identity, followUpViewName, authorization.ActionList)
	if err != nil {
		return nil, err
	}
	if !isAllowedFollowUpRole(complaintAccess.UserLevelIDs) || !isAllowedFollowUpRole(followUpAccess.UserLevelIDs) {
		return nil, ErrCallCenterRoleRequired
	}
	if complaintAccess.OfficeCode == "" || complaintAccess.OfficeCode != followUpAccess.OfficeCode ||
		complaintAccess.ReportTo != followUpAccess.ReportTo ||
		!slices.Equal(complaintAccess.UserLevelIDs, followUpAccess.UserLevelIDs) {
		return nil, authorization.ErrIdentityMismatch
	}

	query.OfficeCode = complaintAccess.OfficeCode
	query, err = query.Normalize()
	if err != nil {
		return nil, err
	}
	entries, err := service.repository.ListForOpenCallCenterTicket(ctx, query)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFoundOrNotVisible
	}
	return entries, err
}

func (service *Service) ListForCallCenterOffice(ctx context.Context, identity authentication.VerifiedIdentity, query OfficeQuery) ([]Entry, error) {
	if service == nil || service.accessService == nil || service.repository == nil {
		return nil, ErrServiceNotConfigured
	}
	query, err := query.NormalizeRequest()
	if err != nil {
		return nil, err
	}
	access, err := service.accessService.Authorize(ctx, identity, followUpTableName, authorization.ActionList)
	if err != nil {
		return nil, err
	}
	if !isAllowedFollowUpRole(access.UserLevelIDs) {
		return nil, ErrCallCenterRoleRequired
	}
	query.OfficeCode = access.OfficeCode
	query, err = query.Normalize()
	if err != nil {
		return nil, err
	}
	return service.repository.ListForCallCenterOffice(ctx, query)
}

func (service *Service) ListDueTodayForCallCenterOffice(ctx context.Context, identity authentication.VerifiedIdentity, query OfficeQuery) ([]Entry, error) {
	if service == nil || service.accessService == nil || service.repository == nil {
		return nil, ErrServiceNotConfigured
	}
	query, err := query.NormalizeRequest()
	if err != nil {
		return nil, err
	}
	access, err := service.accessService.Authorize(ctx, identity, followUpDueTodayViewName, authorization.ActionList)
	if err != nil {
		return nil, err
	}
	if !isAllowedFollowUpRole(access.UserLevelIDs) {
		return nil, ErrCallCenterRoleRequired
	}
	query.OfficeCode = access.OfficeCode
	query, err = query.Normalize()
	if err != nil {
		return nil, ErrCallCenterOfficeRequired
	}
	return service.repository.ListDueTodayForCallCenterOffice(ctx, query)
}

func (service *Service) ListOverdueForCallCenterOffice(ctx context.Context, identity authentication.VerifiedIdentity, query OfficeQuery) ([]Entry, error) {
	if service == nil || service.accessService == nil || service.repository == nil {
		return nil, ErrServiceNotConfigured
	}
	query, err := query.NormalizeRequest()
	if err != nil {
		return nil, err
	}
	access, err := service.accessService.Authorize(ctx, identity, followUpViewName, authorization.ActionList)
	if err != nil {
		return nil, err
	}
	if !isAllowedFollowUpRole(access.UserLevelIDs) {
		return nil, ErrCallCenterRoleRequired
	}
	query.OfficeCode = access.OfficeCode
	query, err = query.Normalize()
	if err != nil {
		return nil, ErrCallCenterOfficeRequired
	}
	return service.repository.ListOverdueForCallCenterOffice(ctx, query)
}

func (service *Service) CountOverdueForCallCenterOffice(ctx context.Context, identity authentication.VerifiedIdentity, query OfficeQuery) (int64, error) {
	if service == nil || service.accessService == nil || service.repository == nil {
		return 0, ErrServiceNotConfigured
	}
	query, err := query.NormalizeRequest()
	if err != nil {
		return 0, err
	}
	access, err := service.accessService.Authorize(ctx, identity, followUpViewName, authorization.ActionList)
	if err != nil {
		return 0, err
	}
	if !isAllowedFollowUpRole(access.UserLevelIDs) {
		return 0, ErrCallCenterRoleRequired
	}
	query.OfficeCode = access.OfficeCode
	query, err = query.Normalize()
	if err != nil {
		return 0, ErrCallCenterOfficeRequired
	}
	return service.repository.CountOverdueForCallCenterOffice(ctx, query)
}

func isAllowedFollowUpRole(userLevelIDs []int64) bool {
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
