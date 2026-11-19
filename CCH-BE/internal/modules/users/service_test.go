package users_test

import (
	"context"
	"errors"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"cch.local/backend/internal/modules/users"
	"cch.local/backend/internal/platform/authentication"
)

type mockRepository struct {
	lastHashedPassword string
	lastCreateCmd      users.CreateUserCommand
	lastUpdateCmd      users.UpdateUserCommand
	lastResetCmd       users.ResetPasswordCommand
	users              map[string]users.User
	levels             []users.UserLevel
}

func newMockRepository() *mockRepository {
	return &mockRepository{
		users: map[string]users.User{
			"admin.pusat": {
				Username:    "admin.pusat",
				UserLevelID: "29",
				FirstName:   "Admin",
				LastName:    "Pusat",
				OfficeCode:  "40000",
			},
			"cs.user": {
				Username:    "cs.user",
				UserLevelID: "3",
				FirstName:   "CS",
				LastName:    "User",
				OfficeCode:  "40005CC",
			},
		},
		levels: []users.UserLevel{
			{ID: -1, Name: "Administrator"},
			{ID: 3, Name: "Call Center"},
			{ID: 29, Name: "Admin Pusat"},
		},
	}
}

func (m *mockRepository) List(ctx context.Context, query users.UserListQuery) (users.UserPage, error) {
	var list []users.User
	for _, u := range m.users {
		list = append(list, u)
	}
	return users.UserPage{
		Data:   list,
		Total:  int64(len(list)),
		Limit:  query.Limit,
		Offset: query.Offset,
	}, nil
}

func (m *mockRepository) Get(ctx context.Context, username string) (users.User, error) {
	u, ok := m.users[username]
	if !ok {
		return users.User{}, users.ErrUserNotFound
	}
	return u, nil
}

func (m *mockRepository) Create(ctx context.Context, cmd users.CreateUserCommand, hashedPassword string) (users.User, error) {
	if _, exists := m.users[cmd.Username]; exists {
		return users.User{}, users.ErrUserAlreadyExists
	}
	m.lastCreateCmd = cmd
	m.lastHashedPassword = hashedPassword
	newUser := users.User{
		Username:    cmd.Username,
		FirstName:   cmd.FirstName,
		LastName:    cmd.LastName,
		Email:       cmd.Email,
		Phone:       cmd.Phone,
		UserLevelID: cmd.UserLevelID,
		OfficeCode:  cmd.OfficeCode,
		Activated:   cmd.Activated,
		Locked:      cmd.Locked,
	}
	m.users[cmd.Username] = newUser
	return newUser, nil
}

func (m *mockRepository) Update(ctx context.Context, cmd users.UpdateUserCommand) (users.User, error) {
	u, ok := m.users[cmd.Username]
	if !ok {
		return users.User{}, users.ErrUserNotFound
	}
	m.lastUpdateCmd = cmd
	u.FirstName = cmd.FirstName
	u.LastName = cmd.LastName
	u.Email = cmd.Email
	u.Phone = cmd.Phone
	u.UserLevelID = cmd.UserLevelID
	u.OfficeCode = cmd.OfficeCode
	u.Activated = cmd.Activated
	u.Locked = cmd.Locked
	m.users[cmd.Username] = u
	return u, nil
}

func (m *mockRepository) UpdateProfile(ctx context.Context, cmd users.UpdateProfileCommand) (users.User, error) {
	u, ok := m.users[cmd.Username]
	if !ok {
		return users.User{}, users.ErrUserNotFound
	}
	u.FirstName = cmd.FirstName
	u.LastName = cmd.LastName
	u.Email = cmd.Email
	u.Phone = cmd.Phone
	m.users[cmd.Username] = u
	return u, nil
}

func (m *mockRepository) GetPasswordHash(ctx context.Context, username string) (string, error) {
	if _, ok := m.users[username]; !ok {
		return "", users.ErrUserNotFound
	}
	// Return a valid hash for "existingpassword123"
	hash, _ := bcrypt.GenerateFromPassword([]byte("existingpassword123"), bcrypt.DefaultCost)
	return string(hash), nil
}

