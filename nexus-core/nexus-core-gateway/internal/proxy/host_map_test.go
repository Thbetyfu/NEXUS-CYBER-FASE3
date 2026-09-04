package proxy

import (
	"testing"
	"time"
)

func TestParseHostMapJSON_WrappedAndSimple(t *testing.T) {
	wrapped, err := ParseHostMapJSON([]byte(`{
		"hosts": [
			{"host": "portfolio.nexus-lab.test", "origin": "https://a.vercel.app", "kind": "portfolio"},
			{"host": "warung.nexus-lab.test", "origin": "http://channel-origin:8099/warung/", "kind": "tepi", "slug": "warung"}
		]
	}`))
	if err != nil {
		t.Fatal(err)
	}
	if len(wrapped) != 2 {
		t.Fatalf("wrapped len=%d", len(wrapped))
	}

	simple, err := ParseHostMapJSON([]byte(`{
		"portfolio.nexus-lab.test": "https://a.vercel.app",
		"warung.nexus-lab.test": "http://channel-origin:8099/warung/"
	}`))
	if err != nil {
		t.Fatal(err)
	}
	if len(simple) != 2 {
		t.Fatalf("simple len=%d", len(simple))
	}
}

func TestBindHostMap_TwoHostsKeepDistinctOrigins(t *testing.T) {
	portfolio := "https://portfolio-website-three-ruddy-65.vercel.app"
	starter := "http://channel-origin:8099/bu-grace/"
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", portfolio)
	t.Setenv("NEXUS_HOST_MAP", `{
		"portfolio.nexus-lab.test": "`+portfolio+`",
		"bu-grace.nexus-lab.test": "`+starter+`"
	}`)

	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, LabInstanceOrigin())
	BindHostMap(router)

	gotPortfolio, ok := router.Lookup("portfolio.nexus-lab.test")
	if !ok || gotPortfolio != portfolio {
		t.Fatalf("portfolio origin=%q ok=%v want %q", gotPortfolio, ok, portfolio)
	}
	gotStarter, ok := router.Lookup("bu-grace.nexus-lab.test")
	if !ok || gotStarter != starter {
		t.Fatalf("starter origin=%q ok=%v want %q", gotStarter, ok, starter)
	}
	loop, ok := router.Lookup("127.0.0.1")
	if !ok || loop != portfolio {
		t.Fatalf("loopback must stay portfolio origin, got %q", loop)
	}
}

func TestBindHostMap_SecondHostDoesNotReplacePortfolio(t *testing.T) {
	portfolio := "https://portfolio-website-three-ruddy-65.vercel.app"
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", portfolio)
	t.Setenv("NEXUS_HOST_MAP", `{"hosts":[
		{"host":"portfolio.nexus-lab.test","origin":"`+portfolio+`"},
		{"host":"toko-dua.nexus-lab.test","origin":"http://channel-origin:8099/toko-dua/"}
	]}`)

	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, LabInstanceOrigin())
	BindHostMap(router)

	got, _ := router.Lookup("portfolio.nexus-lab.test")
	if got != portfolio {
		t.Fatalf("enabling a second tepi host must not move portfolio off Vercel origin, got %q", got)
	}
	extra, ok := router.Lookup("toko-dua.nexus-lab.test")
	if !ok || extra != "http://channel-origin:8099/toko-dua/" {
		t.Fatalf("second host origin=%q ok=%v", extra, ok)
	}
}

func TestBindHostMap_RejectsDangerousHostsAndOrigins(t *testing.T) {
	portfolio := "https://portfolio-website-three-ruddy-65.vercel.app"
	starter := "http://channel-origin:8099/bu-grace/"
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", portfolio)
	t.Setenv("NEXUS_HOST_MAP", `{
		"hosts": [
			{"host": "portfolio.nexus-lab.test", "origin": "`+portfolio+`"},
			{"host": "bu-grace.nexus-lab.test", "origin": "`+starter+`"},
			{"host": "evil.com", "origin": "`+starter+`"},
			{"host": "*.nexus-lab.test", "origin": "`+starter+`"},
			{"host": "portfolio.nexus-lab.test\r\nX-Injected: 1", "origin": "`+starter+`"},
			{"host": "ok.nexus-lab.test", "origin": "ftp://channel-origin:8099/x/"},
			{"host": "js.nexus-lab.test", "origin": "javascript:alert(1)"},
			{"host": "star.nexus-lab.test", "origin": "http://*.vercel.app"},
			{"host": "meta.nexus-lab.test", "origin": "http://169.254.169.254/"}
		]
	}`)

	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, LabInstanceOrigin())
	BindHostMap(router)

	if got, _ := router.Lookup("portfolio.nexus-lab.test"); got != portfolio {
		t.Fatalf("portfolio origin=%q", got)
	}
	if got, ok := router.Lookup("bu-grace.nexus-lab.test"); !ok || got != starter {
		t.Fatalf("channel-origin lab origin must bind, got %q ok=%v", got, ok)
	}
	if router.HasExplicitRoute("evil.com") {
		t.Fatal("non-nexus-lab.test must not become an explicit WAF host")
	}
	if router.HasExplicitRoute("*.nexus-lab.test") {
		t.Fatal("wildcard host must not bind")
	}
	if router.HasExplicitRoute("ok.nexus-lab.test") || router.HasExplicitRoute("js.nexus-lab.test") ||
		router.HasExplicitRoute("star.nexus-lab.test") || router.HasExplicitRoute("meta.nexus-lab.test") {
		t.Fatal("non-http / wildcard / metadata origins must not bind")
	}
}

func TestAcceptHostMapEntry_FailClosed(t *testing.T) {
	if _, _, err := AcceptHostMapEntry("bu-grace.nexus-lab.test", "http://channel-origin:8099/bu-grace/"); err != nil {
		t.Fatalf("lab tepi origin: %v", err)
	}
	if _, _, err := AcceptHostMapEntry("portfolio.nexus-lab.test", "https://x.vercel.app"); err != nil {
		t.Fatalf("vercel origin: %v", err)
	}
	cases := [][2]string{
		{"evil.com", "http://channel-origin:8099/x/"},
		{"*.nexus-lab.test", "http://channel-origin:8099/x/"},
		{"warung.nexus-lab.test", "ftp://channel-origin:8099/x/"},
		{"warung.nexus-lab.test", "http://attacker.example/"},
		{"warung.nexus-lab.test\r\n", "http://channel-origin:8099/x/"},
	}
	for _, c := range cases {
		if _, _, err := AcceptHostMapEntry(c[0], c[1]); err == nil {
			t.Fatalf("expected reject host=%q origin=%q", c[0], c[1])
		}
	}
}

func TestBindHostMap_EmptyIsNoop(t *testing.T) {
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "https://example.vercel.app")
	t.Setenv("NEXUS_HOST_MAP", "")
	t.Setenv("NEXUS_HOST_MAP_FILE", "")

	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, LabInstanceOrigin())
	BindHostMap(router)
	got, ok := router.Lookup("portfolio.nexus-lab.test")
	if !ok || got != "https://example.vercel.app" {
		t.Fatalf("got %q ok=%v", got, ok)
	}
}
