package proxy

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/utils"
)

const (
	defaultGoldenTTL      = 60 * time.Second
	defaultGoldenStale    = time.Hour
	defaultGoldenMaxBody  = 512 * 1024
	defaultGoldenMaxItems = 128
	maxGoldenQueryBytes   = 128
)

var goldenHopHeaders = map[string]struct{}{
	"Connection":          {},
	"Keep-Alive":          {},
	"Proxy-Authenticate":  {},
	"Proxy-Authorization": {},
	"Te":                  {},
	"Trailers":            {},
	"Transfer-Encoding":   {},
	"Upgrade":             {},
}

// goldenRecord is a public GET snapshot stored after WAF allow.
type goldenRecord struct {
	status     int
	header     http.Header
	body       []byte
	storedAt   time.Time
	freshUntil time.Time
	staleUntil time.Time
}

// GoldenGETCache serves cacheable public GET/HEAD from RAM at the WAF.
// Why: remote origins (Vercel) add RTT; a small golden snapshot keeps the
// portfolio reachable from the edge if origin is slow or returns 5xx.
// Not a CDN, not authenticated content, not /api or Job lab routes.
type GoldenGETCache struct {
	enabled    bool
	ttl        time.Duration
	stale      time.Duration
	maxBody    int
	maxEntries int
	mu         sync.Mutex
	items      map[string]*goldenRecord
}

// NewGoldenGETCacheForOrigin enables the cache for https origins by default.
// NEXUS_GOLDEN_GET_CACHE=0/1 overrides. Loopback/http docker origin stays off
// so START-OFFLINE self-heal is visible immediately unless the operator opts in.
func NewGoldenGETCacheForOrigin(origin string) *GoldenGETCache {
	c := &GoldenGETCache{
		enabled:    goldenGETEnabled(origin),
		ttl:        envDurationSeconds("NEXUS_GOLDEN_GET_TTL_SECONDS", defaultGoldenTTL),
		stale:      envDurationSeconds("NEXUS_GOLDEN_GET_STALE_SECONDS", defaultGoldenStale),
		maxBody:    defaultGoldenMaxBody,
		maxEntries: defaultGoldenMaxItems,
		items:      make(map[string]*goldenRecord),
	}
	if c.stale < c.ttl {
		c.stale = c.ttl
	}
	return c
}

func goldenGETEnabled(origin string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("NEXUS_GOLDEN_GET_CACHE"))) {
	case "0", "false", "off":
		return false
	case "1", "true", "on":
		return true
	}
	u, err := url.Parse(origin)
	if err != nil || u.Scheme == "" {
		return false
	}
	return strings.EqualFold(u.Scheme, "https")
}

func envDurationSeconds(name string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return fallback
	}
	return time.Duration(n) * time.Second
}

func goldenCacheKey(r *http.Request) string {
	host := utils.RequestHost(r.Host)
	return strings.ToLower(host) + "\n" + r.URL.Path + "\n" + r.URL.RawQuery
}

func goldenRequestBase(r *http.Request) bool {
	if r == nil {
		return false
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		return false
	}
	if r.Header.Get("Authorization") != "" {
		return false
	}
	if r.Header.Get("Range") != "" {
		return false
	}
	path := r.URL.Path
	if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/nexred/") {
		return false
	}
	if len(r.URL.RawQuery) > maxGoldenQueryBytes {
		return false
	}
	for _, c := range r.Cookies() {
		if c.Name == "nexus_csrf" {
			continue
		}
		return false
	}
	return true
}

func goldenRequestMayLookup(r *http.Request) bool {
	if !goldenRequestBase(r) {
		return false
	}
	cc := strings.ToLower(r.Header.Get("Cache-Control"))
	return !strings.Contains(cc, "no-cache") && !strings.Contains(cc, "no-store")
}

func goldenContentTypeOK(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
	switch ct {
	case "text/html", "text/css", "text/plain", "text/javascript",
		"application/javascript", "application/ecmascript",
		"image/svg+xml", "application/wasm":
		return true
	}
	return strings.HasPrefix(ct, "image/") || strings.HasPrefix(ct, "font/")
}

func responseForbidsStore(h http.Header) bool {
	if h == nil {
		return true
	}
	for _, c := range h.Values("Set-Cookie") {
		name, _, _ := strings.Cut(c, "=")
		if !strings.EqualFold(strings.TrimSpace(name), "nexus_csrf") {
			return true
		}
	}
	cc := strings.ToLower(h.Get("Cache-Control"))
	return strings.Contains(cc, "no-store") || strings.Contains(cc, "private")
}

