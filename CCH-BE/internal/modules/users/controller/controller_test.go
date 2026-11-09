package controller

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"cch.local/backend/internal/modules/users"
	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/httpapi"
)

type stubTokenVerifier struct {
	identity authentication.VerifiedIdentity
}

func (s stubTokenVerifier) Verify(string) (authentication.VerifiedIdentity, error) {
	return s.identity, nil
}

type mockUserService struct {
	listUsersFunc      func(ctx context.Context, identity authentication.VerifiedIdentity, query users.UserListQuery) (users.UserPage, error)
	getUserFunc        func(ctx context.Context, identity authentication.VerifiedIdentity, username string) (users.User, error)
	createUserFunc     func(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.CreateUserCommand) (users.User, error)
	updateUserFunc     func(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateUserCommand) (users.User, error)
	resetPasswordFunc  func(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ResetPasswordCommand) error
	listUserLevelsFunc func(ctx context.Context, identity authentication.VerifiedIdentity) ([]users.UserLevel, error)
	getProfileFunc     func(ctx context.Context, identity authentication.VerifiedIdentity) (users.User, error)
	updateProfileFunc  func(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateProfileCommand) (users.User, error)
	changePasswordFunc func(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ChangePasswordCommand) error
}

func (m *mockUserService) ListUsers(ctx context.Context, identity authentication.VerifiedIdentity, query users.UserListQuery) (users.UserPage, error) {
	if m.listUsersFunc != nil {
		return m.listUsersFunc(ctx, identity, query)
	}
	return users.UserPage{}, nil
}

func (m *mockUserService) GetUser(ctx context.Context, identity authentication.VerifiedIdentity, username string) (users.User, error) {
	if m.getUserFunc != nil {
		return m.getUserFunc(ctx, identity, username)
	}
	return users.User{}, nil
}

func (m *mockUserService) CreateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.CreateUserCommand) (users.User, error) {
	if m.createUserFunc != nil {
		return m.createUserFunc(ctx, identity, cmd)
	}
	return users.User{}, nil
}

func (m *mockUserService) UpdateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateUserCommand) (users.User, error) {
	if m.updateUserFunc != nil {
		return m.updateUserFunc(ctx, identity, cmd)
	}
	return users.User{}, nil
}

func (m *mockUserService) ResetPassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ResetPasswordCommand) error {
	if m.resetPasswordFunc != nil {
		return m.resetPasswordFunc(ctx, identity, cmd)
	}
	return nil
}

func (m *mockUserService) ListUserLevels(ctx context.Context, identity authentication.VerifiedIdentity) ([]users.UserLevel, error) {
	if m.listUserLevelsFunc != nil {
		return m.listUserLevelsFunc(ctx, identity)
	}
	return nil, nil
}

func (m *mockUserService) GetProfile(ctx context.Context, identity authentication.VerifiedIdentity) (users.User, error) {
	if m.getProfileFunc != nil {
		return m.getProfileFunc(ctx, identity)
	}
	return users.User{}, nil
}

func (m *mockUserService) UpdateProfile(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateProfileCommand) (users.User, error) {
	if m.updateProfileFunc != nil {
		return m.updateProfileFunc(ctx, identity, cmd)
	}
	return users.User{}, nil
}

func (m *mockUserService) ChangePassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd users.ChangePasswordCommand) error {
	if m.changePasswordFunc != nil {
		return m.changePasswordFunc(ctx, identity, cmd)
	}
	return nil
}

func testApp(identity authentication.VerifiedIdentity, service Service) *fiber.App {
	registrar := httpapi.AuthenticatedRouteModule(stubTokenVerifier{identity: identity}, New(service))
	return httpapi.NewServer(nil, nil, registrar)
}

