package authentication

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"cch.local/backend/internal/platform/config"
)

const minimumSigningKeyLength = 16 // Lowered to match Legacy CCH (TODO: increase in production)

var ErrVerifierNotConfigured = errors.New("JWT verifier is not configured")
var ErrInvalidToken = errors.New("invalid bearer token")

type TokenVerifier interface {
	Verify(token string) (VerifiedIdentity, error)
}

type VerifiedIdentity struct {
	Username    string
	OfficeCode  string
	ReportTo    string
	UserLevelID string
	Permission  int64
}

type JWTVerifier struct {
	secret []byte
	issuer string
}

// CCHClaims represents the JWT claims structure expected by the CCH backend.
// This is exported to allow other packages (like devauth) to generate compatible tokens.
type CCHClaims struct {
	Security CCHSecurityClaims `json:"security"`
	jwt.RegisteredClaims
}

// CCHSecurityClaims contains the user identity and authorization information.
type CCHSecurityClaims struct {
	Username     string `json:"username"`
	UserID       string `json:"userid"`
	ParentUserID string `json:"parentuserid"`
	UserLevelID  string `json:"userlevelid"`
	Permission   int64  `json:"permission"`
}

// Legacy unexported aliases for backward compatibility with existing tests
type cchClaims = CCHClaims
type cchSecurityClaims = CCHSecurityClaims

// GenerateJTI generates a random token ID (JTI) matching Legacy CCH format
func GenerateJTI() string {
	// Generate random bytes and encode to base64 (matching Legacy PHP implementation)
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return base64.StdEncoding.EncodeToString(bytes)
}

func NewJWTVerifier(settings config.JWTSettings) (*JWTVerifier, error) {
	if !settings.Configured() {
		return nil, ErrVerifierNotConfigured
	}
	if len([]byte(settings.Secret)) < minimumSigningKeyLength {
		return nil, fmt.Errorf("JWT signing key must be at least %d bytes", minimumSigningKeyLength)
	}

	return &JWTVerifier{
		secret: []byte(settings.Secret),
		issuer: settings.Issuer,
	}, nil
}

func (verifier *JWTVerifier) Verify(tokenString string) (VerifiedIdentity, error) {
	claims := &cchClaims{}
	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method.Alg() != jwt.SigningMethodHS512.Alg() {
				return nil, ErrInvalidToken
			}
			return verifier.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS512.Alg()}),
		jwt.WithIssuer(verifier.issuer),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil || token == nil || !token.Valid || claims.Security.Username == "" || claims.Security.UserLevelID == "" || claims.IssuedAt == nil {
		return VerifiedIdentity{}, ErrInvalidToken
	}

	return VerifiedIdentity{
		Username:    claims.Security.Username,
		OfficeCode:  claims.Security.UserID,
		ReportTo:    claims.Security.ParentUserID,
		UserLevelID: claims.Security.UserLevelID,
		Permission:  claims.Security.Permission,
	}, nil
}