func (m *mockRepository) ResetPassword(ctx context.Context, cmd users.ResetPasswordCommand, hashedPassword string) error {
	if _, ok := m.users[cmd.Username]; !ok {
		return users.ErrUserNotFound
	}
	m.lastResetCmd = cmd
	m.lastHashedPassword = hashedPassword
	return nil
}

func (m *mockRepository) ListUserLevels(ctx context.Context) ([]users.UserLevel, error) {
	return m.levels, nil
}

func TestValidation(t *testing.T) {
	t.Run("CreateUserCommand", func(t *testing.T) {
		cmd := users.CreateUserCommand{
			Username:    "",
			Password:    "secret123",
			UserLevelID: "3",
		}
		if _, err := cmd.Validate(); !errors.Is(err, users.ErrUsernameRequired) {
			t.Fatalf("expected ErrUsernameRequired, got %v", err)
		}

		cmd.Username = "validuser"
		cmd.Password = "short"
		if _, err := cmd.Validate(); !errors.Is(err, users.ErrPasswordRequired) {
			t.Fatalf("expected ErrPasswordRequired, got %v", err)
		}

		cmd.Password = "validpassword"
		cmd.UserLevelID = ""
		if _, err := cmd.Validate(); !errors.Is(err, users.ErrUserLevelRequired) {
			t.Fatalf("expected ErrUserLevelRequired, got %v", err)
		}

		cmd.UserLevelID = "3"
		validated, err := cmd.Validate()
		if err != nil {
			t.Fatalf("unexpected validation error: %v", err)
		}
		if validated.Activated != "Y" || validated.Locked != "N" {
			t.Fatalf("expected defaults Activated=Y, Locked=N, got %s/%s", validated.Activated, validated.Locked)
		}
	})

	t.Run("ResetPasswordCommand", func(t *testing.T) {
		cmd := users.ResetPasswordCommand{
			Username:    "someone",
			NewPassword: "123",
		}
		if _, err := cmd.Validate(); !errors.Is(err, users.ErrPasswordRequired) {
			t.Fatalf("expected ErrPasswordRequired, got %v", err)
		}
	})
}

