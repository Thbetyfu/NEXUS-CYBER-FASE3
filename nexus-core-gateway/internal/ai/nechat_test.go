package ai

import (
	"strings"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

// TestNechatClient_Fallback verifies that NechatClient returns a valid, intelligent response
// even when the local AI server (Ollama) is offline (High Availability Policy).
func TestNechatClient_Fallback(t *testing.T) {
	client := NewNechatClient()

	sampleLogs := []logger.TelemetryLog{
		{
			SourceIP:          "192.168.1.100",
			Endpoint:          "/api/login?id=1' UNION SELECT NULL--",
			Method:            "POST",
			Status:            "SQL_INJECTION_DETECTED",
			DeviceFingerprint: "Mozilla/5.0 (Windows NT 10.0)",
			LatencyMS:         2,
		},
		{
			SourceIP:          "10.0.0.5",
			Endpoint:          "/portfolio",
			Method:            "GET",
			Status:            "ALLOWED",
			DeviceFingerprint: "Mozilla/5.0 (Macintosh)",
			LatencyMS:         1,
		},
	}

	response, err := client.Chat(sampleLogs, "Bagaimana status perlindungan website saat ini?")
	if err != nil {
		t.Fatalf("Nechat Chat returned unexpected error: %v", err)
	}

	if response == "" {
		t.Fatalf("Nechat Chat returned empty response")
	}

	// Verify fallback header or content keywords
	if !strings.Contains(response, "NEXUS EXPERT ANALYST") && !strings.Contains(response, "NEXUS") {
		t.Errorf("Expected response to contain expert analyst signature, got: %s", response)
	}

	// Verify threat detection in expert fallback
	if !strings.Contains(response, "SQL Injection") && !strings.Contains(response, "Peringatan") {
		t.Errorf("Expected fallback response to highlight detected SQL Injection threat, got: %s", response)
	}

	t.Logf("[PASS] Nechat Fallback response generated successfully: %s", response[:80])
}
