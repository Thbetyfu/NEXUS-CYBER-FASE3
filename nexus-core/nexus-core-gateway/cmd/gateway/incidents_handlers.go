package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

// incidentDigestHandler serves operator-only incident digest for one protected host.
// GET /api/incidents/digest?domain=&hours=24&format=md|json — not Global Overwatch.
func incidentDigestHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET, OPTIONS")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "method not allowed"})
			return
		}

		domain := logger.NormalizeTargetHost(r.URL.Query().Get("domain"))
		if domain == "" || domain == "all" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "domain required (pick a workspace, not Global Overwatch)",
			})
			return
		}

		hours := 24
		if raw := strings.TrimSpace(r.URL.Query().Get("hours")); raw != "" {
			h, err := strconv.Atoi(raw)
			if err != nil || h < 1 {
				w.WriteHeader(http.StatusBadRequest)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "hours must be 1–168"})
				return
			}
			hours = h
		}
		if hours > 168 {
			hours = 168
		}

		format := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("format")))
		if format == "" {
			format = "md"
		}
		if format != "md" && format != "json" {
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "format must be md or json"})
			return
		}

		until := time.Now()
		since := until.Add(-time.Duration(hours) * time.Hour)
		d, err := database.QueryIncidentDigest(domain, since, until, hours)
		if err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		if format == "md" {
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"markdown": database.FormatIncidentDigestMD(d),
				"digest":   d,
			})
			return
		}
		_ = json.NewEncoder(w).Encode(d)
	}
}
