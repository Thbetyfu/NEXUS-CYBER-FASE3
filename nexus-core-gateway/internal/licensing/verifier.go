// Package licensing mengelola lisensi premium dan status verifikasi langganan global Nexus Cyber.
package licensing

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

// LicenseState merepresentasikan kondisi lisensi secara global di dalam memori secara thread-safe.
type LicenseState struct {
	mu                         sync.RWMutex
	IsValid                    bool
	PlanType                   string
	CpuCores                   int
	IsB2G                      bool
	LastVerified               time.Time
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

// GetPlanType mengembalikan tipe plan lisensi saat ini (e.g. "free", "basic", "pro", "pro_plus", "ultrasafe").
func GetPlanType() string {
	currentLicense.mu.RLock()
	defer currentLicense.mu.RUnlock()
	if currentLicense.PlanType == "" {
		return TierFree
	}
	return currentLicense.PlanType
}

// GetLicenseDetails mengembalikan rincian lisensi saat ini.
func GetLicenseDetails() (isValid bool, plan string, cores int, isB2G bool) {
	currentLicense.mu.RLock()
	defer currentLicense.mu.RUnlock()
	return currentLicense.IsValid, currentLicense.PlanType, currentLicense.CpuCores, currentLicense.IsB2G
}

// StartLicenseHandshake meluncurkan goroutine asinkron yang melakukan verifikasi berkala (handshake).
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
		currentLicense.PlanType = TierFree
		currentLicense.LastVerified = now
		currentLicense.mu.Unlock()
		return
	}

	// 1. Cek Kunci Lisensi Terenkripsi PQC/HMAC (Offline Verification)
	secretKey := os.Getenv("NEXUS_LICENSE_SECRET")
	claims, err := ParseAndVerifyLicenseKey(key, domain, runtime.NumCPU(), secretKey)
	if err == nil && claims != nil {
		currentLicense.mu.Lock()
		currentLicense.IsValid = true
		currentLicense.PlanType = claims.Tier
		currentLicense.CpuCores = claims.CpuCores
		currentLicense.IsB2G = claims.IsB2G
		currentLicense.LastVerified = now
		currentLicense.LastSuccessfulVerification = now
		currentLicense.mu.Unlock()
		return
	}

	// 2. Local Development Bypass Check
	if isLocalDevelopmentBypass(domain, key) {
		currentLicense.mu.Lock()
		currentLicense.IsValid = true
		currentLicense.PlanType = TierUltrasafe
		currentLicense.CpuCores = runtime.NumCPU()
		currentLicense.IsB2G = IsGovernmentOrEduDomain(domain)
		currentLicense.LastVerified = now
		currentLicense.LastSuccessfulVerification = now
		currentLicense.mu.Unlock()
		return
	}

	// 3. Panggil API Server Lisensi SaaS Online/Remote
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
			Cores    int    `json:"cores"`
			IsB2G    bool   `json:"is_b2g"`
		}
		if json.NewDecoder(resp.Body).Decode(&result) == nil {
			currentLicense.IsValid = result.Valid
			if result.Valid {
				currentLicense.PlanType = result.Plan
				currentLicense.CpuCores = result.Cores
				currentLicense.IsB2G = result.IsB2G
				currentLicense.LastSuccessfulVerification = now
			} else {
				currentLicense.PlanType = TierFree
			}
		} else {
			handleVerificationFailureLocked(now)
		}
		return
	}

	if resp.StatusCode >= http.StatusInternalServerError {
		handleVerificationFailureLocked(now)
	} else {
		currentLicense.IsValid = false
		currentLicense.PlanType = TierFree
	}
}

func handleVerificationFailureLocked(now time.Time) {
	if currentLicense.IsValid && isWithinGraceWindow(now, currentLicense.LastSuccessfulVerification) {
		return
	}

	currentLicense.IsValid = false
	currentLicense.PlanType = TierFree
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
