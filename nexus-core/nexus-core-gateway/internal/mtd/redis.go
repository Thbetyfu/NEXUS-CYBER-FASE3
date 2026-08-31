package mtd

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClientWrapper encapsulates the connection to Redis.
// Implements connection pooling automatically via go-redis.
type RedisClientWrapper struct {
	Client  *redis.Client
	Enabled bool
}

// NewRedisClient creates a new Redis connection pool with fallback.
// ISO-25010 Reliability: If Redis is offline, it falls back to local memory without crashing.
func NewRedisClient() *RedisClientWrapper {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	// Lakukan probe cepat tanpa membuat pool dulu, agar tidak ada goroutine
	// reconnect yang menggantung di latar belakang saat Redis memang tidak aktif.
	// Coba parse sebagai URL penuh (misalnya redis://user:pass@host:port)
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		// Fallback jika berupa format host:port biasa
		opt = &redis.Options{
			Addr: redisURL,
		}
	}

	opt.DialTimeout = 500 * time.Millisecond
	opt.ReadTimeout = 500 * time.Millisecond
	opt.PoolSize = 1

	probeClient := redis.NewClient(opt)

	var pingErr error
	for i := 1; i <= 5; i++ {
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
		_, pingErr = probeClient.Ping(ctx).Result()
		cancel()
		if pingErr == nil {
			break
		}
		log.Printf("[MTD-REDIS] Startup check: Redis not ready yet. Retrying in 1s... (Attempt %d/5)", i)
		time.Sleep(1 * time.Second)
	}

	// Tutup probe client di semua kondisi agar tidak ada goroutine menggantung.
	_ = probeClient.Close()

	if pingErr != nil {
		log.Printf("[MTD-REDIS] Bypassed distributed cache (Redis is offline). Falling back to local memory.")
		return &RedisClientWrapper{Enabled: false}
	}

	// Redis aktif — buat pool koneksi penuh dengan opsi yang di-parse.
	fullOpt, err := redis.ParseURL(redisURL)
	if err != nil {
		fullOpt = &redis.Options{
			Addr: redisURL,
		}
	}
	fullOpt.PoolSize = 100
	fullOpt.MinIdleConns = 5
	fullOpt.DialTimeout = 300 * time.Millisecond
	fullOpt.ReadTimeout = 1 * time.Second
	fullOpt.WriteTimeout = 1 * time.Second

	fullClient := redis.NewClient(fullOpt)

	log.Printf("[MTD-REDIS] CONNECTED to Distributed Cache: %s. Using 100 connection pool.", redisURL)
	return &RedisClientWrapper{
		Client:  fullClient,
		Enabled: true,
	}
}

// Global reference for other parts of MTD
var MtdRedis *RedisClientWrapper

func InitRedis() {
	MtdRedis = NewRedisClient()
}
