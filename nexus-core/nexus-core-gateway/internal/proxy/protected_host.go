package proxy

import (
	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

// RegisterProtectedHost maps PROTECTED_HOST → origin so Caddy on-demand TLS
// (ask /api/license/validate-domain) can mint a cert for that one name only.
// The global "*" route still proxies IP/hotspot Host headers; it does not
// authorize TLS for arbitrary SNI.
func RegisterProtectedHost(router *DynamicRouter, target string) {
	if router == nil || target == "" {
		return
	}
	host := utils.ProtectedHostFromEnv()
	if host == "" {
		return
	}
	_ = router.AddRoute(host, target)
}
