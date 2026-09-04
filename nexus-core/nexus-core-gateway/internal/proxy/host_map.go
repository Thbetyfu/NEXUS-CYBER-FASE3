package proxy

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

const (
	labHostMapExact  = "nexus-lab.test"
	labHostMapSuffix = ".nexus-lab.test"
)

// HostMapEntry is one Caddy Host → origin pair on a single lab gateway.
// Lab-only: not a mass CNAME provisioner; not naked *.vercel.app.
type HostMapEntry struct {
	Host   string `json:"host"`
	Origin string `json:"origin"`
	Kind   string `json:"kind,omitempty"`
	Slug   string `json:"slug,omitempty"`
}

type hostMapFile struct {
	Hosts []HostMapEntry `json:"hosts"`
}

// LoadHostMap reads extra (and portfolio) Host→origin pairs.
// Order: NEXUS_HOST_MAP JSON, else file NEXUS_HOST_MAP_FILE.
func LoadHostMap() []HostMapEntry {
	if raw := strings.TrimSpace(os.Getenv("NEXUS_HOST_MAP")); raw != "" {
		entries, err := ParseHostMapJSON([]byte(raw))
		if err != nil {
			fmt.Printf("[HOST-MAP] NEXUS_HOST_MAP JSON invalid: %v\n", err)
			return nil
		}
		return entries
	}
	path := strings.TrimSpace(os.Getenv("NEXUS_HOST_MAP_FILE"))
	if path == "" {
		return nil
	}
	body, err := os.ReadFile(path)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Printf("[HOST-MAP] cannot read %s: %v\n", path, err)
		}
		return nil
	}
	entries, err := ParseHostMapJSON(body)
	if err != nil {
		fmt.Printf("[HOST-MAP] %s invalid: %v\n", path, err)
		return nil
	}
	return entries
}

// ParseHostMapJSON accepts {"hosts":[{host,origin}]} or {"host":"origin",...}.
func ParseHostMapJSON(raw []byte) ([]HostMapEntry, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) == 0 {
		return nil, nil
	}
	var wrapped hostMapFile
	if err := json.Unmarshal(raw, &wrapped); err == nil && wrapped.Hosts != nil {
		return wrapped.Hosts, nil
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil, err
	}
	if hostsRaw, ok := obj["hosts"]; ok {
		var list []HostMapEntry
		if err := json.Unmarshal(hostsRaw, &list); err == nil {
			return list, nil
		}
	}
	var simple map[string]string
	if err := json.Unmarshal(raw, &simple); err != nil {
		return nil, fmt.Errorf("host map must be {\"hosts\":[...]} or {\"host\":\"origin\"}")
	}
	entries := make([]HostMapEntry, 0, len(simple))
	for host, origin := range simple {
		if strings.EqualFold(host, "hosts") {
			continue
		}
		entries = append(entries, HostMapEntry{Host: host, Origin: origin})
	}
	return entries, nil
}

func bytesTrimSpace(b []byte) []byte {
	return []byte(strings.TrimSpace(string(b)))
}

// BindHostMap maps each named Host to its origin after BindLabInstanceOrigin.
// Exact Host wins over the lab "*" catch-all (portfolio / hotspot IP).
func BindHostMap(router *DynamicRouter) {
	if router == nil {
		return
	}
	entries := LoadHostMap()
	if len(entries) == 0 {
		return
	}
	var bound []string
	for _, e := range entries {
		host, origin, err := AcceptHostMapEntry(e.Host, e.Origin)
		if err != nil {
			fmt.Printf("[HOST-MAP] skip %q: %v\n", strings.TrimSpace(e.Host), err)
			continue
		}
		if err := router.AddRoute(host, origin); err != nil {
			fmt.Printf("[HOST-MAP] skip %s: %v\n", host, err)
			continue
		}
		bound = append(bound, host)
	}
	if len(bound) > 0 {
		fmt.Printf("[HOST-MAP] Bound %d host(s) on this gateway: %v (not mass CNAME; not *.vercel.app naked)\n", len(bound), bound)
	}
}

// SeedHostMapSubscriptions upserts map hosts so ROUTER-SYNC cannot stale-split them.
func SeedHostMapSubscriptions() {
	for _, e := range LoadHostMap() {
		host, origin, err := AcceptHostMapEntry(e.Host, e.Origin)
		if err != nil {
			continue
		}
		upsertLabSubscription(host, origin)
	}
}

func hostMapHasControlChars(s string) bool {
	return strings.ContainsAny(s, "\r\n\x00")
}

func isLabHostMapName(host string) bool {
	return host == labHostMapExact || strings.HasSuffix(host, labHostMapSuffix)
}

// AcceptHostMapEntry fail-closes junk Host→origin pairs (CRLF, wildcard, non-lab
// DNS, non-http). Lab tepi origin http://channel-origin:8099/{slug}/ stays valid.
func AcceptHostMapEntry(rawHost, rawOrigin string) (string, string, error) {
	if hostMapHasControlChars(rawHost) || hostMapHasControlChars(rawOrigin) {
		return "", "", fmt.Errorf("control characters are not allowed")
	}
	host := utils.ParseProtectedHost(rawHost)
	if host == "" || !isLabHostMapName(host) {
		return "", "", fmt.Errorf("host must be a nexus-lab.test name")
	}
	origin, err := normalizeHostMapOrigin(rawOrigin)
	if err != nil {
		return "", "", err
	}
	return host, origin, nil
}

func normalizeHostMapOrigin(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || strings.Contains(raw, "*") || strings.Contains(raw, "@") {
		return "", fmt.Errorf("invalid host-map origin")
	}
	normalized, err := NormalizeProxyOrigin(raw)
	if err != nil {
		return "", err
	}
	u, err := url.Parse(normalized)
	if err != nil || u.Host == "" || u.User != nil {
		return "", fmt.Errorf("invalid origin URL")
	}
	h := strings.ToLower(u.Hostname())
	if h == "" || isBlockedMetadataHost(h) {
		return "", fmt.Errorf("origin host is not allowed")
	}
	if ip := net.ParseIP(h); ip != nil {
		if ip.IsUnspecified() || ip.IsMulticast() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || isCloudMetadataIP(ip) {
			return "", fmt.Errorf("origin IP range is not allowed")
		}
		return "", fmt.Errorf("host-map origin must not be a raw IP")
	}
	if h == "channel-origin" || strings.HasSuffix(h, ".vercel.app") {
		return normalized, nil
	}
	return "", fmt.Errorf("origin must be channel-origin or *.vercel.app")
}
