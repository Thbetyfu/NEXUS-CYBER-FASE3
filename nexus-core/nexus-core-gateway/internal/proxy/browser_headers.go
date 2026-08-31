package proxy

import (
	"net/http"
	"strings"
)

// Lab-safe CSP: PoW challenge and the portfolio use inline script/style.
// This is clickjacking/sniffing hardening, not a claim of XSS-proof CSP.
const labContentSecurityPolicy = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-ancestors 'self'"

// ApplyBrowserSecurityHeaders sets edge headers on every public WAF response.
//
// Why: NEX-RED recon flagged missing X-Content-Type-Options / X-Frame-Options / CSP
// on the session challenge (HTTP 403). HSTS is omitted on plain HTTP so the hotspot
// lab at http://192.168.x.x is not forced onto HTTPS.
func ApplyBrowserSecurityHeaders(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	if h.Get("X-Content-Type-Options") == "" {
		h.Set("X-Content-Type-Options", "nosniff")
	}
	if h.Get("X-Frame-Options") == "" {
		h.Set("X-Frame-Options", "SAMEORIGIN")
	}
	if h.Get("Referrer-Policy") == "" {
		h.Set("Referrer-Policy", "no-referrer")
	}
	if h.Get("Content-Security-Policy") == "" {
		h.Set("Content-Security-Policy", labContentSecurityPolicy)
	}

	https := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	if https && h.Get("Strict-Transport-Security") == "" {
		h.Set("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
	}
}
