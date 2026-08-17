package proxy

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/ai"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
)

func testProxy(t *testing.T) *NexusProxy {
	t.Helper()
	mtd.MtdRedis = &mtd.RedisClientWrapper{Enabled: false}
	np, err := NewNexusProxy("http://localhost:9000", ai.NewReflexFilter(), &ai.ReasoningEngine{}, nil, nil, nil)
	if err != nil {
		t.Fatalf("proxy: %v", err)
	}
	return np
}

func TestAntibodySignal_CountOnlyNoPayload(t *testing.T) {
	np := testProxy(t)
	np.AddAntibody("secret-pattern-must-not-leak")
	req := httptest.NewRequest(http.MethodGet, "/nexred/lab/antibody-signal", nil)
	rr := httptest.NewRecorder()
	AntibodySignalHandler(np).ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rr.Code, rr.Body.String())
	}
	body := rr.Body.String()
	if strings.Contains(body, "secret-pattern") || strings.Contains(body, LabVaccineAntibody) {
		t.Fatalf("signal leaked patch text: %s", body)
	}
	var payload map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload["antibody_count"] != float64(1) {
		t.Fatalf("count: %#v", payload["antibody_count"])
	}
	if rr.Header().Get("X-Nexus-Antibody-Count") != "1" {
		t.Fatalf("header count %s", rr.Header().Get("X-Nexus-Antibody-Count"))
	}
}

func TestLabVaccineProbe_VaccinatesAndStaysUnique(t *testing.T) {
	np := testProxy(t)
	h := LabVaccineProbeHandler(np)
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/nexred/lab/vaccine-probe", strings.NewReader(`{"nexred_posture":"vaccine-probe"}`))
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Fatalf("probe %d: want 403 got %d", i, rr.Code)
		}
		if rr.Header().Get("X-Nexus-Waf") != "1" {
			t.Fatalf("missing WAF header")
		}
	}
	if np.AntibodyCount() != 1 {
		t.Fatalf("unique count want 1 got %d", np.AntibodyCount())
	}
	if _, ok := np.Patches.Load(LabVaccineAntibody); !ok {
		t.Fatal("lab vaccine token missing from map")
	}
}

func TestPublicDataPlane_AntibodyLabRoutesReachHandler(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	h := PublicDataPlane(inner)
	req := httptest.NewRequest(http.MethodGet, "/nexred/lab/antibody-signal", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("signal: want 200 got %d", rr.Code)
	}
	req2 := httptest.NewRequest(http.MethodPost, "/nexred/lab/vaccine-probe", strings.NewReader(`{}`))
	rr2 := httptest.NewRecorder()
	h.ServeHTTP(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("vaccine path must be public: got %d", rr2.Code)
	}
}

func TestPublicDataPlane_SOCAntibodiesStay404(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[{"pattern":"leak"}]`))
	})
	h := PublicDataPlane(inner)
	req := httptest.NewRequest(http.MethodGet, "/api/antibodies", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("SOC antibodies on WAF: want 404 got %d", rr.Code)
	}
	if strings.Contains(rr.Body.String(), "pattern") {
		t.Fatalf("must not leak SOC antibody list: %s", rr.Body.String())
	}
}
