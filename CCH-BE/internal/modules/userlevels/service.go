package userlevels

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type Service struct {
	authorization *authorization.AccessService
	repository    Repository
}

func NewService(accessService *authorization.AccessService, repository Repository) *Service {
	return &Service{authorization: accessService, repository: repository}
}

func isAllowedAdmin(identity authentication.VerifiedIdentity) bool {
	parts := strings.Split(identity.UserLevelID, ",")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "-1" || p == "9" || p == "19" || p == "29" {
			return true
		}
	}
	return false
}

func (service *Service) List(ctx context.Context, identity authentication.VerifiedIdentity, query ListQuery) (Page, error) {
	if err := service.validateDependencies(); err != nil {
		return Page{}, err
	}
	query, err := query.Normalize()
	if err != nil {
		return Page{}, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionList); err != nil {
			return Page{}, err
		}
	}
	return service.repository.List(ctx, query)
}

func (service *Service) Get(ctx context.Context, identity authentication.VerifiedIdentity, id int64) (UserLevel, error) {
	if err := service.validateDependencies(); err != nil {
		return UserLevel{}, err
	}
	if err := validateID(id); err != nil {
		return UserLevel{}, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionView); err != nil {
			return UserLevel{}, err
		}
	}
	value, err := service.repository.Get(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return UserLevel{}, ErrNotFound
	}
	return value, err
}

func (service *Service) GetPermissions(ctx context.Context, identity authentication.VerifiedIdentity, id int64) ([]TablePermission, error) {
	if err := service.validateDependencies(); err != nil {
		return nil, err
	}
	if err := validateID(id); err != nil {
		return nil, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionView); err != nil {
			return nil, err
		}
	}
	return service.repository.GetPermissions(ctx, id)
}

func (service *Service) UpdatePermissions(ctx context.Context, identity authentication.VerifiedIdentity, id int64, req UpdatePermissionsRequest) ([]TablePermission, error) {
	if err := service.validateDependencies(); err != nil {
		return nil, err
	}
	if err := validateID(id); err != nil {
		return nil, err
	}
	if id == -1 {
		return nil, ErrCannotModifySuperAdmin
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionEdit); err != nil {
			return nil, err
		}
	}
	if err := service.repository.UpdatePermissions(ctx, id, req.Permissions); err != nil {
		return nil, err
	}
	return service.repository.GetPermissions(ctx, id)
}

func (service *Service) validateDependencies() error {
	if service == nil || service.authorization == nil || service.repository == nil {
		return ErrServiceNotReady
	}
	return nil
}
