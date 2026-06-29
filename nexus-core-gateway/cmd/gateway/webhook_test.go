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

	"github.com/nexus-cyber/nexus-core-gateway/internal/proxy"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestPaymentWebhookHandler(t *testing.T) {
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

	router := proxy.NewDynamicRouter(10 * time.Second)
	handler := paymentWebhookHandler(router, tel)

	// 1. Test invalid method (GET)
	reqGet := httptest.NewRequest(http.MethodGet, "/api/webhook/payment", nil)
	rrGet := httptest.NewRecorder()
	handler.ServeHTTP(rrGet, reqGet)
	if rrGet.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected 405 Method Not Allowed, got %d", rrGet.Code)
	}

	// 2. Test invalid status (pending)
	payloadPending, _ := json.Marshal(map[string]string{
		"domain": "test-webhook.localhost",
		"status": "pending",
	})
	reqPending := httptest.NewRequest(http.MethodPost, "/api/webhook/payment", bytes.NewBuffer(payloadPending))
	rrPending := httptest.NewRecorder()
	handler.ServeHTTP(rrPending, reqPending)
	if rrPending.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request for pending status, got %d. Body: %s", rrPending.Code, rrPending.Body.String())
	}

	// 3. Test successful payment & provisioning trigger
	payloadSuccess, _ := json.Marshal(map[string]string{
		"domain": "test-webhook.localhost",
		"status": "success",
	})
	reqSuccess := httptest.NewRequest(http.MethodPost, "/api/webhook/payment", bytes.NewBuffer(payloadSuccess))
	rrSuccess := httptest.NewRecorder()
	handler.ServeHTTP(rrSuccess, reqSuccess)
	if rrSuccess.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for successful payment, got %d. Body: %s", rrSuccess.Code, rrSuccess.Body.String())
	}

	// Check response JSON structure
	var respData map[string]interface{}
	if err := json.Unmarshal(rrSuccess.Body.Bytes(), &respData); err != nil {
		t.Fatalf("Failed to decode success response: %v", err)
	}
	if respData["status"] != "success" {
		t.Errorf("Expected status to be success, got %v", respData["status"])
	}
	if !strings.Contains(respData["target_url"].(string), "http://127.0.0.1:") {
		t.Errorf("Expected target_url to contain localhost target proxy string, got %v", respData["target_url"])
	}

	// Verify route was added to Dynamic Router
	target, exists := router.Lookup("test-webhook.localhost")
	if !exists {
		t.Error("Expected route test-webhook.localhost to be added to Dynamic Router, got false")
	}
	if target == "" {
		t.Error("Expected non-empty target URL route in router")
	}
}
