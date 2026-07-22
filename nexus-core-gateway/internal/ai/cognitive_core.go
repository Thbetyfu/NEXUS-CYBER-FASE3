// Package ai mengimplementasikan integrasi kecerdasan buatan untuk analisis forensik siber tingkat lanjut.
package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// CognitiveCoreClient mengimplementasikan Reasoning Layer (Pemberi Keputusan Forensik Fase 2).
// Seluruh request inference dijaga tetap lokal agar analisis forensik tidak bergantung pada vendor cloud.
type CognitiveCoreClient struct {
	APIKey   string
	Model    string
	Endpoint string
}

// MitigationAction merepresentasikan rekomendasi penanganan otomatis yang dihasilkan secara cerdas oleh AI.
type MitigationAction struct {
	ActionType string                 `json:"action_type"` // BLOCK_IP | ISOLATE | PATCH | REDIRECT_HONEYPOT | SHUFFLE_MTD
	Priority   string                 `json:"priority"`    // CRITICAL | HIGH | MEDIUM
	Parameters map[string]interface{} `json:"parameters"`  // Parameter dinamis tambahan (seperti durasi IP block)
}

// CognitiveForensicResult menyimpan respon analisis forensik terstruktur dari Reasoning Layer NEX-AI.
type CognitiveForensicResult struct {
	ThreatVerdict     string             `json:"threat_verdict"` // Verdict: CONFIRMED_MALICIOUS | FALSE_POSITIVE | ADVANCED_PERSISTENT
	AttackerIntent    string             `json:"attacker_intent"`
	AttackVector      string             `json:"attack_vector"`
	Confidence        float64            `json:"confidence"`
	MitigationActions []MitigationAction `json:"mitigation_actions"`
	ForensicSummary   string             `json:"forensic_summary"` // Laporan forensik formal untuk regulator
}

// AttackContext membungkus data historis dan intelijen ancaman dinamis yang dikirim ke AI.
type AttackContext struct {
	AttackHistory []map[string]interface{} `json:"attack_history"` // Riwayat serangan IP yang sama dalam 24 jam terakhir
	ThreatIntel   map[string]interface{}   `json:"threat_intel"`   // Umpan ancaman STIX/TAXII dari BSSN atau ID-CERT
	SystemState   SystemState              `json:"system_state"`
}

// SystemState mencerminkan status kesehatan infrastruktur saat ini.
type SystemState struct {
	ActiveIncidents   int    `json:"active_incidents"`
	LastMTDShuffle    string `json:"last_mtd_shuffle"`
	CurrentAlertLevel string `json:"current_alert_level"`
}

// NEX_AI_SYSTEM_PROMPT mendikte kepribadian, misi, dan kontrak output dari Reasoning Layer.
// Insting AI diarahkan untuk melindungi infrastruktur vital Indonesia (OJK, Bank Indonesia)
// serta mematuhi UU Pelindungan Data Pribadi (UU PDP) No. 27/2022.
const NEX_AI_SYSTEM_PROMPT = `You are an expert cybersecurity analyst for Indonesia's critical 
digital infrastructure. You receive escalated threats that have been pre-screened 
by a rapid classifier (Qwen3 32B).

Your job:
1. Analyze the attacker's INTENT based on full context
2. Determine if this is a confirmed threat or false positive
3. Recommend specific autonomous mitigation actions
4. Write a forensic summary for regulators (BSSN, BI, OJK)

Think step by step internally, but your FINAL response must be ONLY valid JSON.
Indonesian context: Protect PDNS, BI, OJK infrastructure. Comply with UU PDP No. 27/2022.`

// NewCognitiveCoreClient mengkonstruksi client CognitiveCoreClient secara dinamis.
//
// Alasan Arsitektural (Why):
// Seluruh reasoning dijaga pada endpoint inferensi lokal agar analisis forensik tidak pernah keluar ke vendor eksternal.
func NewCognitiveCoreClient(model string) *CognitiveCoreClient {
	return &CognitiveCoreClient{
		APIKey:   configuredNexAIAPIKey(),
		Model:    configuredNexAIReasoningModel(model),
		Endpoint: configuredNexAIEndpoint(),
	}
}

// LocalNexAiResult merepresentasikan format JSON lokal dari model NEX-AI.
type LocalNexAiResult struct {
	Status      string  `json:"status"`
	ThreatScore float64 `json:"threat_score"`
	AttackType  string  `json:"attack_type"`
	Reason      string  `json:"reason"`
}

