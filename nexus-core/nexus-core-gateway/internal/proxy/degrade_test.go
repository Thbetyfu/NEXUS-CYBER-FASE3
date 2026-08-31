package proxy

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/ai"
	"github.com/nexus-cyber/nexus-core-gateway/internal/licensing"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
	"github.com/redis/go-redis/v9"
)

// Lab token that must not look like SQLi/XSS so Reflex does not steal the case.
const degradeAntibodyToken = "nex-degrade-ab-token-zz9"

func enableLabLicense(t *testing.T) {
	t.Helper()
	licensing.InitLicenseVerifier("localhost", "nexus-cyber-dev")
	t.Cleanup(func() {
		licensing.InitLicenseVerifier("", "")
	})
}

func newDegradeProxy(t *testing.T, redisWrap *mtd.RedisClientWrapper) *NexusProxy {
	t.Helper()
	enableLabLicense(t)
	prev := mtd.MtdRedis
	mtd.MtdRedis = redisWrap
	t.Cleanup(func() { mtd.MtdRedis = prev })

	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("logger: %v", err)
	}
	t.Cleanup(func() { tel.Close() })

	np, err := NewNexusProxy("http://127.0.0.1:9", ai.NewReflexFilter(), &ai.ReasoningEngine{}, tel, nil, nil)
	if err != nil {
		t.Fatalf("proxy: %v", err)
	}
	return np
}

func serveDegrade(np *NexusProxy, originHit *atomic.Bool, path string) *httptest.ResponseRecorder {
	originHit.Store(false)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		originHit.Store(true)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("origin-ok"))
	})
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rr := httptest.NewRecorder()
	np.AIMiddleware(next).ServeHTTP(rr, req)
	return rr
}

func assertVirtualPatch403(t *testing.T, rr *httptest.ResponseRecorder, originHit *atomic.Bool) {
	t.Helper()
	if originHit.Load() {
		t.Fatal("origin was contacted; Layer 1 must drop in RAM without reverse-proxy")
	}
	if rr.Code != http.StatusForbidden {
		t.Fatalf("want 403 got %d body %s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Nexus-Waf") != "1" {
		t.Fatal("missing X-Nexus-Waf")
	}
	if rr.Header().Get("X-Nexus-Antibody-Count") == "" || rr.Header().Get("X-Nexus-Antibody-Count") == "0" {
		t.Fatalf("antibody count header %q", rr.Header().Get("X-Nexus-Antibody-Count"))
	}
	body := rr.Body.String()
	if !strings.Contains(body, `"status":"blocked"`) || !strings.Contains(body, `"layer":"virtual-patch"`) {
		t.Fatalf("unexpected body %s", body)
	}
}

func TestProxy_AntibodyHoldsWhenRedisDisabled(t *testing.T) {
	np := newDegradeProxy(t, &mtd.RedisClientWrapper{Enabled: false})
	np.AddAntibody(degradeAntibodyToken)

	var originHit atomic.Bool
	rr := serveDegrade(np, &originHit, "/page?q="+degradeAntibodyToken)
	assertVirtualPatch403(t, rr, &originHit)
}

func TestProxy_AntibodyHoldsAfterRedisNil(t *testing.T) {
	np := newDegradeProxy(t, &mtd.RedisClientWrapper{Enabled: false})
	np.AddAntibody(degradeAntibodyToken)
	mtd.MtdRedis = nil

	var originHit atomic.Bool
	rr := serveDegrade(np, &originHit, "/page?q="+degradeAntibodyToken)
	assertVirtualPatch403(t, rr, &originHit)
}

func TestProxy_AntibodyHoldsWithDeadRedisClient(t *testing.T) {
	np := newDegradeProxy(t, &mtd.RedisClientWrapper{Enabled: false})
	dead := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		DialTimeout: 50 * time.Millisecond,
		ReadTimeout: 50 * time.Millisecond,
	})
	t.Cleanup(func() { _ = dead.Close() })
	mtd.MtdRedis = &mtd.RedisClientWrapper{Enabled: true, Client: dead}
	np.AddAntibody(degradeAntibodyToken)

	var originHit atomic.Bool
	rr := serveDegrade(np, &originHit, "/page?q="+degradeAntibodyToken)
	assertVirtualPatch403(t, rr, &originHit)
}

func TestProxy_NoAntibodyReachesOrigin(t *testing.T) {
	np := newDegradeProxy(t, &mtd.RedisClientWrapper{Enabled: false})

	var originHit atomic.Bool
	rr := serveDegrade(np, &originHit, "/")
	if rr.Code != http.StatusOK {
		t.Fatalf("want 200 got %d body %s", rr.Code, rr.Body.String())
	}
	if !originHit.Load() {
		t.Fatal("origin must be reached when no antibody matches")
	}
	if !strings.Contains(rr.Body.String(), "origin-ok") {
		t.Fatalf("body %s", rr.Body.String())
	}
}

func TestProxy_AntibodyHoldsOnPOSTBodyWhenRedisDown(t *testing.T) {
	np := newDegradeProxy(t, &mtd.RedisClientWrapper{Enabled: false})
	np.AddAntibody(degradeAntibodyToken)

	var originHit atomic.Bool
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		originHit.Store(true)
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest(http.MethodPost, "/page", strings.NewReader("note="+degradeAntibodyToken))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	rr := httptest.NewRecorder()
	np.AIMiddleware(next).ServeHTTP(rr, req)
	assertVirtualPatch403(t, rr, &originHit)
}
