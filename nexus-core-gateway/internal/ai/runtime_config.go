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

func configuredNexAIReflexModel(model string) string {
	envModel := strings.TrimSpace(os.Getenv("NEX_AI_MODEL_REFLEX"))
	if envModel != "" {
		return envModel
	}
	if strings.TrimSpace(model) == "" {
		return defaultNexAIReflexModel
	}
	return strings.TrimSpace(model)
}

func configuredNexAIReasoningModel(model string) string {
	envModel := strings.TrimSpace(os.Getenv("NEX_AI_MODEL_REASONING"))
	if envModel != "" {
		return envModel
	}
	if strings.TrimSpace(model) == "" {
		return defaultNexAIReasoningModel
	}
	return strings.TrimSpace(model)
}
