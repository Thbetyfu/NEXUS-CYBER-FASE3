package proxy

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
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
		host := utils.ParseProtectedHost(e.Host)
		if host == "" {
			continue
		}
		origin := strings.TrimSpace(e.Origin)
		if origin == "" {
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
		host := utils.ParseProtectedHost(e.Host)
		origin := strings.TrimSpace(e.Origin)
		if host == "" || origin == "" {
			continue
		}
		if normalized, err := NormalizeProxyOrigin(origin); err == nil {
			origin = normalized
		}
		upsertLabSubscription(host, origin)
	}
}
