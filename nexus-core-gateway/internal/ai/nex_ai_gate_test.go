package ai

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNexAIRequiredFromEnv_DefaultSkip(t *testing.T) {
	t.Setenv("NEX_AI_REQUIRED", "")
	if NexAIRequiredFromEnv() {
		t.Fatal("unset NEX_AI_REQUIRED must skip the gateway gate")
	}
	t.Setenv("NEX_AI_REQUIRED", "0")
	if NexAIRequiredFromEnv() {
		t.Fatal("NEX_AI_REQUIRED=0 must skip")
	}
	t.Setenv("NEX_AI_REQUIRED", "false")
	if NexAIRequiredFromEnv() {
		t.Fatal("NEX_AI_REQUIRED=false must skip")
	}
}

func TestNexAIRequiredFromEnv_ExplicitOn(t *testing.T) {
	t.Setenv("NEX_AI_REQUIRED", "1")
	if !NexAIRequiredFromEnv() {
		t.Fatal("NEX_AI_REQUIRED=1 must enable the gate")
	}
}

func TestNamesFromTagsJSON_BothPresent(t *testing.T) {
	raw := []byte(`{"models":[{"name":"nex-ai-protect:latest"},{"name":"nex-ai-reflex:latest"}]}`)
	missing := MissingRequiredNexAI(NamesFromTagsJSON(raw))
	if len(missing) != 0 {
		t.Fatalf("expected no missing models, got %v", missing)
	}
}

func TestNamesFromTagsJSON_MissingReflex(t *testing.T) {
	raw := []byte(`{"models":[{"name":"nex-ai-protect"}]}`)
	missing := MissingRequiredNexAI(NamesFromTagsJSON(raw))
	if len(missing) != 1 || missing[0] != defaultNexAIReflexModel {
		t.Fatalf("expected missing reflex, got %v", missing)
	}
}

func TestNamesFromTagsJSON_HubDoesNotSatisfy(t *testing.T) {
	raw := []byte(`{"models":[{"name":"qwen2.5:7b"},{"name":"llama3:latest"}]}`)
	missing := MissingRequiredNexAI(NamesFromTagsJSON(raw))
	if len(missing) != 2 {
		t.Fatalf("expected both required models missing, got %v", missing)
	}
}

func TestNamesFromTagsJSON_MalformedIsFailClosed(t *testing.T) {
	missing := MissingRequiredNexAI(NamesFromTagsJSON([]byte(`not-json`)))
	if len(missing) != 2 {
		t.Fatalf("malformed tags must miss both models, got %v", missing)
	}
}

func TestEnforceNexAIRequired_SkippedWhenFalse(t *testing.T) {
	t.Setenv("NEX_AI_REQUIRED", "0")
	if err := EnforceNexAIRequired(context.Background()); err != nil {
		t.Fatalf("skip path must not call Ollama: %v", err)
	}
}

func TestEnforceNexAIRequired_SkippedWhenUnset(t *testing.T) {
	t.Setenv("NEX_AI_REQUIRED", "")
	if err := EnforceNexAIRequired(context.Background()); err != nil {
		t.Fatalf("unset must skip: %v", err)
	}
}

func TestEnforceNexAIRequired_OKWhenBothPresent(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/tags" {
			http.NotFound(w, r)
			return
		}
		_, _ = io.WriteString(w, `{"models":[{"name":"nex-ai-protect:latest"},{"name":"nex-ai-reflex"}]}`)
	}))
	defer srv.Close()

	t.Setenv("NEX_AI_REQUIRED", "1")
	t.Setenv("NEX_AI_TAGS_URL", srv.URL+"/api/tags")
	if err := EnforceNexAIRequired(context.Background()); err != nil {
		t.Fatalf("both models present: %v", err)
	}
}

func TestEnforceNexAIRequired_FailsWhenMissing(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"models":[{"name":"qwen2.5:3b"}]}`)
	}))
	defer srv.Close()

	t.Setenv("NEX_AI_REQUIRED", "1")
	t.Setenv("NEX_AI_TAGS_URL", srv.URL+"/api/tags")
	err := EnforceNexAIRequired(context.Background())
	if err == nil {
		t.Fatal("expected fail-closed when nex-ai-* missing")
	}
	text := err.Error()
	if !strings.Contains(text, "Model AI tidak ada. Silakan pasang terlebih dahulu.") {
		t.Fatalf("missing Indonesian title, got %q", text)
	}
	if !strings.Contains(text, "nex_ai_q4_k_m.gguf") || !strings.Contains(text, "IMPORT-OLLAMA.bat") {
		t.Fatalf("missing honest install steps, got %q", text)
	}
	if !strings.Contains(text, "nex-ai-protect") || !strings.Contains(text, "nex-ai-reflex") {
		t.Fatalf("must name both required models, got %q", text)
	}
}

func TestConfiguredNexAITagsURL_FromChatEndpoint(t *testing.T) {
	t.Setenv("NEX_AI_TAGS_URL", "")
	t.Setenv("NEX_AI_ENDPOINT", "http://host.docker.internal:11434/api/chat")
	got := configuredNexAITagsURL()
	want := "http://host.docker.internal:11434/api/tags"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
