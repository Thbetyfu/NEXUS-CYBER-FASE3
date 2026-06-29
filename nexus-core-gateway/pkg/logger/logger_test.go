package logger

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestEnrichLog_DeviceFingerprint(t *testing.T) {
	l, err := NewLogger()
	if err != nil {
		t.Fatalf("Failed to create logger: %v", err)
	}
	defer l.Close()

	// 1. Uji tanpa header kustom fingerprint
	reqNormal := httptest.NewRequest("GET", "/test-endpoint", nil)
	reqNormal.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	
	logNormal := &TelemetryLog{
		Timestamp: time.Now(),
		SourceIP:  "192.168.1.100",
	}

	l.EnrichLog(logNormal, reqNormal)

	if !strings.HasPrefix(logNormal.AttackerID, "APT-ID-") {
		t.Errorf("Expected AttackerID to start with APT-ID-, got %s", logNormal.AttackerID)
	}
	if strings.Contains(logNormal.DeviceFingerprint, "FP-") {
		t.Errorf("Expected DeviceFingerprint to not contain FP-, got %s", logNormal.DeviceFingerprint)
	}

	// 2. Uji dengan header kustom fingerprint (X-Device-Fingerprint)
	reqFP := httptest.NewRequest("POST", "/api/unlock-reward", nil)
	reqFP.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	reqFP.Header.Set("X-Device-Fingerprint", "FP-8F8D9A81B8")

	logFP := &TelemetryLog{
		Timestamp: time.Now(),
		SourceIP:  "192.168.1.100",
	}

	l.EnrichLog(logFP, reqFP)

	expectedPrefix := "APT-FP-8F8D9A81B8-"
	if !strings.HasPrefix(logFP.AttackerID, expectedPrefix) {
		t.Errorf("Expected AttackerID to start with %s, got %s", expectedPrefix, logFP.AttackerID)
	}

	if !strings.Contains(logFP.DeviceFingerprint, "[FP-8F8D9A81B8]") {
		t.Errorf("Expected DeviceFingerprint to contain fingerprint info, got %s", logFP.DeviceFingerprint)
	}
}
