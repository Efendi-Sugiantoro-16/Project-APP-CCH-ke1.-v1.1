package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"cch.local/backend/internal/modules/users"
)

// MySQLUserRepository implements users.Repository against MariaDB/MySQL
type MySQLUserRepository struct {
	db *sql.DB
}

// NewMySQLUserRepository creates a new MySQL user repository
func NewMySQLUserRepository(db *sql.DB) *MySQLUserRepository {
	return &MySQLUserRepository{db: db}
}

// List queries users with optional filtering and pagination
func (r *MySQLUserRepository) List(ctx context.Context, query users.UserListQuery) (users.UserPage, error) {
	if r == nil || r.db == nil {
		return users.UserPage{}, users.ErrUserServiceNotReady
	}

	var whereClauses []string
	var args []any

	if query.OfficeCode != "" {
		whereClauses = append(whereClauses, "u.Office = ?")
		args = append(args, query.OfficeCode)
	}

	if query.UserLevelID != "" {
		whereClauses = append(whereClauses, "u.User_Level = ?")
		args = append(args, query.UserLevelID)
	}

	if query.Search != "" {
		whereClauses = append(whereClauses, "(u.Username LIKE ? OR u.First_Name LIKE ? OR u.Last_Name LIKE ? OR u.Email LIKE ?)")
		pattern := "%" + query.Search + "%"
		args = append(args, pattern, pattern, pattern, pattern)
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM cch_users u" + whereSQL
	var total int64
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return users.UserPage{}, fmt.Errorf("count users: %w", err)
	}

	// Select records
	dataQuery := `
		SELECT 
			u.Username,
			COALESCE(u.First_Name, ''),
			COALESCE(u.Last_Name, ''),
			COALESCE(u.Email, ''),
			COALESCE(u.Phone, ''),
			u.User_Level,
			COALESCE(l.User_Level_Name, ''),
			COALESCE(u.Report_To, ''),
			COALESCE(u.Office, ''),
			u.Activated,
			COALESCE(u.Locked, 'N'),
			COALESCE(u.Current_Status, 'Logout'),
			COALESCE(u.Display_In_CS_List, 'Y'),
			u.Last_Login,
			u.Date_Added,
			u.Date_Updated
		FROM cch_users u
		LEFT JOIN cch_userlevels l ON u.User_Level = CAST(l.User_Level_ID AS CHAR)` +
		whereSQL +
		" ORDER BY u.Date_Added DESC, u.Username ASC LIMIT ? OFFSET ?"

	argsWithPaging := append(args, query.Limit, query.Offset)
	rows, err := r.db.QueryContext(ctx, dataQuery, argsWithPaging...)
	if err != nil {
		return users.UserPage{}, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var result []users.User
	for rows.Next() {
		var u users.User
		var lastLogin, dateAdded, dateUpdated sql.NullTime
		if err := rows.Scan(
			&u.Username,
			&u.FirstName,
			&u.LastName,
			&u.Email,
			&u.Phone,
			&u.UserLevelID,
			&u.UserLevelName,
			&u.ReportTo,
			&u.OfficeCode,
			&u.Activated,
			&u.Locked,
			&u.CurrentStatus,
			&u.DisplayInCSList,
			&lastLogin,
			&dateAdded,
			&dateUpdated,
		); err != nil {
			return users.UserPage{}, fmt.Errorf("scan user: %w", err)
		}
		if lastLogin.Valid {
			u.LastLogin = &lastLogin.Time
		}
		if dateAdded.Valid {
			u.DateAdded = &dateAdded.Time
		}
		if dateUpdated.Valid {
			u.DateUpdated = &dateUpdated.Time
		}
		result = append(result, u)
	}

	if err := rows.Err(); err != nil {
		return users.UserPage{}, fmt.Errorf("iterate users: %w", err)
	}

	return users.UserPage{
		Data:   result,
		Total:  total,
		Limit:  query.Limit,
		Offset: query.Offset,
	}, nil
}

// Get retrieves a single user by username
func (r *MySQLUserRepository) Get(ctx context.Context, username string) (users.User, error) {
	if r == nil || r.db == nil {
		return users.User{}, users.ErrUserServiceNotReady
	}

	query := `
		SELECT 
			u.Username,
			COALESCE(u.First_Name, ''),
			COALESCE(u.Last_Name, ''),
			COALESCE(u.Email, ''),
			COALESCE(u.Phone, ''),
			u.User_Level,
			COALESCE(l.User_Level_Name, ''),
			COALESCE(u.Report_To, ''),
			COALESCE(u.Office, ''),
			u.Activated,
			COALESCE(u.Locked, 'N'),
			COALESCE(u.Current_Status, 'Logout'),
			COALESCE(u.Display_In_CS_List, 'Y'),
			u.Last_Login,
			u.Date_Added,
			u.Date_Updated
		FROM cch_users u
		LEFT JOIN cch_userlevels l ON u.User_Level = CAST(l.User_Level_ID AS CHAR)
		WHERE u.Username = ?
		LIMIT 1`

	var u users.User
	var lastLogin, dateAdded, dateUpdated sql.NullTime
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&u.Username,
		&u.FirstName,
		&u.LastName,
		&u.Email,
		&u.Phone,
		&u.UserLevelID,
		&u.UserLevelName,
		&u.ReportTo,
		&u.OfficeCode,
		&u.Activated,
		&u.Locked,
		&u.CurrentStatus,
		&u.DisplayInCSList,
		&lastLogin,
		&dateAdded,
		&dateUpdated,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return users.User{}, users.ErrUserNotFound
		}
		return users.User{}, fmt.Errorf("get user: %w", err)
	}

	if lastLogin.Valid {
		u.LastLogin = &lastLogin.Time
	}
	if dateAdded.Valid {
		u.DateAdded = &dateAdded.Time
	}
	if dateUpdated.Valid {
		u.DateUpdated = &dateUpdated.Time
	}

	return u, nil
}

