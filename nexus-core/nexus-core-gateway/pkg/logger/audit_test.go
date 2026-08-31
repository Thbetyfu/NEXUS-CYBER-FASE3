package logger

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func waitForThreatLogCount(db *gorm.DB, want int, timeout time.Duration) (int64, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		var count int64
		if err := db.Model(&models.ThreatLog{}).Count(&count).Error; err != nil {
			return 0, err
		}
		if int(count) >= want {
			return count, nil
		}
		time.Sleep(50 * time.Millisecond)
	}
	var count int64
	if err := db.Model(&models.ThreatLog{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, fmt.Errorf("timeout waiting for %d threat logs, found %d", want, count)
}

func TestCryptographicAuditTrail(t *testing.T) {
	// Bersihkan sisa-sisa file log test lokal jika ada dari crash sebelumnya
	os.Remove("test_audit.db")
	os.Remove("nexus_traffic.log")
	os.Remove("nexus_ai_events.log")

	// 1. Inisialisasi SQLite DB via berkas temporer (karena pool koneksi GORM membutuhkan berkas fisik)
	db, err := gorm.Open(sqlite.Open("test_audit.db"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}

	// Migrate schema ThreatLog
	err = db.AutoMigrate(&models.ThreatLog{})
	if err != nil {
		t.Fatalf("Failed to auto-migrate database schema: %v", err)
	}

	// Pasang DB mock ke database global pointer
	oldDB := database.DB
	database.DB = db
	defer func() {
		database.DB = oldDB
		// Bersihkan sisa-sisa file log test lokal
		os.Remove("test_audit.db")
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	}()

	// 2. Buat Logger Baru
	l, err := NewLogger()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	defer l.Close()

	if l.lastLogHash != "NEXUS_GENESIS_ROOT" {
		t.Errorf("Expected genesis root hash to be NEXUS_GENESIS_ROOT, got %s", l.lastLogHash)
	}

	// 3. Log 3 Ancaman Berturut-turut untuk Membentuk Rantai Hash
	logTime := time.Now()
	l.LogTraffic(TelemetryLog{
		Timestamp:    logTime,
		SourceIP:     "192.168.1.1",
		Endpoint:     "/api/upload",
		Method:       "POST",
		Status:       "BLOCKED",
		ThreatDetail: "SQL_INJECTION",
		LatencyMS:    5,
	})

	l.LogTraffic(TelemetryLog{
		Timestamp:    logTime.Add(time.Second),
		SourceIP:     "192.168.1.2",
		Endpoint:     "/api/auth",
		Method:       "POST",
		Status:       "RATE_LIMITED",
		ThreatDetail: "BRUTE_FORCE",
		LatencyMS:    10,
	})

	l.LogTraffic(TelemetryLog{
		Timestamp:    logTime.Add(2 * time.Second),
		SourceIP:     "192.168.1.3",
		Endpoint:     "/api/dashboard",
		Method:       "GET",
		Status:       "ALLOWED",
		ThreatDetail: "NORMAL_ACCESS",
		LatencyMS:    2,
	})

	// Tunggu goroutine persistensi DB selesai (pre-push CI bisa lebih lambat dari 200ms)
	if _, err := waitForThreatLogCount(db, 3, 3*time.Second); err != nil {
		t.Fatalf("Async threat log persist: %v", err)
	}

	// 4. Jalankan Verifikasi Rantai - Harus VALID
	isValid, count, err := VerifyAuditChain(db)
	if err != nil {
		t.Errorf("Expected chain to be valid, got verification error: %v", err)
	}
	if !isValid {
		t.Error("Expected chain validation to pass, but it returned false")
	}
	if count != 3 {
		t.Errorf("Expected 3 threat logs in DB, found %d", count)
	}

	var persisted models.ThreatLog
	if err := db.Where("source_ip = ?", "192.168.1.1").First(&persisted).Error; err != nil {
		t.Fatalf("fetch persisted log: %v", err)
	}
	if persisted.TargetDomain != "" {
		t.Errorf("expected empty TargetDomain when LogTraffic omitted host, got %q", persisted.TargetDomain)
	}

	l.LogTraffic(TelemetryLog{
		Timestamp:    logTime.Add(3 * time.Second),
		SourceIP:     "10.0.0.9",
		Endpoint:     "/",
		Method:       "GET",
		Status:       "BLOCKED",
		ThreatDetail: "XSS",
		LatencyMS:    3,
		TargetDomain: "portfolio.nexus-lab.test:8080",
	})
	if _, err := waitForThreatLogCount(db, 4, 3*time.Second); err != nil {
		t.Fatalf("persist domain log: %v", err)
	}
	var withHost models.ThreatLog
	if err := db.Where("source_ip = ?", "10.0.0.9").First(&withHost).Error; err != nil {
		t.Fatalf("fetch host log: %v", err)
	}
	if withHost.TargetDomain != "portfolio.nexus-lab.test" {
		t.Errorf("TargetDomain=%q want portfolio.nexus-lab.test", withHost.TargetDomain)
	}

	// 5. SIMULASI ATTACK 1: Manipulasi Konten (Tampering)
	// Kita ubah data IP log kedua secara langsung di database untuk menyimulasikan modifikasi ilegal oleh hacker
	var logToTamper models.ThreatLog
	if err := db.Order("created_at asc, id asc").Offset(1).First(&logToTamper).Error; err != nil {
		t.Fatalf("Failed to fetch second log to tamper: %v", err)
	}

	originalIP := logToTamper.SourceIP
	logToTamper.SourceIP = "99.99.99.99" // Modifikasi ilegal IP asal
	if err := db.Save(&logToTamper).Error; err != nil {
		t.Fatalf("Failed to save tampered log: %v", err)
	}

	// Verifikasi ulang - Harus TIDAK VALID akibat ketidakcocokan hash
	isValidTampered, _, verifyErr := VerifyAuditChain(db)
	if isValidTampered || verifyErr == nil {
		t.Error("Expected validation to detect content tampering, but it passed successfully")
	} else {
		t.Logf("Tampering successfully detected: %v", verifyErr)
	}

	// Kembalikan IP log kedua ke semula
	logToTamper.SourceIP = originalIP
	db.Save(&logToTamper)

	// 6. SIMULASI ATTACK 2: Penghapusan Entri (Deletion)
	// Kita hapus log pertama dari database
	var logToDelete models.ThreatLog
	if err := db.Order("created_at asc, id asc").First(&logToDelete).Error; err != nil {
		t.Fatalf("Failed to fetch first log to delete: %v", err)
	}
	if err := db.Delete(&logToDelete).Error; err != nil {
		t.Fatalf("Failed to delete log: %v", err)
	}

	// Verifikasi ulang - Harus TIDAK VALID karena prev_hash dari log berikutnya terputus
	isValidDeleted, _, deleteVerifyErr := VerifyAuditChain(db)
	if isValidDeleted || deleteVerifyErr == nil {
		t.Error("Expected validation to detect log deletion, but it passed successfully")
	} else {
		t.Logf("Deletion successfully detected: %v", deleteVerifyErr)
	}
}
