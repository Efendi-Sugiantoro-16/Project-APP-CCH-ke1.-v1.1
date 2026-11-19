package complaints

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrCannotDeleteCompletedComplaint = errors.New("cannot delete or cancel already completed complaint")
	ErrDeleteReasonRequired           = errors.New("reason is required to cancel or delete complaint")
)

// DeleteComplaintCommand defines parameters to delete or cancel a complaint
type DeleteComplaintCommand struct {
	ComplaintID     string `json:"complaint_id"`
	ActorUsername   string `json:"actor_username"`
	ActorOfficeCode string `json:"actor_office_code"`
	Reason          string `json:"reason"`
	Force           bool   `json:"force"` // true: hard delete cascade, false: soft delete / cancel
}

// Validate validates delete command fields
func (c *DeleteComplaintCommand) Validate() error {
	c.ComplaintID = strings.TrimSpace(c.ComplaintID)
	if c.ComplaintID == "" {
		return errors.New("complaint ID is required")
	}
	c.Reason = strings.TrimSpace(c.Reason)
	if c.Reason == "" {
		c.Reason = "Dibatalkan / dihapus oleh petugas"
	}
	return nil
}

// DeleteComplaintResult represents outcome of complaint deletion
type DeleteComplaintResult struct {
	ComplaintID string    `json:"complaint_id"`
	Mode        string    `json:"mode"` // "deleted" or "cancelled"
	DeletedAt   time.Time `json:"deleted_at"`
	Message     string    `json:"message"`
}
