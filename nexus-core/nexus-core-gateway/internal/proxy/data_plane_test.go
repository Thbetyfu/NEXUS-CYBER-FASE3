package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestPublicDataPlane_OperatorTelemetryIsNotOnWAF(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"allowed":99,"email":"soc@example.invalid"}`))
	})
	h := PublicDataPlane(inner)

	req := httptest.NewRequest(http.MethodGet, "/api/telemetry", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("telemetry on data plane: want 404, got %d body=%s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "email") {
		t.Fatalf("404 body must not look like an account record: %s", rr.Body.String())
	}
}

func TestPublicDataPlane_MutatingWithoutSessionIsUnauthorized(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("origin-ok"))
	})
	h := PublicDataPlane(inner)

	req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader(`{"nexred_posture":"benign-check"}`))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("POST without session: want 401, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPublicDataPlane_UnknownAPIGetWithoutSessionIsUnauthorized(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"id":1,"email":"owner@example.invalid"}`))
	})
	h := PublicDataPlane(inner)

	req := httptest.NewRequest(http.MethodGet, "/api/objects/pii", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("object GET without session: want 401, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestPublicDataPlane_LabVaultAndPhotosStayPublic(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	h := PublicDataPlane(inner)

	for _, path := range []string{"/api/photos", "/api/unlock-reward", "/api/upload", "/api/csrf-token"} {
		method := http.MethodGet
		if path == "/api/unlock-reward" || path == "/api/upload" {
			method = http.MethodPost
		}
		req := httptest.NewRequest(method, path, nil)
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("%s %s: want 200 from inner handler, got %d", method, path, rr.Code)
		}
	}
}

func TestPublicDataPlane_SessionAllowsOriginMutation(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	h := PublicDataPlane(inner)

	token := generateToken(time.Now().Add(time.Hour).Unix(), getSessionSecret())
	req := httptest.NewRequest(http.MethodPost, "/open", strings.NewReader(`{}`))
	req.AddCookie(&http.Cookie{Name: "nexus_session", Value: token})
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("POST with session: want 200, got %d", rr.Code)
	}
}

func TestPublicDataPlane_SessionPairIsNotMinted(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"owner_token":"leak","peer_token":"leak","object_path":"/objects/1"}`))
	})
	h := PublicDataPlane(inner)

	req := httptest.NewRequest(http.MethodPost, "/nexred/lab/session-pair", strings.NewReader(`{"nexred_posture":"two-account"}`))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("session-pair: want 404, got %d body=%s", rr.Code, rr.Body.String())
	}
	if strings.Contains(rr.Body.String(), "owner_token") {
		t.Fatalf("must not mint lab tokens: %s", rr.Body.String())
	}
}

func TestPublicDataPlane_BenignJSONDoesNotReachOriginAs500(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("crash"))
	})
	h := PublicDataPlane(inner)

	req := httptest.NewRequest(http.MethodPost, "/api/broken", strings.NewReader(`{"nexred_posture":"benign-check"}`))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("benign JSON on unknown API: want 401 (not origin 500), got %d", rr.Code)
	}
}
