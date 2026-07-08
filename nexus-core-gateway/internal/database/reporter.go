package database

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// ThreatReporter mendefinisikan interface universal untuk pelaporan ancaman siber.
type ThreatReporter interface {
	ReportThreat(ip string, categories []int, comment string) error
}

// ActiveThreatReporter adalah objek singleton yang menyimpan reporter aktif di runtime.
var ActiveThreatReporter ThreatReporter

// InitThreatReporter menginisialisasi reporter aktif berdasarkan konfigurasi .env.
func InitThreatReporter() {
	provider := os.Getenv("THREAT_INTEL_PROVIDER")
	if provider == "" {
		provider = "local" // default: log lokal tanpa dependensi eksternal
	}

	switch strings.ToLower(provider) {
	case "syslog-siem":
		endpoint := os.Getenv("BANK_SIEM_ENDPOINT")
		if endpoint == "" {
			endpoint = "localhost:514"
		}
		protocol := os.Getenv("BANK_SIEM_PROTOCOL")
		if protocol == "" {
			protocol = "tcp"
		}
		ActiveThreatReporter = &SyslogSIEMReporter{
			Endpoint: endpoint,
			Protocol: protocol,
		}
		log.Printf("[REPORTER-INIT] Threat reporter initialized: Syslog SIEM (%s://%s)", protocol, endpoint)

	case "abuseipdb":
		apiKey := os.Getenv("ABUSEIPDB_API_KEY")
		if apiKey == "" {
			// Kunci tidak tersedia, turun ke local logger tanpa pesan peringatan.
			ActiveThreatReporter = &LocalOnlyReporter{}
		} else {
			ActiveThreatReporter = &AbuseIPDBReporter{APIKey: apiKey}
			log.Println("[REPORTER-INIT] Threat reporter initialized: AbuseIPDB API v2")
		}

	case "local":
		ActiveThreatReporter = &LocalOnlyReporter{}

	default:
		ActiveThreatReporter = &LocalOnlyReporter{}
	}
}

// --- 1. IMPLEMENTASI ABUSEIPDB REPORTER (SWASTA) ---

type AbuseIPDBReporter struct {
	APIKey string
}

func (r *AbuseIPDBReporter) ReportThreat(ip string, categories []int, comment string) error {
	if r.APIKey == "" {
		log.Printf("[ABUSEIPDB-WARN] ABUSEIPDB_API_KEY not configured. Skipping report for IP: %s", ip)
		return nil
	}

	// Normalisasi IP
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	// Jangan laporkan IP lokal
	if ip == "127.0.0.1" || ip == "localhost" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.") {
		return nil
	}

	go func() {
		endpoint := "https://api.abuseipdb.com/api/v2/report"

		var catStrings []string
		for _, cat := range categories {
			catStrings = append(catStrings, strconv.Itoa(cat))
		}
		categoriesStr := strings.Join(catStrings, ",")

		data := url.Values{}
		data.Set("ip", ip)
		data.Set("categories", categoriesStr)
		data.Set("comment", comment)

		req, err := http.NewRequest("POST", endpoint, bytes.NewBufferString(data.Encode()))
		if err != nil {
			log.Printf("[ABUSEIPDB-ERROR] Request generation failed: %v", err)
			return
		}

		req.Header.Set("Key", r.APIKey)
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[ABUSEIPDB-ERROR] Connection to API failed: %v", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
			log.Printf("[ABUSEIPDB-SUCCESS] Reported IP %s to global database.", ip)
		} else {
			var result map[string]interface{}
			_ = json.NewDecoder(resp.Body).Decode(&result)
			log.Printf("[ABUSEIPDB-ERROR] API returned status %d. Details: %v", resp.StatusCode, result)
		}
	}()

	return nil
}

// --- 2. IMPLEMENTASI SYSLOG SYSLOG-SIEM REPORTER (PEMERINTAH/PERBANKAN) ---

type SyslogSIEMReporter struct {
	Endpoint string
	Protocol string
}

func (r *SyslogSIEMReporter) ReportThreat(ip string, categories []int, comment string) error {
	// Normalisasi IP
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	timestamp := time.Now().Format(time.RFC3339)
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "localhost"
	}

	// Format RFC 5424 Syslog Header & Payload
	payload := fmt.Sprintf("<14>1 %s %s NEXUS-WAF - - - [THREAT_ALERT] IP=%s Categories=%v Comment=\"%s\"\n",
		timestamp, hostname, ip, categories, comment)

	go func() {
		conn, err := net.DialTimeout(r.Protocol, r.Endpoint, 3*time.Second)
		if err != nil {
			log.Printf("[SIEM-ERROR] Failed to connect to SIEM %s via %s: %v", r.Endpoint, r.Protocol, err)
			return
		}
		defer conn.Close()

		_, err = conn.Write([]byte(payload))
		if err != nil {
			log.Printf("[SIEM-ERROR] Failed to send syslog alert to %s: %v", r.Endpoint, err)
		} else {
			log.Printf("[SIEM-SUCCESS] Syslog SIEM alert sent to %s.", r.Endpoint)
		}
	}()

	return nil
}

// --- 3. IMPLEMENTASI LOCAL ONLY REPORTER (FALLBACK) ---

type LocalOnlyReporter struct{}

func (r *LocalOnlyReporter) ReportThreat(ip string, categories []int, comment string) error {
	log.Printf("[LOCAL-LOG-THREAT] IP: %s | Categories: %v | Detail: %s", ip, categories, comment)
	return nil
}
