// Package ai mengimplementasikan logika filtrasi cerdas untuk mendeteksi ancaman secara real-time.
package ai

import (
	"net/url"
	"regexp"
	"strings"
)

// ReflexFilter mengimplementasikan Filter Refleks Cepat (Phase 1 Heuristics) di bawah arsitektur Hybrid Intelligence.
//
// Alasan Arsitektural (Why):
// Sebelum request dikirim ke model AI (nex-ai-protect) yang memerlukan biaya komputasi tinggi (latency ms/detik),
// ReflexFilter melakukan pemindaian awal dengan Regex yang telah di-kompilasi sebelumnya (pre-compiled).
// Ini menjamin pemblokiran instan (<1ms) untuk signature SQLi/XSS/Traversal klasik, menghemat bandwidth AI,
// serta menjaga performa gateway tetap tinggi (ISO 25010 - Time Behavior & Performance).
type ReflexFilter struct {
	sqliPatterns      []*regexp.Regexp
	xssPatterns       []*regexp.Regexp
	traversalPatterns []*regexp.Regexp
	rcePatterns       []*regexp.Regexp
	headerPatterns    []*regexp.Regexp
	// Regex untuk membersihkan komentar SQL sebelum matching (GAP-001)
	sqlCommentStrip   *regexp.Regexp
	benchmarkPattern  *regexp.Regexp
}

// NewReflexFilter menginisialisasi Regex bawaan untuk memindai payload request.
func NewReflexFilter() *ReflexFilter {
	// Pola SQL Injection Umum (Union select, comment bypass, sleep based timing attack, hex encoding)
	sqliRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE).*`),
		regexp.MustCompile(`(?i)' OR '.*'='`),
		regexp.MustCompile(`(?i)" OR ".*"="`),
		regexp.MustCompile(`(?i)'\s*OR\s*1=1`),
		regexp.MustCompile(`(?i)--`),
		regexp.MustCompile(`(?i)#`),
		regexp.MustCompile(`(?i);`),
		regexp.MustCompile(`(?i)0x[0-9a-fA-F]+`),
		regexp.MustCompile(`(?i)SLEEP\s*\(`),
		regexp.MustCompile(`(?i)BENCHMARK\s*\(`),
		regexp.MustCompile(`(?i)WAITFOR\s+DELAY`),
		regexp.MustCompile(`(?i)pg_sleep\s*\(`),
	}

	// Pola Cross-Site Scripting (XSS)
	xssRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script.*?>.*?</script.*?>`),
		regexp.MustCompile(`(?i)on\w+\s*=\s*".*?"`),
		regexp.MustCompile(`(?i)on\w+\s*=\s*'.*?'`),
		regexp.MustCompile(`(?i)javascript:`),
		regexp.MustCompile(`(?i)alert\s*\(`),
		regexp.MustCompile(`(?i)document\.cookie`),
	}

	// Pola Path Traversal & File Access (LFI/RFI)
	traversalRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)\.{2,}[/\\]`), // Mendeteksi ../ atau ..\
		regexp.MustCompile(`(?i)%2e%2e%2f`),   // Mendeteksi URL encoded traversal
		regexp.MustCompile(`(?i)/etc/passwd`),  // Lokasi sensitif Linux
		regexp.MustCompile(`(?i)/etc/shadow`),
		regexp.MustCompile(`(?i)/var/log/`),
		regexp.MustCompile(`(?i)php://`),      // PHP Stream wrappers
		regexp.MustCompile(`(?i)C:\\`),        // Drive utama Windows
		regexp.MustCompile(`(?i)win\.ini`),
	}

	// Pola Command Injection / RCE
	rceRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i);\s*(cat|id|whoami|ls|pwd|wget|curl|nc|bash|sh|powershell)`),
		regexp.MustCompile(`(?i)\|\s*(cat|id|whoami|ls|pwd|wget|curl|nc|bash|sh)`),
		regexp.MustCompile(`(?i)&&\s*(cat|id|whoami|ls|pwd|wget|curl|nc|bash|sh)`),
		regexp.MustCompile("(?i)`[^`]*(whoami|id|cat|wget|curl|sh|bash)[^`]*`"),
		regexp.MustCompile(`(?i)\$\((whoami|id|cat|wget|curl|sh|bash)\)`),
		regexp.MustCompile(`(?i)sh\s+-c\s+`),
	}

	// Pola pemindaian HTTP Header berbahaya
	headerRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*127\.0\.0\.1`),
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*10\.\d+\.\d+\.\d+`),
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*192\.168\.\d+\.\d+`),
		regexp.MustCompile(`(?i)(BSSN_OVERRIDE|EMERGENCY_BYPASS|ADMIN_OVERRIDE)`),
		regexp.MustCompile(`(?i)(classify.{0,20}(benign|allow|safe))`),
		regexp.MustCompile(`(?i)(ignore.{0,30}(previous|instruction|rule))`),
		regexp.MustCompile(`(?i)(authorized.{0,20}(bypass|skip|allow))`),
		regexp.MustCompile(`(?i)(UNION|SELECT|DROP|INSERT).{0,50}(FROM|INTO|TABLE)`),
		regexp.MustCompile(`(?i)<script`),
	}

	return &ReflexFilter{
		sqliPatterns:      sqliRegex,
		xssPatterns:       xssRegex,
		traversalPatterns: traversalRegex,
		rcePatterns:       rceRegex,
		headerPatterns:    headerRegex,
		sqlCommentStrip:  regexp.MustCompile(`/\*.*?\*/`),
		benchmarkPattern: regexp.MustCompile(`(?i)BENCHMARK\s*\(`),
	}
}

