package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestRewardUnlockAutoban(t *testing.T) {
	// 1. Inisialisasi telemetry logger dummy (akan membuat file log lokal di folder tes)
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		tel.Close()
		// Bersihkan file log sampah hasil testing
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	}()

	// Bersihkan state in-memory sebelum menjalankan tes agar hermetik
	failedAttempts.Range(func(key, value interface{}) bool {
		failedAttempts.Delete(key)
		return true
	})
	database.LocalBlacklist.Range(func(key, value interface{}) bool {
		database.LocalBlacklist.Delete(key)
		return true
	})

	// Buat handler yang akan diuji
	handler := rewardUnlockHandler(tel)

	testIP := "192.0.2.1" // Alamat IP khusus testing (RFC 5737)
	correctPassword := "nexus-cyber-secret"

	// --- TEST CASE 1: Kirim password salah (Attempt 1-4) ---
	for attempt := 1; attempt <= 4; attempt++ {
		reqBody, _ := json.Marshal(map[string]string{"password": "salah-password"})
		req := httptest.NewRequest(http.MethodPost, "/api/unlock-reward", bytes.NewBuffer(reqBody))
		req.RemoteAddr = testIP + ":12345" // Port dinamis
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Attempt %d: Expected status 401, got %d", attempt, rr.Code)
		}
		if !strings.Contains(rr.Body.String(), "Incorrect Password") {
			t.Errorf("Attempt %d: Expected error message, got: %s", attempt, rr.Body.String())
		}
	}

	// --- TEST CASE 2: Kirim password salah ke-5 (Harus memicu Autoban) ---
	reqBody5, _ := json.Marshal(map[string]string{"password": "salah-password"})
	req5 := httptest.NewRequest(http.MethodPost, "/api/unlock-reward", bytes.NewBuffer(reqBody5))
	req5.RemoteAddr = testIP + ":12345"
	rr5 := httptest.NewRecorder()

	handler.ServeHTTP(rr5, req5)

	if rr5.Code != http.StatusForbidden {
		t.Errorf("Attempt 5: Expected status 403 (Autoban), got %d", rr5.Code)
	}
	if !strings.Contains(rr5.Body.String(), "BANNED: Too many failed attempts") {
		t.Errorf("Attempt 5: Expected banned message, got: %s", rr5.Body.String())
	}

	// Pastikan IP testIP terdaftar di LocalBlacklist
	if !database.IsIPBlacklisted(testIP) {
		t.Error("Expected IP to be blacklisted, but database.IsIPBlacklisted returned false")
	}

	// --- TEST CASE 3: Request berikutnya dari IP terban langsung ditolak di awal (403 Banned) ---
	reqBanned := httptest.NewRequest(http.MethodPost, "/api/unlock-reward", bytes.NewBuffer(reqBody5))
	reqBanned.RemoteAddr = testIP + ":54321" // Port berubah tapi IP sama
	rrBanned := httptest.NewRecorder()

	handler.ServeHTTP(rrBanned, reqBanned)

	if rrBanned.Code != http.StatusForbidden {
		t.Errorf("Subsequent blocked request: Expected status 403, got %d", rrBanned.Code)
	}
	if !strings.Contains(rrBanned.Body.String(), "Your IP is in the persistent blacklist") {
		t.Errorf("Subsequent blocked request: Expected persistent blacklist message, got: %s", rrBanned.Body.String())
	}

	// --- TEST CASE 4: Cabut ban (Unban) dan kirim password yang benar ---
	database.UnbanIP(testIP)

	// Pastikan IP sudah tidak di-ban
	if database.IsIPBlacklisted(testIP) {
		t.Error("Expected IP to be unbanned, but database.IsIPBlacklisted returned true")
	}

	reqBodyCorrect, _ := json.Marshal(map[string]string{"password": correctPassword})
	reqCorrect := httptest.NewRequest(http.MethodPost, "/api/unlock-reward", bytes.NewBuffer(reqBodyCorrect))
	reqCorrect.RemoteAddr = testIP + ":12345"
	rrCorrect := httptest.NewRecorder()

	handler.ServeHTTP(rrCorrect, reqCorrect)

	if rrCorrect.Code != http.StatusOK {
		t.Errorf("Expected status 200 for correct password, got %d. Body: %s", rrCorrect.Code, rrCorrect.Body.String())
	}
	if !strings.Contains(rrCorrect.Body.String(), "success") || !strings.Contains(rrCorrect.Body.String(), "shopee-kaget") {
		t.Errorf("Expected success response with reward link, got: %s", rrCorrect.Body.String())
	}
}
