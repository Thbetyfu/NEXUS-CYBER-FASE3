package licensing

import (
	"testing"
	"time"
)

func TestLicenseGeneratorAndVerifier(t *testing.T) {
	secretKey := "test-secret-key-12345"

	t.Run("Generate & Verify Valid Pro License", func(t *testing.T) {
		claims := LicenseClaims{
			Domain:    "kemenkeu.go.id",
			CpuCores:  16,
			Tier:      TierUltrasafe,
			IssuedAt:  time.Now().Unix(),
			ExpiresAt: time.Now().Add(365 * 24 * time.Hour).Unix(),
		}

		key, err := GenerateLicenseKey(claims, secretKey)
		if err != nil {
			t.Fatalf("Failed to generate license key: %v", err)
		}

		t.Logf("Generated Key: %s", key)

		parsed, err := ParseAndVerifyLicenseKey(key, "kemenkeu.go.id", 8, secretKey)
		if err != nil {
			t.Fatalf("Failed to verify valid license key: %v", err)
		}

		if parsed.Tier != TierUltrasafe {
			t.Errorf("Expected tier %s, got %s", TierUltrasafe, parsed.Tier)
		}

		if !parsed.IsB2G {
			t.Error("Expected IsB2G to be true for .go.id domain")
		}
	})

	t.Run("Reject Expired License", func(t *testing.T) {
		claims := LicenseClaims{
			Domain:    "example.com",
			CpuCores:  4,
			Tier:      TierBasic,
			IssuedAt:  time.Now().Add(-48 * time.Hour).Unix(),
			ExpiresAt: time.Now().Add(-24 * time.Hour).Unix(),
		}

		key, err := GenerateLicenseKey(claims, secretKey)
		if err != nil {
			t.Fatalf("Failed to generate license key: %v", err)
		}

		_, err = ParseAndVerifyLicenseKey(key, "example.com", 2, secretKey)
		if err != ErrLicenseExpired {
			t.Errorf("Expected ErrLicenseExpired, got %v", err)
		}
	})

	t.Run("Reject CPU Core Limit Exceeded", func(t *testing.T) {
		claims := LicenseClaims{
			Domain:    "my-company.com",
			CpuCores:  4,
			Tier:      TierPro,
			IssuedAt:  time.Now().Unix(),
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
		}

		key, err := GenerateLicenseKey(claims, secretKey)
		if err != nil {
			t.Fatalf("Failed to generate license key: %v", err)
		}

		// Machine has 16 cores, license allows 4 cores
		_, err = ParseAndVerifyLicenseKey(key, "my-company.com", 16, secretKey)
		if err != ErrCpuCoreExceeded {
			t.Errorf("Expected ErrCpuCoreExceeded, got %v", err)
		}
	})

	t.Run("Domain Lapis 2 Validation Check", func(t *testing.T) {
		if !IsGovernmentOrEduDomain("ojk.go.id") {
			t.Error("ojk.go.id should be recognized as B2G/Edu domain")
		}
		if !IsGovernmentOrEduDomain("ui.ac.id") {
			t.Error("ui.ac.id should be recognized as B2G/Edu domain")
		}
		if !IsGovernmentOrEduDomain("sman1.sch.id") {
			t.Error("sman1.sch.id should be recognized as B2G/Edu domain")
		}
		if IsGovernmentOrEduDomain("private-company.com") {
			t.Error("private-company.com should NOT be recognized as B2G/Edu domain")
		}
	})
}
