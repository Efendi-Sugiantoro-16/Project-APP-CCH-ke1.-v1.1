package userlevels

import (
	"context"
	"errors"
	"math"
)

const TableVariable = "cch_userlevels"

const (
	DefaultPageSize = 25
	MaximumPageSize = 100
)

var (
	ErrInvalidInput           = errors.New("user level query is invalid")
	ErrNotFound               = errors.New("user level not found")
	ErrServiceNotReady        = errors.New("user level catalog is not configured")
	ErrCannotModifySuperAdmin = errors.New("super administrator permissions cannot be modified")
)

type UserLevel struct {
	ID   int64  `json:"user_level_id"`
	Name string `json:"user_level_name"`
}

type ListQuery struct {
	Limit  int
	Offset int
}

func (query ListQuery) Normalize() (ListQuery, error) {
	if query.Limit == 0 {
		query.Limit = DefaultPageSize
	}
	if query.Limit < 1 || query.Limit > MaximumPageSize || query.Offset < 0 {
		return ListQuery{}, ErrInvalidInput
	}
	return query, nil
}

type Page struct {
	Data   []UserLevel `json:"data"`
	Total  int64       `json:"total"`
	Limit  int         `json:"limit"`
	Offset int         `json:"offset"`
}

type TablePermission struct {
	TableName   string `json:"table_name"`
	Permission  int64  `json:"permission"`
	AllowAdd    bool   `json:"allow_add"`
	AllowDelete bool   `json:"allow_delete"`
	AllowEdit   bool   `json:"allow_edit"`
	AllowList   bool   `json:"allow_list"`
	AllowView   bool   `json:"allow_view"`
	AllowSearch bool   `json:"allow_search"`
	AllowImport bool   `json:"allow_import"`
	AllowLookup bool   `json:"allow_lookup"`
	AllowExport bool   `json:"allow_export"`
	AllowPrint  bool   `json:"allow_print"`
}

type UpdatePermissionItem struct {
	TableName   string `json:"table_name"`
	Permission  int64  `json:"permission"`
	AllowAdd    *bool  `json:"allow_add,omitempty"`
	AllowDelete *bool  `json:"allow_delete,omitempty"`
	AllowEdit   *bool  `json:"allow_edit,omitempty"`
	AllowList   *bool  `json:"allow_list,omitempty"`
	AllowView   *bool  `json:"allow_view,omitempty"`
	AllowSearch *bool  `json:"allow_search,omitempty"`
	AllowImport *bool  `json:"allow_import,omitempty"`
	AllowLookup *bool  `json:"allow_lookup,omitempty"`
	AllowExport *bool  `json:"allow_export,omitempty"`
	AllowPrint  *bool  `json:"allow_print,omitempty"`
}

func (item UpdatePermissionItem) ResolvedBitmask() int64 {
	if item.Permission > 0 {
		return item.Permission
	}
	var val int64 = 0
	if item.AllowAdd != nil && *item.AllowAdd {
		val |= 1
	}
	if item.AllowDelete != nil && *item.AllowDelete {
		val |= 2
	}
	if item.AllowEdit != nil && *item.AllowEdit {
		val |= 4
	}
	if item.AllowList != nil && *item.AllowList {
		val |= 8
	}
	if item.AllowView != nil && *item.AllowView {
		val |= 32
	}
	if item.AllowSearch != nil && *item.AllowSearch {
		val |= 64
	}
	if item.AllowImport != nil && *item.AllowImport {
		val |= 128
	}
	if item.AllowLookup != nil && *item.AllowLookup {
		val |= 256
	}
	if item.AllowExport != nil && *item.AllowExport {
		val |= 1024
	}
	if item.AllowPrint != nil && *item.AllowPrint {
		val |= 2048
	}
	return val
}

type UpdatePermissionsRequest struct {
	Permissions []UpdatePermissionItem `json:"permissions"`
}

type Repository interface {
	List(context.Context, ListQuery) (Page, error)
	Get(context.Context, int64) (UserLevel, error)
	GetPermissions(context.Context, int64) ([]TablePermission, error)
	UpdatePermissions(context.Context, int64, []UpdatePermissionItem) error
}

func validateID(id int64) error {
	if id < math.MinInt32 || id > math.MaxInt32 {
		return ErrInvalidInput
	}
	return nil
}
