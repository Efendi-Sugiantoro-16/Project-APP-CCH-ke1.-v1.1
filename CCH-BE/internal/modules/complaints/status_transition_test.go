package complaints

import (
	"context"
	"errors"
	"testing"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type stubCallCenterStatusTransitionRepository struct {
	command StatusTransitionCommand
	result  StatusTransitionResult
	err     error
	called  bool
}

func (repository *stubCallCenterStatusTransitionRepository) ApplyCallCenterStatusTransition(_ context.Context, command StatusTransitionCommand) (StatusTransitionResult, error) {
	repository.called = true
	repository.command = command
	return repository.result, repository.err
}

func TestStatusTransitionServiceUsesRevalidatedIdentityAndNormalizesRequest(t *testing.T) {
	loader := &stubComplaintAccessLoader{accessByTable: map[string]authorization.AccountAccess{
		cchComplaintTable: {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionView)},
		"cchentrimas":     {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionAdd)},
	}}
	repository := &stubCallCenterStatusTransitionRepository{result: StatusTransitionResult{ComplaintID: "TKT-001", HistoryID: "HIST-001", StatusCode: "103"}}
	service := NewStatusTransitionService(authorization.NewAccessService(loader), repository)

	result, err := service.ApplyForCallCenter(context.Background(), authentication.VerifiedIdentity{Username: "agent.test", OfficeCode: "UNTRUSTED"}, StatusTransitionRequest{
		ComplaintID:        " TKT-001 ",
		ExpectedStatusCode: " 102 ",
		StatusCode:         " 103 ",
		Description:        "  Sedang dikonfirmasi  ",
		IdempotencyKey:     "request-key-0001",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !repository.called {
		t.Fatal("authorized request did not reach status repository")
	}
	command := repository.command
	if command.ComplaintID != "TKT-001" || command.ExpectedStatusCode != "102" || command.StatusCode != "103" || command.Description != "Sedang dikonfirmasi" || command.IdempotencyKey != "request-key-0001" {
		t.Fatalf("request was not normalized: %#v", command.StatusTransitionRequest)
	}
	if command.OfficeCode != "40005CC" || command.Actor != "agent.test" {
		t.Fatalf("writer received untrusted office/actor: %#v", command)
	}
	if result.HistoryID != "HIST-001" {
		t.Fatalf("result = %#v", result)
	}
}

func TestStatusTransitionServiceRejectsInvalidRequestsBeforeAuthorizationOrWrite(t *testing.T) {
	invalidRequests := []StatusTransitionRequest{
		{ComplaintID: "TKT-001", ExpectedStatusCode: "109", StatusCode: "103", Description: "update", IdempotencyKey: "request-key-0001"},
		{ComplaintID: "TKT-001", ExpectedStatusCode: "101", StatusCode: "104", Description: "update", IdempotencyKey: "request-key-0001"},
		{ComplaintID: "TKT-001", ExpectedStatusCode: "101", StatusCode: "103", Description: " ", IdempotencyKey: "request-key-0001"},
		{ComplaintID: "TKT-001", ExpectedStatusCode: "101", StatusCode: "103", Description: "update", IdempotencyKey: "short"},
		{ComplaintID: "TKT-001", ExpectedStatusCode: "101", StatusCode: "103", Description: "update", IdempotencyKey: "request-key-00é"},
	}
	for _, request := range invalidRequests {
		repository := &stubCallCenterStatusTransitionRepository{}
		service := NewStatusTransitionService(authorization.NewAccessService(&stubComplaintAccessLoader{}), repository)
		if _, err := service.ApplyForCallCenter(context.Background(), authentication.VerifiedIdentity{}, request); !errors.Is(err, ErrInvalidStatusTransition) {
			t.Errorf("invalid request %#v error = %v, want invalid transition", request, err)
		}
		if repository.called {
			t.Errorf("invalid request %#v reached the repository", request)
		}
	}
}

func TestStatusTransitionServiceRequiresBothPermissionsAndSingleCallCenterRole(t *testing.T) {
	for _, test := range []struct {
		name    string
		access  map[string]authorization.AccountAccess
		wantErr error
	}{
		{
			name: "missing history Add permission",
			access: map[string]authorization.AccountAccess{
				cchComplaintTable: {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionView)},
				"cchentrimas":     {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionList)},
			},
			wantErr: authorization.ErrPermissionDenied,
		},
		{
			name: "wrong role",
			access: map[string]authorization.AccountAccess{
				cchComplaintTable: {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{1}, PermissionMask: int64(authorization.ActionView)},
				"cchentrimas":     {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{1}, PermissionMask: int64(authorization.ActionAdd)},
			},
			wantErr: ErrCallCenterRoleRequired,
		},
		{
			name: "multiple roles",
			access: map[string]authorization.AccountAccess{
				cchComplaintTable: {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID, 1}, PermissionMask: int64(authorization.ActionView)},
				"cchentrimas":     {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID, 1}, PermissionMask: int64(authorization.ActionAdd)},
			},
			wantErr: ErrCallCenterRoleRequired,
		},
		{
			name: "office mismatch",
			access: map[string]authorization.AccountAccess{
				cchComplaintTable: {Username: "agent.test", OfficeCode: "40005CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionView)},
				"cchentrimas":     {Username: "agent.test", OfficeCode: "40006CC", UserLevelIDs: []int64{callCenterUserLevelID}, PermissionMask: int64(authorization.ActionAdd)},
			},
			wantErr: authorization.ErrIdentityMismatch,
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			repository := &stubCallCenterStatusTransitionRepository{}
			service := NewStatusTransitionService(authorization.NewAccessService(&stubComplaintAccessLoader{accessByTable: test.access}), repository)
			_, err := service.ApplyForCallCenter(context.Background(), authentication.VerifiedIdentity{Username: "agent.test"}, StatusTransitionRequest{
				ComplaintID: "TKT-001", ExpectedStatusCode: "102", StatusCode: "103", Description: "update", IdempotencyKey: "request-key-0001",
			})
			if !errors.Is(err, test.wantErr) {
				t.Fatalf("ApplyForCallCenter() error = %v, want %v", err, test.wantErr)
			}
			if repository.called {
				t.Fatal("unauthorized request reached status repository")
			}
		})
	}
}

