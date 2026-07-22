// Package proxy mengimplementasikan gateway proxy reverse otonom dengan kecerdasan MTD.
package proxy

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
)

// RouteEntry menyimpan data alamat target backend beserta masa kadaluarsanya di memori lokal.
type RouteEntry struct {
	TargetURL string
	ExpiresAt time.Time
}

// DynamicRouter mengelola pemetaan domain (host) ke backend secara dinamis berbasis Redis + Cache Memori Lokal.
//
// Alasan Arsitektural (Why):
// Modul ini mematuhi standar ISO 25010 (Time Behavior & Resource Utilization).
// Melakukan query ke Redis terdistribusi untuk setiap HTTP request yang masuk akan membebani I/O jaringan
// dan meningkatkan latensi gerbang secara signifikan. Router ini menerapkan arsitektur caching dua tingkat:
// - Tier 1: RAM lokal (In-Memory Cache) berlatency sub-mikrodetik menggunakan RWMutex.
// - Tier 2: Penyimpanan terdistribusi Redis Hash untuk sinkronisasi antar-node gateway.
type DynamicRouter struct {
	cache map[string]RouteEntry
	mu    sync.RWMutex // Lock baca/tulis yang dioptimalkan untuk performa tinggi pada konkurensi tinggi
	ttl   time.Duration // Durasi hidup cache memori lokal sebelum divalidasi ulang ke Redis
}

// NewDynamicRouter membuat instansi router dinamis baru dengan TTL cache lokal tertentu.
func NewDynamicRouter(cacheTTL time.Duration) *DynamicRouter {
	return &DynamicRouter{
		cache: make(map[string]RouteEntry),
		ttl:   cacheTTL,
	}
}

// Lookup menemukan URL target backend berdasarkan nama domain (host), dengan dukungan wildcard fallback (misal *.domain.com atau *).
//
// Alasan Teknis (Why):
// 1. Menguji cache memori lokal dengan Read-Lock (`RLock`) terlebih dahulu.
//    Read-Lock memungkinkan ratusan goroutine membaca cache secara simultan tanpa saling memblokir (high concurrency).
// 2. Jika kadaluarsa atau tidak ditemukan, sistem melakukan fallback ke Redis dengan batas waktu ketat (`500ms timeout`).
// 3. Jika pencocokan tepat gagal, dilakukan pencarian rekursif wildcard (misal `*.example.com`) untuk mendukung Shared WAF.
// 4. Jika tetap tidak ditemukan, pencarian diarahkan ke global wildcard (`*`) sebagai gerbang fallback universal.
func (dr *DynamicRouter) Lookup(host string) (string, bool) {
	// 1. Periksa Pencocokan Tepat di Cache RAM Lokal (Tier 1)
	dr.mu.RLock()
	entry, exists := dr.cache[host]
	dr.mu.RUnlock()

	// [SAAS RESILIENCY FALLBACK]
	if exists && (time.Now().Before(entry.ExpiresAt) || mtd.MtdRedis == nil || !mtd.MtdRedis.Enabled) {
		return entry.TargetURL, true
	}

	// 2. Fallback Pencocokan Tepat ke Redis (Tier 2)
	if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()

		target, err := mtd.MtdRedis.Client.HGet(ctx, "nexus:routes", host).Result()
		if err == nil && target != "" {
			dr.updateLocalCache(host, target)
			return target, true
		}
	}

	// Fallback ke cache RAM lokal jika Redis tidak memiliki entri terdaftar
	if exists {
		return entry.TargetURL, true
	}

	// 2b. Fallback Pencocokan Tepat ke PostgreSQL Database jika tidak ada di Redis (Tier 3)
	if database.DB != nil {
		var sub models.DomainSubscription
		err := database.DB.Where("domain = ? AND is_active = true", host).First(&sub).Error
		if err == nil && sub.OriginIP != "" {
			// Sinkronkan rute kembali ke Redis & Cache Lokal untuk mempercepat request selanjutnya
			_ = dr.AddRoute(host, sub.OriginIP)
			return sub.OriginIP, true
		}
	}

	// 3. Pencocokan Wildcard Fallback (e.g., *.domain.com) jika pencocokan tepat gagal
	parts := strings.Split(host, ".")
	for i := 0; i < len(parts)-1; i++ {
		wildcardHost := "*." + strings.Join(parts[i+1:], ".")
		
		// Cek di Cache RAM Lokal
		dr.mu.RLock()
		wEntry, wExists := dr.cache[wildcardHost]
		dr.mu.RUnlock()
		if wExists && (time.Now().Before(wEntry.ExpiresAt) || mtd.MtdRedis == nil || !mtd.MtdRedis.Enabled) {
			return wEntry.TargetURL, true
		}

		// Cek di Redis
		if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
			ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
			defer cancel()
			target, err := mtd.MtdRedis.Client.HGet(ctx, "nexus:routes", wildcardHost).Result()
			if err == nil && target != "" {
				dr.updateLocalCache(wildcardHost, target)
				return target, true
			}
		}
	}

	// 4. Pencocokan Global Fallback (e.g., "*") untuk Shared WAF universal
	dr.mu.RLock()
	gEntry, gExists := dr.cache["*"]
	dr.mu.RUnlock()
	if gExists && (time.Now().Before(gEntry.ExpiresAt) || mtd.MtdRedis == nil || !mtd.MtdRedis.Enabled) {
		return gEntry.TargetURL, true
	}

	if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
		defer cancel()
		target, err := mtd.MtdRedis.Client.HGet(ctx, "nexus:routes", "*").Result()
		if err == nil && target != "" {
			dr.updateLocalCache("*", target)
			return target, true
		}
	}

	return "", false
}

