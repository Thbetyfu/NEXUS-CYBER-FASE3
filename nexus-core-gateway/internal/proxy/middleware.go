// Package proxy mengimplementasikan gateway proxy reverse otonom dengan kecerdasan MTD.
package proxy

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"html"
	"io"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

const (
	defaultInspectableBodyLimit int64 = 1 * 1024 * 1024
	mediaInspectableBodyLimit   int64 = 10 * 1024 * 1024
)

var (
	runtimeSessionSecret     string
	runtimeSessionSecretOnce sync.Once
)

type browserChallenge struct {
	Left    int
	Right   int
	Target  string
	Expires int64
}

func getSessionSecret() string {
	runtimeSessionSecretOnce.Do(func() {
		if secret := os.Getenv("NEXUS_SESSION_SECRET"); secret != "" {
			runtimeSessionSecret = secret
			return
		}

		runtimeSessionSecret = generateSecureHexToken(32)
	})

	return runtimeSessionSecret
}

func generateSecureHexToken(byteLen int) string {
	b := make([]byte, byteLen)
	if _, err := rand.Read(b); err != nil {
		return GenerateCSRFToken() + GenerateCSRFToken()
	}
	return fmt.Sprintf("%x", b)
}

func envBool(name string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(name))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func sanitizeRelativeTarget(target string) string {
	if target == "" || !strings.HasPrefix(target, "/") || strings.HasPrefix(target, "//") {
		return "/"
	}
	return target
}

func randomIntInRange(min, max int) int {
	if max <= min {
		return min
	}

	n, err := rand.Int(rand.Reader, big.NewInt(int64(max-min+1)))
	if err != nil {
		return min
	}

	return min + int(n.Int64())
}

func signValue(value, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func buildChallengeToken(challenge browserChallenge, secret string) string {
	payload := fmt.Sprintf(
		"%d|%d|%s|%d",
		challenge.Left,
		challenge.Right,
		base64.RawURLEncoding.EncodeToString([]byte(challenge.Target)),
		challenge.Expires,
	)
	return payload + "." + signValue(payload, secret)
}

func newBrowserChallenge(target string) browserChallenge {
	return browserChallenge{
		Left:    randomIntInRange(111, 997),
		Right:   randomIntInRange(11, 97),
		Target:  sanitizeRelativeTarget(target),
		Expires: time.Now().Add(2 * time.Minute).Unix(),
	}
}

func verifyChallengeToken(token, answer, secret string) (string, bool) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "/", false
	}

	payload, providedSig := parts[0], parts[1]
	expectedSig := signValue(payload, secret)
	if !hmac.Equal([]byte(providedSig), []byte(expectedSig)) {
		return "/", false
	}

	payloadParts := strings.Split(payload, "|")
	if len(payloadParts) != 4 {
		return "/", false
	}

	left, err := strconv.Atoi(payloadParts[0])
	if err != nil {
		return "/", false
	}

	right, err := strconv.Atoi(payloadParts[1])
	if err != nil {
		return "/", false
	}

	targetBytes, err := base64.RawURLEncoding.DecodeString(payloadParts[2])
	if err != nil {
		return "/", false
	}

	expires, err := strconv.ParseInt(payloadParts[3], 10, 64)
	if err != nil || time.Now().Unix() > expires {
		return "/", false
	}

	expectedAnswer := strconv.Itoa(left * right)
	if !hmac.Equal([]byte(answer), []byte(expectedAnswer)) {
		return "/", false
	}

	return sanitizeRelativeTarget(string(targetBytes)), true
}

func inspectionBodyLimit(r *http.Request) int64 {
	contentType := strings.ToLower(r.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "image/jpeg") ||
		strings.HasPrefix(contentType, "image/png") ||
		strings.HasPrefix(contentType, "multipart/form-data") {
		return mediaInspectableBodyLimit
	}

	return defaultInspectableBodyLimit
}

