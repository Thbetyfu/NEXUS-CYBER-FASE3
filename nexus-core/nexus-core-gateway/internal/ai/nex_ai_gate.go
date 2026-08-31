package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// Required local Ollama names. Hub tags (qwen/llama/gpt) never satisfy this gate.
var requiredNexAIModels = []string{defaultNexAIReasoningModel, defaultNexAIReflexModel}

const defaultNexAITagsTimeout = 5 * time.Second

// Operator-facing text. Keep in sync with scripts/check_nex_ai.py
const nexAIMissingMessage = `============================================================
  Model AI tidak ada. Silakan pasang terlebih dahulu.
============================================================

NEX-AI milik Nexus. Bobot TIDAK diunduh dari Ollama Hub.
Jangan jalankan: ollama pull qwen / llama / gpt

Cara pasang:
  1. Salin nex_ai_q4_k_m.gguf ke folder nex-ai-models\
  2. Jalankan nex-ai-models\IMPORT-OLLAMA.bat
  3. Pastikan Ollama nyala di laptop ini
  4. Cek: ollama list  - harus ada nex-ai-protect DAN nex-ai-reflex

Lewati gerbang ini hanya untuk CI: set NEX_AI_REQUIRED=0
(bukan pengganti Hub; lab di PC ini tetap wajib model lokal).
============================================================`

type ollamaTagsResponse struct {
	Models []struct {
		Name string `json:"name"`
	} `json:"models"`
}

// NexAIRequiredFromEnv is true only for an explicit on-value.
// Unset / empty / 0 keeps unit tests and go run from calling Ollama.
func NexAIRequiredFromEnv() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("NEX_AI_REQUIRED"))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func normalizeOllamaModelName(name string) string {
	raw := strings.ToLower(strings.TrimSpace(name))
	if i := strings.Index(raw, ":"); i >= 0 {
		raw = raw[:i]
	}
	return raw
}

// NamesFromTagsJSON parses GET /api/tags. Malformed input is empty (fail-closed).
func NamesFromTagsJSON(raw []byte) []string {
	var payload ollamaTagsResponse
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil
	}
	names := make([]string, 0, len(payload.Models))
	for _, model := range payload.Models {
		if n := normalizeOllamaModelName(model.Name); n != "" {
			names = append(names, n)
		}
	}
	return names
}

// MissingRequiredNexAI returns required names that are not in the installed set.
func MissingRequiredNexAI(names []string) []string {
	have := make(map[string]struct{}, len(names))
	for _, name := range names {
		have[normalizeOllamaModelName(name)] = struct{}{}
	}
	var missing []string
	for _, required := range requiredNexAIModels {
		if _, ok := have[required]; !ok {
			missing = append(missing, required)
		}
	}
	return missing
}

func configuredNexAITagsURL() string {
	if explicit := strings.TrimSpace(os.Getenv("NEX_AI_TAGS_URL")); explicit != "" {
		return explicit
	}
	endpoint := strings.TrimRight(configuredNexAIEndpoint(), "/")
	switch {
	case strings.HasSuffix(endpoint, "/api/chat"):
		return strings.TrimSuffix(endpoint, "/api/chat") + "/api/tags"
	case strings.HasSuffix(endpoint, "/api"):
		return endpoint + "/tags"
	default:
		return endpoint + "/api/tags"
	}
}

func formatNexAIMissing(reason string) error {
	return fmt.Errorf("%s\n\n%s", strings.TrimSpace(reason), nexAIMissingMessage)
}

// EnforceNexAIRequired fails closed when NEX_AI_REQUIRED is on and local
// Ollama does not list both nex-ai-protect and nex-ai-reflex.
func EnforceNexAIRequired(ctx context.Context) error {
	return enforceNexAIRequired(ctx, http.DefaultClient)
}

func enforceNexAIRequired(ctx context.Context, client *http.Client) error {
	if !NexAIRequiredFromEnv() {
		return nil
	}
	url := configuredNexAITagsURL()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return formatNexAIMissing(fmt.Sprintf("[GAGAL] URL tags NEX-AI tidak valid: %v.", err))
	}
	if client == nil {
		client = http.DefaultClient
	}
	httpClient := *client
	if httpClient.Timeout == 0 {
		httpClient.Timeout = defaultNexAITagsTimeout
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		return formatNexAIMissing(fmt.Sprintf("[GAGAL] Ollama tidak merespons di %s (%v).", url, err))
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return formatNexAIMissing(fmt.Sprintf("[GAGAL] Gagal membaca /api/tags dari %s.", url))
	}
	if resp.StatusCode >= 400 {
		return formatNexAIMissing(fmt.Sprintf("[GAGAL] Ollama menolak %s (HTTP %d).", url, resp.StatusCode))
	}
	missing := MissingRequiredNexAI(NamesFromTagsJSON(body))
	if len(missing) == 0 {
		return nil
	}
	return formatNexAIMissing(fmt.Sprintf("[GAGAL] Model hilang di Ollama lokal: %s.", strings.Join(missing, ", ")))
}
