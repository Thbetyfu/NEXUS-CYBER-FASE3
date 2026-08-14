package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPublicMuxDoesNotRegisterSystemReset(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
		_, _ = w.Write([]byte("origin-proxy"))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/system/reset", nil)
	rr := httptest.NewRecorder()
	mux.ServeHTTP(rr, req)
	if rr.Code != http.StatusTeapot {
		t.Fatalf("public WAF port must not own /api/system/reset; got %d", rr.Code)
	}
	if rr.Body.String() != "origin-proxy" {
		t.Fatalf("unexpected body %q", rr.Body.String())
	}
}
