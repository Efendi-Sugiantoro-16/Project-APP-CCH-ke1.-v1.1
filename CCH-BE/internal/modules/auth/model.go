package auth

// LoginRequest represents a production login request with username and password
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the response after successful authentication
type LoginResponse struct {
	Token   string   `json:"token"`
	User    UserInfo `json:"user"`
	Message string   `json:"message,omitempty"`
}

// UserInfo contains basic user information returned after login
type UserInfo struct {
	Username  string `json:"username"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	Office    string `json:"office"`
	Role      string `json:"role"`
	UserLevel string `json:"user_level"`
	Activated string `json:"activated"`
	Locked    string `json:"locked"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}
