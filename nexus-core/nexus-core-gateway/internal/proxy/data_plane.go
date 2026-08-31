package proxy

import (
	"net/http"
	"strings"
)

// Public lab routes on the WAF data plane (:8080). Everything else under /api/
// is either SOC-only (:8081) or requires a nexus_session cookie so NEX-RED
// live checks cannot read operator JSON or mutate origin without a session.
func IsPublicDataPlanePath(path string) bool {
	switch path {
	case "/api/verify-session",
		"/api/csrf-token",
		"/api/unlock-reward",
		"/api/upload",
		"/api/photos",
		"/api/webhook/payment",
		"/api/license/validate-domain":
		return true
	}
	if path == "/nexred/lab/antibody-signal" || path == "/nexred/lab/vaccine-probe" {
		return true
	}
	return strings.HasPrefix(path, "/api/guest-photos/")
}

func isControlPlaneAPIPath(path string) bool {
	prefixes := []string{
		"/api/telemetry",
		"/api/logs",
		"/api/domains",
		"/api/ai-events",
		"/api/ai/",
		"/api/cli/",
		"/api/panic",
		"/api/report/",
		"/api/stream/",
		"/api/ip-monitoring",
		"/api/blacklist",
		"/api/audit/",
		"/api/antibodies",
		"/api/system/",
		"/api/test/",
		"/api/admin/",
		"/api/routes",
		"/api/nechat",
	}
	for _, prefix := range prefixes {
		if path == prefix || strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

func isLabSessionPairPath(path string) bool {
	return path == "/nexred/lab/session-pair" || strings.HasPrefix(path, "/nexred/lab/session-pair/")
}

func isMutatingMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func requestHasValidBrowserSession(r *http.Request) bool {
	cookie, err := r.Cookie("nexus_session")
	if err != nil || cookie.Value == "" {
		return false
	}
	return isValidSession(cookie.Value, getSessionSecret())
}

func writeDataPlaneJSON(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(body))
}

// PublicDataPlane enforces the WAF surface that NEX-RED measures.
//
// Why: the public mux used to proxy unknown /api/* to origin, so GET
// /api/telemetry could return 200 from a SPA. Operator APIs belong on :8081.
// Lab Gallery/vault stay reachable without a PoW cookie; other mutations need a session.
func PublicDataPlane(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path
		if isLabSessionPairPath(path) {
			writeDataPlaneJSON(w, http.StatusNotFound, `{"status":"error","message":"not found"}`)
			return
		}
		if isControlPlaneAPIPath(path) {
			writeDataPlaneJSON(w, http.StatusNotFound, `{"status":"error","message":"not found"}`)
			return
		}
		if IsPublicDataPlanePath(path) {
			next.ServeHTTP(w, r)
			return
		}

		needsSession := strings.HasPrefix(path, "/api/") || isMutatingMethod(r.Method)
		if needsSession && !requestHasValidBrowserSession(r) {
			writeDataPlaneJSON(w, http.StatusUnauthorized, `{"status":"error","message":"session required"}`)
			return
		}

		next.ServeHTTP(w, r)
	})
}
