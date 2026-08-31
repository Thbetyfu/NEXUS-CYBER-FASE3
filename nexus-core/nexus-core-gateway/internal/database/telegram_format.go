package database

import (
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

const telegramIPCooldown = 15 * time.Minute

var telegramLastByIP sync.Map // ip -> time.Time

// CleanReporterIP extracts host from host:port without truncating IPv6 at the first colon.
func CleanReporterIP(raw string) string {
	host := strings.TrimSpace(raw)
	if host == "" {
		return host
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	return strings.Trim(host, "[]")
}

// IsPrivateOrLabIP is true for loopback, RFC1918, link-local, and unparseable values.
// Lab hotspot clients (192.168.137.x) must not be treated as a world GPS pin.
func IsPrivateOrLabIP(ip string) bool {
	parsed := net.ParseIP(CleanReporterIP(ip))
	if parsed == nil {
		return true
	}
	return parsed.IsLoopback() || parsed.IsPrivate() || parsed.IsLinkLocalUnicast() || parsed.IsUnspecified()
}

// ShouldSendTelegramAlertForIP rate-limits pager messages per visible IP (lab + public).
func ShouldSendTelegramAlertForIP(ip string) bool {
	key := CleanReporterIP(ip)
	if key == "" {
		return false
	}
	now := time.Now()
	if v, ok := telegramLastByIP.Load(key); ok {
		if last, ok := v.(time.Time); ok && now.Sub(last) < telegramIPCooldown {
			return false
		}
	}
	telegramLastByIP.Store(key, now)
	return true
}

// FormatTelegramAlert is the pager body: after WAF already blocked, not a tracker.
func FormatTelegramAlert(ip, domain, comment string, categories []int, country, city, isp string, lat, lon float64, now time.Time) string {
	ip = CleanReporterIP(ip)
	domainLabel := domain
	if domainLabel == "" {
		domainLabel = "lab / gateway"
	}

	var locBlock string
	if IsPrivateOrLabIP(ip) {
		locBlock = "📍 *Lokasi*: IP *privat/lab* (RFC1918/loopback). Ini *bukan* rumah penyerang, *bukan* GPS, *bukan* tembus VPN.\n"
	} else {
		geoCountry := country
		geoCity := city
		geoISP := isp
		if geoCountry == "" {
			geoCountry = "unknown"
		}
		if geoCity == "" {
			geoCity = "unknown"
		}
		if geoISP == "" {
			geoISP = "unknown"
		}
		locBlock = fmt.Sprintf(
			"🌍 *GeoIP (perkiraan dari IP publik)*: `%s, %s`\n"+
				"📡 *ISP (bisa VPN/proxy)*: `%s`\n"+
				"_GeoIP bukan GPS perangkat. VPN mengubah negara yang terlihat._\n",
			geoCity, geoCountry, geoISP)
		if lat != 0 || lon != 0 {
			gmapsURL := fmt.Sprintf("https://www.google.com/maps/search/?api=1&query=%.6f,%.6f", lat, lon)
			locBlock += fmt.Sprintf("🗺️ *Peta perkiraan GeoIP*: %s\n", gmapsURL)
		}
	}

	return fmt.Sprintf(
		"NEXUS *pager* (bukan pelacak)\n\n"+
			"WAF sudah memblokir. Ini pemberitahuan ke HP, bukan login dan bukan bukti lokasi fisik.\n\n"+
			"🔒 *IP yang terlihat*: `%s`\n"+
			"🌐 *Target*: `%s`\n"+
			"%s"+
			"⚠️ *Alasan*: `%s`\n"+
			"🏷️ *Kategori*: `%v`\n"+
			"⏱️ *Waktu*: `%s`\n",
		ip, domainLabel, locBlock, comment, categories, now.Format("2006-01-02 15:04:05 MST"))
}

// FormatBrowserLocationAlert is used only if a client *chose* to share coordinates to the honeypot.
func FormatBrowserLocationAlert(ip, userAgent string, lat, lon, acc float64, now time.Time) string {
	ip = CleanReporterIP(ip)
	gmapsURL := fmt.Sprintf("https://www.google.com/maps/search/?api=1&query=%.6f,%.6f", lat, lon)
	return fmt.Sprintf(
		"Honeypot: *browser membagikan koordinat* (bukan paksaan ke semua pengunjung)\n\n"+
			"IP yang terlihat: `%s`\n"+
			"Koordinat yang dikirim klien: `%.6f, %.6f` (akurasi browser ±%.1f m, bisa salah)\n"+
			"Peta: %s\n"+
			"User-Agent: `%s`\n"+
			"Waktu: `%s`\n\n"+
			"_Hanya jika peramban mengizinkan prompt. VPN tetap menyembunyikan IP publik. Bukan GPS 95%%._",
		ip, lat, lon, acc, gmapsURL, userAgent, now.Format("2006-01-02 15:04:05 MST"))
}
