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
