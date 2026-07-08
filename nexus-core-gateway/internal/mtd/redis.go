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
	probeClient := redis.NewClient(&redis.Options{
		Addr:        redisURL,
		DialTimeout: 500 * time.Millisecond,
		ReadTimeout: 500 * time.Millisecond,
		PoolSize:    1,
	})

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

	// Redis aktif — baru buat pool koneksi penuh.
	fullClient := redis.NewClient(&redis.Options{
		Addr:         redisURL,
		Password:     "",
		DB:           0,
		PoolSize:     100,
		MinIdleConns: 5,
		DialTimeout:  300 * time.Millisecond,
		ReadTimeout:  1 * time.Second,
		WriteTimeout: 1 * time.Second,
	})

	log.Printf("[MTD-REDIS] CONNECTED to Distributed Cache: %s. Using %d connection pool.", redisURL, 100)
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
