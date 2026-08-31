package logger

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"gorm.io/gorm"
)

// VerifyAuditChain melakukan verifikasi rantai kriptografi pada tabel `threat_logs`.
// Membaca seluruh data log secara kronologis (dari log tertua ke terbaru), menghitung ulang
// signature SHA-256 tiap baris, dan mencocokkan nilainya dengan PrevHash dari log berikutnya.
func VerifyAuditChain(db *gorm.DB) (bool, int, error) {
	if db == nil {
		return false, 0, fmt.Errorf("database connection is unavailable")
	}

	var logs []models.ThreatLog
	// Ambil semua log diurutkan secara kronologis (terlama ke terbaru)
	err := db.Order("created_at asc, id asc").Find(&logs).Error
	if err != nil {
		return false, 0, fmt.Errorf("failed to fetch threat logs: %v", err)
	}

	if len(logs) == 0 {
		return true, 0, nil
	}

	lastHash := "NEXUS_GENESIS_ROOT"
	for idx, log := range logs {
		// 1. Verifikasi PrevHash harus sesuai dengan hash log sebelumnya
		if log.PrevHash != lastHash {
			return false, idx, fmt.Errorf("cryptographic chain broken at log index %d (ID: %s): expected prev_hash '%s', got '%s'",
				idx, log.ID, lastHash, log.PrevHash)
		}

		// 2. Hitung ulang hash untuk log ini
		timeStr := log.CreatedAt.UTC().Format(time.RFC3339)
		h := sha256.New()
		h.Write([]byte(fmt.Sprintf("%s|%s|%s|%s|%s|%s|%d|%s", 
			log.PrevHash, log.SourceIP, log.Endpoint, log.Method, log.Status, log.ThreatType, int64(log.LatencyMs), timeStr)))
		computedHash := fmt.Sprintf("%x", h.Sum(nil))

		// 3. Verifikasi apakah hash yang disimpan di DB cocok dengan hash hasil perhitungan ulang
		if log.Hash != computedHash {
			return false, idx, fmt.Errorf("integrity violation at log index %d (ID: %s): saved hash '%s' does not match computed hash '%s' (content modified)",
				idx, log.ID, log.Hash, computedHash)
		}

		// Update hash terakhir untuk elemen berikutnya
		lastHash = log.Hash
	}

	return true, len(logs), nil
}
