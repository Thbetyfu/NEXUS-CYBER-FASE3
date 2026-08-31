package ai

import (
	"net/url"
	"testing"
)

// Tes regresi Lantai 1: obfuskasi dangkal harus kena Reflex setelah normalisasi.
// Bukan kit serangan; hanya bentuk terenkode dari kasus yang sudah di tes unit.
func TestReflexFilter_NormalizeObfuscation(t *testing.T) {
	filter := NewReflexFilter()

	tests := []struct {
		name       string
		payload    string
		wantThreat bool
		wantType   string
	}{
		{
			name:       "SQL keyword split by comments",
			payload:    "SEL/**/ECT username FROM users",
			wantThreat: true,
			wantType:   "SQL_INJECTION_DETECTED",
		},
		{
			name:       "JS unicode escapes for script tag",
			payload:    `\u003cscript\u003ealert(1)\u003c/script\u003e`,
			wantThreat: true,
			wantType:   "XSS_DETECTED",
		},
		{
			name:       "HTML entities for script tag",
			payload:    "&lt;script&gt;alert(document.cookie)&lt;/script&gt;",
			wantThreat: true,
			wantType:   "XSS_DETECTED",
		},
		{
			name:       "Double percent-encoding of script tag",
			payload:    "%253Cscript%253Ealert(1)%253C/script%253E",
			wantThreat: true,
			wantType:   "XSS_DETECTED",
		},
		{
			name:       "NFKC fullwidth latin SQL keyword",
			payload:    "1' ＵＮＩＯＮ ＳＥＬＥＣＴ username FROM users--",
			wantThreat: true,
			wantType:   "SQL_INJECTION_DETECTED",
		},
		{
			name:       "Benign Indonesian query",
			payload:    "q=foto+liburan+keluarga",
			wantThreat: false,
		},
		{
			name:       "Benign JSON",
			payload:    `{"action":"get_status","client_id":"12345"}`,
			wantThreat: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, kind := filter.InspectRequest(tt.payload)
			if got != tt.wantThreat {
				t.Fatalf("InspectRequest(%q) threat=%v type=%s wantThreat=%v", tt.payload, got, kind, tt.wantThreat)
			}
			if tt.wantThreat && tt.wantType != "" && kind != tt.wantType {
				t.Fatalf("threat type %s want %s", kind, tt.wantType)
			}
		})
	}
}

func TestReflexFilter_EncodedHeaderValue(t *testing.T) {
	filter := NewReflexFilter()
	encoded := url.QueryEscape("UNION SELECT password FROM admin")
	hit, _ := filter.InspectHeaders(map[string][]string{
		"X-User-Input": {encoded},
	})
	if !hit {
		t.Fatal("percent-encoded SQLi in header should be detected after normalize")
	}
}
