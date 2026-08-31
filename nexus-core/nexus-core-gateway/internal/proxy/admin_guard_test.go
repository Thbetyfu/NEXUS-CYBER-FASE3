package proxy

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequirePOST_RejectsGET(t *testing.T) {
	h := RequirePOST(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/system/reset", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET reset: want 405, got %d body=%s", rr.Code, rr.Body.String())
	}

	post := httptest.NewRequest(http.MethodPost, "/api/system/reset", nil)
	rrPost := httptest.NewRecorder()
	h.ServeHTTP(rrPost, post)
	if rrPost.Code != http.StatusOK {
		t.Fatalf("POST reset: want 200, got %d", rrPost.Code)
	}
}

func TestAdminControlPlane_LoopbackAllowedWithoutToken(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := AdminControlPlane(inner, "")

	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req.RemoteAddr = "127.0.0.1:54321"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("loopback without token: want 200, got %d", rr.Code)
	}
}

func TestAdminControlPlane_NonLoopbackRequiresCookieOrHeader(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := AdminControlPlane(inner, "secret-admin")

	req := httptest.NewRequest(http.MethodGet, "/api/system/reset", nil)
	req.RemoteAddr = "10.0.0.8:4444"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("LAN without token: want 401, got %d", rr.Code)
	}

	reqQ := httptest.NewRequest(http.MethodGet, "/api/stream/threats?admin_token=secret-admin", nil)
	reqQ.RemoteAddr = "10.0.0.8:4444"
	rrQ := httptest.NewRecorder()
	h.ServeHTTP(rrQ, reqQ)
	if rrQ.Code != http.StatusUnauthorized {
		t.Fatalf("query string token must be rejected: want 401, got %d", rrQ.Code)
	}

	req2 := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req2.RemoteAddr = "10.0.0.8:4444"
	req2.Header.Set(AdminTokenHeader, "secret-admin")
	rr2 := httptest.NewRecorder()
	h.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("LAN with header token: want 200, got %d", rr2.Code)
	}

	req3 := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	req3.RemoteAddr = "172.18.0.4:9"
	req3.AddCookie(&http.Cookie{Name: AdminTokenCookie, Value: "secret-admin"})
	rr3 := httptest.NewRecorder()
	h.ServeHTTP(rr3, req3)
	if rr3.Code != http.StatusOK {
		t.Fatalf("LAN with session cookie: want 200, got %d", rr3.Code)
	}
}

func TestAdminControlPlane_IgnoresSpoofedForwardedFor(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := AdminControlPlane(inner, "secret-admin")

	req := httptest.NewRequest(http.MethodPost, "/api/cli/execute", nil)
	req.RemoteAddr = "192.168.137.20:9"
	req.Header.Set("X-Forwarded-For", "127.0.0.1")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("spoofed XFF must not skip token: want 401, got %d", rr.Code)
	}
}

func TestAdminControlPlane_ExemptsLoginAndCSRF(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	h := AdminControlPlane(inner, "secret-admin")

	req := httptest.NewRequest(http.MethodGet, "/api/csrf-token", nil)
	req.RemoteAddr = "172.18.0.2:9"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("csrf-token must be reachable before login: got %d", rr.Code)
	}

	req2 := httptest.NewRequest(http.MethodPost, "/api/admin/login", nil)
	req2.RemoteAddr = "172.18.0.2:9"
	rr2 := httptest.NewRecorder()
	h.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusNoContent {
		t.Fatalf("login must be reachable: got %d", rr2.Code)
	}
}

func TestAdminLoginHandler_SetsHttpOnlyCookie(t *testing.T) {
	h := AdminLoginHandler("secret-admin")
	body := strings.NewReader(`{"token":"secret-admin"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/admin/login", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("login: want 200, got %d %s", rr.Code, rr.Body.String())
	}
	var cookie *http.Cookie
	for _, c := range rr.Result().Cookies() {
		if c.Name == AdminTokenCookie {
			cookie = c
		}
	}
	if cookie == nil || cookie.Value != "secret-admin" || !cookie.HttpOnly {
		t.Fatalf("expected HttpOnly session cookie, got %+v", cookie)
	}
	var payload map[string]string
	_ = json.NewDecoder(rr.Body).Decode(&payload)
	if payload["status"] != "ok" {
		t.Fatalf("unexpected body %v", payload)
	}
}

func TestAdminLoginHandler_RejectsWrongToken(t *testing.T) {
	h := AdminLoginHandler("secret-admin")
	req := httptest.NewRequest(http.MethodPost, "/api/admin/login", strings.NewReader(`{"token":"nope"}`))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", rr.Code)
	}
}

func TestAdminControlPlane_EmptyTokenRejectsNonLoopback(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	h := AdminControlPlane(inner, "")

	req := httptest.NewRequest(http.MethodPost, "/api/panic", nil)
	req.RemoteAddr = "172.18.0.4:1234"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("docker-network without token: want 401, got %d", rr.Code)
	}
}
