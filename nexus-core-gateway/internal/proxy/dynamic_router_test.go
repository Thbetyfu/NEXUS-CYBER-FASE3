package proxy

import (
	"os"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"gorm.io/gorm"
)

func TestDynamicRouterWildcardAndFallback(t *testing.T) {
	router := NewDynamicRouter(10 * time.Second)

	// 1. Tambahkan pemetaan tepat, wildcard, dan fallback
	router.AddRoute("exact.tenant.localhost", "http://127.0.0.1:3001")
	router.AddRoute("*.tenant.localhost", "http://127.0.0.1:4001")
	router.AddRoute("*", "http://127.0.0.1:5001")

	// 2. Uji Pencocokan Tepat (Exact Match)
	target, found := router.Lookup("exact.tenant.localhost")
	if !found || target != "http://127.0.0.1:3001" {
		t.Errorf("Expected exact.tenant.localhost to map to http://127.0.0.1:3001, got %s (found: %v)", target, found)
	}

	// 3. Uji Pencocokan Wildcard Satu Tingkat (Single-level Wildcard)
	targetWildcard1, foundW1 := router.Lookup("app.tenant.localhost")
	if !foundW1 || targetWildcard1 != "http://127.0.0.1:4001" {
		t.Errorf("Expected app.tenant.localhost to match wildcard *.tenant.localhost, got %s (found: %v)", targetWildcard1, foundW1)
	}

	// 4. Uji Pencocokan Wildcard Multi Tingkat (Multi-level Wildcard)
	targetWildcard2, foundW2 := router.Lookup("api.v1.tenant.localhost")
	if !foundW2 || targetWildcard2 != "http://127.0.0.1:4001" {
		t.Errorf("Expected api.v1.tenant.localhost to match wildcard *.tenant.localhost, got %s (found: %v)", targetWildcard2, foundW2)
	}

	// 5. Uji Global Fallback
	targetFallback, foundFb := router.Lookup("unregistered-domain.localhost")
	if !foundFb || targetFallback != "http://127.0.0.1:5001" {
		t.Errorf("Expected unregistered-domain.localhost to fall back to global wildcard *, got %s (found: %v)", targetFallback, foundFb)
	}

	if router.HasExplicitRoute("unregistered-domain.localhost") {
		t.Fatal("HasExplicitRoute must ignore global * so TLS ask cannot mint random certs")
	}
	if !router.HasExplicitRoute("exact.tenant.localhost") {
		t.Fatal("HasExplicitRoute should accept exact tenant hosts")
	}
	if !router.HasExplicitRoute("app.tenant.localhost") {
		t.Fatal("HasExplicitRoute should accept tenant wildcards")
	}
}

func TestDynamicRouterDatabaseFallbackAndSync(t *testing.T) {
	os.Remove("test_router.db")

	// 1. Inisialisasi Database SQLite
	db, err := gorm.Open(sqlite.Open("test_router.db"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}

	err = db.AutoMigrate(&models.DomainSubscription{})
	if err != nil {
		t.Fatalf("Failed to migrate DomainSubscription schema: %v", err)
	}

	// Setup database global pointer
	oldDB := database.DB
	database.DB = db
	defer func() {
		database.DB = oldDB
		os.Remove("test_router.db")
	}()

	// 2. Seed data ke database local
	db.Create(&models.DomainSubscription{
		Domain:   "tenant1.localhost",
		OriginIP: "http://127.0.0.1:9001",
		IsActive: true,
		PlanType: "premium",
	})
	
	sub2 := models.DomainSubscription{
		Domain:   "tenant2.localhost",
		OriginIP: "http://127.0.0.1:9002",
		PlanType: "premium",
	}
	db.Create(&sub2)
	db.Model(&sub2).Update("is_active", false)

	router := NewDynamicRouter(10 * time.Second)

	// 3. Uji Database Fallback pada Lookup (Tier 3)
	target, found := router.Lookup("tenant1.localhost")
	if !found || target != "http://127.0.0.1:9001" {
		t.Errorf("Expected database fallback to find tenant1.localhost mapped to http://127.0.0.1:9001, got %s (found: %v)", target, found)
	}

	_, found2 := router.Lookup("tenant2.localhost")
	if found2 {
		t.Error("Expected inactive tenant2.localhost to not be found in database fallback")
	}

	// 4. Uji SyncFromDatabase
	emptyRouter := NewDynamicRouter(10 * time.Second)
	err = emptyRouter.SyncFromDatabase()
	if err != nil {
		t.Fatalf("SyncFromDatabase failed: %v", err)
	}

	// Cek apakah data sudah disinkronisasi ke memory cache lokal
	targetSynced, foundSynced := emptyRouter.Lookup("tenant1.localhost")
	if !foundSynced || targetSynced != "http://127.0.0.1:9001" {
		t.Errorf("Expected synced tenant1.localhost to resolve to http://127.0.0.1:9001, got %s (found: %v)", targetSynced, foundSynced)
	}
}

