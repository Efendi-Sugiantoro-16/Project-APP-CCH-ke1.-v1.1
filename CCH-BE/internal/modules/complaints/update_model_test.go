package complaints

import (
	"testing"
)

func TestUpdateComplaintCommandValidation(t *testing.T) {
	validCommand := UpdateComplaintCommand{
		ComplaintID:          "CCH-20261023-00001",
		CustomerName:         "Budi Santoso",
		CustomerEmail:        "budi@example.com",
		CustomerPhone:        "081234567890",
		CustomerAddress:      "Jl. Diponegoro No. 10 Bandung",
		ComplaintTypeCode:    1,
		ComplaintSourceCode:  2,
		ShipmentTypeCode:     "POS_KILAT",
		ShipmentNumber:       "P2610230001",
		Summary:              "Kiriman paket kilat belum sampai ke tujuan",
		Description:          "Paket dokumen penting belum diterima padahal sudah melewati estimasi waktu.",
		ShipmentOriginOffice: "40000",
		ShipmentTargetOffice: "50000",
	}

	t.Run("valid command passes", func(t *testing.T) {
		validated, err := validCommand.Validate()
		if err != nil {
			t.Fatalf("expected valid command, got error: %v", err)
		}
		if validated.ComplaintID != "CCH-20261023-00001" {
			t.Errorf("expected complaint ID to be preserved, got %s", validated.ComplaintID)
		}
	})

	t.Run("missing complaint ID fails", func(t *testing.T) {
		cmd := validCommand
		cmd.ComplaintID = "  "
		_, err := cmd.Validate()
		if err != ErrComplaintIDRequired {
			t.Errorf("expected ErrComplaintIDRequired, got %v", err)
		}
	})

	t.Run("missing customer name fails", func(t *testing.T) {
		cmd := validCommand
		cmd.CustomerName = ""
		_, err := cmd.Validate()
		if err != ErrCustomerNameRequired {
			t.Errorf("expected ErrCustomerNameRequired, got %v", err)
		}
	})

	t.Run("short summary fails", func(t *testing.T) {
		cmd := validCommand
		cmd.Summary = "Pendek"
		_, err := cmd.Validate()
		if err != ErrSummaryTooShort {
			t.Errorf("expected ErrSummaryTooShort, got %v", err)
		}
	})

	t.Run("short description fails", func(t *testing.T) {
		cmd := validCommand
		cmd.Description = "Terlalu pendek"
		_, err := cmd.Validate()
		if err != ErrDescriptionTooShort {
			t.Errorf("expected ErrDescriptionTooShort, got %v", err)
		}
	})
}