func captureRequestBodyForInspection(r *http.Request) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}

	limit := inspectionBodyLimit(r)
	body, err := io.ReadAll(io.LimitReader(r.Body, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > limit {
		return nil, fmt.Errorf("request body exceeds inspection limit of %d bytes", limit)
	}

	r.Body = io.NopCloser(bytes.NewBuffer(body))
	return body, nil
}

// BrowserIntegrityCheck mengimplementasikan "CGNAT Bypass JS Challenge" (Pemeriksaan Integritas Peramban).
//
// Alasan Arsitektural (Why):
// Sistem perlindungan terhadap bot pemindai scriptless (seperti curl, python-requests, atau zgrab).
// Bot otomatis biasanya tidak mengeksekusi JavaScript. Dengan mengembalikan halaman tantangan matematika ringan
// (Proof-of-Work) yang diselesaikan secara otomatis oleh JavaScript peramban dalam 800ms, kita dapat
// memverifikasi keaslian browser manusia (user-agent integrity) secara transparan tanpa mengganggu kenyamanan pengguna.
func BrowserIntegrityCheck(next http.Handler) http.Handler {
	secret := getSessionSecret()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// [BYPASS LOCALHOST DASHBOARD]
		// Pengunjung lokal pada localhost/127.0.0.1 (Admin SOC Dashboard) dibebaskan dari tantangan JS
		// agar dasbor Command Center langsung terbuka secara instan tanpa mengalami challenge loop.
		host := utils.RequestHost(r.Host)
		if utils.IsLoopbackRequestHost(host) {
			next.ServeHTTP(w, r)
			return
		}

		// [LAYER_0_PREFLIGHT_GUARD]
		// Alasan Teknis (Why):
		// Mengizinkan metode OPTIONS untuk bypass pemeriksaan integritas guna mendukung kelancaran komunikasi CORS
		// pada antarmuka admin SOC Dashboard.
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// Lab Gallery/vault/PoW APIs skip the HTML challenge; SOC APIs are not on this port.
		if IsPublicDataPlanePath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		// 2. Validasi cookie sesi nexus_session
		cookie, err := r.Cookie("nexus_session")
		if err == nil {
			if isValidSession(cookie.Value, secret) {
				next.ServeHTTP(w, r)
				return
			}
		}

		// 3. Kembalikan halaman tantangan (Challenge Page) jika sesi tidak valid/belum terdaftar.
		challenge := newBrowserChallenge(r.URL.Path)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprint(w, generateChallengeHTML(challenge, buildChallengeToken(challenge, secret)))
	})
}

// VerifySessionHandler menangani pengiriman jawaban tantangan Proof-of-Work browser.
//
// Alasan Arsitektural (Why):
// - Jika jawaban matematika klien benar dan token tantangan masih valid, sistem menerbitkan cookie otorisasi 24 jam.
// - Cookie diset dengan atribut HttpOnly (mencegah pencurian token via XSS) dan SameSite=Lax (mitigasi CSRF).
func (np *NexusProxy) VerifySessionHandler(w http.ResponseWriter, r *http.Request) {
	secret := getSessionSecret()

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	answer := r.FormValue("answer")
	challengeToken := r.FormValue("challenge_token")

	if targetPath, ok := verifyChallengeToken(challengeToken, answer, secret); ok {
		expiry := time.Now().Add(24 * time.Hour).Unix()
		token := generateToken(expiry, secret)

		http.SetCookie(w, &http.Cookie{
			Name:     "nexus_session",
			Value:    token,
			MaxAge:   86400,
			Path:     "/",
			HttpOnly: true,
			Secure:   envBool("SESSION_COOKIE_SECURE"),
			SameSite: http.SameSiteLaxMode,
		})

		http.Redirect(w, r, targetPath, http.StatusFound)
		return
	}

	http.Error(w, "Matrix Verification Failed. Bot Detected.", http.StatusForbidden)
}

