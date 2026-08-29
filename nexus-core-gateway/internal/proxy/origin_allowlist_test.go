package proxy

import (
	"strings"
	"testing"
)

func TestNormalizeProxyOrigin_AddsScheme(t *testing.T) {
	got, err := NormalizeProxyOrigin("127.0.0.1:3002")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "http://127.0.0.1:3002" {
		t.Fatalf("got %q", got)
	}
	got, err = NormalizeProxyOrigin("https://example.com/path")
	if err != nil || got != "https://example.com/path" {
		t.Fatalf("https origin: got %q err %v", got, err)
	}
	if _, err := NormalizeProxyOrigin("ftp://example.com"); err == nil {
		t.Fatal("ftp must be rejected")
	}
	if _, err := NormalizeProxyOrigin(""); err == nil {
		t.Fatal("empty must be rejected")
	}
}

func TestValidateProxyOrigin_BlocksPrivateAndMetadata(t *testing.T) {
	t.Setenv("NEXUS_ALLOW_PRIVATE_ORIGINS", "")

	cases := []string{
		"http://127.0.0.1:5432",
		"http://10.0.0.8/latest",
		"http://192.168.1.1",
		"http://169.254.169.254/latest/meta-data/",
		"http://localhost:3002",
		"ftp://example.com",
		"not-a-url",
	}
	for _, raw := range cases {
		if err := ValidateProxyOrigin(raw); err == nil {
			t.Errorf("expected reject for %q", raw)
		}
	}
	// Bare host without scheme must still be rejected as private (after normalize).
	if err := ValidateProxyOrigin("10.0.0.5:8080"); err == nil || !strings.Contains(err.Error(), "private") {
		t.Fatalf("bare private host should reject after normalize: %v", err)
	}
}

func TestValidateProxyOrigin_AllowsPublicIP(t *testing.T) {
	t.Setenv("NEXUS_ALLOW_PRIVATE_ORIGINS", "")
	if err := ValidateProxyOrigin("https://8.8.8.8"); err != nil {
		t.Fatalf("public IP should be allowed: %v", err)
	}
}

func TestValidateProxyOrigin_AllowsPrivateWhenEnabled(t *testing.T) {
	t.Setenv("NEXUS_ALLOW_PRIVATE_ORIGINS", "true")
	if err := ValidateProxyOrigin("http://10.0.0.5:8080"); err != nil {
		t.Fatalf("RFC1918 should be allowed when flag set: %v", err)
	}
	if err := ValidateProxyOrigin("http://169.254.169.254/"); err == nil {
		t.Fatal("link-local metadata must stay blocked")
	}
}