func (f *ReflexFilter) stripSQLComments(data string) string {
	return f.sqlCommentStrip.ReplaceAllString(data, "")
}

// InspectRequest memindai string input untuk mencari pola eksploitasi dasar.
func (f *ReflexFilter) InspectRequest(data string) (isThreat bool, threatType string) {
	// Recursive URL Unescape (hingga 5 iterasi) untuk membongkar obfuskasi multi-layered URL percent encoding
	decoded := data
	for i := 0; i < 5; i++ {
		if !strings.Contains(decoded, "%") {
			break
		}
		if unescaped, err := url.QueryUnescape(decoded); err == nil && unescaped != decoded {
			decoded = unescaped
		} else {
			break
		}
	}

	// Bersihkan komentar SQL sebelum lowercase dan matching
	decoded = f.stripSQLComments(decoded)
	decoded = strings.ToLower(decoded)

	// 1. Pemindaian SQLi
	for _, p := range f.sqliPatterns {
		if p.MatchString(decoded) {
			return true, "SQL_INJECTION_DETECTED"
		}
	}

	// 2. Pemindaian Path Traversal / LFI
	for _, p := range f.traversalPatterns {
		if p.MatchString(decoded) {
			return true, "PATH_TRAVERSAL_DETECTED"
		}
	}

	// 3. Pemindaian Command Injection / RCE
	for _, p := range f.rcePatterns {
		if p.MatchString(decoded) {
			return true, "RCE_COMMAND_INJECTION_DETECTED"
		}
	}

	// 4. Pemindaian XSS
	for _, p := range f.xssPatterns {
		if p.MatchString(decoded) {
			return true, "XSS_DETECTED"
		}
	}

	return false, ""
}

func urlQueryUnescape(s string) (string, error) {
	// Full recursive percent unescape for double URL encoding bypasses
	return url.QueryUnescape(s)
}

// InspectHeaders memeriksa kumpulan header HTTP untuk mendeteksi injeksi, spoofing IP,
// dan upaya social engineering terhadap model AI Cognitive Core.
//
// Alasan Arsitektural (Why - GAP-003):
// Laporan Red Team (INTELLIGENCE_GAP.md) mengidentifikasi bahwa header HTTP sepenuhnya
// lolos dari pemeriksaan Reflex sebelumnya. Penyerang dapat menyematkan payload berbahaya
// atau instruksi injeksi prompt AI di dalam nilai header untuk memanipulasi gateway.
// Fungsi ini memindai seluruh pasangan header:nilai sekaligus untuk mempertahankan
// latensi pemrosesan seminimal mungkin.
func (f *ReflexFilter) InspectHeaders(headers map[string][]string) (isThreat bool, threatType string) {
	for name, values := range headers {
		for _, val := range values {
			// Gabungkan nama header + nilai untuk pemindaian kontekstual
			combined := strings.ToLower(name + ": " + val)

			for _, p := range f.headerPatterns {
				if p.MatchString(combined) {
					return true, "MALICIOUS_HEADER_DETECTED"
				}
			}
		}
	}
	return false, ""
}

// InspectAdvanced memperluas analisis dengan memverifikasi User-Agent untuk mendeteksi bot/scanner siber.
//
// Alasan Arsitektural (Why):
// Banyak peretas menggunakan alat pemindai otomatis (seperti sqlmap atau nikto) untuk mencari celah keamanan.
// Mengidentifikasi header User-Agent pemindai di awal memungkinkan gateway langsung memblokir request
// sebelum program peretas sempat mengirim payload eksploitasi sesungguhnya.
func (f *ReflexFilter) InspectAdvanced(data string, ua string) (isThreat bool, threatType string) {
	// 1. Deteksi Alat Pemindai / Rekognisi Otomatis
	ua = strings.ToLower(ua)
	scanners := []string{"sqlmap", "gobuster", "dirb", "nmap", "nikto", "burp", "zap", "acunetix"}
	for _, s := range scanners {
		if strings.Contains(ua, s) {
			return true, "MALICIOUS_SCANNER_TOOL_DETECTED"
		}
	}

	// 2. Jika bukan scanner, lanjutkan ke pemindaian payload standar (dengan GAP-001 fix).
	return f.InspectRequest(data)
}

// Sanitize membersihkan karakter berbahaya secara lokal (Opsional, untuk pengembangan fitur berikutnya).
func (f *ReflexFilter) Sanitize(data string) string {
	return strings.ReplaceAll(data, "<", "&lt;")
}
