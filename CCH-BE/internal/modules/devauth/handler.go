package devauth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"

	"cch.local/backend/internal/platform/authentication"
	"cch.local/backend/internal/platform/config"
)

type Handler struct {
	settings    config.DevAuthSettings
	jwtSettings config.JWTSettings
	db          *sql.DB
}

func NewHandler(devAuth config.DevAuthSettings, jwtSettings config.JWTSettings, db *sql.DB) *Handler {
	return &Handler{
		settings:    devAuth,
		jwtSettings: jwtSettings,
		db:          db,
	}
}

type LoginRequest struct {
	Username string `json:"username"`
	Office   string `json:"office"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  UserProfile `json:"user"`
}

type UserProfile struct {
	Username string `json:"username"`
	Office   string `json:"office"`
	Role     string `json:"role"`
}

// Login handles development login by checking DB and generating JWT
func (h *Handler) Login(c fiber.Ctx) error {
	if !h.settings.Enabled {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "dev auth is disabled",
		})
	}

	var req LoginRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Username == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "username is required",
		})
	}

	// Use provided office or default
	office := req.Office
	if office == "" {
		office = h.settings.DefaultOffice
	}

	// Check if user exists in database
	user, err := h.getUserFromDB(req.Username, office)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": fmt.Sprintf("user not found or not activated: %v", err),
		})
	}

	// Generate JWT token that matches Legacy CCH format
	token, err := h.generateLegacyFormatJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("token generation failed: %v", err),
		})
	}

	return c.JSON(AuthResponse{
		Token: token,
		User: UserProfile{
			Username: user.Username,
			Office:   user.Office,
			Role:     user.UserLevelName,
		},
	})
}

// Register handles development registration (same as login for dev)
func (h *Handler) Register(c fiber.Ctx) error {
	// For dev, register is same as login
	return h.Login(c)
}

// DBUser represents user data from database
type DBUser struct {
	Username      string
	Office        string
	UserLevel     string
	UserLevelName string
	ReportTo      string
	Activated     string
	Permissions   map[string]int64 // Table permissions loaded from cch_userlevelpermissions
}

// getUserFromDB retrieves user data from cch_users table
func (h *Handler) getUserFromDB(username, office string) (*DBUser, error) {
	query := `
		SELECT u.Username, u.Office, u.User_Level, COALESCE(u.Report_To, ''), u.Activated, COALESCE(ul.User_Level_Name, '')
		FROM cch_users u
		LEFT JOIN cch_userlevels ul ON u.User_Level = ul.User_Level_ID
		WHERE u.Username = ? AND u.Office = ? AND u.Activated = 'Y'
		LIMIT 1
	`

	var user DBUser
	err := h.db.QueryRow(query, username, office).Scan(
		&user.Username,
		&user.Office,
		&user.UserLevel,
		&user.ReportTo,
		&user.Activated,
		&user.UserLevelName,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found or not activated")
		}
		return nil, err
	}

	// Load permissions from database
	user.Permissions, err = h.loadUserPermissions(user.UserLevel)
	if err != nil {
		return nil, fmt.Errorf("load permissions: %w", err)
	}

	return &user, nil
}

// loadUserPermissions loads all table permissions for a user level
func (h *Handler) loadUserPermissions(userLevel string) (map[string]int64, error) {
	query := `
		SELECT Table_Name, Permission
		FROM cch_userlevelpermissions
		WHERE User_Level_ID = ?
	`

	rows, err := h.db.Query(query, userLevel)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	permissions := make(map[string]int64)
	for rows.Next() {
		var tableName string
		var permission int64
		if err := rows.Scan(&tableName, &permission); err != nil {
			return nil, err
		}
		permissions[tableName] = permission
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return permissions, nil
}

// generateLegacyFormatJWT creates a JWT token matching Legacy CCH format exactly
func (h *Handler) generateLegacyFormatJWT(user *DBUser) (string, error) {
	now := time.Now()
	// Match Legacy CCH JWT config: NOT_BEFORE_TIME = 0, EXPIRE_TIME = 600 seconds
	notBefore := now.Add(0 * time.Second)
	expiry := notBefore.Add(600 * time.Second) // 10 minutes

	// Generate JTI (token ID) - random string like Legacy
	jti := authentication.GenerateJTI()

	// Build security claims matching Legacy format
	securityClaims := authentication.CCHSecurityClaims{
		Username:     user.Username,
		UserID:       user.Office,
		ParentUserID: user.ReportTo,
		UserLevelID:  user.UserLevel,
		// DEV MODE: Use ALLOW_ALL permission (524287) for testing
		// TODO PRODUCTION: Implement proper per-table permission check from database
		Permission: 524287, // ALLOW_ALL = sum of all permission bits
	}

	// Build JWT claims matching Legacy format
	claims := authentication.CCHClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiry),
			NotBefore: jwt.NewNumericDate(notBefore),
			Issuer:    h.jwtSettings.Issuer, // "cch"
			ID:        jti,
		},
		Security: securityClaims,
	}

	// Create token with HS512 algorithm (matching Legacy)
	token := jwt.NewWithClaims(jwt.SigningMethodHS512, claims)

	// Sign token with secret key
	signedToken, err := token.SignedString([]byte(h.jwtSettings.Secret))
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return signedToken, nil
}
