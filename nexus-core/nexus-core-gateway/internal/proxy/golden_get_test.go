package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func testGoldenCache() *GoldenGETCache {
	return &GoldenGETCache{
		enabled:    true,
		ttl:        time.Minute,
		stale:      time.Hour,
		maxBody:    4096,
		maxEntries: 16,
		items:      make(map[string]*goldenRecord),
	}
}

func goldenHTMLOrigin(body string, hits *atomic.Int32) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, body)
	})
}

func TestGoldenGET_MissThenHit(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))

	req := httptest.NewRequest(http.MethodGet, "http://portfolio.nexus-lab.test/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != 200 || !strings.Contains(rr.Body.String(), "ok") {
		t.Fatalf("miss: %d %s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("X-Nexus-Cache") != "MISS" {
		t.Fatalf("want MISS got %s", rr.Header().Get("X-Nexus-Cache"))
	}

	rr2 := httptest.NewRecorder()
	h.ServeHTTP(rr2, httptest.NewRequest(http.MethodGet, "http://portfolio.nexus-lab.test/", nil))
	if rr2.Header().Get("X-Nexus-Cache") != "HIT" {
		t.Fatalf("want HIT got %s body %s", rr2.Header().Get("X-Nexus-Cache"), rr2.Body.String())
	}
	if hits.Load() != 1 {
		t.Fatalf("origin hits %d want 1", hits.Load())
	}
}

func TestGoldenGET_CsrfCookieStillCaches(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))
	req := httptest.NewRequest(http.MethodGet, "http://portfolio.nexus-lab.test/", nil)
	req.AddCookie(&http.Cookie{Name: "nexus_csrf", Value: "abc"})
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	rr2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "http://portfolio.nexus-lab.test/", nil)
	req2.AddCookie(&http.Cookie{Name: "nexus_csrf", Value: "abc"})
	h.ServeHTTP(rr2, req2)
	if rr2.Header().Get("X-Nexus-Cache") != "HIT" {
		t.Fatalf("csrf cookie must not bypass golden GET, got %s", rr2.Header().Get("X-Nexus-Cache"))
	}
}

func TestGoldenGET_SessionCookieBypasses(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))
	req := httptest.NewRequest(http.MethodGet, "http://portfolio.nexus-lab.test/", nil)
	req.AddCookie(&http.Cookie{Name: "nexus_session", Value: "tok"})
	h.ServeHTTP(httptest.NewRecorder(), req)
	h.ServeHTTP(httptest.NewRecorder(), req)
	if hits.Load() != 2 {
		t.Fatalf("session GET must not share cache, hits=%d", hits.Load())
	}
}

func TestGoldenGET_SkipsAPIAndPOST(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/api/photos", nil))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/api/photos", nil))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "http://h.test/", strings.NewReader("x")))
	if hits.Load() != 3 {
		t.Fatalf("api/post must miss cache, hits=%d", hits.Load())
	}
}

func TestGoldenGET_CsrfSetCookieStillStores(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "text/html")
		w.Header().Set("Set-Cookie", "nexus_csrf=abc; Path=/; SameSite=Lax")
		_, _ = io.WriteString(w, "<html>ok</html>")
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if hits.Load() != 1 {
		t.Fatalf("csrf Set-Cookie must not block golden store, hits=%d", hits.Load())
	}
	if rr.Header().Get("X-Nexus-Cache") != "HIT" {
		t.Fatalf("want HIT got %s", rr.Header().Get("X-Nexus-Cache"))
	}
}

func TestGoldenGET_SetCookieNotStored(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "text/html")
		w.Header().Set("Set-Cookie", "id=1")
		_, _ = io.WriteString(w, "<html>ok</html>")
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if hits.Load() != 2 {
		t.Fatalf("Set-Cookie responses must not be stored, hits=%d", hits.Load())
	}
}

func TestGoldenGET_StaleOnOrigin5xx(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := hits.Add(1)
		if n == 1 {
			w.Header().Set("Content-Type", "text/html")
			_, _ = io.WriteString(w, "<html>golden</html>")
			return
		}
		w.WriteHeader(http.StatusBadGateway)
		_, _ = io.WriteString(w, "down")
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	key := goldenCacheKey(httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	c.mu.Lock()
	if rec := c.items[key]; rec != nil {
		rec.freshUntil = time.Now().Add(-time.Second)
	}
	c.mu.Unlock()

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if rr.Header().Get("X-Nexus-Cache") != "STALE" {
		t.Fatalf("want STALE got %s body %s", rr.Header().Get("X-Nexus-Cache"), rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "golden") {
		t.Fatalf("stale body %s", rr.Body.String())
	}
}

func TestGoldenGET_NoStorePrivate(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "text/html")
		w.Header().Set("Cache-Control", "private, max-age=60")
		_, _ = io.WriteString(w, "<html>ok</html>")
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if hits.Load() != 2 {
		t.Fatalf("private must not store, hits=%d", hits.Load())
	}
}

func TestGoldenGET_JSONNotStored(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"ok":true}`)
	}))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if hits.Load() != 2 {
		t.Fatalf("json must not be golden-cached, hits=%d", hits.Load())
	}
}

func TestGoldenGET_Purge(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	c.Purge()
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	if hits.Load() != 2 {
		t.Fatalf("after purge hits=%d", hits.Load())
	}
}

func TestGoldenGET_AutoEnableHTTPSOnly(t *testing.T) {
	t.Setenv("NEXUS_GOLDEN_GET_CACHE", "")
	on := NewGoldenGETCacheForOrigin("https://portfolio-website-three-ruddy-65.vercel.app")
	if !on.enabled {
		t.Fatal("https origin must enable golden GET by default")
	}
	off := NewGoldenGETCacheForOrigin("http://portfolio:3002")
	if off.enabled {
		t.Fatal("http docker origin must stay off by default (self-heal)")
	}
	t.Setenv("NEXUS_GOLDEN_GET_CACHE", "1")
	forced := NewGoldenGETCacheForOrigin("http://127.0.0.1:3002")
	if !forced.enabled {
		t.Fatal("env=1 must enable even on loopback")
	}
	t.Setenv("NEXUS_GOLDEN_GET_CACHE", "0")
	disabled := NewGoldenGETCacheForOrigin("https://example.vercel.app")
	if disabled.enabled {
		t.Fatal("env=0 must disable https origin")
	}
}

func TestGoldenGET_BrowserRefreshBypassesHit(t *testing.T) {
	c := testGoldenCache()
	var hits atomic.Int32
	h := c.Wrap(goldenHTMLOrigin("<html>ok</html>", &hits))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "http://h.test/", nil))
	req := httptest.NewRequest(http.MethodGet, "http://h.test/", nil)
	req.Header.Set("Cache-Control", "no-cache")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if hits.Load() != 2 {
		t.Fatalf("no-cache request must revalidate origin, hits=%d", hits.Load())
	}
}
