// Package ai menyediakan antarmuka terpadu ke model kecerdasan buatan untuk pertahanan siber aktif.
package ai

import (
	"fmt"
)

// ReasoningEngine bertindak sebagai Facade Pattern (Pola Fasad) yang menjaga call site gateway tetap stabil
// untuk mengakses modul Analisis Forensik Mendalam (Reasoning Layer).
//
// Alasan Arsitektural (Why):
// Mengisolasi logika komunikasi local inference dari proxy_core.go. Jika backend model lokal berubah di masa depan
// (misalnya berpindah dari satu runtime Ollama ke runtime lokal lain), kode inti di proxy_core.go tidak perlu
// mengalami modifikasi sama sekali (ISO 25010 - Maintainability & Modularity).
type ReasoningEngine struct {
	client  *CognitiveCoreClient
	Enabled bool
}

// NewReasoningEngine mengkonstruksi ReasoningEngine untuk model reasoning lokal aktif.
func NewReasoningEngine() *ReasoningEngine {
	return &ReasoningEngine{
		client:  NewCognitiveCoreClient(""),
		Enabled: true,
	}
}

// AnalyzeIntent adalah antarmuka utama yang dipanggil oleh proxy_core.go.
// Menghasilkan analisis forensik terstruktur secara asinkron dari model AI tingkat tinggi.
func (re *ReasoningEngine) AnalyzeIntent(payload string) (*CognitiveForensicResult, error) {
	if !re.Enabled {
		return nil, fmt.Errorf("reasoning engine disabled")
	}
	return re.client.AnalyzeIntent(payload)
}
