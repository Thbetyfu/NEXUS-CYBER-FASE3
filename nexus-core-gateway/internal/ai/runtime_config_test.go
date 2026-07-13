package ai

import "testing"

func TestConfiguredNexAIDefaults(t *testing.T) {
	t.Setenv("NEX_AI_ENDPOINT", "")
	t.Setenv("NEX_AI_API_KEY", "")
	t.Setenv("NEX_AI_MODEL_REFLEX", "")
	t.Setenv("NEX_AI_MODEL_REASONING", "")

	if got := configuredNexAIEndpoint(); got != defaultNexAIEndpoint {
		t.Fatalf("expected default endpoint %q, got %q", defaultNexAIEndpoint, got)
	}
	if got := configuredNexAIAPIKey(); got != defaultNexAIAPIKey {
		t.Fatalf("expected default API key %q, got %q", defaultNexAIAPIKey, got)
	}
	if got := configuredNexAIReflexModel(""); got != defaultNexAIReflexModel {
		t.Fatalf("expected default reflex model %q, got %q", defaultNexAIReflexModel, got)
	}
	if got := configuredNexAIReasoningModel(""); got != defaultNexAIReasoningModel {
		t.Fatalf("expected default reasoning model %q, got %q", defaultNexAIReasoningModel, got)
	}
}

func TestConfiguredNexAIEnvironmentOverrides(t *testing.T) {
	t.Setenv("NEX_AI_ENDPOINT", "http://127.0.0.1:11434/api/chat")
	t.Setenv("NEX_AI_API_KEY", "local-test-key")
	t.Setenv("NEX_AI_MODEL_REFLEX", "reflex-override")
	t.Setenv("NEX_AI_MODEL_REASONING", "reasoning-override")

	if got := configuredNexAIEndpoint(); got != "http://127.0.0.1:11434/api/chat" {
		t.Fatalf("expected overridden endpoint, got %q", got)
	}
	if got := configuredNexAIAPIKey(); got != "local-test-key" {
		t.Fatalf("expected overridden API key, got %q", got)
	}
	if got := configuredNexAIReflexModel("custom-reflex"); got != "reflex-override" {
		t.Fatalf("expected reflex override to win, got %q", got)
	}
	if got := configuredNexAIReasoningModel("custom-reasoning"); got != "reasoning-override" {
		t.Fatalf("expected reasoning override to win, got %q", got)
	}
}
