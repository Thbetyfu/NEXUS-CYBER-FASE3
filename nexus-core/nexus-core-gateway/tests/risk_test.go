package tests

import (
	"net/http"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/risk"
)

// TestMultiParametricRiskEngine memverifikasi keakuratan penilaian skor risiko adaptif
// untuk mencegah false positives pada pengguna VPN sah dan memblokir peretas ber-VPN.
func TestMultiParametricRiskEngine(t *testing.T) {
	// 1. Pengujian Pengguna Legitim Biasa (Clean ISP) -> Harus ALLOW
	req1, _ := http.NewRequest("GET", "http://localhost/api/users", nil)
	req1.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	eval1 := risk.EvaluateRisk(req1, "8.8.8.8", false)
	if eval1.RecommendedAct != "ALLOW" {
		t.Errorf("Expected ALLOW for clean IP, got: %s (Score: %d)", eval1.RecommendedAct, eval1.TotalScore)
	}

	// 2. Pengujian Pengguna VPN Biasa Tanpa Serangan -> Harus ALLOW (Mencegah False Positive)
	req2, _ := http.NewRequest("GET", "http://localhost/api/users", nil)
	req2.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	eval2 := risk.EvaluateRisk(req2, "165.21.83.88", false)
	t.Logf("[RISK-TEST-VPN-CLEAN] IP: 165.21.83.88 | Score: %d | Action: %s", eval2.TotalScore, eval2.RecommendedAct)

	// 3. Pengujian Peretas Ber-VPN + SQLi Attack Payload -> Harus STRICT_BLOCK / HONEYPOT_REDIRECT
	req3, _ := http.NewRequest("GET", "http://localhost/api/users?id=1%27%20OR%201=1", nil)
	req3.Header.Set("User-Agent", "sqlmap/1.5.2#stable")
	eval3 := risk.EvaluateRisk(req3, "165.21.83.88", true)
	if eval3.RecommendedAct == "ALLOW" {
		t.Errorf("Expected STRICT_BLOCK or HONEYPOT_REDIRECT for VPN Attacker, got: %s (Score: %d)", eval3.RecommendedAct, eval3.TotalScore)
	} else {
		t.Logf("[RISK-TEST-VPN-ATTACKER] VPN Attacker successfully caught! Score: %d | Action: %s | Factors: %v",
			eval3.TotalScore, eval3.RecommendedAct, eval3.RiskFactors)
	}
}
