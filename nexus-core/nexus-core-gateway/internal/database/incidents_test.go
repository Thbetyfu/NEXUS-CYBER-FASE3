package database

import (
	"strings"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupIncidentsTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.ThreatLog{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	DB = db
}

func TestQueryIncidentDigestFiltersByDomain(t *testing.T) {
	setupIncidentsTestDB(t)
	now := time.Now()
	rows := []models.ThreatLog{
		{SourceIP: "1.1.1.1", Endpoint: "/a", Method: "GET", Status: "BLOCKED", ThreatType: "SQLI", TargetDomain: "portfolio.nexus-lab.test"},
		{SourceIP: "2.2.2.2", Endpoint: "/b", Method: "GET", Status: "ALLOWED", ThreatType: "NORMAL", TargetDomain: "other.example.test"},
		{SourceIP: "3.3.3.3", Endpoint: "/c", Method: "POST", Status: "BLOCKED", ThreatType: "XSS", TargetDomain: "portfolio.nexus-lab.test"},
	}
	for i := range rows {
		rows[i].CreatedAt = now.Add(-time.Duration(i) * time.Minute)
		if err := DB.Create(&rows[i]).Error; err != nil {
			t.Fatalf("insert: %v", err)
		}
	}

	d, err := QueryIncidentDigest("portfolio.nexus-lab.test", now.Add(-time.Hour), now.Add(time.Minute), 24)
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if d.Total != 2 {
		t.Fatalf("total=%d want 2", d.Total)
	}
	if len(d.Samples) != 2 {
		t.Fatalf("samples=%d", len(d.Samples))
	}
	for _, s := range d.Samples {
		if s.TargetDomain != "portfolio.nexus-lab.test" {
			t.Fatalf("leaked domain %s", s.TargetDomain)
		}
		if s.Endpoint == "" {
			t.Fatal("empty endpoint")
		}
	}

	md := FormatIncidentDigestMD(d)
	if !strings.Contains(md, "portfolio.nexus-lab.test") {
		t.Fatal("markdown missing domain")
	}
	if strings.Contains(strings.ToLower(md), "attempted password") || strings.Contains(md, "PayloadSample") {
		t.Fatal("markdown must not dump payloads")
	}

	if _, err := QueryIncidentDigest("all", now.Add(-time.Hour), now, 24); err == nil {
		t.Fatal("expected error for Global Overwatch")
	}
}
