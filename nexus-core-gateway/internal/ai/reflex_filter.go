// Package ai mengimplementasikan logika filtrasi cerdas untuk mendeteksi ancaman secara real-time.
package ai

import (
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
	headerPatterns    []*regexp.Regexp
	// Regex untuk membersihkan komentar SQL sebelum matching (GAP-001)
	sqlCommentStrip   *regexp.Regexp
	benchmarkPattern  *regexp.Regexp
}

// NewReflexFilter menginisialisasi Regex bawaan untuk memindai payload request.
//
// Alasan Arsitektural (Why):
// Pola Regex di-compile di awal (singleton-like initialization) menggunakan regexp.MustCompile.
// Meng-compile regex di setiap request (in-flight request) akan membebani memori dan CPU (CPU spikes),
// sehingga inisialisasi di awal wajib dilakukan untuk stabilitas produksi.
func NewReflexFilter() *ReflexFilter {
	// Pola SQL Injection Umum (Union select, comment bypass, sleep based timing attack, hex encoding)
	sqliRegex := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE).*`),
		regexp.MustCompile(`(?i)' OR '.*'='`),
		regexp.MustCompile(`(?i)" OR ".*"="`),
		regexp.MustCompile(`(?i)--`),
		regexp.MustCompile(`(?i);`),
		regexp.MustCompile(`(?i)0x[0-9a-fA-F]+`),
		regexp.MustCompile(`(?i)SLEEP\s*\(`),
		// [GAP-001 FIX] Mendeteksi BENCHMARK() sebagai pengganti SLEEP() pada timing attack
		// Alasan (Why): Penyerang menggunakan BENCHMARK(N, SHA1(1)) untuk menggantikan SLEEP()
		// karena ia tidak masuk dalam pola SLEEP\( yang umum.
		regexp.MustCompile(`(?i)BENCHMARK\s*\(`),
		// [GAP-001 FIX] Mendeteksi WAITFOR DELAY (MSSQL timing attack)
		regexp.MustCompile(`(?i)WAITFOR\s+DELAY`),
		// [GAP-001 FIX] Mendeteksi pg_sleep (PostgreSQL timing attack)
		regexp.MustCompile(`(?i)pg_sleep\s*\(`),
	}

	// Pola Cross-Site Scripting (XSS) (HTML script injection, element handler hijack, javascript scheme)
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
		regexp.MustCompile(`(?i)\.{2,}[/\\]`), // Mendeteksi ../ atau ..\ (Directory traversal)
		regexp.MustCompile(`(?i)%2e%2e%2f`),   // Mendeteksi URL encoded traversal
		regexp.MustCompile(`(?i)/etc/passwd`),  // Lokasi sensitif Linux
		regexp.MustCompile(`(?i)/etc/shadow`),
		regexp.MustCompile(`(?i)C:\\`), // Drive utama Windows
		regexp.MustCompile(`(?i)win\.ini`),
	}

	// [GAP-003 FIX] Pola pemindaian HTTP Header berbahaya
	//
	// Alasan Arsitektural (Why):
	// Simulasi Red Team (INTELLIGENCE_GAP.md GAP-003) membuktikan bahwa header seperti
	// X-Forwarded-For, X-Custom-IP-Authorization, dan header injeksi sosial TIDAK diperiksa
	// oleh Reflex sebelumnya. Penyerang dapat menyematkan payload berbahaya, override IP palsu,
	// atau mencoba social engineering melalui header untuk mengelabui backend.
	headerRegex := []*regexp.Regexp{
		// Deteksi injeksi IP spoofing melalui header X-Forwarded-For
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*127\.0\.0\.1`),
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*10\.\d+\.\d+\.\d+`),
		regexp.MustCompile(`(?i)X-Forwarded-For:\s*192\.168\.\d+\.\d+`),
		// Deteksi header authorization bypass / social engineering (GAP-002 & GAP-003)
		// Alasan (Why): Kata kunci seperti "OVERRIDE", "authorized", "classify as" digunakan
		// dalam Zero-Shot Prompt Injection untuk mengelabui model AI Cognitive Core.
		regexp.MustCompile(`(?i)(BSSN_OVERRIDE|EMERGENCY_BYPASS|ADMIN_OVERRIDE)`),
		regexp.MustCompile(`(?i)(classify.{0,20}(benign|allow|safe))`),
		regexp.MustCompile(`(?i)(ignore.{0,30}(previous|instruction|rule))`),
		regexp.MustCompile(`(?i)(authorized.{0,20}(bypass|skip|allow))`),
		// Deteksi header injeksi SQLi/XSS di dalam nilai header HTTP
		regexp.MustCompile(`(?i)(UNION|SELECT|DROP|INSERT).{0,50}(FROM|INTO|TABLE)`),
		regexp.MustCompile(`(?i)<script`),
	}

	return &ReflexFilter{
		sqliPatterns:      sqliRegex,
		xssPatterns:       xssRegex,
		traversalPatterns: traversalRegex,
		headerPatterns:    headerRegex,
		// [GAP-001 FIX] Pre-compile regex untuk membersihkan komentar SQL inline (/* ... */)
		// Alasan (Why): Serangan seperti SL/**/EEP(5) lolos dari pola SLEEP\( karena ada
		// komentar di tengah keyword. Dengan stripping komentar sebelum matching,
		// payload tersebut menjadi SLEEP(5) dan langsung terdeteksi.
		sqlCommentStrip:  regexp.MustCompile(`/\*.*?\*/`),
		benchmarkPattern: regexp.MustCompile(`(?i)BENCHMARK\s*\(`),
	}
}

// stripSQLComments menghapus komentar inline SQL (/* ... */) dari string input.
//
// Alasan Arsitektural (Why - GAP-001):
// Teknik evasion "SL/**/EEP" menyisipkan komentar SQL kosong di tengah keyword untuk
// memecah pola string matching. Dengan menghapus komentar terlebih dahulu, teknik ini
// menjadi tidak efektif dan keyword berbahaya kembali terekspos untuk dideteksi.
func (f *ReflexFilter) stripSQLComments(data string) string {
	return f.sqlCommentStrip.ReplaceAllString(data, "")
}

// InspectRequest memindai string input untuk mencari pola eksploitasi dasar.
// Mengembalikan status ancaman (bool) dan jenis ancaman jika terdeteksi.
func (f *ReflexFilter) InspectRequest(data string) (isThreat bool, threatType string) {
	// [GAP-001 FIX] Bersihkan komentar SQL sebelum lowercase dan matching
	// Alasan (Why): Tanpa stripping ini, "SL/**/EEP(5)" tidak cocok dengan pola SLEEP\(.
	// Setelah stripping menjadi "SLEEP(5)" yang langsung cocok.
	data = f.stripSQLComments(data)

	// Konversi input ke lowercase sekali saja untuk menghemat CPU dibanding mencocokkan case-insensitive berulang kali.
	data = strings.ToLower(data)

	// 1. Pemindaian SQLi
	for _, p := range f.sqliPatterns {
		if p.MatchString(data) {
			return true, "SQL_INJECTION_DETECTED"
		}
	}

	// 2. Pemindaian Path Traversal
	for _, p := range f.traversalPatterns {
		if p.MatchString(data) {
			return true, "PATH_TRAVERSAL_DETECTED"
		}
	}

	// 3. Pemindaian XSS
	for _, p := range f.xssPatterns {
		if p.MatchString(data) {
			return true, "XSS_DETECTED"
		}
	}

	return false, ""
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
