package users

import (
	"context"
	"crypto/md5"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

// Service coordinates business logic and access control for user administration
type Service struct {
	access *authorization.AccessService
	repo   Repository
}

// NewService creates a new user management service
func NewService(access *authorization.AccessService, repo Repository) *Service {
	return &Service{
		access: access,
		repo:   repo,
	}
}

// isAllowedAdmin checks if the user level belongs to an admin role (-1 SysAdmin, 9 Admin UPT, 19 Admin Regional, 29 Admin Pusat)
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

// authorizeAdmin checks if user has administrative rights or specific table action permission
func (s *Service) authorizeAdmin(ctx context.Context, identity authentication.VerifiedIdentity, action authorization.Action) error {
	if isAllowedAdmin(identity) {
		return nil
	}
	if s.access != nil {
		_, err := s.access.Authorize(ctx, identity, TableVariable, action)
		if err == nil {
			return nil
		}
	}
	return ErrAdminRoleRequired
}

// ListUsers lists users with authorization check
func (s *Service) ListUsers(ctx context.Context, identity authentication.VerifiedIdentity, query UserListQuery) (UserPage, error) {
	if s == nil || s.repo == nil {
		return UserPage{}, ErrUserServiceNotReady
	}

	if err := s.authorizeAdmin(ctx, identity, authorization.ActionList); err != nil {
		return UserPage{}, err
	}

	normQuery, err := query.Normalize()
	if err != nil {
		return UserPage{}, err
	}

	return s.repo.List(ctx, normQuery)
}

// GetUser returns a single user's detail
func (s *Service) GetUser(ctx context.Context, identity authentication.VerifiedIdentity, username string) (User, error) {
	if s == nil || s.repo == nil {
		return User{}, ErrUserServiceNotReady
	}

	// Allow user to view their own profile, or require admin permission to view other users
	if !strings.EqualFold(identity.Username, strings.TrimSpace(username)) {
		if err := s.authorizeAdmin(ctx, identity, authorization.ActionView); err != nil {
			return User{}, err
		}
	}

	return s.repo.Get(ctx, username)
}

// CreateUser registers a new user with bcrypt password hashing
func (s *Service) CreateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd CreateUserCommand) (User, error) {
	if s == nil || s.repo == nil {
		return User{}, ErrUserServiceNotReady
	}

	if err := s.authorizeAdmin(ctx, identity, authorization.ActionAdd); err != nil {
		return User{}, err
	}

	validated, err := cmd.Validate()
	if err != nil {
		return User{}, err
	}
	validated.AddedBy = identity.Username

	// Hash password with bcrypt
	hashed, err := bcrypt.GenerateFromPassword([]byte(validated.Password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, fmt.Errorf("hash password: %w", err)
	}

	return s.repo.Create(ctx, validated, string(hashed))
}

// UpdateUser modifies an existing user
func (s *Service) UpdateUser(ctx context.Context, identity authentication.VerifiedIdentity, cmd UpdateUserCommand) (User, error) {
	if s == nil || s.repo == nil {
		return User{}, ErrUserServiceNotReady
	}

	if err := s.authorizeAdmin(ctx, identity, authorization.ActionEdit); err != nil {
		return User{}, err
	}

	validated, err := cmd.Validate()
	if err != nil {
		return User{}, err
	}
	validated.UpdatedBy = identity.Username

	return s.repo.Update(ctx, validated)
}

// ResetPassword sets a new password for a user
func (s *Service) ResetPassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd ResetPasswordCommand) error {
	if s == nil || s.repo == nil {
		return ErrUserServiceNotReady
	}

	// Admin can reset anyone's password; non-admin can only reset their own password
	if !strings.EqualFold(identity.Username, strings.TrimSpace(cmd.Username)) {
		if err := s.authorizeAdmin(ctx, identity, authorization.ActionEdit); err != nil {
			return err
		}
	}

	validated, err := cmd.Validate()
	if err != nil {
		return err
	}
	validated.UpdatedBy = identity.Username

	// Hash new password with bcrypt
	hashed, err := bcrypt.GenerateFromPassword([]byte(validated.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	return s.repo.ResetPassword(ctx, validated, string(hashed))
}

// ListUserLevels returns all available user levels for role assignment
func (s *Service) ListUserLevels(ctx context.Context, identity authentication.VerifiedIdentity) ([]UserLevel, error) {
	if s == nil || s.repo == nil {
		return nil, ErrUserServiceNotReady
	}

	if err := s.authorizeAdmin(ctx, identity, authorization.ActionLookup); err != nil {
		return nil, err
	}

	return s.repo.ListUserLevels(ctx)
}

// GetProfile returns the authenticated user's profile (cch_profil_pengguna)
func (s *Service) GetProfile(ctx context.Context, identity authentication.VerifiedIdentity) (User, error) {
	if s == nil || s.repo == nil {
		return User{}, ErrUserServiceNotReady
	}
	return s.repo.Get(ctx, identity.Username)
}

// UpdateProfile allows a user to update their own personal profile
func (s *Service) UpdateProfile(ctx context.Context, identity authentication.VerifiedIdentity, cmd UpdateProfileCommand) (User, error) {
	if s == nil || s.repo == nil {
		return User{}, ErrUserServiceNotReady
	}
	cmd.Username = identity.Username
	validated, err := cmd.Validate()
	if err != nil {
		return User{}, err
	}
	return s.repo.UpdateProfile(ctx, validated)
}

// verifyPassword checks bcrypt hash first, then falls back to legacy MD5 hash
func verifyPassword(storedHash, plainPassword string) bool {
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(plainPassword)); err == nil {
		return true
	}
	hasher := md5.New()
	hasher.Write([]byte(plainPassword))
	md5Hash := hex.EncodeToString(hasher.Sum(nil))
	return subtle.ConstantTimeCompare([]byte(storedHash), []byte(md5Hash)) == 1
}

// ChangePassword allows a user to change their own password with old password verification
func (s *Service) ChangePassword(ctx context.Context, identity authentication.VerifiedIdentity, cmd ChangePasswordCommand) error {
	if s == nil || s.repo == nil {
		return ErrUserServiceNotReady
	}
	cmd.Username = identity.Username
	validated, err := cmd.Validate()
	if err != nil {
		return err
	}

	// Verify old password
	currentHash, err := s.repo.GetPasswordHash(ctx, validated.Username)
	if err != nil {
		return err
	}

	if !verifyPassword(currentHash, validated.OldPassword) {
		return ErrInvalidOldPassword
	}

	// Hash new password
	hashed, err := bcrypt.GenerateFromPassword([]byte(validated.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	resetCmd := ResetPasswordCommand{
		Username:    validated.Username,
		NewPassword: validated.NewPassword,
		UpdatedBy:   validated.Username,
	}
	return s.repo.ResetPassword(ctx, resetCmd, string(hashed))
}