// Create inserts a new user record
func (r *MySQLUserRepository) Create(ctx context.Context, cmd users.CreateUserCommand, hashedPassword string) (users.User, error) {
	if r == nil || r.db == nil {
		return users.User{}, users.ErrUserServiceNotReady
	}

	now := time.Now()

	// Check if already exists
	var count int
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cch_users WHERE Username = ?", cmd.Username).Scan(&count); err != nil {
		return users.User{}, fmt.Errorf("check existing user: %w", err)
	}
	if count > 0 {
		return users.User{}, users.ErrUserAlreadyExists
	}

	insertSQL := `
		INSERT INTO cch_users (
			Username,
			Password,
			First_Name,
			Last_Name,
			Email,
			Phone,
			User_Level,
			Report_To,
			Office,
			Activated,
			Locked,
			Current_Status,
			Display_In_CS_List,
			Date_Added,
			Added_By
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := r.db.ExecContext(ctx, insertSQL,
		cmd.Username,
		hashedPassword,
		cmd.FirstName,
		cmd.LastName,
		cmd.Email,
		cmd.Phone,
		cmd.UserLevelID,
		cmd.ReportTo,
		cmd.OfficeCode,
		cmd.Activated,
		cmd.Locked,
		cmd.CurrentStatus,
		cmd.DisplayInCSList,
		now,
		cmd.AddedBy,
	)
	if err != nil {
		return users.User{}, fmt.Errorf("insert user: %w", err)
	}

	return r.Get(ctx, cmd.Username)
}

// Update modifies an existing user
func (r *MySQLUserRepository) Update(ctx context.Context, cmd users.UpdateUserCommand) (users.User, error) {
	if r == nil || r.db == nil {
		return users.User{}, users.ErrUserServiceNotReady
	}

	now := time.Now()

	updateSQL := `
		UPDATE cch_users SET
			First_Name = ?,
			Last_Name = ?,
			Email = ?,
			Phone = ?,
			User_Level = ?,
			Report_To = ?,
			Office = ?,
			Activated = ?,
			Locked = ?,
			Current_Status = ?,
			Display_In_CS_List = ?,
			Date_Updated = ?,
			Updated_By = ?
		WHERE Username = ?`

	res, err := r.db.ExecContext(ctx, updateSQL,
		cmd.FirstName,
		cmd.LastName,
		cmd.Email,
		cmd.Phone,
		cmd.UserLevelID,
		cmd.ReportTo,
		cmd.OfficeCode,
		cmd.Activated,
		cmd.Locked,
		cmd.CurrentStatus,
		cmd.DisplayInCSList,
		now,
		cmd.UpdatedBy,
		cmd.Username,
	)
	if err != nil {
		return users.User{}, fmt.Errorf("update user: %w", err)
	}

	rowsAff, err := res.RowsAffected()
	if err != nil {
		return users.User{}, fmt.Errorf("rows affected: %w", err)
	}
	if rowsAff == 0 {
		// Verify if user exists
		var exists int
		if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cch_users WHERE Username = ?", cmd.Username).Scan(&exists); err == nil && exists == 0 {
			return users.User{}, users.ErrUserNotFound
		}
	}

	return r.Get(ctx, cmd.Username)
}

// ResetPassword updates user's password hash
func (r *MySQLUserRepository) ResetPassword(ctx context.Context, cmd users.ResetPasswordCommand, hashedPassword string) error {
	if r == nil || r.db == nil {
		return users.ErrUserServiceNotReady
	}

	now := time.Now()

	updateSQL := `UPDATE cch_users SET Password = ?, Date_Updated = ?, Updated_By = ? WHERE Username = ?`
	res, err := r.db.ExecContext(ctx, updateSQL, hashedPassword, now, cmd.UpdatedBy, cmd.Username)
	if err != nil {
		return fmt.Errorf("reset password: %w", err)
	}

	rowsAff, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if rowsAff == 0 {
		return users.ErrUserNotFound
	}

	return nil
}

// UpdateProfile modifies personal profile details of a user (cch_profil_pengguna)
func (r *MySQLUserRepository) UpdateProfile(ctx context.Context, cmd users.UpdateProfileCommand) (users.User, error) {
	if r == nil || r.db == nil {
		return users.User{}, users.ErrUserServiceNotReady
	}

	now := time.Now()
	updateSQL := `
		UPDATE cch_users SET
			First_Name = ?,
			Last_Name = ?,
			Email = ?,
			Phone = ?,
			Date_Updated = ?,
			Updated_By = ?
		WHERE Username = ?`

	res, err := r.db.ExecContext(ctx, updateSQL,
		cmd.FirstName,
		cmd.LastName,
		cmd.Email,
		cmd.Phone,
		now,
		cmd.Username,
		cmd.Username,
	)
	if err != nil {
		return users.User{}, fmt.Errorf("update profile: %w", err)
	}

	rowsAff, err := res.RowsAffected()
	if err != nil {
		return users.User{}, fmt.Errorf("rows affected: %w", err)
	}
	if rowsAff == 0 {
		var exists int
		if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM cch_users WHERE Username = ?", cmd.Username).Scan(&exists); err == nil && exists == 0 {
			return users.User{}, users.ErrUserNotFound
		}
	}

	return r.Get(ctx, cmd.Username)
}

// GetPasswordHash retrieves the stored password hash for verification
func (r *MySQLUserRepository) GetPasswordHash(ctx context.Context, username string) (string, error) {
	if r == nil || r.db == nil {
		return "", users.ErrUserServiceNotReady
	}

	var hash string
	err := r.db.QueryRowContext(ctx, "SELECT Password FROM cch_users WHERE Username = ? LIMIT 1", username).Scan(&hash)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", users.ErrUserNotFound
		}
		return "", fmt.Errorf("get password hash: %w", err)
	}
	return hash, nil
}

// ListUserLevels returns all roles from cch_userlevels
func (r *MySQLUserRepository) ListUserLevels(ctx context.Context) ([]users.UserLevel, error) {
	if r == nil || r.db == nil {
		return nil, users.ErrUserServiceNotReady
	}

	query := `SELECT User_Level_ID, User_Level_Name FROM cch_userlevels ORDER BY User_Level_ID ASC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query user levels: %w", err)
	}
	defer rows.Close()

	var levels []users.UserLevel
	for rows.Next() {
		var ul users.UserLevel
		if err := rows.Scan(&ul.ID, &ul.Name); err != nil {
			return nil, fmt.Errorf("scan user level: %w", err)
		}
		levels = append(levels, ul)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user levels: %w", err)
	}

	return levels, nil
}
