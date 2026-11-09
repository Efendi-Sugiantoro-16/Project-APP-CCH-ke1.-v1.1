package complaints

import (
	"errors"
	"strings"
	"time"
)

// UpdateComplaintCommand represents the data allowed to update an existing complaint
type UpdateComplaintCommand struct {
	// Identifier
	ComplaintID string `json:"complaintId"`

	// Customer Information
	CustomerName    string `json:"customerName"`
	CustomerEmail   string `json:"customerEmail"`
	CustomerPhone   string `json:"customerPhone"`
	CustomerAddress string `json:"customerAddress"`

	// Complaint Details
	ComplaintTypeCode   int64  `json:"complaintTypeCode"`
	ComplaintSourceCode int64  `json:"complaintSourceCode"`
	ShipmentTypeCode    string `json:"shipmentTypeCode"`
	ShipmentNumber      string `json:"shipmentNumber"`
	Summary             string `json:"summary"`
	Description         string `json:"description"`

	// Routing details
	ShipmentOriginOffice string `json:"shipmentOriginOffice,omitempty"`
	ShipmentTargetOffice string `json:"shipmentTargetOffice,omitempty"`

	// Officer Context (filled by backend from JWT)
	UpdatingOfficeCode string `json:"-"`
	UpdatingUsername   string `json:"-"`
}

// UpdateComplaintResult represents the response after successful complaint update
type UpdateComplaintResult struct {
	ComplaintID   string    `json:"complaintId"`
	UpdatedAt     time.Time `json:"updatedAt"`
	CurrentStatus string    `json:"currentStatus"`
}

var (
	ErrComplaintIDRequired            = errors.New("complaint ID is required")
	ErrComplaintNotFound              = errors.New("complaint not found")
	ErrComplaintClosed                = errors.New("complaint is closed and cannot be updated")
	ErrComplaintUpdateFailed          = errors.New("complaint update failed")
	ErrComplaintUpdateServiceNotAvail = errors.New("complaint update service not available")
	ErrComplaintUpdateNotConfigured   = errors.New("complaint update service not configured")
)

// Validate validates the update command and returns normalized version or error
func (cmd UpdateComplaintCommand) Validate() (UpdateComplaintCommand, error) {
	cmd.ComplaintID = strings.TrimSpace(cmd.ComplaintID)
	cmd.CustomerName = strings.TrimSpace(cmd.CustomerName)
	cmd.CustomerEmail = strings.TrimSpace(cmd.CustomerEmail)
	cmd.CustomerPhone = strings.TrimSpace(cmd.CustomerPhone)
	cmd.CustomerAddress = strings.TrimSpace(cmd.CustomerAddress)
	cmd.ShipmentNumber = strings.TrimSpace(cmd.ShipmentNumber)
	cmd.ShipmentTypeCode = strings.TrimSpace(cmd.ShipmentTypeCode)
	cmd.Summary = strings.TrimSpace(cmd.Summary)
	cmd.Description = strings.TrimSpace(cmd.Description)
	cmd.ShipmentOriginOffice = strings.TrimSpace(cmd.ShipmentOriginOffice)
	cmd.ShipmentTargetOffice = strings.TrimSpace(cmd.ShipmentTargetOffice)

	if cmd.ComplaintID == "" {
		return UpdateComplaintCommand{}, ErrComplaintIDRequired
	}

	// Validate customer information
	if cmd.CustomerName == "" {
		return UpdateComplaintCommand{}, ErrCustomerNameRequired
	}
	if len(cmd.CustomerName) > 100 {
		return UpdateComplaintCommand{}, errors.New("customer name too long (maximum 100 characters)")
	}
	if cmd.CustomerPhone == "" {
		return UpdateComplaintCommand{}, ErrCustomerPhoneRequired
	}
	if len(cmd.CustomerPhone) > 15 {
		return UpdateComplaintCommand{}, errors.New("customer phone too long (maximum 15 characters)")
	}
	if cmd.CustomerEmail != "" && len(cmd.CustomerEmail) > 100 {
		return UpdateComplaintCommand{}, errors.New("customer email too long (maximum 100 characters)")
	}
	if len(cmd.CustomerAddress) > 255 {
		return UpdateComplaintCommand{}, errors.New("customer address too long (maximum 255 characters)")
	}

	// Validate complaint details
	if cmd.ComplaintTypeCode <= 0 {
		return UpdateComplaintCommand{}, ErrInvalidComplaintType
	}
	if cmd.ComplaintSourceCode <= 0 {
		return UpdateComplaintCommand{}, ErrInvalidComplaintSource
	}
	if cmd.ShipmentTypeCode == "" {
		return UpdateComplaintCommand{}, ErrInvalidShipmentType
	}
	if cmd.ShipmentNumber == "" {
		return UpdateComplaintCommand{}, ErrShipmentNumberRequired
	}
	if len(cmd.Summary) < 10 {
		return UpdateComplaintCommand{}, ErrSummaryTooShort
	}
	if len(cmd.Summary) > 255 {
		return UpdateComplaintCommand{}, errors.New("summary too long (maximum 255 characters)")
	}
	if len(cmd.Description) < 20 {
		return UpdateComplaintCommand{}, ErrDescriptionTooShort
	}

	return cmd, nil
}
