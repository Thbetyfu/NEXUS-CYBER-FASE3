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

	case "telegram":
		botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
		chatID := os.Getenv("TELEGRAM_CHAT_ID")
		if botToken == "" || chatID == "" {
			ActiveThreatReporter = &LocalOnlyReporter{}
		} else {
			ActiveThreatReporter = &TelegramBotReporter{BotToken: botToken, ChatID: chatID}
			log.Println("[REPORTER-INIT] Threat reporter initialized: Telegram Bot Push Alerts")
		}

	case "local":
		ActiveThreatReporter = &LocalOnlyReporter{}

	default:
		// Jika TELEGRAM_BOT_TOKEN diset, gunakan Telegram secara otomatis
		botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
		chatID := os.Getenv("TELEGRAM_CHAT_ID")
		if botToken != "" && chatID != "" {
			ActiveThreatReporter = &TelegramBotReporter{BotToken: botToken, ChatID: chatID}
			log.Println("[REPORTER-INIT] Threat reporter auto-initialized: Telegram Bot Push Alerts")
		} else {
			ActiveThreatReporter = &LocalOnlyReporter{}
		}
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

// --- 3. IMPLEMENTASI TELEGRAM BOT REPORTER (INSTANT PUSH ALERTS - MULTI-TENANT B2B/B2G) ---

type TelegramBotReporter struct {
	BotToken string
	ChatID   string // Default global Chat ID (fallback)
}

func (r *TelegramBotReporter) ReportThreat(ip string, categories []int, comment string) error {
	return r.ReportThreatForDomain("", ip, categories, comment)
}

// ReportThreatForDomain mengirimkan notifikasi push Telegram secara dinamis ke Chat ID pemilik domain spesifik.
func (r *TelegramBotReporter) ReportThreatForDomain(domain string, ip string, categories []int, comment string) error {
	if r.BotToken == "" {
		log.Printf("[TELEGRAM-WARN] TELEGRAM_BOT_TOKEN not configured. Skipping alert for IP: %s", ip)
		return nil
	}

	targetChatID := r.ChatID

	// Multi-tenant resolution: Cek apakah domain memiliki Telegram Chat ID khusus
	if domain != "" {
		customChatID, enabled, _, err := GetDomainTelegramConfig(domain)
		if err == nil && !enabled {
			// Notifikasi dimatikan oleh pemilik domain
			return nil
		}
		if err == nil && customChatID != "" {
			targetChatID = customChatID
		}

		// Terapkan Cooldown Debounce (15 menit per domain) untuk cegah spam/DDoS
		if !ShouldSendTelegramAlert(domain) {
			log.Printf("[TELEGRAM-DEBOUNCE] Cooldown active for domain %s. Skipping alert dispatch.", domain)
			return nil
		}
	}

	if targetChatID == "" {
		log.Printf("[TELEGRAM-WARN] No Chat ID available for domain '%s' or fallback. Skipping alert.", domain)
		return nil
	}

	// Normalisasi IP
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	go func() {
		endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", r.BotToken)

		// Dynamic Real-time GeoIP Lookup
		country, city, isp, lat, lon := GetIPGeoInfo(ip)
		gmapsURL := fmt.Sprintf("https://www.google.com/maps/search/?api=1&query=%.6f,%.6f", lat, lon)

		domainLabel := domain
		if domainLabel == "" {
			domainLabel = "System Gateway"
		}

		messageText := fmt.Sprintf("🚨 *NEXUS CYBER ALERT - %s*\n\n"+
			"🔒 *IP Penyerang*: `%s`\n"+
			"🌐 *Domain Target*: `%s`\n"+
			"🌍 *Wilayah*: `%s, %s`\n"+
			"📡 *ISP*: `%s`\n"+
			"🗺️ *Google Maps*: %s\n"+
			"⚠️ *Kategori Serangan*: `%v` (%s)\n"+
			"⏱️ *Waktu*: `%s`\n\n"+
			"🛡️ _Status: Auto-Banned & Protected by Dual-Brain AI (Zero COGS)_",
			domainLabel, ip, domainLabel, city, country, isp, gmapsURL, categories, comment, time.Now().Format("2006-01-02 15:04:05 MST"))

		payload := map[string]string{
			"chat_id":    targetChatID,
			"text":       messageText,
			"parse_mode": "Markdown",
		}

		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to marshal Telegram payload: %v", err)
			return
		}

		req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonPayload))
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to create HTTP request: %v", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to send Telegram notification: %v", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			log.Printf("[TELEGRAM-SUCCESS] Multi-tenant push alert dispatched for domain '%s' (ChatID: %s).", domainLabel, targetChatID)
		} else {
			log.Printf("[TELEGRAM-ERROR] Telegram API returned status %d.", resp.StatusCode)
		}
	}()

	return nil
}

// SendCustomMessage mengirimkan pesan notifikasi kustom langsung ke Telegram Admin.
func (r *TelegramBotReporter) SendCustomMessage(messageText string) error {
	if r.BotToken == "" || r.ChatID == "" {
		return nil
	}

	go func() {
		endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", r.BotToken)
		payload := map[string]string{
			"chat_id":    r.ChatID,
			"text":       messageText,
			"parse_mode": "Markdown",
		}

		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to marshal Telegram payload: %v", err)
			return
		}

		req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonPayload))
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to create HTTP request: %v", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[TELEGRAM-ERROR] Failed to send Telegram notification: %v", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			log.Printf("[TELEGRAM-SUCCESS] Custom Telegram alert dispatched.")
		} else {
			log.Printf("[TELEGRAM-ERROR] Telegram API returned status %d.", resp.StatusCode)
		}
	}()

	return nil
}

// --- 4. IMPLEMENTASI LOCAL ONLY REPORTER (FALLBACK) ---

type LocalOnlyReporter struct{}

func (r *LocalOnlyReporter) ReportThreat(ip string, categories []int, comment string) error {
	log.Printf("[LOCAL-LOG-THREAT] IP: %s | Categories: %v | Detail: %s", ip, categories, comment)
	return nil
}
