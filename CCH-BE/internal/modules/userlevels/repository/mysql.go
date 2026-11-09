package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"cch.local/backend/internal/modules/userlevels"
)

const countUserLevelsSQL = `SELECT COUNT(*) FROM cch_userlevels`
const listUserLevelsSQL = `SELECT User_Level_ID, User_Level_Name FROM cch_userlevels
ORDER BY User_Level_ID ASC LIMIT ? OFFSET ?`
const getUserLevelSQL = `SELECT User_Level_ID, User_Level_Name FROM cch_userlevels WHERE User_Level_ID = ? LIMIT 1`

var ErrRepositoryNotConfigured = errors.New("user level repository is not configured")

type MySQLRepository struct{ db *sql.DB }

var _ userlevels.Repository = (*MySQLRepository)(nil)

func NewMySQLRepository(database *sql.DB) *MySQLRepository { return &MySQLRepository{db: database} }

func (repository *MySQLRepository) List(ctx context.Context, query userlevels.ListQuery) (userlevels.Page, error) {
	if repository == nil || repository.db == nil {
		return userlevels.Page{}, ErrRepositoryNotConfigured
	}
	query, err := query.Normalize()
	if err != nil {
		return userlevels.Page{}, err
	}
	var total int64
	if err := repository.db.QueryRowContext(ctx, countUserLevelsSQL).Scan(&total); err != nil {
		return userlevels.Page{}, fmt.Errorf("count user levels: %w", err)
	}
	rows, err := repository.db.QueryContext(ctx, listUserLevelsSQL, query.Limit, query.Offset)
	if err != nil {
		return userlevels.Page{}, fmt.Errorf("list user levels: %w", err)
	}
	defer rows.Close()
	values := make([]userlevels.UserLevel, 0, query.Limit)
	for rows.Next() {
		var value userlevels.UserLevel
		if err := rows.Scan(&value.ID, &value.Name); err != nil {
			return userlevels.Page{}, fmt.Errorf("scan user level: %w", err)
		}
		values = append(values, value)
	}
	if err := rows.Err(); err != nil {
		return userlevels.Page{}, fmt.Errorf("read user levels: %w", err)
	}
	return userlevels.Page{Data: values, Total: total, Limit: query.Limit, Offset: query.Offset}, nil
}

func (repository *MySQLRepository) Get(ctx context.Context, id int64) (userlevels.UserLevel, error) {
	if repository == nil || repository.db == nil {
		return userlevels.UserLevel{}, ErrRepositoryNotConfigured
	}
	var value userlevels.UserLevel
	if err := repository.db.QueryRowContext(ctx, getUserLevelSQL, id).Scan(&value.ID, &value.Name); err != nil {
		return userlevels.UserLevel{}, fmt.Errorf("get user level: %w", err)
	}
	return value, nil
}

const listUserLevelPermissionsSQL = `SELECT Table_Name, Permission FROM cch_userlevelpermissions WHERE User_Level_ID = ? ORDER BY Table_Name ASC`
const listAllTablesInPermissionsSQL = `SELECT DISTINCT Table_Name FROM cch_userlevelpermissions ORDER BY Table_Name ASC`

func cleanTableName(raw string) string {
	if idx := strings.Index(raw, "}"); idx != -1 && strings.HasPrefix(raw, "{") {
		return raw[idx+1:]
	}
	return raw
}

func parsePermission(tableName string, p int64) userlevels.TablePermission {
	return userlevels.TablePermission{
		TableName:   cleanTableName(tableName),
		Permission:  p,
		AllowAdd:    p&1 == 1,
		AllowDelete: p&2 == 2,
		AllowEdit:   p&4 == 4,
		AllowList:   p&8 == 8,
		AllowView:   p&32 == 32,
		AllowSearch: p&64 == 64,
		AllowImport: p&128 == 128,
		AllowLookup: p&256 == 256,
		AllowExport: p&1024 == 1024,
		AllowPrint:  p&2048 == 2048,
	}
}

func (repository *MySQLRepository) GetPermissions(ctx context.Context, id int64) ([]userlevels.TablePermission, error) {
	if repository == nil || repository.db == nil {
		return nil, ErrRepositoryNotConfigured
	}
	if id == -1 {
		rows, err := repository.db.QueryContext(ctx, listAllTablesInPermissionsSQL)
		if err != nil {
			return nil, fmt.Errorf("list tables for admin: %w", err)
		}
		defer rows.Close()
		var perms []userlevels.TablePermission
		for rows.Next() {
			var rawTable string
			if err := rows.Scan(&rawTable); err != nil {
				return nil, err
			}
			perms = append(perms, parsePermission(rawTable, 524287))
		}
		return perms, rows.Err()
	}

	rows, err := repository.db.QueryContext(ctx, listUserLevelPermissionsSQL, id)
	if err != nil {
		return nil, fmt.Errorf("list user level permissions: %w", err)
	}
	defer rows.Close()
	var perms []userlevels.TablePermission
	for rows.Next() {
		var rawTable string
		var p int64
		if err := rows.Scan(&rawTable, &p); err != nil {
			return nil, fmt.Errorf("scan user level permission: %w", err)
		}
		perms = append(perms, parsePermission(rawTable, p))
	}
	return perms, rows.Err()
}

const (
	legacyProjectPrefix          = "{4FB290EB-B8DA-4CB0-919A-D9EEAA260785}"
	upsertUserLevelPermissionSQL = `INSERT INTO cch_userlevelpermissions (User_Level_ID, Table_Name, Permission) 
VALUES (?, ?, ?) 
ON DUPLICATE KEY UPDATE Permission = VALUES(Permission)`
)

func ensureTablePrefix(name string) string {
	name = strings.TrimSpace(name)
	if strings.HasPrefix(name, "{") {
		return name
	}
	return legacyProjectPrefix + name
}

func (repository *MySQLRepository) UpdatePermissions(ctx context.Context, id int64, items []userlevels.UpdatePermissionItem) error {
	if repository == nil || repository.db == nil {
		return ErrRepositoryNotConfigured
	}
	if len(items) == 0 {
		return nil
	}

	tx, err := repository.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, upsertUserLevelPermissionSQL)
	if err != nil {
		return fmt.Errorf("prepare upsert permission: %w", err)
	}
	defer stmt.Close()

	for _, item := range items {
		tbl := ensureTablePrefix(item.TableName)
		mask := item.ResolvedBitmask()
		if _, err := stmt.ExecContext(ctx, id, tbl, mask); err != nil {
			return fmt.Errorf("exec upsert permission for %s: %w", item.TableName, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
