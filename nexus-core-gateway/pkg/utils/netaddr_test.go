package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequestHost_IPv6AndPort(t *testing.T) {
	cases := map[string]string{
		"example.com:8080":  "example.com",
		"127.0.0.1:3001":    "127.0.0.1",
		"[::1]:8080":        "::1",
		"[2001:db8::1]:443": "2001:db8::1",
		"localhost":         "localhost",
		"portfolio.local":   "portfolio.local",
	}
	for in, want := range cases {
		if got := RequestHost(in); got != want {
			t.Errorf("RequestHost(%q)=%q want %q", in, got, want)
		}
	}
}

func TestIsLoopbackRequestHost(t *testing.T) {
	if !IsLoopbackRequestHost("[::1]:8080") {
		t.Fatal("::1 should be loopback")
	}
	if IsLoopbackRequestHost("example.com:443") {
		t.Fatal("public host is not loopback")
	}
}

func TestClientIP_IgnoresSpoofedXFFFromUntrustedPeer(t *testing.T) {
	t.Setenv("NEXUS_TRUSTED_PROXIES", "127.0.0.0/8,::1/128,172.16.0.0/12")
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.137.20:4444"
	req.Header.Set("X-Forwarded-For", "8.8.8.8")
	if got := ClientIP(req); got != "192.168.137.20" {
		t.Fatalf("hotspot client must not spoof XFF, got %s", got)
	}
}

func TestClientIP_UsesRightmostXFFFromDockerCaddy(t *testing.T) {
	t.Setenv("NEXUS_TRUSTED_PROXIES", "127.0.0.0/8,::1/128,172.16.0.0/12")
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "172.18.0.4:1234"
	req.Header.Set("X-Forwarded-For", "8.8.8.8, 192.168.137.20")
	if got := ClientIP(req); got != "192.168.137.20" {
		t.Fatalf("trusted Caddy hop should use rightmost XFF, got %s", got)
	}
}
