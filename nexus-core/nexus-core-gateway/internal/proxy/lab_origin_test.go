package proxy

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"gorm.io/gorm"
)

func openLabRouteDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.DomainSubscription{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	old := database.DB
	database.DB = db
	t.Cleanup(func() {
		database.DB = old
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	return db
}

func seedStaleLoopbackOrigin(t *testing.T, db *gorm.DB) {
	t.Helper()
	for _, host := range []string{"localhost", "portfolio.nexus-lab.test"} {
		if err := db.Create(&models.DomainSubscription{
			Domain:   host,
			OriginIP: "http://127.0.0.1:3001",
			IsActive: true,
			PlanType: "premium",
		}).Error; err != nil {
			t.Fatalf("seed stale %s: %v", host, err)
		}
	}
}

func requireSameOrigin(t *testing.T, router *DynamicRouter, want string, hosts ...string) {
	t.Helper()
	for _, host := range hosts {
		got, ok := router.Lookup(host)
		if !ok || got != want {
			t.Fatalf("host %q origin=%q found=%v want %q", host, got, ok, want)
		}
	}
}

func TestSeedUpsertsStaleLabOriginToVercel(t *testing.T) {
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "https://portfolio-website-three-ruddy-65.vercel.app")
	t.Setenv("TARGET_BACKEND_HOST", "portfolio-website-three-ruddy-65.vercel.app")

	db := openLabRouteDB(t)
	seedStaleLoopbackOrigin(t, db)
	db.Create(&models.DomainSubscription{
		Domain:   "extra.pilot.test",
		OriginIP: "https://other.example",
		IsActive: true,
		PlanType: "pilot",
	})

	SeedInitialDomainSubscriptions()

	var named, loopback, extra models.DomainSubscription
	if err := db.Where("domain = ?", "portfolio.nexus-lab.test").First(&named).Error; err != nil {
		t.Fatalf("named host row: %v", err)
	}
	if err := db.Where("domain = ?", "127.0.0.1").First(&loopback).Error; err != nil {
		t.Fatalf("loopback row: %v", err)
	}
	if err := db.Where("domain = ?", "extra.pilot.test").First(&extra).Error; err != nil {
		t.Fatalf("extra onboard row: %v", err)
	}

	want := "https://portfolio-website-three-ruddy-65.vercel.app"
	if named.OriginIP != want {
		t.Fatalf("named OriginIP=%q want %q (leftover 127.0.0.1:3001 must not win START.bat)", named.OriginIP, want)
	}
	if loopback.OriginIP != want {
		t.Fatalf("loopback OriginIP=%q want %q", loopback.OriginIP, want)
	}
	if extra.OriginIP != "https://other.example" {
		t.Fatalf("onboarded extra host was overwritten: %q", extra.OriginIP)
	}
}

func TestSeedUpsertsStaleLabOriginToOfflinePortfolio(t *testing.T) {
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "http://portfolio:3002")
	t.Setenv("TARGET_BACKEND_HOST", "portfolio")

	db := openLabRouteDB(t)
	for _, host := range []string{"localhost", "portfolio.nexus-lab.test"} {
		db.Create(&models.DomainSubscription{
			Domain:   host,
			OriginIP: "https://portfolio-website-three-ruddy-65.vercel.app",
			IsActive: true,
			PlanType: "premium",
		})
	}

	SeedInitialDomainSubscriptions()

	var named models.DomainSubscription
	if err := db.Where("domain = ?", "portfolio.nexus-lab.test").First(&named).Error; err != nil {
		t.Fatal(err)
	}
	if named.OriginIP != "http://portfolio:3002" {
		t.Fatalf("START-OFFLINE named OriginIP=%q want http://portfolio:3002", named.OriginIP)
	}
}

func TestNamedHostAndLoopbackAgreeAfterRouterSync_Vercel(t *testing.T) {
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "https://portfolio-website-three-ruddy-65.vercel.app")

	db := openLabRouteDB(t)
	seedStaleLoopbackOrigin(t, db)
	SeedInitialDomainSubscriptions()

	origin := LabInstanceOrigin()
	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, origin)
	if err := router.SyncFromDatabase(); err != nil {
		t.Fatalf("SyncFromDatabase: %v", err)
	}
	BindLabInstanceOrigin(router, origin)

	requireSameOrigin(t, router, origin,
		"portfolio.nexus-lab.test", "127.0.0.1", "localhost", "*")
}

func TestNamedHostAndLoopbackAgreeAfterRouterSync_Offline(t *testing.T) {
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "http://portfolio:3002")

	db := openLabRouteDB(t)
	seedStaleLoopbackOrigin(t, db)
	SeedInitialDomainSubscriptions()

	origin := LabInstanceOrigin()
	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, origin)
	if err := router.SyncFromDatabase(); err != nil {
		t.Fatalf("SyncFromDatabase: %v", err)
	}
	BindLabInstanceOrigin(router, origin)

	if origin != "http://portfolio:3002" {
		t.Fatalf("LabInstanceOrigin=%q", origin)
	}
	requireSameOrigin(t, router, origin,
		"portfolio.nexus-lab.test", "127.0.0.1", "localhost", "*")
}

func TestRouterSyncWithoutRebindSplitsHosts(t *testing.T) {
	// Documents the live-lab failure: leftover DB OriginIP overwrites named host
	// while loopback/"*" stay on compose TARGET_BACKEND.
	t.Setenv("PROTECTED_HOST", "portfolio.nexus-lab.test")
	t.Setenv("TARGET_BACKEND", "https://portfolio-website-three-ruddy-65.vercel.app")

	db := openLabRouteDB(t)
	seedStaleLoopbackOrigin(t, db)

	vercel := "https://portfolio-website-three-ruddy-65.vercel.app"
	router := NewDynamicRouter(10 * time.Second)
	BindLabInstanceOrigin(router, vercel)
	if err := router.SyncFromDatabase(); err != nil {
		t.Fatalf("SyncFromDatabase: %v", err)
	}

	named, _ := router.Lookup("portfolio.nexus-lab.test")
	loop, _ := router.Lookup("127.0.0.1")
	if named == loop {
		t.Fatalf("expected stale DB to split named-host (%q) vs loopback (%q)", named, loop)
	}
	if named != "http://127.0.0.1:3001" {
		t.Fatalf("named host after sync-only: %q", named)
	}
	if loop != vercel {
		t.Fatalf("loopback after sync-only: %q", loop)
	}

	BindLabInstanceOrigin(router, vercel)
	requireSameOrigin(t, router, vercel,
		"portfolio.nexus-lab.test", "127.0.0.1", "*")
}
