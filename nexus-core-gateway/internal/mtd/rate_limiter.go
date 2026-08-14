// Package mtd (Moving Target Defense) menyediakan modul manajemen trafik dan pembatasan laju paket (rate limiting).
package mtd

import (
	"context"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

// ipBucket mendefinisikan status token bucket individu untuk setiap IP sumber.
type ipBucket struct {
	tokens     float64
	lastRefill time.Time
}

// PerIPTokenBucket mengimplementasikan pembatasan laju paket per alamat IP sumber (Per-IP Rate Limiting)
// dengan algoritma Token Bucket.
//
// Alasan Arsitektural (Why):
// Algoritma Token Bucket dipilih karena memungkinkan lonjakan trafik wajar (bursts) hingga batas `capacity`,
// namun tetap membatasi laju rata-rata berkelanjutan (`refillRate`). Ini ideal untuk mengizinkan pemuatan
// aset web dinamis (seperti CSS/JS gambar) sekaligus memblokir serangan brute-force atau DDoS volumetrik.
type PerIPTokenBucket struct {
	mu              sync.Mutex
	buckets         map[string]*ipBucket
	capacity        float64
	refillRate      float64
	cleanupInterval time.Duration // Interval pembersihan entri IP yang tidak aktif (janitor)
	OnRateLimit     func(r *http.Request)
}

// NewPerIPTokenBucket mengkonstruksi pembatas laju paket per IP baru.
// Menjalankan goroutine janitor latar belakang untuk manajemen siklus hidup memori.
func NewPerIPTokenBucket(capacity, refillRate float64) *PerIPTokenBucket {
	tb := &PerIPTokenBucket{
		buckets:         make(map[string]*ipBucket),
		capacity:        capacity,
		refillRate:      refillRate,
		cleanupInterval: 5 * time.Minute,
	}
	go tb.janitor()
	return tb
}

// getRealIP identifies the client for per-IP rate limiting.
func getRealIP(r *http.Request) string {
	return utils.ClientIP(r)
}

// Allow mengevaluasi apakah IP sumber tertentu masih memiliki token yang cukup untuk meneruskan request.
// Menggunakan Redis terdistribusi jika aktif, dengan fallback otomatis ke memori lokal jika luring.
func (tb *PerIPTokenBucket) Allow(sourceIP string) bool {
	// Normalisasi IP: Bersihkan nomor port (misal "127.0.0.1:48281" -> "127.0.0.1")
	ip, _, err := net.SplitHostPort(sourceIP)
	if err != nil {
		ip = sourceIP
	}

	if MtdRedis != nil && MtdRedis.Enabled {
		return tb.allowRedis(ip)
	}
	return tb.allowLocal(ip)
}

// allowRedis mengimplementasikan Token Bucket terdistribusi menggunakan skrip Lua atomik di Redis.
//
// Alasan Arsitektural (Why):
// Dalam arsitektur multi-node (kluster gateway terdistribusi), rate limiting lokal tidak cukup karena peretas
// dapat membagi beban serangan ke node gateway yang berbeda. Skrip Lua dieksekusi secara atomik di server Redis,
// menghindari masalah kondisi balapan data (race condition) tanpa memerlukan mekanisme locking distributed yang rumit.
func (tb *PerIPTokenBucket) allowRedis(ip string) bool {
	ctx := context.Background()
	script := `
		local key = KEYS[1]
		local capacity = tonumber(ARGV[1])
		local rate = tonumber(ARGV[2])
		local now = tonumber(ARGV[3])
		local requested = 1

		local info = redis.call('HMGET', key, 'tokens', 'last_refill')
		local tokens = tonumber(info[1])
		local last_refill = tonumber(info[2])

		if not tokens then
			tokens = capacity
			last_refill = now
		end

		local elapsed = now - last_refill
		tokens = math.min(capacity, tokens + elapsed * rate)

		if tokens >= requested then
			tokens = tokens - requested
			redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
			redis.call('EXPIRE', key, math.ceil(capacity/rate) + 10)
			return 1
		end
		
		redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
		redis.call('EXPIRE', key, math.ceil(capacity/rate) + 10)
		return 0
	`
	now := float64(time.Now().UnixNano()) / 1e9 // Konversi waktu nanosecond ke hitungan detik (float)
	res, err := MtdRedis.Client.Eval(ctx, script, []string{"tb:" + ip}, tb.capacity, tb.refillRate, now).Result()
	if err != nil {
		log.Printf("[MTD-REDIS] Eval Error: %v. Falling back to memory.", err)
		return tb.allowLocal(ip)
	}
	return res.(int64) == 1
}

// allowLocal mengimplementasikan Token Bucket berbasis memori lokal (In-Memory Fallback).
//
// Alasan Arsitektural (Why):
// Menyediakan mekanisme failover yang tangguh. Jika server Redis mengalami gangguan atau kehabisan memori,
// sistem secara asinkron berpindah ke penyimpanan RAM lokal terisolasi agar kelancaran sistem (availability)
// tidak terpengaruh sedikit pun (ISO 25010 - Fault Tolerance).
func (tb *PerIPTokenBucket) allowLocal(ip string) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	b, exists := tb.buckets[ip]
	if !exists {
		b = &ipBucket{tokens: tb.capacity, lastRefill: now}
		tb.buckets[ip] = b
	}

	// Refill (pengisian ulang) token berdasarkan akumulasi waktu yang telah lewat sejak request terakhir.
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.lastRefill = now
	b.tokens += elapsed * tb.refillRate
	if b.tokens > tb.capacity {
		b.tokens = tb.capacity
	}

	// Jika jumlah token >= 1.0, kurangi 1 token dan izinkan request (PASS).
	if b.tokens >= 1.0 {
		b.tokens--
		return true
	}
	return false
}