// Wrap sits after WAF allow, around the origin reverse proxy.
func (c *GoldenGETCache) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c == nil || !c.enabled || next == nil {
			if next != nil {
				next.ServeHTTP(w, r)
			}
			return
		}
		if !goldenRequestBase(r) {
			next.ServeHTTP(w, r)
			return
		}
		key := goldenCacheKey(r)
		if goldenRequestMayLookup(r) {
			if rec := c.lookup(key, true); rec != nil {
				c.serve(w, r, rec, "HIT")
				return
			}
		}
		stale := c.lookup(key, false)
		if stale != nil && goldenRequestMayLookup(r) {
			buf := httptest.NewRecorder()
			next.ServeHTTP(buf, r)
			if originFailed(buf.Code) {
				c.serve(w, r, stale, "STALE")
				return
			}
			flushRecorder(w, buf)
			c.maybeStore(key, buf.Code, buf.Header(), buf.Body.Bytes())
			return
		}
		w.Header().Set("X-Nexus-Cache", "MISS")
		tee := &teeOriginWriter{ResponseWriter: w, limit: c.maxBody}
		next.ServeHTTP(tee, r)
		if !tee.oversize {
			c.maybeStore(key, tee.statusOrOK(), w.Header(), tee.body)
		}
	})
}

func originFailed(status int) bool {
	return status == 0 || status >= 500
}

func flushRecorder(w http.ResponseWriter, buf *httptest.ResponseRecorder) {
	dst := w.Header()
	for k, vals := range buf.Header() {
		for _, v := range vals {
			dst.Add(k, v)
		}
	}
	code := buf.Code
	if code == 0 {
		code = http.StatusOK
	}
	w.WriteHeader(code)
	_, _ = w.Write(buf.Body.Bytes())
}

func (c *GoldenGETCache) lookup(key string, freshOnly bool) *goldenRecord {
	c.mu.Lock()
	defer c.mu.Unlock()
	rec, ok := c.items[key]
	if !ok {
		return nil
	}
	now := time.Now()
	if now.After(rec.staleUntil) {
		delete(c.items, key)
		return nil
	}
	if freshOnly && now.After(rec.freshUntil) {
		return nil
	}
	return rec
}

func (c *GoldenGETCache) maybeStore(key string, status int, hdr http.Header, body []byte) {
	if status != http.StatusOK || len(body) == 0 || len(body) > c.maxBody {
		return
	}
	if !goldenContentTypeOK(hdr.Get("Content-Type")) || responseForbidsStore(hdr) {
		return
	}
	now := time.Now()
	stored := &goldenRecord{
		status:     status,
		header:     cloneGoldenHeader(hdr),
		body:       append([]byte(nil), body...),
		storedAt:   now,
		freshUntil: now.Add(c.ttl),
		staleUntil: now.Add(c.stale),
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[key] = stored
	for len(c.items) > c.maxEntries {
		c.evictOldestLocked()
	}
}

func (c *GoldenGETCache) evictOldestLocked() {
	var oldestKey string
	var oldest time.Time
	first := true
	for k, rec := range c.items {
		if first || rec.storedAt.Before(oldest) {
			oldestKey = k
			oldest = rec.storedAt
			first = false
		}
	}
	if oldestKey != "" {
		delete(c.items, oldestKey)
	}
}

// Purge drops every golden snapshot.
func (c *GoldenGETCache) Purge() {
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]*goldenRecord)
}

func (c *GoldenGETCache) serve(w http.ResponseWriter, r *http.Request, rec *goldenRecord, state string) {
	dst := w.Header()
	for k, vals := range rec.header {
		if _, hop := goldenHopHeaders[k]; hop {
			continue
		}
		for _, v := range vals {
			dst.Add(k, v)
		}
	}
	dst.Set("X-Nexus-Cache", state)
	dst.Set("Content-Length", strconv.Itoa(len(rec.body)))
	w.WriteHeader(rec.status)
	if r.Method == http.MethodHead {
		return
	}
	_, _ = w.Write(rec.body)
}

func cloneGoldenHeader(h http.Header) http.Header {
	out := make(http.Header, len(h))
	for k, vals := range h {
		if _, hop := goldenHopHeaders[k]; hop {
			continue
		}
		if strings.EqualFold(k, "X-Nexus-Cache") || strings.EqualFold(k, "Set-Cookie") {
			continue
		}
		out[k] = append([]string(nil), vals...)
	}
	return out
}

type teeOriginWriter struct {
	http.ResponseWriter
	limit    int
	status   int
	body     []byte
	oversize bool
}

func (t *teeOriginWriter) WriteHeader(code int) {
	t.status = code
	t.ResponseWriter.WriteHeader(code)
}

func (t *teeOriginWriter) Write(p []byte) (int, error) {
	if t.status == 0 {
		t.status = http.StatusOK
	}
	if !t.oversize {
		if len(t.body)+len(p) > t.limit {
			t.oversize = true
			t.body = nil
		} else {
			t.body = append(t.body, p...)
		}
	}
	return t.ResponseWriter.Write(p)
}

func (t *teeOriginWriter) statusOrOK() int {
	if t.status == 0 {
		return http.StatusOK
	}
	return t.status
}

func (t *teeOriginWriter) Flush() {
	if f, ok := t.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
