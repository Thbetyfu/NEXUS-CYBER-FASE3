package proxy

import (
	"crypto/subtle"
	"encoding/json"
	"net"
	"net/http"
	"strings"
)

const AdminTokenHeader = "X-Nexus-Admin-Token"
const AdminTokenCookie = "nexus_admin_token"

// RequirePOST rejects GET/PUT/DELETE on destructive control-plane routes.
func RequirePOST(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", "POST, OPTIONS")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = w.Write([]byte(`{"status":"error","message":"method not allowed"}`))
			return
		}
		next(w, r)
	}
}

func isAdminAuthExempt(path string) bool {
	switch path {
	case "/api/admin/login", "/api/admin/logout", "/api/csrf-token":
		return true
	default:
		return false
	}
}

// AdminControlPlane gates SOC APIs.
// Loopback clients (start-dev.bat) are allowed without a token when none is configured.
// Docker/Caddy callers must present a session cookie or X-Nexus-Admin-Token header.
// Query-string tokens are rejected (they leak in logs and Referer).
func AdminControlPlane(next http.Handler, token string) http.Handler {
	want := strings.TrimSpace(token)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isAdminAuthExempt(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		got := readAdminCredential(r)
		if want != "" && adminTokenMatch(got, want) {
			next.ServeHTTP(w, r)
			return
		}
		if want == "" && requestIsLoopback(r) {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		if want == "" {
			_, _ = w.Write([]byte(`{"status":"error","message":"admin control plane requires NEXUS_ADMIN_TOKEN"}`))
			return
		}
		_, _ = w.Write([]byte(`{"status":"error","message":"unauthorized"}`))
	})
}

func readAdminCredential(r *http.Request) string {
	got := strings.TrimSpace(r.Header.Get(AdminTokenHeader))
	if got != "" {
		return got
	}
	if c, err := r.Cookie(AdminTokenCookie); err == nil {
		return strings.TrimSpace(c.Value)
	}
	return ""
}

func AdminLoginHandler(token string) http.HandlerFunc {
	want := strings.TrimSpace(token)
	return RequirePOST(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if want == "" {
			w.WriteHeader(http.StatusServiceUnavailable)
			_, _ = w.Write([]byte(`{"status":"error","message":"NEXUS_ADMIN_TOKEN is not configured"}`))
			return
		}
		var payload struct {
			Token    string `json:"token"`
			Password string `json:"password"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		got := strings.TrimSpace(payload.Token)
		if got == "" {
			got = strings.TrimSpace(payload.Password)
		}
		if !adminTokenMatch(got, want) {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"status":"error","message":"invalid credentials"}`))
			return
		}
		http.SetCookie(w, &http.Cookie{
			Name:     AdminTokenCookie,
			Value:    want,
			Path:     "/",
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
			Secure:   envBool("SESSION_COOKIE_SECURE") || envBool("CSRF_COOKIE_SECURE"),
		})
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
}

func AdminLogoutHandler() http.HandlerFunc {
	return RequirePOST(func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{
			Name:     AdminTokenCookie,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
			SameSite: http.SameSiteLaxMode,
		})
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
}

func requestIsLoopback(r *http.Request) bool {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func adminTokenMatch(got, want string) bool {
	if got == "" || want == "" || len(got) != len(want) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}
