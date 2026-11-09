package users

import (
	"context"
	"errors"
	"strings"
	"time"
)

const TableVariable = "cch_users"

const (
	DefaultPageSize = 25
	MaxPageSize     = 100
)

var (
	ErrUserNotFound        = errors.New("user not found")
	ErrUserAlreadyExists   = errors.New("username already exists")
	ErrInvalidUserInput    = errors.New("invalid user input")
	ErrUsernameRequired    = errors.New("username is required")
	ErrPasswordRequired    = errors.New("password is required (minimum 6 characters)")
	ErrUserLevelRequired   = errors.New("user level is required")
	ErrAdminRoleRequired   = errors.New("admin role is required to manage users")
	ErrUserServiceNotReady = errors.New("user management service is not configured")
	ErrInvalidOldPassword  = errors.New("kata sandi lama salah")
)

// User represents an officer / user profile in CCH
type User struct {
	Username        string     `json:"username"`
	FirstName       string     `json:"first_name"`
	LastName        string     `json:"last_name"`
	Email           string     `json:"email"`
	Phone           string     `json:"phone"`
	UserLevelID     string     `json:"user_level_id"`
	UserLevelName   string     `json:"user_level_name,omitempty"`
	ReportTo        string     `json:"report_to"`
	OfficeCode      string     `json:"office_code"`
	Activated       string     `json:"activated"`          // "Y" or "N"
	Locked          string     `json:"locked"`             // "Y" or "N"
	CurrentStatus   string     `json:"current_status"`     // "Login" or "Logout"
	DisplayInCSList string     `json:"display_in_cs_list"` // "Y" or "N"
	LastLogin       *time.Time `json:"last_login,omitempty"`
	DateAdded       *time.Time `json:"date_added,omitempty"`
	DateUpdated     *time.Time `json:"date_updated,omitempty"`
}

// UserListQuery represents filtering and pagination for users list
type UserListQuery struct {
	OfficeCode  string
	UserLevelID string
	Search      string
	Limit       int
	Offset      int
}

// Normalize validates and normalizes list query parameters
func (query UserListQuery) Normalize() (UserListQuery, error) {
	if query.Limit == 0 {
		query.Limit = DefaultPageSize
	}
	if query.Limit < 1 || query.Limit > MaxPageSize || query.Offset < 0 {
		return UserListQuery{}, ErrInvalidUserInput
	}
	query.OfficeCode = strings.TrimSpace(query.OfficeCode)
	query.UserLevelID = strings.TrimSpace(query.UserLevelID)
	query.Search = strings.TrimSpace(query.Search)
	return query, nil
}

// UserPage represents paginated user list result
type UserPage struct {
	Data   []User `json:"data"`
	Total  int64  `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}

// CreateUserCommand represents parameters to register a new user
type CreateUserCommand struct {
	Username        string `json:"username"`
	Password        string `json:"password"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	UserLevelID     string `json:"user_level_id"`
	ReportTo        string `json:"report_to"`
	OfficeCode      string `json:"office_code"`
	Activated       string `json:"activated"`
	Locked          string `json:"locked"`
	CurrentStatus   string `json:"current_status"`
	DisplayInCSList string `json:"display_in_cs_list"`
	AddedBy         string `json:"-"`
}

// Validate checks and normalizes user creation parameters
func (cmd CreateUserCommand) Validate() (CreateUserCommand, error) {
	cmd.Username = strings.TrimSpace(cmd.Username)
	cmd.FirstName = strings.TrimSpace(cmd.FirstName)
	cmd.LastName = strings.TrimSpace(cmd.LastName)
	cmd.Email = strings.TrimSpace(cmd.Email)
	cmd.Phone = strings.TrimSpace(cmd.Phone)
	cmd.UserLevelID = strings.TrimSpace(cmd.UserLevelID)
	cmd.ReportTo = strings.TrimSpace(cmd.ReportTo)
	cmd.OfficeCode = strings.TrimSpace(cmd.OfficeCode)
	cmd.Activated = strings.ToUpper(strings.TrimSpace(cmd.Activated))
	cmd.Locked = strings.ToUpper(strings.TrimSpace(cmd.Locked))
	cmd.CurrentStatus = strings.TrimSpace(cmd.CurrentStatus)
	cmd.DisplayInCSList = strings.ToUpper(strings.TrimSpace(cmd.DisplayInCSList))

	if cmd.Username == "" {
		return CreateUserCommand{}, ErrUsernameRequired
	}
	if len(cmd.Username) < 3 || len(cmd.Username) > 50 {
		return CreateUserCommand{}, errors.New("username must be between 3 and 50 characters")
	}
	if len(cmd.Password) < 6 {
		return CreateUserCommand{}, ErrPasswordRequired
	}
	if cmd.UserLevelID == "" {
		return CreateUserCommand{}, ErrUserLevelRequired
	}
	if cmd.Activated != "Y" && cmd.Activated != "N" {
		cmd.Activated = "Y"
	}
	if cmd.Locked != "Y" && cmd.Locked != "N" {
		cmd.Locked = "N"
	}
	if cmd.CurrentStatus != "Login" && cmd.CurrentStatus != "Logout" {
		cmd.CurrentStatus = "Logout"
	}
	if cmd.DisplayInCSList != "Y" && cmd.DisplayInCSList != "N" {
		cmd.DisplayInCSList = "Y"
	}

	return cmd, nil
}

