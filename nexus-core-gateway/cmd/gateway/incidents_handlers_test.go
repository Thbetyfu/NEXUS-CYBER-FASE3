package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestIncidentDigestRequiresWorkspace(t *testing.T) {
	h := incidentDigestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/incidents/digest?domain=all&format=md", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rr.Code, rr.Body.String())
	}
	var body map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("json: %v", err)
	}
	if body["error"] == "" {
		t.Fatal("expected error message")
	}
}

func TestIncidentDigestRejectsMissingDomain(t *testing.T) {
	h := incidentDigestHandler()
	req := httptest.NewRequest(http.MethodGet, "/api/incidents/digest", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", rr.Code)
	}
}