func TestUserController(t *testing.T) {
	adminIdentity := authentication.VerifiedIdentity{Username: "admin.pusat", UserLevelID: "29", OfficeCode: "40000"}

	t.Run("GET /admin/users returns user list", func(t *testing.T) {
		svc := &mockUserService{
			listUsersFunc: func(_ context.Context, _ authentication.VerifiedIdentity, query users.UserListQuery) (users.UserPage, error) {
				return users.UserPage{
					Data:  []users.User{{Username: "admin.pusat", FirstName: "Admin"}},
					Total: 1,
				}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users?limit=10&offset=0", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("GET /admin/users/levels returns roles", func(t *testing.T) {
		svc := &mockUserService{
			listUserLevelsFunc: func(_ context.Context, _ authentication.VerifiedIdentity) ([]users.UserLevel, error) {
				return []users.UserLevel{
					{ID: -1, Name: "Administrator"},
					{ID: 3, Name: "Call Center"},
				}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/levels", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("GET /admin/users/:username returns single user", func(t *testing.T) {
		svc := &mockUserService{
			getUserFunc: func(_ context.Context, _ authentication.VerifiedIdentity, username string) (users.User, error) {
				if username == "admin.pusat" {
					return users.User{Username: "admin.pusat"}, nil
				}
				return users.User{}, users.ErrUserNotFound
			},
		}
		app := testApp(adminIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/admin.pusat", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}

		// Not found
		req404 := httptest.NewRequest(http.MethodGet, "/api/v1/admin/users/unknown", nil)
		req404.Header.Set("Authorization", "Bearer token")
		res404, _ := app.Test(req404)
		if res404.StatusCode != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", res404.StatusCode)
		}
	})

	t.Run("POST /admin/users creates new user", func(t *testing.T) {
		svc := &mockUserService{
			createUserFunc: func(_ context.Context, _ authentication.VerifiedIdentity, cmd users.CreateUserCommand) (users.User, error) {
				return users.User{Username: cmd.Username}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		body := `{"username":"newuser","password":"password123","user_level_id":"3"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/users", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusCreated {
			t.Fatalf("expected 201, got %d", res.StatusCode)
		}
	})

	t.Run("PUT /admin/users/:username updates user", func(t *testing.T) {
		svc := &mockUserService{
			updateUserFunc: func(_ context.Context, _ authentication.VerifiedIdentity, cmd users.UpdateUserCommand) (users.User, error) {
				return users.User{Username: cmd.Username, FirstName: cmd.FirstName}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		body := `{"first_name":"Updated","user_level_id":"3"}`
		req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/existinguser", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("POST /admin/users/:username/reset-password resets password", func(t *testing.T) {
		svc := &mockUserService{
			resetPasswordFunc: func(_ context.Context, _ authentication.VerifiedIdentity, cmd users.ResetPasswordCommand) error {
				return nil
			},
		}
		app := testApp(adminIdentity, svc)
		body := `{"new_password":"newsecretpassword123"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/users/existinguser/reset-password", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("GET /users/profile returns own profile", func(t *testing.T) {
		svc := &mockUserService{
			getProfileFunc: func(_ context.Context, identity authentication.VerifiedIdentity) (users.User, error) {
				return users.User{
					Username:   identity.Username,
					FirstName:  "Self",
					OfficeCode: identity.OfficeCode,
				}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/users/profile", nil)
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("PUT /users/profile updates own profile", func(t *testing.T) {
		svc := &mockUserService{
			updateProfileFunc: func(_ context.Context, identity authentication.VerifiedIdentity, cmd users.UpdateProfileCommand) (users.User, error) {
				return users.User{
					Username:  identity.Username,
					FirstName: cmd.FirstName,
					Email:     cmd.Email,
				}, nil
			},
		}
		app := testApp(adminIdentity, svc)
		body := `{"first_name":"UpdatedSelf","email":"self@posind.test","phone":"081234"}`
		req := httptest.NewRequest(http.MethodPut, "/api/v1/users/profile", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})

	t.Run("POST /users/profile/change-password changes own password", func(t *testing.T) {
		svc := &mockUserService{
			changePasswordFunc: func(_ context.Context, identity authentication.VerifiedIdentity, cmd users.ChangePasswordCommand) error {
				return nil
			},
		}
		app := testApp(adminIdentity, svc)
		body := `{"old_password":"oldpassword123","new_password":"newpassword123"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/users/profile/change-password", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer token")
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		if res.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d", res.StatusCode)
		}
	})
}
