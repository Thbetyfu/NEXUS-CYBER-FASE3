package ai

import (
	"os"
	"strings"
)

const (
	defaultNexAIEndpoint       = "http://localhost:11434/api/chat"
	defaultNexAIAPIKey         = "dummy-key-for-local-usage"
	defaultNexAIReflexModel    = "nex-ai-reflex"
	defaultNexAIReasoningModel = "nex-ai-protect"
)

func configuredNexAIEndpoint() string {
	endpoint := strings.TrimSpace(os.Getenv("NEX_AI_ENDPOINT"))
	if endpoint == "" {
		return defaultNexAIEndpoint
	}
	return endpoint
}

func configuredNexAIAPIKey() string {
	apiKey := strings.TrimSpace(os.Getenv("NEX_AI_API_KEY"))
	if apiKey == "" {
		return defaultNexAIAPIKey
	}
	return apiKey
}

func isNexAIModel(name string) bool {
	raw := strings.ToLower(strings.TrimSpace(name))
	if !strings.HasPrefix(raw, "nex-ai-") {
		return false
	}
	foreign := []string{"qwen", "llama", "gpt", "chatgpt", "claude", "gemini", "mistral", "deepseek", "gemma", "phi-", "yi-"}
	for _, token := range foreign {
		if strings.Contains(raw, token) {
			return false
		}
	}
	return true
}

func canonicalNexAIModel(raw, fallback string) string {
	candidate := strings.TrimSpace(raw)
	if i := strings.Index(candidate, ":"); i >= 0 {
		candidate = candidate[:i]
	}
	if isNexAIModel(candidate) {
		return candidate
	}
	return fallback
}

func configuredNexAIReflexModel(model string) string {
	envModel := strings.TrimSpace(os.Getenv("NEX_AI_MODEL_REFLEX"))
	if envModel != "" {
		return canonicalNexAIModel(envModel, defaultNexAIReflexModel)
	}
	if strings.TrimSpace(model) == "" {
		return defaultNexAIReflexModel
	}
	return canonicalNexAIModel(model, defaultNexAIReflexModel)
}

func configuredNexAIReasoningModel(model string) string {
	envModel := strings.TrimSpace(os.Getenv("NEX_AI_MODEL_REASONING"))
	if envModel != "" {
		return canonicalNexAIModel(envModel, defaultNexAIReasoningModel)
	}
	if strings.TrimSpace(model) == "" {
		return defaultNexAIReasoningModel
	}
	return canonicalNexAIModel(model, defaultNexAIReasoningModel)
}