// generateToken menyusun token bertanda tangan kriptografi menggunakan HMAC-SHA256.
func generateToken(expiry int64, secret string) string {
	payload := fmt.Sprintf("%d", expiry)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	sig := base64.URLEncoding.EncodeToString(h.Sum(nil))
	return payload + "." + sig
}

// isValidSession memverifikasi integritas tanda tangan token dan masa kedaluarsanya.
func isValidSession(token, secret string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false
	}

	payload, sig := parts[0], parts[1]

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	expectedSig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return false
	}

	var expiry int64
	fmt.Sscanf(payload, "%d", &expiry)
	return time.Now().Unix() < expiry
}

// generateChallengeHTML menyintesis visual tantangan peramban bertema Matrix minimalis premium.
func generateChallengeHTML(challenge browserChallenge, challengeToken string) string {
	return `<!DOCTYPE html>
<html>
<head>
    <title>Nexus Cyber | Matrix Verification</title>
    <style>
        body { background: #06080b; color: #10b981; font-family: 'Courier New', monospace; text-align: center; padding-top: 20%; }
        .box { border: 1px solid #10b981; padding: 20px; display: inline-block; border-radius: 8px; background: rgba(16,185,129,0.05); }
        h1 { font-size: 1.2rem; }
        .spinner { border: 4px solid #06080b; border-top: 4px solid #10b981; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="box">
        <h1>VERIFYING TERMINAL INTEGRITY...</h1>
        <p>Bypassing CGNAT via Matrix Sync.</p>
        <div class="spinner"></div>
        <p>Please wait while your browser establishes a secure Nexus Session.</p>
        <form id="challenge" action="/api/verify-session" method="POST" style="display:none;">
            <input type="hidden" name="answer" id="answer">
            <input type="hidden" name="challenge_token" value="` + html.EscapeString(challengeToken) + `">
        </form>
    </div>
    <script>
        // Eksperimen Proof-of-Work Matematis Sederhana berbasis token bertanda tangan.
        setTimeout(() => {
            const res = ` + strconv.Itoa(challenge.Left) + ` * ` + strconv.Itoa(challenge.Right) + `;
            document.getElementById('answer').value = res;
            document.getElementById('challenge').submit();
        }, 800);
    </script>
</body>
</html>`
}

// GenerateCSRFToken generates a cryptographically secure random token (32 hex chars)
func GenerateCSRFToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// CsrfShield implements Double-Submit Cookie CSRF Protection at the gateway level.
func CsrfShield(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Bypass CORS preflight requests
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		// 2. Set CSRF cookie for all GET requests if it doesn't exist
		cookie, err := r.Cookie("nexus_csrf")
		var csrfToken string
		if err != nil || cookie.Value == "" {
			csrfToken = GenerateCSRFToken()
			http.SetCookie(w, &http.Cookie{
				Name:     "nexus_csrf",
				Value:    csrfToken,
				Path:     "/",
				HttpOnly: false, // Must be readable by client JS
				Secure:   envBool("CSRF_COOKIE_SECURE"),
				SameSite: http.SameSiteLaxMode,
			})
		} else {
			csrfToken = cookie.Value
		}

		// 3. Verify CSRF for state-changing requests (POST, PUT, DELETE, PATCH)
		if r.Method == http.MethodPost || r.Method == http.MethodPut || r.Method == http.MethodDelete || r.Method == http.MethodPatch {
			// Bypass verify-session challenge handler
			if r.URL.Path == "/api/verify-session" || r.URL.Path == "/nexred/lab/vaccine-probe" {
				next.ServeHTTP(w, r)
				return
			}

			// Read token from header or form value
			clientToken := r.Header.Get("X-CSRF-Token")
			if clientToken == "" {
				clientToken = r.FormValue("csrf_token")
			}

			if clientToken == "" || clientToken != csrfToken {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"status":"error","message":"Security Violation: CSRF verification failed. Missing or invalid X-CSRF-Token."}`))
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