// updateLocalCache memperbarui entri cache RAM lokal secara thread-safe menggunakan Write-Lock.
func (dr *DynamicRouter) updateLocalCache(host, target string) {
	dr.mu.Lock()
	dr.cache[host] = RouteEntry{
		TargetURL: target,
		ExpiresAt: time.Now().Add(dr.ttl),
	}
	dr.mu.Unlock()
}

// AddRoute mendaftarkan pemetaan rute baru secara instan di memori lokal dan menyinkronkannya ke Redis.
//
// Alasan Teknis (Why):
// Menggunakan Write-Lock (`Lock`) eksklusif untuk menghindari kondisi balapan data (race condition)
// sewaktu memperbarui map cache memori. Sinkronisasi ke Redis dilakukan menggunakan batasan timeout 2 detik.
func (dr *DynamicRouter) AddRoute(host, target string) error {
	// 1. Perbarui Cache Memori Lokal (Penyediaan instan untuk request lokal)
	dr.mu.Lock()
	dr.cache[host] = RouteEntry{
		TargetURL: target,
		ExpiresAt: time.Now().Add(dr.ttl),
	}
	dr.mu.Unlock()

	// 2. Sinkronisasi Global ke Redis (Persistensi kluster)
	if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := mtd.MtdRedis.Client.HSet(ctx, "nexus:routes", host, target).Err()
		if err != nil {
			return err
		}
	}

	log.Printf("[ROUTER] Mapping established: %s -> %s", host, target)
	return nil
}

// GetAllRoutes menarik seluruh data pemetaan rute yang aktif dari Redis terdistribusi.
func (dr *DynamicRouter) GetAllRoutes() (map[string]string, error) {
	if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		return mtd.MtdRedis.Client.HGetAll(ctx, "nexus:routes").Result()
	}
	return nil, nil
}

// RemoveRoute menghapus pemetaan rute secara instan dari memori lokal dan Redis terdistribusi.
func (dr *DynamicRouter) RemoveRoute(host string) error {
	// 1. Hapus dari Cache Memori Lokal
	dr.mu.Lock()
	delete(dr.cache, host)
	dr.mu.Unlock()

	// 2. Hapus secara Global dari Redis
	if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := mtd.MtdRedis.Client.HDel(ctx, "nexus:routes", host).Err()
		if err != nil {
			return err
		}
	}

	log.Printf("[ROUTER] Mapping removed: %s", host)
	return nil
}

// SyncFromDatabase menyelaraskan seluruh rute aktif dari PostgreSQL ke Redis dan Cache Lokal pada saat startup.
func (dr *DynamicRouter) SyncFromDatabase() error {
	if database.DB == nil {
		return nil
	}

	var subscriptions []models.DomainSubscription
	err := database.DB.Where("is_active = true").Find(&subscriptions).Error
	if err != nil {
		return err
	}

	for _, sub := range subscriptions {
		if sub.Domain != "" && sub.OriginIP != "" {
			err = dr.AddRoute(sub.Domain, sub.OriginIP)
			if err != nil {
				log.Printf("[ROUTER-SYNC-WARN] Gagal sinkronisasi rute %s ke Redis: %v", sub.Domain, err)
			}
		}
	}

	log.Printf("[ROUTER-SYNC] Berhasil sinkronisasi %d rute aktif dari PostgreSQL ke Redis/Cache.", len(subscriptions))
	return nil
}
