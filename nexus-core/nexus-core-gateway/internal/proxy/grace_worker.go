package proxy

import (
	"context"
	"log"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
)

// StartGracePeriodTeardownWorker meluncurkan goroutine rutin yang memeriksa langganan kadaluarsa > 7 hari.
//
// Alasan Arsitektural (Why):
// Mematuhi keputusan /grill-me Soft-Lock dengan Paywall Overlay selama 7 hari grace period.
// Setelah melewati 7 hari masa tenggang tanpa pembayaran diperbarui, kontainer tenant dihancurkan
// (`docker compose down`) dan direktori sementaranya dibersihkan demi efisiensi RAM/Disk server host.
func StartGracePeriodTeardownWorker(ctx context.Context, checkInterval time.Duration) {
	go func() {
		ticker := time.NewTicker(checkInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				processExpiredGraceSubscriptions()
			}
		}
	}()
}

func processExpiredGraceSubscriptions() {
	if database.DB == nil {
		return
	}

	graceCutoff := time.Now().AddDate(0, 0, -7) // 7 hari lalu

	var expiredSubs []models.DomainSubscription
	err := database.DB.Where("is_active = false AND updated_at < ?", graceCutoff).Find(&expiredSubs).Error
	if err != nil {
		return
	}

	for _, sub := range expiredSubs {
		if sub.Domain == "" {
			continue
		}

		log.Printf("[GRACE-TEARDOWN] Tenant %s is expired > 7 days. Destroying container...", sub.Domain)

		// Hancurkan kontainer tenant secara asinkron
		go func(domain string) {
			err := RunProvisioner("down", domain, 0)
			if err != nil {
				log.Printf("[GRACE-TEARDOWN-ERROR] Failed to destroy container for %s: %v", domain, err)
			} else {
				log.Printf("[GRACE-TEARDOWN-SUCCESS] Container destroyed for tenant %s", domain)
			}
		}(sub.Domain)
	}
}
