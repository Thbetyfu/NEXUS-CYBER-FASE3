package ai

import "testing"

// Tes pagar tipis: string jinak yang menandai injeksi judi/deface di request kanonik.
// Bukan PoC exploit. Aturan hanya berlaku jika trafik sudah lewat WAF :8080 / PROTECTED_HOST.
func TestReflexFilter_GamblingDefaceInject(t *testing.T) {
	filter := NewReflexFilter()

	tests := []struct {
		name       string
		payload    string
		wantThreat bool
		wantType   string
	}{
		{
			name:       "query slot gacor",
			payload:    "q=slot-gacor&ref=home",
			wantThreat: true,
			wantType:   "GAMBLING_DEFACE_INJECT_DETECTED",
		},
		{
			name:       "path judi online",
			payload:    "/promo/judi-online",
			wantThreat: true,
			wantType:   "GAMBLING_DEFACE_INJECT_DETECTED",
		},
		{
			name:       "body situs togel",
			payload:    "html=<a href='/x'>situs togel</a>",
			wantThreat: true,
			wantType:   "GAMBLING_DEFACE_INJECT_DETECTED",
		},
		{
			name:       "graffiti defaced by",
			payload:    "title=defaced by unknown",
			wantThreat: true,
			wantType:   "GAMBLING_DEFACE_INJECT_DETECTED",
		},
		{
			name:       "iframe casino snippet",
			payload:    `<iframe src="https://example.test/casino"></iframe>`,
			wantThreat: true,
			wantType:   "GAMBLING_DEFACE_INJECT_DETECTED",
		},
		{
			name:       "benign parking slot",
			payload:    "q=slot+parkir+motor",
			wantThreat: false,
		},
		{
			name:       "benign school page",
			payload:    "/profil-sekolah?q=ppdb",
			wantThreat: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, kind := filter.InspectRequest(tt.payload)
			if got != tt.wantThreat {
				t.Fatalf("InspectRequest(%q) threat=%v type=%s wantThreat=%v", tt.payload, got, kind, tt.wantThreat)
			}
			if tt.wantThreat && kind != tt.wantType {
				t.Fatalf("threat type %s want %s", kind, tt.wantType)
			}
		})
	}
}

func TestReflexFilter_GamblingDefaceHeader(t *testing.T) {
	filter := NewReflexFilter()
	hit, kind := filter.InspectHeaders(map[string][]string{
		"Referer": {"https://example.test/daftar-slot"},
	})
	if !hit || kind != "GAMBLING_DEFACE_INJECT_DETECTED" {
		t.Fatalf("Referer daftar-slot should match pagar tipis, got hit=%v type=%s", hit, kind)
	}
}
