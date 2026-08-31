package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCsrfShield(t *testing.T) {
	// 1. Create a dummy handler that returns 200 OK
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Success"))
	})

	// Wrap it with CsrfShield middleware
	csrfWrappedHandler := CsrfShield(dummyHandler)

	// --- TEST CASE 1: GET Request should set the nexus_csrf cookie ---
	reqGet := httptest.NewRequest(http.MethodGet, "/", nil)
	rrGet := httptest.NewRecorder()
	csrfWrappedHandler.ServeHTTP(rrGet, reqGet)

	if rrGet.Code != http.StatusOK {
		t.Errorf("Expected GET status 200, got %d", rrGet.Code)
	}

	cookies := rrGet.Result().Cookies()
	var csrfCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "nexus_csrf" {
			csrfCookie = c
			break
		}
	}

	if csrfCookie == nil {
		t.Fatal("Expected GET response to set 'nexus_csrf' cookie, but it was missing")
	}
	if len(csrfCookie.Value) != 32 { // hex representation of 16 bytes is 32 chars
		t.Errorf("Expected CSRF token length of 32, got %d (value: %s)", len(csrfCookie.Value), csrfCookie.Value)
	}

	csrfTokenValue := csrfCookie.Value

	// --- TEST CASE 2: POST without CSRF token must be blocked (403) ---
	reqPostNoToken := httptest.NewRequest(http.MethodPost, "/api/routes", nil)
	rrPostNoToken := httptest.NewRecorder()
	csrfWrappedHandler.ServeHTTP(rrPostNoToken, reqPostNoToken)

	if rrPostNoToken.Code != http.StatusForbidden {
		t.Errorf("Expected blocked POST status 403, got %d", rrPostNoToken.Code)
	}
	if !strings.Contains(rrPostNoToken.Body.String(), "CSRF verification failed") {
		t.Errorf("Expected CSRF violation message, got: %s", rrPostNoToken.Body.String())
	}

	// --- TEST CASE 3: POST with mismatched CSRF cookie & header must be blocked (403) ---
	reqPostBadToken := httptest.NewRequest(http.MethodPost, "/api/routes", nil)
	reqPostBadToken.AddCookie(&http.Cookie{Name: "nexus_csrf", Value: csrfTokenValue})
	reqPostBadToken.Header.Set("X-CSRF-Token", "wrong-token-value")
	rrPostBadToken := httptest.NewRecorder()
	csrfWrappedHandler.ServeHTTP(rrPostBadToken, reqPostBadToken)

	if rrPostBadToken.Code != http.StatusForbidden {
		t.Errorf("Expected blocked POST with bad token to be 403, got %d", rrPostBadToken.Code)
	}

	// --- TEST CASE 4: POST with valid CSRF cookie & header must succeed (200) ---
	reqPostValid := httptest.NewRequest(http.MethodPost, "/api/routes", nil)
	reqPostValid.AddCookie(&http.Cookie{Name: "nexus_csrf", Value: csrfTokenValue})
	reqPostValid.Header.Set("X-CSRF-Token", csrfTokenValue)
	rrPostValid := httptest.NewRecorder()
	csrfWrappedHandler.ServeHTTP(rrPostValid, reqPostValid)

	if rrPostValid.Code != http.StatusOK {
		t.Errorf("Expected valid POST status 200, got %d. Body: %s", rrPostValid.Code, rrPostValid.Body.String())
	}

	// --- TEST CASE 5: POST to exempted verify-session route must succeed even without CSRF token ---
	reqPostExempt := httptest.NewRequest(http.MethodPost, "/api/verify-session", nil)
	rrPostExempt := httptest.NewRecorder()
	csrfWrappedHandler.ServeHTTP(rrPostExempt, reqPostExempt)

	if rrPostExempt.Code != http.StatusOK {
		t.Errorf("Expected exempt POST to /api/verify-session to bypass CSRF and return 200, got %d", rrPostExempt.Code)
	}
}
