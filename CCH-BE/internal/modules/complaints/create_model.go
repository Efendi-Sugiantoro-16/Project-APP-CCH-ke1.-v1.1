package complaints

import (
	"context"
	"errors"
	"strings"
	"time"
)

// CreateComplaintCommand represents the data needed to create a new complaint
type CreateComplaintCommand struct {
	// Customer Information
	CustomerID      int64  `json:"customerId,omitempty"`
	CustomerName    string `json:"customerName"`
	CustomerEmail   string `json:"customerEmail"`
	CustomerPhone   string `json:"customerPhone"`
	CustomerAddress string `json:"customerAddress"`

	// Complaint Routing Offices
	OriginOffice string `json:"originOffice,omitempty"` // Kantor_Asal
	TargetOffice string `json:"targetOffice,omitempty"` // Kantor_Tujuan
	CcOffice     string `json:"ccOffice,omitempty"`     // Kantor_Tembusan

	// Complaint Details
	ComplaintTypeCode   int64  `json:"complaintTypeCode"`
	ComplaintSourceCode int64  `json:"complaintSourceCode"`
	ShipmentTypeCode    string `json:"shipmentTypeCode"`
	ShipmentNumber      string `json:"shipmentNumber"`
	Summary             string `json:"summary"`
	Description         string `json:"description"`

	// Shipment Routing (optional, can be extracted from shipment number)
	ShipmentOriginOffice string `json:"shipmentOriginOffice,omitempty"`
	ShipmentTargetOffice string `json:"shipmentTargetOffice,omitempty"`

	// Officer Context (filled by backend from JWT)
	CreatingOfficeCode string `json:"-"` // Filled by handler
	CreatingUsername   string `json:"-"` // Filled by handler
}

// CreateComplaintResult represents the result of a complaint creation
type CreateComplaintResult struct {
	ComplaintID   string    `json:"complaintId"`
	CreatedAt     time.Time `json:"createdAt"`
	InitialStatus string    `json:"initialStatus"`
}

var (
	ErrInvalidComplaintCommand      = errors.New("invalid complaint creation command")
	ErrComplaintCreationFailed      = errors.New("complaint creation failed")
	ErrCustomerInfoRequired         = errors.New("customer information required")
	ErrComplaintDetailsRequired     = errors.New("complaint details required")
	ErrInvalidComplaintType         = errors.New("invalid complaint type")
	ErrInvalidComplaintSource       = errors.New("invalid complaint source")
	ErrInvalidShipmentType          = errors.New("invalid shipment type")
	ErrShipmentNumberRequired       = errors.New("shipment number required")
	ErrSummaryTooShort              = errors.New("summary too short (minimum 10 characters)")
	ErrDescriptionTooShort          = errors.New("description too short (minimum 20 characters)")
	ErrCustomerNameRequired         = errors.New("customer name required")
	ErrCustomerPhoneRequired        = errors.New("customer phone required")
	ErrComplaintServiceNotAvailable = errors.New("complaint creation service not available")
)

// Validate validates the command and returns normalized version or error
func (cmd CreateComplaintCommand) Validate() (CreateComplaintCommand, error) {
	// Normalize strings
	cmd.CustomerName = strings.TrimSpace(cmd.CustomerName)
	cmd.CustomerEmail = strings.TrimSpace(cmd.CustomerEmail)
	cmd.CustomerPhone = strings.TrimSpace(cmd.CustomerPhone)
	cmd.CustomerAddress = strings.TrimSpace(cmd.CustomerAddress)
	cmd.OriginOffice = strings.TrimSpace(cmd.OriginOffice)
	cmd.TargetOffice = strings.TrimSpace(cmd.TargetOffice)
	cmd.CcOffice = strings.TrimSpace(cmd.CcOffice)
	cmd.ShipmentNumber = strings.TrimSpace(cmd.ShipmentNumber)
	cmd.ShipmentTypeCode = strings.TrimSpace(cmd.ShipmentTypeCode)
	cmd.Summary = strings.TrimSpace(cmd.Summary)
	cmd.Description = strings.TrimSpace(cmd.Description)
	cmd.ShipmentOriginOffice = strings.TrimSpace(cmd.ShipmentOriginOffice)
	cmd.ShipmentTargetOffice = strings.TrimSpace(cmd.ShipmentTargetOffice)

	// Validate customer information
	if cmd.CustomerName == "" {
		return CreateComplaintCommand{}, ErrCustomerNameRequired
	}
	if len(cmd.CustomerName) > 100 {
		return CreateComplaintCommand{}, errors.New("customer name too long (maximum 100 characters)")
	}
	if cmd.CustomerPhone == "" {
		return CreateComplaintCommand{}, ErrCustomerPhoneRequired
	}
	if len(cmd.CustomerPhone) > 20 {
		return CreateComplaintCommand{}, errors.New("customer phone too long (maximum 20 characters)")
	}
	if cmd.CustomerEmail != "" && len(cmd.CustomerEmail) > 100 {
		return CreateComplaintCommand{}, errors.New("customer email too long (maximum 100 characters)")
	}
	if len(cmd.CustomerAddress) > 255 {
		return CreateComplaintCommand{}, errors.New("customer address too long (maximum 255 characters)")
	}

	// Validate complaint details
	if cmd.ComplaintTypeCode <= 0 {
		return CreateComplaintCommand{}, ErrInvalidComplaintType
	}
	if cmd.ComplaintSourceCode <= 0 {
		return CreateComplaintCommand{}, ErrInvalidComplaintSource
	}
	if cmd.ShipmentTypeCode == "" {
		return CreateComplaintCommand{}, ErrInvalidShipmentType
	}
	if len(cmd.ShipmentTypeCode) > 10 {
		return CreateComplaintCommand{}, errors.New("shipment type code too long")
	}
	if cmd.ShipmentNumber == "" {
		return CreateComplaintCommand{}, ErrShipmentNumberRequired
	}
	if len(cmd.ShipmentNumber) > 30 {
		return CreateComplaintCommand{}, errors.New("shipment number too long (maximum 30 characters)")
	}
	if len(cmd.Summary) < 10 {
		return CreateComplaintCommand{}, ErrSummaryTooShort
	}
	if len(cmd.Summary) > 200 {
		return CreateComplaintCommand{}, errors.New("summary too long (maximum 200 characters)")
	}
	if len(cmd.Description) < 20 {
		return CreateComplaintCommand{}, ErrDescriptionTooShort
	}
	if len(cmd.Description) > 2000 {
		return CreateComplaintCommand{}, errors.New("description too long (maximum 2000 characters)")
	}

	// Validate office codes if provided (allow 3 to 20 chars)
	if cmd.ShipmentOriginOffice != "" && (len(cmd.ShipmentOriginOffice) < 3 || len(cmd.ShipmentOriginOffice) > 20) {
		return CreateComplaintCommand{}, errors.New("invalid shipment origin office code format")
	}
	if cmd.ShipmentTargetOffice != "" && (len(cmd.ShipmentTargetOffice) < 3 || len(cmd.ShipmentTargetOffice) > 20) {
		return CreateComplaintCommand{}, errors.New("invalid shipment target office code format")
	}

	return cmd, nil
}

// ComplaintCreationRepository defines the interface for creating complaints
type ComplaintCreationRepository interface {
	CreateComplaint(ctx context.Context, cmd CreateComplaintCommand) (CreateComplaintResult, error)
}