// HTTPMiddleware membungkus handler HTTP dengan logika pembatasan laju paket per IP klien.
// Mengembalikan status HTTP 429 Too Many Requests disertai header Retry-After jika batas tercapai.
func (tb *PerIPTokenBucket) HTTPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// [BYPASS STATIC ASSETS]
		// Pemuatan aset statis Next.js (seperti JS chunks, CSS, font, favicon) dibebaskan dari rate limiter
		// agar inisialisasi React client-side di dasbor SOC tidak terblokir saat request paralel bersamaan.
		if strings.HasPrefix(r.URL.Path, "/_next/") ||
			strings.HasPrefix(r.URL.Path, "/static/") ||
			strings.HasPrefix(r.URL.Path, "/favicon.ico") ||
			strings.HasSuffix(r.URL.Path, ".js") ||
			strings.HasSuffix(r.URL.Path, ".css") ||
			strings.HasSuffix(r.URL.Path, ".woff2") {
			next.ServeHTTP(w, r)
			return
		}

		realIP := getRealIP(r)
		if !tb.Allow(realIP) {
			log.Printf("[MTD-RATELIMIT] IP THROTTLED (Redis Integration Active): %s (real) / %s (remote) — >%.0f req/s",
				realIP, r.RemoteAddr, tb.refillRate)
			if tb.OnRateLimit != nil {
				tb.OnRateLimit(r)
			}
			w.Header().Set("Retry-After", "1")
			http.Error(w,
				`{"error":"rate_limit_exceeded","message":"Too many requests from your IP","retry_after":"1s"}`,
				http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// janitor bertugas membersihkan memori dari entri IP yang sudah tidak aktif secara berkala.
//
// Alasan Arsitektural (Why):
// Tanpa janitor, jika server diserang oleh jutaan IP unik sekali pakai (seperti serangan botnet DDoS),
// peta `buckets` di RAM lokal akan membengkak tiada henti hingga server mengalami crash kehabisan memori (OOM).
// Janitor secara berkala menghapus IP yang tidak aktif lebih lama dari cleanupInterval untuk proteksi kebocoran memori.
func (tb *PerIPTokenBucket) janitor() {
	ticker := time.NewTicker(tb.cleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		cutoff := time.Now().Add(-tb.cleanupInterval)
		tb.mu.Lock()
		for ip, b := range tb.buckets {
			if b.lastRefill.Before(cutoff) {
				delete(tb.buckets, ip)
			}
		}
		tb.mu.Unlock()
	}
}

// TokenBucket dipertahankan demi kompatibilitas kode lawas dengan main.go.
type TokenBucket = PerIPTokenBucket

// NewTokenBucket dipertahankan demi kompatibilitas API pemanggilan awal di main.go.
func NewTokenBucket(capacity, refillRate float64) *PerIPTokenBucket {
	return NewPerIPTokenBucket(capacity, refillRate)
}
