// Package risk mengimplementasikan Mesin Penilaian Risiko Keamanan Multi-Parametrik (Multi-Parametric Risk Scoring Engine).
// Modul ini mematuhi standar ISO 27001 (Kontrol A.12.6 - Pengelolaan Kerentanan Teknis) dan UU No. 27/2022 (UU PDP)
// untuk mencegah False Positives (salah vonis) pada pengguna sah sambil secara adaptif melumpuhkan peretas ber-VPN.
package risk

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
)

// RiskAssessment menyimpan hasil penilaian risiko multi-parametrik untuk satu permintaan HTTP.
type RiskAssessment struct {
	IP             string   `json:"ip"`
	TotalScore     int      `json:"total_score"`     // Skor Risiko 0 - 100
	IsVPNOrProxy   bool     `json:"is_vpn_or_proxy"` // Apakah terdeteksi dari Datacenter / ASN Proxy
	RiskFactors    []string `json:"risk_factors"`    // Daftar indikator ancaman yang teridentifikasi
	RecommendedAct string   `json:"recommended_act"` // "ALLOW", "HONEYPOT_REDIRECT", "STRICT_BLOCK"
}

// EvaluateRisk menilai skor risiko keamanan trafik masuk secara multi-parametrik.
//
// Alasan Arsitektural & Kepatuhan (Why):
// 1. Mencegah False Positives (salah vonis) pada pengguna sah yang menggunakan VPN internal kantor/perusahaan.
// 2. Menghitung akumulasi skor risiko (0-100) berdasarkan 4 indikator empiris:
//    - Indikator 1: ASN Datacenter / Known Proxy Provider (+35 Poin)
//    - Indikator 2: Header HTTP Transparan Proxy (Via / X-Forwarded-For) (+25 Poin)
//    - Indikator 3: Timezone / Bot Scanner User-Agent (+30 Poin)
//    - Indikator 4: Deteksi Payload Eksploitasi Serangan (SQLi, XSS, RFI) (+50 Poin)
// 3. Mengatur tindakan rekomendasi:
//    - Total Score < 50: ALLOW (Pengguna VPN biasa/sah tetap diizinkan)
//    - Total Score 50 - 69: HONEYPOT_REDIRECT (Silent Diversion ke Honeypot 9090)
//    - Total Score >= 70: STRICT_BLOCK (Autobanned & Blocked)
func EvaluateRisk(r *http.Request, ip string, hasAttackPayload bool) RiskAssessment {
	assessment := RiskAssessment{
		IP:             ip,
		TotalScore:     0,
		RiskFactors:    make([]string, 0),
		RecommendedAct: "ALLOW",
	}

	cleanIP := ip
	if idx := strings.Index(ip, ":"); idx != -1 {
		cleanIP = ip[:idx]
	}

	// 1. Analisis ASN & Provider Jaringan (MaxMind / GeoIP)
	country, city, isp, lat, lon := database.GetIPGeoInfo(cleanIP)
	_ = city
	_ = lat
	_ = lon

	ispLower := strings.ToLower(isp)
	if strings.Contains(ispLower, "amazon") || strings.Contains(ispLower, "digitalocean") ||
		strings.Contains(ispLower, "linode") || strings.Contains(ispLower, "hetzner") ||
		strings.Contains(ispLower, "ovh") || strings.Contains(ispLower, "m247") ||
		strings.Contains(ispLower, "expressvpn") || strings.Contains(ispLower, "nordvpn") ||
		strings.Contains(ispLower, "vpn") || strings.Contains(ispLower, "proxy") {
		assessment.IsVPNOrProxy = true
		assessment.TotalScore += 35
		assessment.RiskFactors = append(assessment.RiskFactors, fmt.Sprintf("ASN Datacenter/VPN Node (%s, %s)", isp, country))
	}

	// 2. Deteksi Header Proxy Transparan
	if r.Header.Get("Via") != "" || r.Header.Get("X-Forwarded-For") != "" || r.Header.Get("Forwarded") != "" {
		assessment.TotalScore += 25
		assessment.RiskFactors = append(assessment.RiskFactors, "Transparent Proxy Header Present (Via/X-Forwarded-For)")
	}

	// 3. Deteksi Anomali User-Agent / Headless Bot Scanner
	ua := strings.ToLower(r.Header.Get("User-Agent"))
	if ua == "" || strings.Contains(ua, "sqlmap") || strings.Contains(ua, "nikto") || strings.Contains(ua, "nmap") || strings.Contains(ua, "python-requests") {
		assessment.TotalScore += 30
		assessment.RiskFactors = append(assessment.RiskFactors, fmt.Sprintf("Automated Bot Scanner User-Agent (%s)", r.Header.Get("User-Agent")))
	}

	// 4. Deteksi Payload Eksploitasi Serangan Aktif (SQLi / XSS / RFI)
	if hasAttackPayload {
		assessment.TotalScore += 50
		assessment.RiskFactors = append(assessment.RiskFactors, "Active OWASP Attack Payload Detected")
	}

	// 5. Penetapan Rekomendasi Tindakan Adaptif
	if assessment.TotalScore >= 70 {
		assessment.RecommendedAct = "STRICT_BLOCK"
	} else if assessment.TotalScore >= 50 || (assessment.IsVPNOrProxy && hasAttackPayload) {
		assessment.RecommendedAct = "HONEYPOT_REDIRECT"
	} else {
		assessment.RecommendedAct = "ALLOW"
	}

	log.Printf("[RISK-ENGINE] IP: %s | Risk Score: %d/100 | VPN/Proxy: %v | Action: %s | Factors: %v",
		cleanIP, assessment.TotalScore, assessment.IsVPNOrProxy, assessment.RecommendedAct, assessment.RiskFactors)

	return assessment
}
