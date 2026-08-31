// Package ai mengimplementasikan logika filtrasi cerdas untuk mendeteksi ancaman secara real-time.
package ai

import (
	"html"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"golang.org/x/text/unicode/norm"
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
	// Pagar tipis: injeksi judi/deface di request kanonik. Hanya WAF :8080 / PROTECTED_HOST.
	defacePatterns []*regexp.Regexp
	// Regex untuk membersihkan komentar SQL sebelum matching (GAP-001)
	sqlCommentStrip  *regexp.Regexp
	jsUnicodeEscape  *regexp.Regexp
	jsHexEscape      *regexp.Regexp
	benchmarkPattern *regexp.Regexp
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
		regexp.MustCompile(`(?i)/etc/passwd`), // Lokasi sensitif Linux
		regexp.MustCompile(`(?i)/etc/shadow`),
		regexp.MustCompile(`(?i)/var/log/`),
		regexp.MustCompile(`(?i)php://`), // PHP Stream wrappers
		regexp.MustCompile(`(?i)C:\\`),   // Drive utama Windows
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

	// Pagar tipis anti-judi/deface (bukan zero-day, bukan restore origin).
	// Hanya request yang sudah masuk gateway WAF (:8080 / Host PROTECTED_HOST).
	// Pola sengaja multi-token agar "slot parkir" / nama usaha biasa tidak kena.
	defaceRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)slot[\s._-]*gacor`),
		regexp.MustCompile(`(?i)judi[\s._-]*online`),
		regexp.MustCompile(`(?i)togel[\s._-]*(online|hongkong|singapore|sidney|\bhk\b|\bsgp\b)`),
		regexp.MustCompile(`(?i)(situs|link)[\s._-]*(judi|slot|togel)`),
		regexp.MustCompile(`(?i)(daftar|promo)[\s._-]*(slot|judi)`),
		regexp.MustCompile(`(?i)pragmatic[\s._-]*play`),
		regexp.MustCompile(`(?i)pg[\s._-]*soft`),
		regexp.MustCompile(`(?i)hacked[\s._-]*by`),
		regexp.MustCompile(`(?i)defaced[\s._-]*by`),
		regexp.MustCompile(`(?i)<iframe[^>]{0,200}(slot|judi|togel|casino)`),
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
		defacePatterns:    defaceRegex,
		sqlCommentStrip:   regexp.MustCompile(`(?s)/\*.*?\*/`),
		jsUnicodeEscape:   regexp.MustCompile(`\\u([0-9a-fA-F]{4})`),
		jsHexEscape:       regexp.MustCompile(`\\x([0-9a-fA-F]{2})`),
		benchmarkPattern:  regexp.MustCompile(`(?i)BENCHMARK\s*\(`),
	}
}

func (f *ReflexFilter) stripSQLComments(data string) string {
	out := data
	for i := 0; i < 5; i++ {
		next := f.sqlCommentStrip.ReplaceAllString(out, "")
		if next == out {
			return out
		}
		out = next
	}
	return out
}

func decodeHexRune(hex string) (rune, bool) {
	n, err := strconv.ParseUint(hex, 16, 32)
	if err != nil || n == 0 {
		return 0, false
	}
	r := rune(n)
	if !utf8.ValidRune(r) {
		return 0, false
	}
	return r, true
}

func (f *ReflexFilter) decodeJSEscapes(data string) string {
	out := f.jsUnicodeEscape.ReplaceAllStringFunc(data, func(m string) string {
		sub := f.jsUnicodeEscape.FindStringSubmatch(m)
		if len(sub) < 2 {
			return m
		}
		r, ok := decodeHexRune(sub[1])
		if !ok {
			return m
		}
		return string(r)
	})
	return f.jsHexEscape.ReplaceAllStringFunc(out, func(m string) string {
		sub := f.jsHexEscape.FindStringSubmatch(m)
		if len(sub) < 2 {
			return m
		}
		r, ok := decodeHexRune(sub[1])
		if !ok {
			return m
		}
		return string(r)
	})
}

func percentUnescapeRound(s string) string {
	if !strings.Contains(s, "%") {
		return s
	}
	unescaped, err := url.QueryUnescape(s)
	if err != nil || unescaped == s {
		return s
	}
	return unescaped
}

// NormalizeForInspect meratakan obfuskasi dangkal sebelum regex.
// Alasan: Reflex harus menilai bentuk kanonik (percent-encoding berlapis, entitas HTML,
// \uXXXX, komentar SQL, NFKC), bukan string mentah yang mudah diubah ejaannya.
func (f *ReflexFilter) NormalizeForInspect(data string) string {
	decoded := data
	for i := 0; i < 6; i++ {
		next := percentUnescapeRound(decoded)
		next = f.decodeJSEscapes(next)
		next = html.UnescapeString(next)
		next = f.stripSQLComments(next)
		next = norm.NFKC.String(next)
		if next == decoded {
			break
		}
		decoded = next
	}
	return strings.ToLower(decoded)
}

// InspectRequest memindai string input untuk mencari pola eksploitasi dasar.
func (f *ReflexFilter) InspectRequest(data string) (isThreat bool, threatType string) {
	decoded := f.NormalizeForInspect(data)

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

	// 5. Pagar tipis: injeksi judi / graffiti deface (hanya jika trafik sudah di WAF)
	if kind := f.matchDefaceInject(decoded); kind != "" {
		return true, kind
	}

	return false, ""
}

func (f *ReflexFilter) matchDefaceInject(decoded string) string {
	for _, p := range f.defacePatterns {
		if p.MatchString(decoded) {
			return "GAMBLING_DEFACE_INJECT_DETECTED"
		}
	}
	return ""
}

// InspectHeaders memeriksa kumpulan header HTTP untuk mendeteksi injeksi, spoofing IP,
// dan upaya social engineering terhadap model AI Cognitive Core.
func (f *ReflexFilter) InspectHeaders(headers map[string][]string) (isThreat bool, threatType string) {
	for name, values := range headers {
		for _, val := range values {
			normalizedVal := f.NormalizeForInspect(val)
			combined := strings.ToLower(name) + ": " + normalizedVal

			for _, p := range f.headerPatterns {
				if p.MatchString(combined) {
					return true, "MALICIOUS_HEADER_DETECTED"
				}
			}
			if kind := f.matchDefaceInject(normalizedVal); kind != "" {
				return true, kind
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
