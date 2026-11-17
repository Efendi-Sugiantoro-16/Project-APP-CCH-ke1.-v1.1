package devauth

import (
	"errors"
)

var (
	ErrDevAuthDisabled           = errors.New("dev auth is disabled")
	ErrDevAuthOfficeRequired     = errors.New("dev auth office is required")
	ErrDevAuthUsernameRequired   = errors.New("dev auth username is required")
	ErrDevAuthPasswordRequired   = errors.New("dev auth password is required")
	ErrDevAuthInvalidCredentials = errors.New("invalid dev credentials")
	ErrDevAuthUsernameTaken      = errors.New("dev username already taken")
)

// Credentials is the JSON body for development login.
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// RegisterRequest is the JSON body for development account creation.
type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Office   string `json:"office"`
}

// AuthResult is returned by login/register and carries a staff JWT that the
// frontend stores like any other staff token.
type AuthResult struct {
	Token       string `json:"token"`
	Username    string `json:"username"`
	Office      string `json:"office"`
	UserLevelID string `json:"user_level_id"`
}
