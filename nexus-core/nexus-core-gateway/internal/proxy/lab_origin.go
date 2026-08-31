package proxy

import (
	"fmt"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

const defaultLabProtectedHost = "portfolio.nexus-lab.test"

// LabInstanceOrigin is the compose-mode origin (TARGET_BACKEND).
// START.bat → Vercel HTTPS; START-OFFLINE → local portfolio service.
// Inside the gateway container, leftover 127.0.0.1:3001 is not the host SOC.
func LabInstanceOrigin() string {
	backendHost := strings.TrimSpace(os.Getenv("TARGET_BACKEND_HOST"))
	if backendHost == "" {
		backendHost = "host.docker.internal"
	}
	target := strings.TrimSpace(os.Getenv("TARGET_BACKEND"))
	if target == "" {
		target = fmt.Sprintf("http://%s:3001", backendHost)
	}
	if normalized, err := NormalizeProxyOrigin(target); err == nil {
		return normalized
	}
	return target
}

// LabInstanceHosts are the Host headers that must share LabInstanceOrigin.
// Named PROTECTED_HOST and loopback (WAF :8080) must not disagree after ROUTER-SYNC.
func LabInstanceHosts() []string {
	protected := utils.ProtectedHostFromEnv()
	if protected == "" {
		protected = defaultLabProtectedHost
	}
	seen := map[string]struct{}{}
	var hosts []string
	for _, h := range []string{"localhost", "127.0.0.1", protected} {
		if h == "" {
			continue
		}
		if _, ok := seen[h]; ok {
			continue
		}
		seen[h] = struct{}{}
		hosts = append(hosts, h)
	}
	return hosts
}

// BindLabInstanceOrigin maps lab Host aliases + global "*" to the same origin.
// Call after SyncFromDatabase so a leftover Postgres row cannot split named-host vs loopback.
func BindLabInstanceOrigin(router *DynamicRouter, origin string) {
	if router == nil || origin == "" {
		return
	}
	for _, host := range LabInstanceHosts() {
		_ = router.AddRoute(host, origin)
	}
	_ = router.AddRoute("*", origin)
}

func upsertLabSubscription(domain, origin string) {
	if database.DB == nil || domain == "" || origin == "" {
		return
	}
	var sub models.DomainSubscription
	err := database.DB.Where("domain = ?", domain).First(&sub).Error
	if err != nil {
		database.DB.Create(&models.DomainSubscription{
			Domain:   domain,
			OriginIP: origin,
			IsActive: true,
			PlanType: "premium",
		})
		return
	}
	if sub.OriginIP == origin && sub.IsActive {
		return
	}
	sub.OriginIP = origin
	sub.IsActive = true
	database.DB.Save(&sub)
}
