package tests

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
)

// TestInitThreatReporter memverifikasi bahwa inisialisasi dinamis reporter ancaman
// berjalan sesuai dengan variabel lingkungan THREAT_INTEL_PROVIDER.
func TestInitThreatReporter(t *testing.T) {
	origProvider := os.Getenv("THREAT_INTEL_PROVIDER")
	origEndpoint := os.Getenv("BANK_SIEM_ENDPOINT")
	origToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	origChat := os.Getenv("TELEGRAM_CHAT_ID")
	defer func() {
		os.Setenv("THREAT_INTEL_PROVIDER", origProvider)
		os.Setenv("BANK_SIEM_ENDPOINT", origEndpoint)
		os.Setenv("TELEGRAM_BOT_TOKEN", origToken)
		os.Setenv("TELEGRAM_CHAT_ID", origChat)
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

	t.Run("Initialize Telegram Bot Mode", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "telegram")
		os.Setenv("TELEGRAM_BOT_TOKEN", "test-token-123")
		os.Setenv("TELEGRAM_CHAT_ID", "test-chat-456")
		database.InitThreatReporter()

		reporter, ok := database.ActiveThreatReporter.(*database.TelegramBotReporter)
		if !ok {
			t.Fatal("Expected ActiveThreatReporter to be of type *database.TelegramBotReporter")
		}
		if reporter.BotToken != "test-token-123" {
			t.Errorf("Expected BotToken to be 'test-token-123', got '%s'", reporter.BotToken)
		}
		if reporter.ChatID != "test-chat-456" {
			t.Errorf("Expected ChatID to be 'test-chat-456', got '%s'", reporter.ChatID)
		}
	})

	t.Run("Empty provider with Telegram credentials uses pager", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "")
		os.Setenv("TELEGRAM_BOT_TOKEN", "lab-token")
		os.Setenv("TELEGRAM_CHAT_ID", "lab-chat")
		database.InitThreatReporter()

		reporter, ok := database.ActiveThreatReporter.(*database.TelegramBotReporter)
		if !ok {
			t.Fatal("Expected Telegram pager when token and chat id are set")
		}
		if reporter.BotToken != "lab-token" || reporter.ChatID != "lab-chat" {
			t.Errorf("unexpected telegram credentials: %+v", reporter)
		}
	})

	t.Run("Initialize Unknown Fallback Mode", func(t *testing.T) {
		os.Setenv("THREAT_INTEL_PROVIDER", "invalid-provider-name")
		os.Unsetenv("TELEGRAM_BOT_TOKEN")
		os.Unsetenv("TELEGRAM_CHAT_ID")
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

	t.Run("TelegramBotReporter Execution (Mock Multi-Tenant Domain Alert)", func(t *testing.T) {
		reporter := &database.TelegramBotReporter{
			BotToken: "mock-bot-token",
			ChatID:   "mock-chat-id",
		}
		err := reporter.ReportThreatForDomain("tokosaya.com", "1.2.3.4", []int{18}, "Test Multi-Tenant Alert")
		if err != nil {
			t.Errorf("Expected no error from ReportThreatForDomain dispatch, got %v", err)
		}
	})
}

func TestFormatTelegramAlertHonesty(t *testing.T) {
	now := time.Date(2026, 8, 17, 2, 0, 0, 0, time.UTC)
	lab := database.FormatTelegramAlert("192.168.137.66:4444", "", "vault brute", []int{18, 15}, "Indonesia", "Jakarta", "Telkom", -6.2, 106.8, now)
	if !strings.Contains(lab, "192.168.137.66") {
		t.Fatal("lab pager must show the visible lab IP")
	}
	if strings.Contains(lab, "google.com/maps") {
		t.Fatal("lab RFC1918 must not get a world Maps pin")
	}
	if !strings.Contains(lab, "privat/lab") {
		t.Fatal("lab pager must label private IPs")
	}
	if strings.Contains(lab, "GPS 95") || strings.Contains(lab, "Zero COGS") {
		t.Fatal("pager copy must stay honest")
	}

	pub := database.FormatTelegramAlert("8.8.8.8", "example.com", "blocked", []int{15}, "United States", "Mountain View", "Google", 37.4, -122.0, now)
	if !strings.Contains(pub, "GeoIP") || !strings.Contains(pub, "bukan GPS") {
		t.Fatal("public IP pager must label GeoIP as not GPS")
	}
	if !strings.Contains(pub, "google.com/maps") {
		t.Fatal("public GeoIP may include a maps URL")
	}

	if database.CleanReporterIP("[2001:db8::1]:443") != "2001:db8::1" {
		t.Fatal("IPv6 host:port must not be truncated at the first colon")
	}
}