func TestStatusTransitionServiceAllowsAllOperationalRoles(t *testing.T) {
	operationalRoles := []struct {
		name string
		id   int64
	}{
		{name: "Administrator", id: -1},
		{name: "UPT", id: 1},
		{name: "UPT dan Bandara", id: 2},
		{name: "Call Center", id: 3},
		{name: "Admin UPT", id: 9},
		{name: "Regional", id: 10},
		{name: "Admin Regional", id: 19},
		{name: "Kantor Pusat", id: 20},
		{name: "Admin Pusat", id: 29},
	}

	for _, role := range operationalRoles {
		t.Run(role.name, func(t *testing.T) {
			access := map[string]authorization.AccountAccess{
				cchComplaintTable: {Username: "officer.test", OfficeCode: "40005CC", UserLevelIDs: []int64{role.id}, PermissionMask: int64(authorization.ActionView)},
				"cchentrimas":     {Username: "officer.test", OfficeCode: "40005CC", UserLevelIDs: []int64{role.id}, PermissionMask: int64(authorization.ActionAdd)},
			}
			repository := &stubCallCenterStatusTransitionRepository{
				result: StatusTransitionResult{ComplaintID: "TKT-001", HistoryID: "HIST-001", StatusCode: "103"},
			}
			service := NewStatusTransitionService(authorization.NewAccessService(&stubComplaintAccessLoader{accessByTable: access}), repository)
			res, err := service.ApplyStatusTransition(context.Background(), authentication.VerifiedIdentity{Username: "officer.test"}, StatusTransitionRequest{
				ComplaintID: "TKT-001", ExpectedStatusCode: "102", StatusCode: "103", Description: "multi-role transition", IdempotencyKey: "multi-role-key-01",
			})
			if err != nil {
				t.Fatalf("ApplyStatusTransition() failed for role %s: %v", role.name, err)
			}
			if !repository.called {
				t.Fatalf("repository not called for role %s", role.name)
			}
			if res.StatusCode != "103" {
				t.Fatalf("res.StatusCode = %s, want 103", res.StatusCode)
			}
		})
	}
}