func TestServiceAuthorization(t *testing.T) {
	repo := newMockRepository()
	service := users.NewService(nil, repo)

	adminIdentity := authentication.VerifiedIdentity{
		Username:    "admin.pusat",
		UserLevelID: "29",
		OfficeCode:  "40000",
	}
	staffIdentity := authentication.VerifiedIdentity{
		Username:    "cs.user",
		UserLevelID: "3",
		OfficeCode:  "40005CC",
	}

	ctx := context.Background()

	// Admin can list users
	page, err := service.ListUsers(ctx, adminIdentity, users.UserListQuery{})
	if err != nil {
		t.Fatalf("admin list users failed: %v", err)
	}
	if page.Total != 2 {
		t.Fatalf("expected 2 users, got %d", page.Total)
	}

	// Staff cannot list users
	if _, err := service.ListUsers(ctx, staffIdentity, users.UserListQuery{}); !errors.Is(err, users.ErrAdminRoleRequired) {
		t.Fatalf("expected ErrAdminRoleRequired for staff list, got %v", err)
	}

	// Staff CAN view their own profile
	selfUser, err := service.GetUser(ctx, staffIdentity, "cs.user")
	if err != nil {
		t.Fatalf("viewing own profile failed: %v", err)
	}
	if selfUser.Username != "cs.user" {
		t.Fatalf("expected cs.user, got %s", selfUser.Username)
	}

	// Staff CANNOT view another user's profile
	if _, err := service.GetUser(ctx, staffIdentity, "admin.pusat"); !errors.Is(err, users.ErrAdminRoleRequired) {
		t.Fatalf("expected ErrAdminRoleRequired viewing another profile, got %v", err)
	}

	// Admin creates a new user
	newUser, err := service.CreateUser(ctx, adminIdentity, users.CreateUserCommand{
		Username:    "new.officer",
		Password:    "password123",
		FirstName:   "New",
		LastName:    "Officer",
		Email:       "new@posindonesia.co.id",
		Phone:       "08123456789",
		UserLevelID: "1",
		OfficeCode:  "40000",
	})
	if err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	if newUser.Username != "new.officer" {
		t.Fatalf("expected new.officer, got %s", newUser.Username)
	}

	// Verify password was hashed with bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(repo.lastHashedPassword), []byte("password123")); err != nil {
		t.Fatalf("stored password is not valid bcrypt hash of input: %v", err)
	}

	// Staff cannot create user
	if _, err := service.CreateUser(ctx, staffIdentity, users.CreateUserCommand{
		Username:    "another.officer",
		Password:    "password123",
		UserLevelID: "1",
	}); !errors.Is(err, users.ErrAdminRoleRequired) {
		t.Fatalf("expected ErrAdminRoleRequired for staff create, got %v", err)
	}

	// Admin can reset password of any user
	err = service.ResetPassword(ctx, adminIdentity, users.ResetPasswordCommand{
		Username:    "new.officer",
		NewPassword: "newsecurepassword123",
	})
	if err != nil {
		t.Fatalf("admin reset password failed: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(repo.lastHashedPassword), []byte("newsecurepassword123")); err != nil {
		t.Fatalf("stored reset password is not valid bcrypt hash: %v", err)
	}

	// Staff can reset their own password
	err = service.ResetPassword(ctx, staffIdentity, users.ResetPasswordCommand{
		Username:    "cs.user",
		NewPassword: "myownnewpassword123",
	})
	if err != nil {
		t.Fatalf("staff reset own password failed: %v", err)
	}

	// Staff CANNOT reset another user's password
	err = service.ResetPassword(ctx, staffIdentity, users.ResetPasswordCommand{
		Username:    "admin.pusat",
		NewPassword: "hackedpassword123",
	})
	if !errors.Is(err, users.ErrAdminRoleRequired) {
		t.Fatalf("expected ErrAdminRoleRequired when staff resets admin password, got %v", err)
	}

	// Admin can list user levels
	levels, err := service.ListUserLevels(ctx, adminIdentity)
	if err != nil {
		t.Fatalf("list user levels failed: %v", err)
	}
	if len(levels) != 3 {
		t.Fatalf("expected 3 levels, got %d", len(levels))
	}
}

func TestServiceProfileManagement(t *testing.T) {
	repo := newMockRepository()
	service := users.NewService(nil, repo)
	ctx := context.Background()

	staffIdentity := authentication.VerifiedIdentity{
		Username:    "cs.user",
		UserLevelID: "3",
		OfficeCode:  "40005CC",
	}

	// 1. Get own profile
	profile, err := service.GetProfile(ctx, staffIdentity)
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}
	if profile.Username != "cs.user" || profile.OfficeCode != "40005CC" {
		t.Fatalf("unexpected profile data: %#v", profile)
	}

	// 2. Update own profile
	updated, err := service.UpdateProfile(ctx, staffIdentity, users.UpdateProfileCommand{
		FirstName: "Cantik",
		LastName:  "Anita",
		Email:     "anita@posind.test",
		Phone:     "08123456789",
	})
	if err != nil {
		t.Fatalf("UpdateProfile failed: %v", err)
	}
	if updated.FirstName != "Cantik" || updated.Email != "anita@posind.test" {
		t.Fatalf("unexpected updated profile data: %#v", updated)
	}

	// 3. Change password with wrong old password -> error
	err = service.ChangePassword(ctx, staffIdentity, users.ChangePasswordCommand{
		OldPassword: "wrongpassword",
		NewPassword: "newsecretpassword123",
	})
	if err == nil || err.Error() != "kata sandi lama salah" {
		t.Fatalf("expected 'kata sandi lama salah' error, got %v", err)
	}

	// 4. Change password with correct old password -> success
	err = service.ChangePassword(ctx, staffIdentity, users.ChangePasswordCommand{
		OldPassword: "existingpassword123",
		NewPassword: "newsecretpassword123",
	})
	if err != nil {
		t.Fatalf("ChangePassword failed: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(repo.lastHashedPassword), []byte("newsecretpassword123")); err != nil {
		t.Fatalf("stored changed password is not valid bcrypt hash: %v", err)
	}
}
