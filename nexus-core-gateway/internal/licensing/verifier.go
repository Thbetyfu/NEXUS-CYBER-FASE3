// Package licensing mengelola lisensi premium dan status verifikasi langganan global Nexus Cyber.
package licensing

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// LicenseState merepresentasikan kondisi lisensi secara global di dalam memori secara thread-safe.
type LicenseState struct {
	mu           sync.RWMutex
	IsValid      bool
	PlanType     string
	LastVerified time.Time
	LastSuccessfulVerification time.Time
}

var (
	currentLicense LicenseState
	licenseKey     string
	licenseDomain  string
	timeNow        = time.Now
)

const (
	defaultLicenseGracePeriodMinutes = 360
	localDevelopmentLicenseKey       = "nexus-cyber-dev"
)

// InitLicenseVerifier menginisiasi status lisensi awal saat startup gateway.
//
// Alasan Arsitektural (Why):
// Melakukan verifikasi pertama kali secara sinkron saat booting agar gateway langsung menangguhkan rute
// jika kunci lisensi tidak valid sejak detik pertama peluncuran.
func InitLicenseVerifier(domain string, key string) {
	licenseKey = key
	licenseDomain = domain
	verify(domain, key)
}

// IsLicenseValid mengembalikan apakah sistem dalam kondisi terlisensi aktif secara thread-safe.
func IsLicenseValid() bool {
	currentLicense.mu.RLock()
	defer currentLicense.mu.RUnlock()
	return currentLicense.IsValid
}

// GetPlanType mengembalikan tipe plan lisensi saat ini (e.g. "premium", "enterprise").
func GetPlanType() string {
	currentLicense.mu.RLock()
	defer currentLicense.mu.RUnlock()
	return currentLicense.PlanType
}

// StartLicenseHandshake meluncurkan goroutine asinkron yang melakukan verifikasi berkala (handshake).
//
// Alasan Arsitektural (Why):
// - Verifikasi berkala secara asinkron mencegah penundaan (latency) saat memproses request pengguna sah.
// - Menjamin pembaruan instan jika status langganan dicabut (REVOKED) oleh server pusat tanpa memerlukan restart gateway.
func StartLicenseHandshake(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			verify(licenseDomain, licenseKey)
		}
	}()
}

func verify(domain string, key string) {
	now := timeNow()
	if key == "" || domain == "" {
		currentLicense.mu.Lock()
		currentLicense.IsValid = false
		currentLicense.PlanType = ""
		currentLicense.LastVerified = now
		currentLicense.mu.Unlock()
		return
	}

	if isLocalDevelopmentBypass(domain, key) {
		currentLicense.mu.Lock()
		currentLicense.IsValid = true
		currentLicense.PlanType = "premium"
		currentLicense.LastVerified = now
		currentLicense.LastSuccessfulVerification = now
		currentLicense.mu.Unlock()
		return
	}

	// Panggil API Server Lisensi SaaS Lokal
	// Default ke http://localhost:3000/api/license tapi bisa di-override via env
	apiEndpoint := os.Getenv("SAAS_LICENSE_API_URL")
	if apiEndpoint == "" {
		apiEndpoint = "http://localhost:3000/api/license"
	}

	type VerifyPayload struct {
		Domain     string `json:"domain"`
		LicenseKey string `json:"licenseKey"`
	}
	payload := VerifyPayload{
		Domain:     domain,
		LicenseKey: key,
	}
	data, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post(apiEndpoint, "application/json", bytes.NewBuffer(data))
	
	currentLicense.mu.Lock()
	defer currentLicense.mu.Unlock()
	currentLicense.LastVerified = now

	if err != nil {
		handleVerificationFailureLocked(now)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var result struct {
			Valid    bool   `json:"valid"`
			Status   string `json:"status"`
			Plan     string `json:"plan"`
		}
		if json.NewDecoder(resp.Body).Decode(&result) == nil {
			currentLicense.IsValid = result.Valid
			if result.Valid {
				currentLicense.PlanType = result.Plan
				currentLicense.LastSuccessfulVerification = now
			} else {
				currentLicense.PlanType = ""
			}
		} else {
			handleVerificationFailureLocked(now)
		}
		return
	}

	if resp.StatusCode >= http.StatusInternalServerError {
		handleVerificationFailureLocked(now)
	} else {
		// Status selain 200 dianggap tidak aktif
		currentLicense.IsValid = false
		currentLicense.PlanType = ""
	}
}

func handleVerificationFailureLocked(now time.Time) {
	if currentLicense.IsValid && isWithinGraceWindow(now, currentLicense.LastSuccessfulVerification) {
		return
	}

	currentLicense.IsValid = false
	currentLicense.PlanType = ""
}

func isWithinGraceWindow(now, lastSuccessful time.Time) bool {
	if lastSuccessful.IsZero() {
		return false
	}

	return now.Sub(lastSuccessful) <= licenseGracePeriod()
}

func licenseGracePeriod() time.Duration {
	value := strings.TrimSpace(os.Getenv("LICENSE_GRACE_PERIOD_MINUTES"))
	if value == "" {
		return time.Duration(defaultLicenseGracePeriodMinutes) * time.Minute
	}

	minutes, err := strconv.Atoi(value)
	if err != nil || minutes <= 0 {
		return time.Duration(defaultLicenseGracePeriodMinutes) * time.Minute
	}

	return time.Duration(minutes) * time.Minute
}

func isLocalDevelopmentBypass(domain, key string) bool {
	return key == localDevelopmentLicenseKey && isLocalDevelopmentDomain(domain)
}

func isLocalDevelopmentDomain(domain string) bool {
	normalized := strings.ToLower(strings.TrimSpace(domain))
	if normalized == "" {
		return false
	}

	if strings.Contains(normalized, "://") {
		parsed, err := url.Parse(normalized)
		if err == nil {
			normalized = parsed.Hostname()
		}
	}

	if host, _, err := strings.Cut(normalized, ":"); err && host != "" {
		normalized = host
	}

	return normalized == "localhost" || normalized == "127.0.0.1" || strings.HasSuffix(normalized, ".localhost")
}
