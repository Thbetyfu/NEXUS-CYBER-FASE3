package proxy

import (
	"testing"
	"time"
)

func TestDynamicRouterWildcardAndFallback(t *testing.T) {
	router := NewDynamicRouter(10 * time.Second)

	// 1. Tambahkan pemetaan tepat, wildcard, dan fallback
	router.AddRoute("exact.tenant.localhost", "http://127.0.0.1:3001")
	router.AddRoute("*.tenant.localhost", "http://127.0.0.1:4001")
	router.AddRoute("*", "http://127.0.0.1:5001")

	// 2. Uji Pencocokan Tepat (Exact Match)
	target, found := router.Lookup("exact.tenant.localhost")
	if !found || target != "http://127.0.0.1:3001" {
		t.Errorf("Expected exact.tenant.localhost to map to http://127.0.0.1:3001, got %s (found: %v)", target, found)
	}

	// 3. Uji Pencocokan Wildcard Satu Tingkat (Single-level Wildcard)
	targetWildcard1, foundW1 := router.Lookup("app.tenant.localhost")
	if !foundW1 || targetWildcard1 != "http://127.0.0.1:4001" {
		t.Errorf("Expected app.tenant.localhost to match wildcard *.tenant.localhost, got %s (found: %v)", targetWildcard1, foundW1)
	}

	// 4. Uji Pencocokan Wildcard Multi Tingkat (Multi-level Wildcard)
	targetWildcard2, foundW2 := router.Lookup("api.v1.tenant.localhost")
	if !foundW2 || targetWildcard2 != "http://127.0.0.1:4001" {
		t.Errorf("Expected api.v1.tenant.localhost to match wildcard *.tenant.localhost, got %s (found: %v)", targetWildcard2, foundW2)
	}

	// 5. Uji Global Fallback
	targetFallback, foundFb := router.Lookup("unregistered-domain.localhost")
	if !foundFb || targetFallback != "http://127.0.0.1:5001" {
		t.Errorf("Expected unregistered-domain.localhost to fall back to global wildcard *, got %s (found: %v)", targetFallback, foundFb)
	}
}
