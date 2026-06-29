package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
	"github.com/nexus-cyber/nexus-core-gateway/internal/proxy"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestCliExecuteSubUnsub(t *testing.T) {
	// Inisialisasi telemetry logger dummy
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		tel.Close()
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	}()

	shuffler := mtd.NewTopologyShuffler("127.0.0.1", []int{3001, 3002}, 60, nil)
	router := proxy.NewDynamicRouter(10 * time.Second)
	handler := cliExecuteHandler(tel, shuffler, router)

	testDomain := "test-cli-sub.localhost"

	// 1. Jalankan perintah "/sub [domain]"
	payloadSub, _ := json.Marshal(map[string]string{
		"command": "/sub " + testDomain,
	})
	reqSub := httptest.NewRequest(http.MethodPost, "/api/cli/execute", bytes.NewBuffer(payloadSub))
	rrSub := httptest.NewRecorder()
	handler.ServeHTTP(rrSub, reqSub)

	if rrSub.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for /sub execution, got %d. Body: %s", rrSub.Code, rrSub.Body.String())
	}

	var respSub map[string]interface{}
	if err := json.Unmarshal(rrSub.Body.Bytes(), &respSub); err != nil {
		t.Fatalf("Failed to decode sub response: %v", err)
	}

	subOutput := respSub["response"].(string)
	if !strings.Contains(subOutput, "[SUCCESS]") || !strings.Contains(subOutput, "activated") {
		t.Errorf("Expected success output for CLI sub, got: %s", subOutput)
	}

	// Pastikan rute dimasukkan ke Dynamic Router
	targetSub, existsSub := router.Lookup(testDomain)
	if !existsSub || targetSub == "" {
		t.Errorf("Expected route %s to be created in Dynamic Router, got false", testDomain)
	}

	// 2. Jalankan perintah "/unsub [domain]"
	payloadUnsub, _ := json.Marshal(map[string]string{
		"command": "/unsub " + testDomain,
	})
	reqUnsub := httptest.NewRequest(http.MethodPost, "/api/cli/execute", bytes.NewBuffer(payloadUnsub))
	rrUnsub := httptest.NewRecorder()
	handler.ServeHTTP(rrUnsub, reqUnsub)

	if rrUnsub.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for /unsub execution, got %d. Body: %s", rrUnsub.Code, rrUnsub.Body.String())
	}

	var respUnsub map[string]interface{}
	if err := json.Unmarshal(rrUnsub.Body.Bytes(), &respUnsub); err != nil {
		t.Fatalf("Failed to decode unsub response: %v", err)
	}

	unsubOutput := respUnsub["response"].(string)
	if !strings.Contains(unsubOutput, "[WARNING]") || !strings.Contains(unsubOutput, "revoked") {
		t.Errorf("Expected warning output for CLI unsub, got: %s", unsubOutput)
	}

	// Pastikan rute dihapus dari Dynamic Router
	_, existsAfter := router.Lookup(testDomain)
	if existsAfter {
		t.Errorf("Expected route %s to be deleted from Dynamic Router, but it still exists", testDomain)
	}
}
