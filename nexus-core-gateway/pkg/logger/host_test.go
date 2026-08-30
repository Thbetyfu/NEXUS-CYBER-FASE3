package logger

import "testing"

func TestNormalizeTargetHost(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"", ""},
		{"all", "all"},
		{"Portfolio.Nexus-Lab.Test", "portfolio.nexus-lab.test"},
		{"portfolio.nexus-lab.test:8080", "portfolio.nexus-lab.test"},
		{"http://portfolio.nexus-lab.test:8080/path", "portfolio.nexus-lab.test"},
		{"[::1]:8080", "::1"},
		{"https://[2001:db8::1]:443/", "2001:db8::1"},
	}
	for _, c := range cases {
		got := NormalizeTargetHost(c.in)
		if got != c.want {
			t.Errorf("NormalizeTargetHost(%q)=%q want %q", c.in, got, c.want)
		}
	}
}
