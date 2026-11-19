package userlevels

import (
	"context"
	"errors"
	"testing"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type accessLoaderStub struct {
	access authorization.AccountAccess
	table  string
}

func (loader *accessLoaderStub) Load(_ context.Context, _ authentication.VerifiedIdentity, table string) (authorization.AccountAccess, error) {
	loader.table = table
	return loader.access, nil
}

type repositoryStub struct {
	called string
	query  ListQuery
}

func (repository *repositoryStub) List(_ context.Context, query ListQuery) (Page, error) {
	repository.called = "list"
	repository.query = query
	return Page{Data: []UserLevel{{ID: 3, Name: "Call Center"}}, Total: 1, Limit: query.Limit, Offset: query.Offset}, nil
}
func (repository *repositoryStub) Get(_ context.Context, id int64) (UserLevel, error) {
	repository.called = "view"
	return UserLevel{ID: id, Name: "Call Center"}, nil
}
func (repository *repositoryStub) GetPermissions(_ context.Context, _ int64) ([]TablePermission, error) {
	repository.called = "permissions"
	return []TablePermission{{TableName: "cchentri", Permission: 1901}}, nil
}
func (repository *repositoryStub) UpdatePermissions(_ context.Context, _ int64, _ []UpdatePermissionItem) error {
	repository.called = "update_permissions"
	return nil
}

func TestServiceRequiresListAndViewACL(t *testing.T) {
	identity := authentication.VerifiedIdentity{Username: "security.admin"}
	for _, test := range []struct {
		name   string
		action authorization.Action
		call   func(*Service) error
	}{
		{name: "list", action: authorization.ActionList, call: func(service *Service) error {
			_, err := service.List(context.Background(), identity, ListQuery{})
			return err
		}},
		{name: "view", action: authorization.ActionView, call: func(service *Service) error {
			_, err := service.Get(context.Background(), identity, 3)
			return err
		}},
	} {
		t.Run(test.name, func(t *testing.T) {
			loader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{29}, PermissionMask: int64(test.action)}}
			repository := &repositoryStub{}
			service := NewService(authorization.NewAccessService(loader), repository)
			if err := test.call(service); err != nil {
				t.Fatalf("authorized read failed: %v", err)
			}
			if loader.table != TableVariable || repository.called == "" {
				t.Fatalf("wrong ACL/repository call: %q/%q", loader.table, repository.called)
			}
		})
	}
}

func TestServiceRejectsMissingPermissionAndInvalidInputs(t *testing.T) {
	loader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{3}, PermissionMask: int64(authorization.ActionView)}}
	repository := &repositoryStub{}
	service := NewService(authorization.NewAccessService(loader), repository)
	identity := authentication.VerifiedIdentity{Username: "viewer"}
	if _, err := service.List(context.Background(), identity, ListQuery{}); !errors.Is(err, authorization.ErrPermissionDenied) {
		t.Fatalf("List without List permission = %v", err)
	}
	for _, query := range []ListQuery{{Limit: -1}, {Limit: MaximumPageSize + 1}, {Offset: -1}} {
		loader.access.PermissionMask = int64(authorization.ActionList)
		if _, err := service.List(context.Background(), identity, query); !errors.Is(err, ErrInvalidInput) {
			t.Errorf("List(%#v) error = %v, want invalid input", query, err)
		}
	}
	loader.access.PermissionMask = int64(authorization.ActionView)
	if _, err := service.Get(context.Background(), identity, int64(^uint32(0))); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("Get(out-of-range ID) error = %v, want invalid input", err)
	}
	if repository.called != "" {
		t.Fatalf("invalid/unauthorized request reached repository: %q", repository.called)
	}
}

func TestServiceDefaultsPaginationAndPreservesNegativeLegacyIDs(t *testing.T) {
	loader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{29}, PermissionMask: int64(authorization.ActionList | authorization.ActionView)}}
	repository := &repositoryStub{}
	service := NewService(authorization.NewAccessService(loader), repository)
	page, err := service.List(context.Background(), authentication.VerifiedIdentity{Username: "admin"}, ListQuery{})
	if err != nil || page.Limit != DefaultPageSize || repository.query.Offset != 0 {
		t.Fatalf("default List() = %#v, error = %v", page, err)
	}
	value, err := service.Get(context.Background(), authentication.VerifiedIdentity{Username: "admin"}, -2)
	if err != nil || value.ID != -2 {
		t.Fatalf("Get(-2) = %#v, error = %v; legacy system IDs may be negative", value, err)
	}
}

func TestServiceUpdatePermissionsSafeguardsAndACL(t *testing.T) {
	loader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{29}, PermissionMask: int64(authorization.ActionEdit)}}
	repository := &repositoryStub{}
	service := NewService(authorization.NewAccessService(loader), repository)
	identity := authentication.VerifiedIdentity{Username: "admin"}

	// Test SuperAdmin (-1) is protected
	_, err := service.UpdatePermissions(context.Background(), identity, -1, UpdatePermissionsRequest{
		Permissions: []UpdatePermissionItem{{TableName: "cchentri", Permission: 100}},
	})
	if !errors.Is(err, ErrCannotModifySuperAdmin) {
		t.Fatalf("UpdatePermissions(-1) error = %v, want ErrCannotModifySuperAdmin", err)
	}

	// Test authorized user can update permissions for valid level
	perms, err := service.UpdatePermissions(context.Background(), identity, 3, UpdatePermissionsRequest{
		Permissions: []UpdatePermissionItem{{TableName: "cchentri", Permission: 100}},
	})
	if err != nil {
		t.Fatalf("UpdatePermissions(3) failed: %v", err)
	}
	if repository.called != "permissions" { // called update_permissions then getPermissions which sets to permissions
		t.Fatalf("UpdatePermissions repository call = %s, want permissions", repository.called)
	}
	if len(perms) != 1 || perms[0].TableName != "cchentri" {
		t.Fatalf("UpdatePermissions returned unexpected perms: %#v", perms)
	}

	// Test unauthorized user without Edit action
	unauthLoader := &accessLoaderStub{access: authorization.AccountAccess{UserLevelIDs: []int64{3}, PermissionMask: int64(authorization.ActionView)}}
	unauthService := NewService(authorization.NewAccessService(unauthLoader), repository)
	_, err = unauthService.UpdatePermissions(context.Background(), authentication.VerifiedIdentity{Username: "viewer"}, 3, UpdatePermissionsRequest{})
	if !errors.Is(err, authorization.ErrPermissionDenied) {
		t.Fatalf("UpdatePermissions without Edit permission = %v, want ErrPermissionDenied", err)
	}
}
