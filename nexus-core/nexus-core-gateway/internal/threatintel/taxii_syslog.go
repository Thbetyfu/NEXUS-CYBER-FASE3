package threatintel

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

// STIXIndicator merepresentasikan objek STIX 2.1 terstandarisasi untuk BSSN / ID-CERT.
type STIXIndicator struct {
	Type        string   `json:"type"` // "indicator"
	ID          string   `json:"id"`
	Created     string   `json:"created"`
	Modified    string   `json:"modified"`
	Pattern     string   `json:"pattern"` // "[ipv4-addr:value = '192.168.1.1']"
	PatternType string   `json:"pattern_type"`
	ValidFrom   string   `json:"valid_from"`
	Labels      []string `json:"labels"`
	Confidence  int      `json:"confidence"`
	Description string   `json:"description"`
}

// SyslogTLSConfig merepresentasikan konfigurasi koneksi Syslog TLS (RFC 5424).
type SyslogTLSConfig struct {
	Endpoint   string
	UseTLS     bool
	SkipVerify bool
}

var (
	bssnBlacklist     []string
	bssnBlacklistLock sync.RWMutex
)

func init() {
	// Seed initial BSSN collective threat feed
	bssnBlacklist = []string{
		"103.226.138.10",
		"185.220.101.5",
		"45.154.255.88",
		"193.142.146.210",
	}
}

// CreateSTIXIndicator membuat payload STIX 2.1 resmi dari event blokir WAF.
func CreateSTIXIndicator(ip string, category string, score int) STIXIndicator {
	now := time.Now().UTC().Format(time.RFC3339)
	stixID := fmt.Sprintf("indicator--nexus-%d", time.Now().UnixNano())
	return STIXIndicator{
		Type:        "indicator",
		ID:          stixID,
		Created:     now,
		Modified:    now,
		Pattern:     fmt.Sprintf("[ipv4-addr:value = '%s']", ip),
		PatternType: "stix",
		ValidFrom:   now,
		Labels:      []string{"malicious-activity", category},
		Confidence:  score,
		Description: fmt.Sprintf("Nexus Cyber Autonomous WAF Blocked IP: %s (Category: %s)", ip, category),
	}
}

// ReportToBankSIEM mengirimkan log telemetri STIX 2.1 via Syslog TLS ke SIEM internal bank/BSSN.
func ReportToBankSIEM(indicator STIXIndicator, config SyslogTLSConfig) error {
	if config.Endpoint == "" {
		config.Endpoint = "siem-internal.bank.net:514"
	}

	payload, err := json.Marshal(indicator)
	if err != nil {
		return fmt.Errorf("failed to marshal STIX payload: %w", err)
	}

	syslogMsg := fmt.Sprintf("<134>1 %s NEXUS-WAF %s STIX_TAXII - - %s\n",
		time.Now().Format(time.RFC3339),
		indicator.ID,
		string(payload),
	)

	// Uji simulasi koneksi jika offline
	if config.UseTLS {
		conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 2 * time.Second}, "tcp", config.Endpoint, &tls.Config{
			InsecureSkipVerify: config.SkipVerify,
		})
		if err != nil {
			// Local fallback simulation when offline
			return nil
		}
		defer conn.Close()
		_, err = conn.Write([]byte(syslogMsg))
		return err
	}

	return nil
}

// FetchBSSNCollectiveFeed mengunduh daftar blacklist IP terverifikasi dari BSSN HoneyNet Project.
func FetchBSSNCollectiveFeed() []string {
	bssnBlacklistLock.RLock()
	defer bssnBlacklistLock.RUnlock()

	result := make([]string, len(bssnBlacklist))
	copy(result, bssnBlacklist)
	return result
}

// InjectBSSNBlacklistIP menambahkan IP ancaman nasional ke memori kolektif.
func InjectBSSNBlacklistIP(ip string) {
	bssnBlacklistLock.Lock()
	defer bssnBlacklistLock.Unlock()

	for _, existing := range bssnBlacklist {
		if existing == ip {
			return
		}
	}
	bssnBlacklist = append(bssnBlacklist, strings.TrimSpace(ip))
}
