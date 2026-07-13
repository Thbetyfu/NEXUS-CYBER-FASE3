package licensing

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func resetLicenseStateForTest() {
	currentLicense = LicenseState{}
	licenseKey = ""
	licenseDomain = ""
	timeNow = time.Now
}

func TestVerifyAllowsLocalDevelopmentBypassOnlyForLocalDomains(t *testing.T) {
	t.Cleanup(resetLicenseStateForTest)
	resetLicenseStateForTest()

	fixedNow := time.Date(2026, 7, 12, 10, 0, 0, 0, time.UTC)
	timeNow = func() time.Time { return fixedNow }

	verify("http://tenant.localhost:3000", localDevelopmentLicenseKey)
	if !IsLicenseValid() {
		t.Fatal("expected local development domain to stay valid with dev key")
	}
	if GetPlanType() != "premium" {
		t.Fatalf("expected premium plan for local bypass, got %q", GetPlanType())
	}

	resetLicenseStateForTest()
	t.Setenv("SAAS_LICENSE_API_URL", "http://127.0.0.1:1")
	timeNow = func() time.Time { return fixedNow }

	verify("https://example.com", localDevelopmentLicenseKey)
	if IsLicenseValid() {
		t.Fatal("expected non-local domain to reject dev key bypass")
	}
}

func TestVerifyKeepsLastKnownGoodWithinGraceWindow(t *testing.T) {
	t.Cleanup(resetLicenseStateForTest)
	resetLicenseStateForTest()

	baseTime := time.Date(2026, 7, 12, 11, 0, 0, 0, time.UTC)
	t.Setenv("LICENSE_GRACE_PERIOD_MINUTES", "5")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"valid":true,"status":"ACTIVE","plan":"enterprise"}`)
	}))
	defer server.Close()

	t.Setenv("SAAS_LICENSE_API_URL", server.URL)
	timeNow = func() time.Time { return baseTime }
	verify("tenant.example.com", "nx_lic_valid")

	if !IsLicenseValid() {
		t.Fatal("expected successful verification to mark license valid")
	}
	if GetPlanType() != "enterprise" {
		t.Fatalf("expected enterprise plan after successful verification, got %q", GetPlanType())
	}

	t.Setenv("SAAS_LICENSE_API_URL", "http://127.0.0.1:1")
	timeNow = func() time.Time { return baseTime.Add(4 * time.Minute) }
	verify("tenant.example.com", "nx_lic_valid")

	if !IsLicenseValid() {
		t.Fatal("expected license to remain valid during grace window")
	}
	if GetPlanType() != "enterprise" {
		t.Fatalf("expected plan to remain enterprise during grace window, got %q", GetPlanType())
	}
}

func TestVerifyExpiresLicenseAfterGraceWindow(t *testing.T) {
	t.Cleanup(resetLicenseStateForTest)
	resetLicenseStateForTest()

	baseTime := time.Date(2026, 7, 12, 12, 0, 0, 0, time.UTC)
	t.Setenv("LICENSE_GRACE_PERIOD_MINUTES", "5")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"valid":true,"status":"ACTIVE","plan":"premium"}`)
	}))
	defer server.Close()

	t.Setenv("SAAS_LICENSE_API_URL", server.URL)
	timeNow = func() time.Time { return baseTime }
	verify("tenant.example.com", "nx_lic_valid")

	t.Setenv("SAAS_LICENSE_API_URL", "http://127.0.0.1:1")
	timeNow = func() time.Time { return baseTime.Add(6 * time.Minute) }
	verify("tenant.example.com", "nx_lic_valid")

	if IsLicenseValid() {
		t.Fatal("expected license to become invalid after grace window expires")
	}
	if GetPlanType() != "" {
		t.Fatalf("expected empty plan after grace window expiry, got %q", GetPlanType())
	}
}

func TestVerifyInvalidatesLicenseOnForbiddenResponse(t *testing.T) {
	t.Cleanup(resetLicenseStateForTest)
	resetLicenseStateForTest()

	baseTime := time.Date(2026, 7, 12, 13, 0, 0, 0, time.UTC)
	t.Setenv("LICENSE_GRACE_PERIOD_MINUTES", "60")

	successServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"valid":true,"status":"ACTIVE","plan":"premium"}`)
	}))
	defer successServer.Close()

	t.Setenv("SAAS_LICENSE_API_URL", successServer.URL)
	timeNow = func() time.Time { return baseTime }
	verify("tenant.example.com", "nx_lic_valid")

	forbiddenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "forbidden", http.StatusForbidden)
	}))
	defer forbiddenServer.Close()

	t.Setenv("SAAS_LICENSE_API_URL", forbiddenServer.URL)
	timeNow = func() time.Time { return baseTime.Add(10 * time.Minute) }
	verify("tenant.example.com", "nx_lic_valid")

	if IsLicenseValid() {
		t.Fatal("expected 403 response to invalidate license immediately")
	}
	if GetPlanType() != "" {
		t.Fatalf("expected empty plan after 403 invalidation, got %q", GetPlanType())
	}
}
