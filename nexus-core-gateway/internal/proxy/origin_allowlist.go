package proxy

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"
)

// NormalizeProxyOrigin ensures a reverse-proxy target is an absolute http(s) URL.
// Bare hosts like "127.0.0.1:3002" become "http://127.0.0.1:3002" so url.Parse
// does not treat the port colon as a fake scheme (tunnel / PC pilot regressions).
func NormalizeProxyOrigin(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("origin URL is required")
	}
	if !strings.Contains(raw, "://") {
		raw = "http://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", fmt.Errorf("invalid origin URL")
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", fmt.Errorf("origin scheme must be http or https")
	}
	u.Scheme = scheme
	u.User = nil
	u.Fragment = ""
	return u.String(), nil
}

// ValidateProxyOrigin rejects operator-supplied reverse-proxy targets that would
// turn the WAF into an open proxy into loopback, RFC1918, link-local, or metadata.
// Set NEXUS_ALLOW_PRIVATE_ORIGINS=true on air-gapped on-prem installs that must
// reach RFC1918 backends. Link-local and cloud metadata stay blocked either way.
func ValidateProxyOrigin(raw string) error {
	normalized, err := NormalizeProxyOrigin(raw)
	if err != nil {
		return err
	}
	u, err := url.Parse(normalized)
	if err != nil || u.Host == "" {
		return fmt.Errorf("invalid origin URL")
	}

	host := strings.ToLower(u.Hostname())
	if host == "" {
		return fmt.Errorf("origin host is required")
	}
	if isBlockedMetadataHost(host) {
		return fmt.Errorf("origin host is not allowed")
	}

	if ip := net.ParseIP(host); ip != nil {
		return validateOriginIP(ip)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil || len(addrs) == 0 {
		return fmt.Errorf("origin host could not be resolved")
	}
	for _, addr := range addrs {
		if err := validateOriginIP(addr.IP); err != nil {
			return err
		}
	}
	return nil
}

func validateOriginIP(ip net.IP) error {
	if ip == nil {
		return fmt.Errorf("invalid origin IP")
	}
	if ip.IsUnspecified() || ip.IsMulticast() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return fmt.Errorf("origin IP range is not allowed")
	}
	if isCloudMetadataIP(ip) {
		return fmt.Errorf("origin IP range is not allowed")
	}
	if envBool("NEXUS_ALLOW_PRIVATE_ORIGINS") {
		return nil
	}
	if ip.IsLoopback() || ip.IsPrivate() {
		return fmt.Errorf("private or loopback origins are disabled")
	}
	return nil
}

func isCloudMetadataIP(ip net.IP) bool {
	if ip4 := ip.To4(); ip4 != nil {
		return ip4[0] == 169 && ip4[1] == 254
	}
	return false
}

func isBlockedMetadataHost(host string) bool {
	switch host {
	case "localhost", "metadata.google.internal", "metadata", "instance-data":
		return true
	}
	return strings.HasSuffix(host, ".localhost")
}
