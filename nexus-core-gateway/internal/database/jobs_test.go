package database

import (
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupJobsTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(
		&models.CoworkJob{},
		&models.CoworkJobStepLog{},
		&models.CoworkJobApproval{},
		&models.HostImmuneMemory{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	DB = db
}

func TestUpsertCoworkJob(t *testing.T) {
	setupJobsTestDB(t)
	ok := true
	dto := CoworkJobDTO{
		JobID:          "JOB-TEST01",
		Title:          "Test",
		TargetURL:      "http://127.0.0.1:8080",
		HostKey:        "127.0.0.1",
		Scope:          "hybrid-http-jinak",
		AutonomyLevel:  "L0",
		Status:         "PENDING_APPROVAL",
		DefenseDeltas:  map[string]int{"waf_blocked": 2},
		Residuals:      []string{},
		AntibodyLoopOK: &ok,
		FindingsCount:  3,
	}
	if err := UpsertCoworkJob(dto, nil, nil); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	got, err := GetCoworkJob("JOB-TEST01")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Status != "PENDING_APPROVAL" {
		t.Fatalf("status=%s", got.Status)
	}
	if got.DefenseDeltas["waf_blocked"] != 2 {
		t.Fatalf("deltas=%v", got.DefenseDeltas)
	}

	dto.Status = "CLOSED_OK"
	if err := UpsertCoworkJob(dto, nil, nil); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ = GetCoworkJob("JOB-TEST01")
	if got.Status != "CLOSED_OK" {
		t.Fatalf("updated status=%s", got.Status)
	}
}

func TestUpsertHostImmuneMemory(t *testing.T) {
	setupJobsTestDB(t)
	if err := UpsertHostImmuneMemory("lab.test", 2, 1, 0, "JOB-X", "CLOSED_GAP", `[]`); err != nil {
		t.Fatalf("upsert host: %v", err)
	}
	row, err := GetHostImmuneMemory("lab.test")
	if err != nil {
		t.Fatalf("get host: %v", err)
	}
	if row.ReplayMissedCount != 1 {
		t.Fatalf("missed=%d", row.ReplayMissedCount)
	}
}
