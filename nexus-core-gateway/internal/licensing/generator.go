package licensing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Subscription Tiers
const (
	TierFree      = "free"
	TierBasic     = "basic"
	TierPro       = "pro"
	TierProPlus   = "pro_plus"
	TierUltrasafe = "ultrasafe"
)

// LicenseClaims merepresentasikan struktur token lisensi terenkripsi.
type LicenseClaims struct {
	Domain      string `json:"domain"`
	CpuCores    int    `json:"cpu_cores"`
	Tier        string `json:"tier"`
	IssuedAt    int64  `json:"issued_at"`
	ExpiresAt   int64  `json:"expires_at"`
	IsB2G       bool   `json:"is_b2g"`
	BypassPO    string `json:"bypass_po,omitempty"`
}

var (
	ErrInvalidLicenseFormat = errors.New("invalid license key format")
	ErrLicenseExpired       = errors.New("license key has expired")
	ErrDomainMismatch       = errors.New("license key domain mismatch")
	ErrCpuCoreExceeded      = errors.New("license CPU core limit exceeded by host system")
	ErrInvalidSignature     = errors.New("license signature verification failed")
)

const defaultSecretKey = "nexus-pqc-hmac-master-secret-2026"

// IsGovernmentOrEduDomain memeriksa apakah domain tergolong instansi publik (Lapis 2 Validation).
func IsGovernmentOrEduDomain(domain string) bool {
	d := strings.ToLower(strings.TrimSpace(domain))
	suffixes := []string{".go.id", ".ac.id", ".sch.id", ".gov", ".edu", ".mil"}
	for _, suffix := range suffixes {
		if strings.HasSuffix(d, suffix) {
			return true
		}
	}
	return false
}

// GenerateLicenseKey membuat kunci lisensi bertanda tangan kriptografis HMAC-SHA256.
func GenerateLicenseKey(claims LicenseClaims, secretKey string) (string, error) {
	if secretKey == "" {
		secretKey = defaultSecretKey
	}

	claims.IsB2G = IsGovernmentOrEduDomain(claims.Domain)

	jsonData, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("failed to marshal license claims: %w", err)
	}

	encodedPayload := base64.RawURLEncoding.EncodeToString(jsonData)
	signature := computeHMAC(encodedPayload, secretKey)

	tierPrefix := strings.ToUpper(claims.Tier)
	if tierPrefix == "" {
		tierPrefix = "FREE"
	}

	return fmt.Sprintf("NXS-%s-%s.%s", tierPrefix, encodedPayload, signature), nil
}

// ParseAndVerifyLicenseKey memverifikasi dan mendekode kunci lisensi.
func ParseAndVerifyLicenseKey(keyString string, currentDomain string, availableCores int, secretKey string) (*LicenseClaims, error) {
	if secretKey == "" {
		secretKey = defaultSecretKey
	}

	if keyString == "" {
		return nil, ErrInvalidLicenseFormat
	}

	// Bypass untuk local development
	if keyString == localDevelopmentLicenseKey {
		return &LicenseClaims{
			Domain:    "localhost",
			CpuCores:  128,
			Tier:      TierUltrasafe,
			IssuedAt:  time.Now().Unix(),
			ExpiresAt: time.Now().Add(10 * 365 * 24 * time.Hour).Unix(),
			IsB2G:     true,
		}, nil
	}

	parts := strings.Split(keyString, ".")
	if len(parts) != 2 {
		return nil, ErrInvalidLicenseFormat
	}

	rawPayloadPart := parts[0]
	signaturePart := parts[1]

	// Extract payload dari prefix NXS-<TIER>-<PAYLOAD>
	subParts := strings.SplitN(rawPayloadPart, "-", 3)
	if len(subParts) < 3 || subParts[0] != "NXS" {
		return nil, ErrInvalidLicenseFormat
	}
	encodedPayload := subParts[2]

	expectedSignature := computeHMAC(encodedPayload, secretKey)
	if !hmac.Equal([]byte(signaturePart), []byte(expectedSignature)) {
		return nil, ErrInvalidSignature
	}

	jsonData, err := base64.RawURLEncoding.DecodeString(encodedPayload)
	if err != nil {
		return nil, ErrInvalidLicenseFormat
	}

	var claims LicenseClaims
	if err := json.Unmarshal(jsonData, &claims); err != nil {
		return nil, ErrInvalidLicenseFormat
	}

	// 1. Cek Expiry
	now := time.Now().Unix()
	if claims.ExpiresAt > 0 && now > claims.ExpiresAt {
		return nil, ErrLicenseExpired
	}

	// 2. Cek Domain Matching (kecuali wildcard "*" atau localhost)
	if currentDomain != "" && currentDomain != "*" && !isLocalDevelopmentDomain(currentDomain) {
		normCurrent := strings.ToLower(strings.TrimSpace(currentDomain))
		normClaim := strings.ToLower(strings.TrimSpace(claims.Domain))
		if normClaim != "*" && normClaim != normCurrent && !strings.HasSuffix(normCurrent, "."+normClaim) {
			return nil, ErrDomainMismatch
		}
	}

	// 3. Cek CPU Cores Limit
	if availableCores > 0 && claims.CpuCores > 0 && availableCores > claims.CpuCores {
		return nil, ErrCpuCoreExceeded
	}

	return &claims, nil
}

func computeHMAC(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))
	return hex.EncodeToString(h.Sum(nil))[:16]
}
