package logger

import (
	"net"
	"net/url"
	"strings"
)

// NormalizeTargetHost stores and matches ThreatLog.target_domain without :port or scheme.
func NormalizeTargetHost(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" || s == "all" {
		return s
	}
	if strings.Contains(s, "://") {
		if u, err := url.Parse(s); err == nil && u.Host != "" {
			s = strings.ToLower(u.Host)
		}
	}
	if h, _, err := net.SplitHostPort(s); err == nil {
		return strings.Trim(h, "[]")
	}
	if i := strings.LastIndex(s, "]"); i >= 0 && strings.HasPrefix(s, "[") {
		return s[1:i]
	}
	return strings.TrimSuffix(s, ".")
}
