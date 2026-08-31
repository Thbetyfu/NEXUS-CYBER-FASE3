package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestApplyDashboardCORSHeadersAllowsTrustedOrigin(t *testing.T) {
	t.Setenv("DASHBOARD_ALLOWED_ORIGINS", "http://localhost:3000")

	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rr := httptest.NewRecorder()

	ApplyDashboardCORSHeaders(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("expected trusted origin to be allowed, got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected credentials header to be true, got %q", got)
	}
}

func TestApplyDashboardCORSHeadersRejectsUnknownOrigin(t *testing.T) {
	t.Setenv("DASHBOARD_ALLOWED_ORIGINS", "http://localhost:3000")

	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req.Header.Set("Origin", "https://evil.example")
	rr := httptest.NewRecorder()

	ApplyDashboardCORSHeaders(rr, req)

	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected unknown origin to stay unset, got %q", got)
	}
}

func TestDashboardCORSHandlesPreflightWithExplicitHeaders(t *testing.T) {
	t.Setenv("DASHBOARD_ALLOWED_ORIGINS", "http://127.0.0.1:3000")

	called := false
	handler := DashboardCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/telemetry", nil)
	req.Header.Set("Origin", "http://127.0.0.1:3000")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected preflight to return 200, got %d", rr.Code)
	}
	if called {
		t.Fatal("expected preflight to stop before next handler")
	}
	if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:3000" {
		t.Fatalf("expected trusted origin on preflight, got %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type, X-CSRF-Token, X-Nexus-Webhook-Secret, X-Nexus-Admin-Token" {
		t.Fatalf("unexpected allowed headers value: %q", got)
	}
	if got := rr.Header().Get("Access-Control-Allow-Methods"); got != "GET, POST, OPTIONS, PUT, DELETE" {
		t.Fatalf("unexpected allowed methods value: %q", got)
	}
}

func TestDashboardCORSSetsBrowserSecurityHeadersWithoutHSTSOnHTTP(t *testing.T) {
	handler := DashboardCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if got := rr.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("nosniff: %q", got)
	}
	if got := rr.Header().Get("X-Frame-Options"); got != "SAMEORIGIN" {
		t.Fatalf("frame: %q", got)
	}
	if got := rr.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatal("expected CSP")
	}
	if got := rr.Header().Get("Strict-Transport-Security"); got != "" {
		t.Fatalf("HSTS must stay off on HTTP lab, got %q", got)
	}
}

func TestApplyBrowserSecurityHeadersSetsHSTSOnHTTPSForward(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	rr := httptest.NewRecorder()
	ApplyBrowserSecurityHeaders(rr, req)
	if got := rr.Header().Get("Strict-Transport-Security"); !strings.Contains(got, "max-age=") {
		t.Fatalf("HSTS: %q", got)
	}
}
