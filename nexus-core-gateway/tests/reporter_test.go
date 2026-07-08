package tests

import (
	"os"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
)

// TestInitThreatReporter memverifikasi bahwa inisialisasi dinamis reporter ancaman
// berjalan sesuai dengan variabel lingkungan THREAT_INTEL_PROVIDER.
func TestInitThreatReporter(t *testing.T) {
	origProvider := os.Getenv("THREAT_INTEL_PROVIDER")
	origEndpoint := os.Getenv("BANK_SIEM_ENDPOINT")
	defer func() {
		os.Setenv("THREAT_INTEL_PROVIDER", origProvider)
		os.Setenv("BANK_SIEM_ENDPOINT", origEndpoint)
	}()

	t.Run("Initialize AbuseIPDB Mode", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "abuseipdb")
		os.Setenv("ABUSEIPDB_API_KEY", "test-key-123")
		database.InitThreatReporter()

		reporter, ok := database.ActiveThreatReporter.(*database.AbuseIPDBReporter)
		if !ok {
			t.Fatal("Expected ActiveThreatReporter to be of type *database.AbuseIPDBReporter")
		}
		if reporter.APIKey != "test-key-123" {
			t.Errorf("Expected APIKey to be 'test-key-123', got '%s'", reporter.APIKey)
		}
	})

	t.Run("Initialize Syslog SIEM Mode", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "syslog-siem")
		os.Setenv("BANK_SIEM_ENDPOINT", "10.0.0.1:514")
		os.Setenv("BANK_SIEM_PROTOCOL", "udp")
		database.InitThreatReporter()

		reporter, ok := database.ActiveThreatReporter.(*database.SyslogSIEMReporter)
		if !ok {
			t.Fatal("Expected ActiveThreatReporter to be of type *database.SyslogSIEMReporter")
		}
		if reporter.Endpoint != "10.0.0.1:514" {
			t.Errorf("Expected Endpoint to be '10.0.0.1:514', got '%s'", reporter.Endpoint)
		}
		if reporter.Protocol != "udp" {
			t.Errorf("Expected Protocol to be 'udp', got '%s'", reporter.Protocol)
		}
	})

	t.Run("Initialize Unknown Fallback Mode", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "invalid-provider-name")
		database.InitThreatReporter()

		_, ok := database.ActiveThreatReporter.(*database.LocalOnlyReporter)
		if !ok {
			t.Fatal("Expected ActiveThreatReporter to fall back to *database.LocalOnlyReporter")
		}
	})
}

// TestThreatReporterExecution memverifikasi bahwa pemanggilan fungsi pelaporan
// tidak menyebabkan panic/error saat memproses data.
func TestThreatReporterExecution(t *testing.T) {
	t.Run("LocalOnlyReporter Execution", func(t *testing.T) {
		reporter := &database.LocalOnlyReporter{}
		err := reporter.ReportThreat("1.1.1.1", []int{15}, "Test local log alert")
		if err != nil {
			t.Errorf("Expected no error from LocalOnlyReporter, got %v", err)
		}
	})

	t.Run("SyslogSIEMReporter Execution (Offline Target)", func(t *testing.T) {
		reporter := &database.SyslogSIEMReporter{
			Endpoint: "127.0.0.1:9999",
			Protocol: "tcp",
		}
		err := reporter.ReportThreat("8.8.8.8", []int{18}, "Brute force simulation")
		if err != nil {
			t.Errorf("Expected no error from SyslogSIEMReporter start, got %v", err)
		}
	})
}
