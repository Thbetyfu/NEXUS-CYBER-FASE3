package utils

import (
	"net"
	"net/http"
	"os"
	"strings"
)

// RequestHost returns the hostname from an HTTP Host header without the port.
// IPv6 literals such as "[::1]:8080" stay intact as "::1" instead of truncating at the first colon.
func RequestHost(host string) string {
	host = strings.TrimSpace(host)
	if host == "" {
		return ""
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		return strings.Trim(h, "[]")
	}
	return strings.Trim(host, "[]")
}

func isLoopbackHost(host string) bool {
	h := strings.ToLower(RequestHost(host))
	if h == "localhost" || h == "127.0.0.1" || h == "::1" {
		return true
	}
	if ip := net.ParseIP(h); ip != nil {
		return ip.IsLoopback()
	}
	return false
}

// IsLoopbackRequestHost reports whether the HTTP Host is a local dashboard/dev origin.
func IsLoopbackRequestHost(host string) bool {
	return isLoopbackHost(host)
}

func peerIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func trustedProxyNets() []*net.IPNet {
	raw := strings.TrimSpace(os.Getenv("NEXUS_TRUSTED_PROXIES"))
	if raw == "" {
		raw = "127.0.0.0/8,::1/128,172.16.0.0/12"
	}
	var nets []*net.IPNet
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if !strings.Contains(part, "/") {
			if ip := net.ParseIP(part); ip != nil {
				if ip.To4() != nil {
					part += "/32"
				} else {
					part += "/128"
				}
			}
		}
		_, n, err := net.ParseCIDR(part)
		if err != nil {
			continue
		}
		nets = append(nets, n)
	}
	return nets
}

func isTrustedProxyIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}
	for _, n := range trustedProxyNets() {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

func rightmostForwardedIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		for i := len(parts) - 1; i >= 0; i-- {
			ip := strings.TrimSpace(parts[i])
			ip = RequestHost(ip)
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		xri = RequestHost(xri)
		if net.ParseIP(xri) != nil {
			return xri
		}
	}
	return ""
}

// ClientIP returns the rate-limit / ban identity for a request.
// Headers are used only when RemoteAddr is a trusted reverse proxy (loopback or Docker bridge by default).
// Direct clients on the public WAF port cannot spoof X-Forwarded-For.
func ClientIP(r *http.Request) string {
	peer := peerIP(r)
	if isTrustedProxyIP(peer) {
		if forwarded := rightmostForwardedIP(r); forwarded != "" {
			return forwarded
		}
	}
	return peer
}