// UpdateUserCommand represents parameters to modify an existing user
type UpdateUserCommand struct {
	Username        string `json:"-"`
	FirstName       string `json:"first_name"`
	LastName        string `json:"last_name"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	UserLevelID     string `json:"user_level_id"`
	ReportTo        string `json:"report_to"`
	OfficeCode      string `json:"office_code"`
	Activated       string `json:"activated"`
	Locked          string `json:"locked"`
	CurrentStatus   string `json:"current_status"`
	DisplayInCSList string `json:"display_in_cs_list"`
	UpdatedBy       string `json:"-"`
}

// Validate checks and normalizes user update parameters
func (cmd UpdateUserCommand) Validate() (UpdateUserCommand, error) {
	cmd.Username = strings.TrimSpace(cmd.Username)
	cmd.FirstName = strings.TrimSpace(cmd.FirstName)
	cmd.LastName = strings.TrimSpace(cmd.LastName)
	cmd.Email = strings.TrimSpace(cmd.Email)
	cmd.Phone = strings.TrimSpace(cmd.Phone)
	cmd.UserLevelID = strings.TrimSpace(cmd.UserLevelID)
	cmd.ReportTo = strings.TrimSpace(cmd.ReportTo)
	cmd.OfficeCode = strings.TrimSpace(cmd.OfficeCode)
	cmd.Activated = strings.ToUpper(strings.TrimSpace(cmd.Activated))
	cmd.Locked = strings.ToUpper(strings.TrimSpace(cmd.Locked))
	cmd.CurrentStatus = strings.TrimSpace(cmd.CurrentStatus)
	cmd.DisplayInCSList = strings.ToUpper(strings.TrimSpace(cmd.DisplayInCSList))

	if cmd.Username == "" {
		return UpdateUserCommand{}, ErrUsernameRequired
	}
	if cmd.UserLevelID == "" {
		return UpdateUserCommand{}, ErrUserLevelRequired
	}
	if cmd.Activated != "Y" && cmd.Activated != "N" {
		cmd.Activated = "Y"
	}
	if cmd.Locked != "Y" && cmd.Locked != "N" {
		cmd.Locked = "N"
	}
	if cmd.CurrentStatus != "Login" && cmd.CurrentStatus != "Logout" {
		cmd.CurrentStatus = "Logout"
	}
	if cmd.DisplayInCSList != "Y" && cmd.DisplayInCSList != "N" {
		cmd.DisplayInCSList = "Y"
	}

	return cmd, nil
}

// ResetPasswordCommand represents parameters to reset a user's password
type ResetPasswordCommand struct {
	Username    string `json:"-"`
	NewPassword string `json:"new_password"`
	UpdatedBy   string `json:"-"`
}

// Validate checks password reset parameters
func (cmd ResetPasswordCommand) Validate() (ResetPasswordCommand, error) {
	cmd.Username = strings.TrimSpace(cmd.Username)
	cmd.NewPassword = strings.TrimSpace(cmd.NewPassword)
	if cmd.Username == "" {
		return ResetPasswordCommand{}, ErrUsernameRequired
	}
	if len(cmd.NewPassword) < 6 {
		return ResetPasswordCommand{}, ErrPasswordRequired
	}
	return cmd, nil
}

// UpdateProfileCommand represents parameters for user self-service profile update (cch_profil_pengguna)
type UpdateProfileCommand struct {
	Username  string `json:"-"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
}

// Validate checks and normalizes profile parameters
func (cmd UpdateProfileCommand) Validate() (UpdateProfileCommand, error) {
	cmd.Username = strings.TrimSpace(cmd.Username)
	cmd.FirstName = strings.TrimSpace(cmd.FirstName)
	cmd.LastName = strings.TrimSpace(cmd.LastName)
	cmd.Email = strings.TrimSpace(cmd.Email)
	cmd.Phone = strings.TrimSpace(cmd.Phone)
	if cmd.Username == "" {
		return UpdateProfileCommand{}, ErrUsernameRequired
	}
	return cmd, nil
}

// ChangePasswordCommand represents parameters for user self-service password change
type ChangePasswordCommand struct {
	Username    string `json:"-"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// Validate checks password change parameters
func (cmd ChangePasswordCommand) Validate() (ChangePasswordCommand, error) {
	cmd.Username = strings.TrimSpace(cmd.Username)
	cmd.OldPassword = strings.TrimSpace(cmd.OldPassword)
	cmd.NewPassword = strings.TrimSpace(cmd.NewPassword)
	if cmd.Username == "" {
		return ChangePasswordCommand{}, ErrUsernameRequired
	}
	if cmd.OldPassword == "" {
		return ChangePasswordCommand{}, errors.New("kata sandi lama wajib diisi")
	}
	if len(cmd.NewPassword) < 6 {
		return ChangePasswordCommand{}, ErrPasswordRequired
	}
	return cmd, nil
}

// UserLevel represents a role/level in CCH
type UserLevel struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// Repository defines data access for users
type Repository interface {
	List(ctx context.Context, query UserListQuery) (UserPage, error)
	Get(ctx context.Context, username string) (User, error)
	Create(ctx context.Context, cmd CreateUserCommand, hashedPassword string) (User, error)
	Update(ctx context.Context, cmd UpdateUserCommand) (User, error)
	UpdateProfile(ctx context.Context, cmd UpdateProfileCommand) (User, error)
	GetPasswordHash(ctx context.Context, username string) (string, error)
	ResetPassword(ctx context.Context, cmd ResetPasswordCommand, hashedPassword string) error
	ListUserLevels(ctx context.Context) ([]UserLevel, error)
}
