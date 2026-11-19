package complaints_test

import (
	"errors"
	"testing"

	"cch.local/backend/internal/modules/complaints"
)

func TestNewStatusCodeAcceptsThreeDigitCodes(t *testing.T) {
	// Katalog aktif plus kode historis 105/106 yang nyata ada di data produksi.
	for _, raw := range []string{"101", "102", "103", "104", "105", "106", "109", "110", "000"} {
		code, err := complaints.NewStatusCode(raw)
		if err != nil {
			t.Fatalf("NewStatusCode(%q) error = %v, want nil", raw, err)
		}
		if code.String() != raw {
			t.Fatalf("NewStatusCode(%q).String() = %q", raw, code.String())
		}
		if code.IsZero() {
			t.Fatalf("NewStatusCode(%q).IsZero() = true", raw)
		}
	}
}

func TestNewStatusCodeTrimsSurroundingWhitespace(t *testing.T) {
	code, err := complaints.NewStatusCode("  102  ")
	if err != nil {
		t.Fatalf("NewStatusCode with whitespace error = %v", err)
	}
	if code.String() != "102" {
		t.Fatalf("String() = %q, want 102", code.String())
	}
}

func TestNewStatusCodeRejectsNonThreeDigitValues(t *testing.T) {
	for _, raw := range []string{"", " ", "10", "1000", "10a", "abc", "-01", "1 2", "１２３"} {
		code, err := complaints.NewStatusCode(raw)
		if !errors.Is(err, complaints.ErrInvalidStatusFormat) {
			t.Fatalf("NewStatusCode(%q) error = %v, want ErrInvalidStatusFormat", raw, err)
		}
		if !code.IsZero() {
			t.Fatalf("NewStatusCode(%q) returned non-zero code on error", raw)
		}
	}
}

func TestStatusCodeIsKnownStatusOnlyForActiveCatalog(t *testing.T) {
	known := map[string]bool{"101": true, "102": true, "103": true, "104": true, "109": true, "105": false, "106": false}
	for raw, want := range known {
		code := complaints.MustStatusCode(raw)
		if got := code.IsKnownStatus(); got != want {
			t.Errorf("StatusCode(%s).IsKnownStatus() = %v, want %v", raw, got, want)
		}
	}
}

func TestStatusCodeIsTerminalOnlyForSelesai(t *testing.T) {
	terminal := map[string]bool{"101": false, "102": false, "103": false, "104": false, "105": false, "109": true}
	for raw, want := range terminal {
		code := complaints.MustStatusCode(raw)
		if got := code.IsTerminal(); got != want {
			t.Errorf("StatusCode(%s).IsTerminal() = %v, want %v", raw, got, want)
		}
	}
}

// TestStatusCodeCanTransitionToCharacterizesLegacyRule memastikan perilaku
// StatusCode.CanTransitionTo identik dengan aturan lama
// complaints.IsValidStatusTransition untuk SELURUH kombinasi kode yang mungkin
// muncul (katalog aktif plus kode historis 105/106). Test ini adalah jaring
// pengaman utama migrasi dari string mentah ke value object: bila salah satu
// pasangan berubah, test ini gagal.
func TestStatusCodeCanTransitionToCharacterizesLegacyRule(t *testing.T) {
	codes := []string{"101", "102", "103", "104", "105", "106", "109"}
	for _, from := range codes {
		for _, to := range codes {
			fromCode := complaints.MustStatusCode(from)
			toCode := complaints.MustStatusCode(to)
			want := complaints.IsValidStatusTransition(from, to)
			if got := fromCode.CanTransitionTo(toCode); got != want {
				t.Errorf("CanTransitionTo(%s -> %s) = %v, legacy IsValidStatusTransition = %v", from, to, got, want)
			}
		}
	}
}

func TestStatusCodeCanTransitionToMatchesDocumentedBusinessRules(t *testing.T) {
	allowed := map[string][]string{
		"101": {"102", "103", "109"},
		"102": {"103", "104", "109"},
		"103": {"102", "104", "109"},
		"104": {"103", "109"},
		// 105 dan 106 adalah kode historis; keduanya mengikuti cabang default.
		"105": {"102", "103", "104", "109"},
		"106": {"102", "103", "104", "109"},
		"109": {},
	}
	codes := []string{"101", "102", "103", "104", "105", "106", "109"}
	for from, targets := range allowed {
		permitted := make(map[string]bool, len(targets))
		for _, target := range targets {
			permitted[target] = true
		}
		for _, to := range codes {
			want := permitted[to]
			got := complaints.MustStatusCode(from).CanTransitionTo(complaints.MustStatusCode(to))
			if got != want {
				t.Errorf("%s -> %s = %v, want %v", from, to, got, want)
			}
		}
	}
}

func TestStatusCodeRejectsSelfTransition(t *testing.T) {
	for _, raw := range []string{"101", "102", "103", "104", "105", "106", "109"} {
		code := complaints.MustStatusCode(raw)
		if code.CanTransitionTo(code) {
			t.Errorf("%s -> %s should not be allowed", raw, raw)
		}
	}
}

func TestStatusCodeHasNoTransitionOutOfTerminal(t *testing.T) {
	terminal := complaints.MustStatusCode("109")
	for _, raw := range []string{"101", "102", "103", "104", "105", "106", "109"} {
		if terminal.CanTransitionTo(complaints.MustStatusCode(raw)) {
			t.Errorf("109 -> %s should not be allowed", raw)
		}
	}
}

func TestStatusCodeZeroValueCannotTransition(t *testing.T) {
	var zero complaints.StatusCode
	if !zero.IsZero() {
		t.Fatal("zero StatusCode should report IsZero")
	}
	for _, raw := range []string{"101", "109"} {
		if zero.CanTransitionTo(complaints.MustStatusCode(raw)) {
			t.Errorf("zero -> %s should not be allowed", raw)
		}
	}
	if complaints.MustStatusCode("101").CanTransitionTo(zero) {
		t.Error("101 -> zero should not be allowed")
	}
}

func TestKnownStatusCodesReturnsCatalogCopy(t *testing.T) {
	first := complaints.KnownStatusCodes()
	if len(first) != 5 {
		t.Fatalf("catalog size = %d, want 5", len(first))
	}
	first[0] = complaints.StatusSelesai
	second := complaints.KnownStatusCodes()
	if second[0].String() != "101" {
		t.Fatalf("catalog was mutated through returned slice: %v", second[0].String())
	}
}

func TestMustStatusCodePanicsOnInvalidFormat(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("MustStatusCode should panic on invalid format")
		}
	}()
	_ = complaints.MustStatusCode("9999")
}
