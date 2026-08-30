package proxy

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestBrowserIntegrity_NamedHostWithoutSessionIsPoW(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("origin-html"))
	})
	h := BrowserIntegrityCheck(inner)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Host = "portfolio.nexus-lab.test:8080"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("named host without session: want 403 PoW, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Matrix Verification") {
		t.Fatalf("named host must see PoW HTML, got %q", rr.Body.String()[:min(200, rr.Body.Len())])
	}
}

func TestBrowserIntegrity_LoopbackSkipsPoW(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("loopback-ok"))
	})
	h := BrowserIntegrityCheck(inner)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Host = "127.0.0.1:8080"
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("loopback Host must skip PoW: got %d", rr.Code)
	}
}

func TestBrowserIntegrity_NamedHostWithSessionPasses(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("session-ok"))
	})
	h := BrowserIntegrityCheck(inner)

	token := generateToken(4102444800, getSessionSecret()) // 2100-01-01
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Host = "portfolio.nexus-lab.test"
	req.AddCookie(&http.Cookie{Name: "nexus_session", Value: token})
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("named host with nexus_session: want 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestVerifySession_LabTokenFailClosedWhenEnvEmpty(t *testing.T) {
	t.Setenv("NEXUS_LAB_SESSION_TOKEN", "")
	var np NexusProxy
	form := url.Values{"lab_token": {"guess"}}
	req := httptest.NewRequest(http.MethodPost, "/api/verify-session", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	np.VerifySessionHandler(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("empty env must not mint session: got %d", rr.Code)
	}
	if cookie := cookieNamed(rr, "nexus_session"); cookie != "" {
		t.Fatalf("must not Set-Cookie when env empty")
	}
}

func TestVerifySession_LabTokenWrongRejected(t *testing.T) {
	t.Setenv("NEXUS_LAB_SESSION_TOKEN", "operator-lab-token")
	var np NexusProxy
	form := url.Values{"lab_token": {"wrong"}}
	req := httptest.NewRequest(http.MethodPost, "/api/verify-session", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	np.VerifySessionHandler(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("wrong lab token: want 403, got %d", rr.Code)
	}
}

func TestVerifySession_LabTokenMintsSession(t *testing.T) {
	t.Setenv("NEXUS_LAB_SESSION_TOKEN", "operator-lab-token")
	var np NexusProxy
	form := url.Values{"lab_token": {"operator-lab-token"}}
	req := httptest.NewRequest(http.MethodPost, "/api/verify-session", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	np.VerifySessionHandler(rr, req)
	if rr.Code != http.StatusFound {
		t.Fatalf("matching lab token: want 302, got %d body=%s", rr.Code, rr.Body.String())
	}
	cookie := cookieNamed(rr, "nexus_session")
	if cookie == "" {
		t.Fatal("matching lab token must Set-Cookie nexus_session")
	}
	if !isValidSession(cookie, getSessionSecret()) {
		t.Fatal("issued cookie must validate")
	}
}

func TestVerifySession_LabTokenHeaderMintsSession(t *testing.T) {
	t.Setenv("NEXUS_LAB_SESSION_TOKEN", "operator-lab-token")
	var np NexusProxy
	req := httptest.NewRequest(http.MethodPost, "/api/verify-session", nil)
	req.Header.Set("X-Nexus-Lab-Token", "operator-lab-token")
	rr := httptest.NewRecorder()
	np.VerifySessionHandler(rr, req)
	if rr.Code != http.StatusFound {
		t.Fatalf("header lab token: want 302, got %d", rr.Code)
	}
	if cookieNamed(rr, "nexus_session") == "" {
		t.Fatal("header lab token must Set-Cookie nexus_session")
	}
}

func cookieNamed(rr *httptest.ResponseRecorder, name string) string {
	for _, c := range rr.Result().Cookies() {
		if c.Name == name {
			return c.Value
		}
	}
	return ""
}
