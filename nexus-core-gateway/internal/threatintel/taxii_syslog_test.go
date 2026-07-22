package threatintel

import (
	"testing"
)

func TestSTIXAndSyslogReporting(t *testing.T) {
	t.Run("Create Valid STIX 2.1 Indicator", func(t *testing.T) {
		indicator := CreateSTIXIndicator("192.168.1.100", "sqli", 95)

		if indicator.Type != "indicator" {
			t.Errorf("Expected STIX type 'indicator', got '%s'", indicator.Type)
		}
		if indicator.Confidence != 95 {
			t.Errorf("Expected confidence 95, got %d", indicator.Confidence)
		}
		if !t.Failed() {
			t.Logf("Generated STIX ID: %s", indicator.ID)
		}
	})

	t.Run("Report STIX to Bank SIEM Syslog TLS", func(t *testing.T) {
		indicator := CreateSTIXIndicator("103.44.12.9", "xss", 90)
		config := SyslogTLSConfig{
			Endpoint:   "127.0.0.1:1514",
			UseTLS:     true,
			SkipVerify: true,
		}

		err := ReportToBankSIEM(indicator, config)
		if err != nil {
			t.Fatalf("ReportToBankSIEM returned error: %v", err)
		}
	})

	t.Run("Fetch & Inject BSSN Collective Feed", func(t *testing.T) {
		initialFeed := FetchBSSNCollectiveFeed()
		initialCount := len(initialFeed)

		InjectBSSNBlacklistIP("45.33.22.11")
		updatedFeed := FetchBSSNCollectiveFeed()

		if len(updatedFeed) != initialCount+1 {
			t.Errorf("Expected feed count %d, got %d", initialCount+1, len(updatedFeed))
		}
	})
}
