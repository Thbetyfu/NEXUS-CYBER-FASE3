package database

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"gorm.io/gorm"
)

func wipeLocalBlacklist() {
	LocalBlacklist.Range(func(key, _ interface{}) bool {
		LocalBlacklist.Delete(key)
		return true
	})
}

func setupBlacklistTestDB(t *testing.T) {
	t.Helper()
	prev := DB
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.IntelBlacklist{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	DB = db
	wipeLocalBlacklist()
	t.Cleanup(func() {
		DB = prev
		wipeLocalBlacklist()
	})
}

func TestBanSurvivesRestartViaDBWhenRAMEmpty(t *testing.T) {
	setupBlacklistTestDB(t)
	ip := "10.66.66.11"
	BanIP(ip, "lab sql fallback after restart", 24*time.Hour)
	wipeLocalBlacklist()
	if !IsIPBlacklisted(ip) {
		t.Fatal("DB must still ban after RAM wipe")
	}
	if !IsIPBlacklisted(ip + ":54321") {
		t.Fatal("host:port RemoteAddr must still match stored ban")
	}
}

func TestBanSurvivesRestartViaHydrateRAM(t *testing.T) {
	setupBlacklistTestDB(t)
	ip := "10.66.66.10"
	BanIP(ip, "lab hydrate after restart", 24*time.Hour)
	wipeLocalBlacklist()
	HydrateActiveBlacklist()

	saved := DB
	DB = nil
	defer func() { DB = saved }()

	if !IsIPBlacklisted(ip) {
		t.Fatal("hydrated RAM must hold ban without live DB")
	}
}

func TestPermanentBanSurvivesRestart(t *testing.T) {
	setupBlacklistTestDB(t)
	ip := "10.66.66.12"
	BanIP(ip, "manual permanent", 0)
	wipeLocalBlacklist()
	HydrateActiveBlacklist()
	if !IsIPBlacklisted(ip) {
		t.Fatal("permanent ban (expires_at NULL) must survive restart")
	}
}

func TestExpiredBanDoesNotReturnAfterRestart(t *testing.T) {
	setupBlacklistTestDB(t)
	ip := "10.66.66.13"
	past := time.Now().Add(-time.Hour)
	row := models.IntelBlacklist{
		IPAddress: ip,
		Reason:    "expired",
		ExpiresAt: &past,
		IsActive:  true,
	}
	if err := DB.Create(&row).Error; err != nil {
		t.Fatalf("insert: %v", err)
	}
	HydrateActiveBlacklist()
	if IsIPBlacklisted(ip) {
		t.Fatal("expired ban must not hydrate or match")
	}
}

func TestUnbanSurvivesRestart(t *testing.T) {
	setupBlacklistTestDB(t)
	ip := "10.66.66.14"
	BanIP(ip, "then unban", 24*time.Hour)
	UnbanIP(ip)
	wipeLocalBlacklist()
	HydrateActiveBlacklist()
	if IsIPBlacklisted(ip) {
		t.Fatal("inactive ban must not return after restart")
	}
}
