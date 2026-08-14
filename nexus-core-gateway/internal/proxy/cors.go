package proxy

import (
	"net/http"
	"os"
	"strings"
)

const (
	defaultDashboardAllowedOrigins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081"
	dashboardAllowedMethods        = "GET, POST, OPTIONS, PUT, DELETE"
	dashboardAllowedHeaders        = "Content-Type, X-CSRF-Token, X-Nexus-Webhook-Secret, X-Nexus-Admin-Token"
)

func parseDashboardAllowedOrigins() map[string]struct{} {
	rawOrigins := strings.TrimSpace(os.Getenv("DASHBOARD_ALLOWED_ORIGINS"))
	if rawOrigins == "" {
		rawOrigins = defaultDashboardAllowedOrigins
	}

	allowed := make(map[string]struct{})
	for _, origin := range strings.Split(rawOrigins, ",") {
		normalized := strings.TrimSpace(origin)
		if normalized == "" {
			continue
		}
		allowed[normalized] = struct{}{}
	}

	return allowed
}

func isDashboardOriginAllowed(origin string) bool {
	_, ok := parseDashboardAllowedOrigins()[strings.TrimSpace(origin)]
	return ok
}

// ApplyDashboardCORSHeaders menerapkan policy CORS tepercaya untuk dashboard tanpa wildcard.
func ApplyDashboardCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	w.Header().Add("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", dashboardAllowedMethods)
	w.Header().Set("Access-Control-Allow-Headers", dashboardAllowedHeaders)

	if origin != "" && isDashboardOriginAllowed(origin) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
	}
}

// DashboardCORS membungkus seluruh API gateway dengan allowlist origin eksplisit.
func DashboardCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ApplyDashboardCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