// MapToForensicResult mengubah hasil analisis lokal menjadi struktur standar gateway (Adapter Pattern).
func (local *LocalNexAiResult) MapToForensicResult() *CognitiveForensicResult {
	verdict := "FALSE_POSITIVE"
	if local.Status == "MALICIOUS" {
		verdict = "CONFIRMED_MALICIOUS"
	} else if local.Status == "SUSPICIOUS" {
		verdict = "SUSPICIOUS"
	}

	actions := []MitigationAction{}
	if local.Status == "MALICIOUS" {
		actions = append(actions, MitigationAction{
			ActionType: "BLOCK_IP",
			Priority:   "HIGH",
			Parameters: map[string]interface{}{"duration": "24h"},
		})
	}

	return &CognitiveForensicResult{
		ThreatVerdict:     verdict,
		AttackerIntent:    "Exploitation attempt detected via local SLM classification",
		AttackVector:      local.AttackType,
		Confidence:        local.ThreatScore,
		MitigationActions: actions,
		ForensicSummary:   local.Reason,
	}
}

// AnalyzeEscalatedThreat melakukan analisis forensik mendalam pada payload yang dicurigai.
//
// Alasan Arsitektural (Why):
// Fungsi ini didesain agar dijalankan secara asinkron (goroutine) dengan context budget 30 detik.
// Proses ini sengaja tidak memblokir (non-blocking) arus request trafik utama pengguna demi menjamin
// tingkat kelancaran respons aplikasi (low latency proxy) tetap optimal.
func (l *CognitiveCoreClient) AnalyzeEscalatedThreat(qwenResult *QwenResult, payload string, ctx AttackContext) (*CognitiveForensicResult, error) {
	var systemPrompt string
	var userPrompt string

	// SELALU gunakan NEX-AI lokal - tidak ada fallback
	systemPrompt = "Lakukan klasifikasi payload HTTP ini. Tentukan status (BENIGN, SUSPICIOUS, MALICIOUS), tipe serangan (SQL_INJECTION, CROSS_SITE_SCRIPTING, PATH_TRAVERSAL, COMMAND_INJECTION, ZERO_DAY_BYPASS, NONE), dan threat score. Kembalikan respons dalam format JSON valid tanpa penjelasan teks lain."
	userPrompt = payload

	reqBody, _ := json.Marshal(localAIChatRequest{
		Model: l.Model,
		Messages: []localAIChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	})

	req, err := http.NewRequest("POST", l.Endpoint, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("ai_request_build: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+l.APIKey)
	req.Header.Set("Content-Type", "application/json")

	// Anggaran waktu 30 detik agar model reasoning lokal memiliki waktu analisis yang cukup.
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai_request_timeout: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var orResp localAIChatResponse
	if err := json.Unmarshal(body, &orResp); err != nil || len(orResp.Choices) == 0 {
		return nil, fmt.Errorf("ai_parse_response: %s", string(body)[:min2(len(body), 200)])
	}

	rawContent := orResp.Choices[0].Message.Content
	return ParseCognitiveResponse(rawContent)
}

// AnalyzeIntent adalah antarmuka pembungkus ramah warisan (legacy) untuk proxy_core.go.
func (l *CognitiveCoreClient) AnalyzeIntent(payload string) (*CognitiveForensicResult, error) {
	ctx := AttackContext{
		AttackHistory: []map[string]interface{}{},
		ThreatIntel:   map[string]interface{}{},
		SystemState:   SystemState{ActiveIncidents: 0, LastMTDShuffle: "unknown", CurrentAlertLevel: "NORMAL"},
	}
	return l.AnalyzeEscalatedThreat(nil, payload, ctx)
}

// ParseCognitiveResponse mengekstrak respon JSON NEX-AI secara tangguh menggunakan 3-Stage Parser.
func ParseCognitiveResponse(raw string) (*CognitiveForensicResult, error) {
	raw = strings.TrimSpace(raw)
	var jsonStr string

	// Stage 1: Coba temukan blok kode markdown ```json ... ```
	if idx := strings.Index(raw, "```json"); idx != -1 {
		end := strings.Index(raw[idx+7:], "```")
		if end != -1 {
			jsonStr = strings.TrimSpace(raw[idx+7 : idx+7+end])
		}
	}

	// Stage 2: Bracket Search jika markdown block tidak ada/gagal
	if jsonStr == "" {
		start := strings.Index(raw, "{")
		last := strings.LastIndex(raw, "}")
		if start != -1 && last != -1 && last > start {
			jsonStr = raw[start : last+1]
		}
	}

	// Stage 3: Gunakan string mentah jika bracket search gagal
	if jsonStr == "" {
		jsonStr = raw
	}

	// Coba unmarshal ke LocalNexAiResult terlebih dahulu untuk deteksi model lokal nex-ai-protect
	var localResult LocalNexAiResult
	if err := json.Unmarshal([]byte(jsonStr), &localResult); err == nil && localResult.Status != "" {
		return localResult.MapToForensicResult(), nil
	}

	// Unmarshal standar ke CognitiveForensicResult
	var result CognitiveForensicResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err == nil {
		return &result, nil
	}

	return nil, fmt.Errorf("cognitive_parse_error: %s", raw[:min2(len(raw), 200)])
}

func min2(a, b int) int {
	if a < b {
		return a
	}
	return b
}
