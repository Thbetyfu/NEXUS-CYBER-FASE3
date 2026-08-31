package proxy

import (
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/ai"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
)

// TestProxy_AddAntibody_DegradedMode memverifikasi bahwa AddAntibody dapat dieksekusi dengan aman
// dan tanpa blocking/panic ketika modul Redis tidak aktif atau nil.
//
// Alasan Arsitektural (Why):
// Sesuai parameter keandalan ISO 25010 (Fault Tolerance & Degradasi Anggun), jika koneksi Redis terputus,
// sistem pertahanan siber harus tetap berjalan lancar dan mencatat antibodi baru di RAM lokal.
func TestProxy_AddAntibody_DegradedMode(t *testing.T) {
	// Inisialisasi filter tiruan
	filter := ai.NewReflexFilter()
	reasoning := &ai.ReasoningEngine{}

	// Set Redis wrapper ke disabled/nil
	mtd.MtdRedis = &mtd.RedisClientWrapper{Enabled: false}

	// Buat instance proxy dengan target tiruan
	np, err := NewNexusProxy("http://localhost:9000", filter, reasoning, nil, nil, nil)
	if err != nil {
		t.Fatalf("Failed to initialize proxy: %v", err)
	}

	// Set count awal ke 0
	np.PatchesCount = 0

	// Daftarkan payload zero-day tiruan
	payload := "eyJhY3Rpb24iOiAiJ09SIFNMRUVQKDEwKS0tIn0="
	np.AddAntibody(payload)

	// Pastikan terdaftar di memori lokal RAM
	if _, loaded := np.Patches.Load(payload); !loaded {
		t.Errorf("Expected payload to be stored in local Patches map")
	}

	if np.PatchesCount != 1 {
		t.Errorf("Expected PatchesCount to be 1, got %d", np.PatchesCount)
	}

	// Reset antibodi
	np.ResetAntibodies()

	if np.PatchesCount != 0 {
		t.Errorf("Expected PatchesCount to be 0 after reset, got %d", np.PatchesCount)
	}
}

// TestProxy_StartImmunitySync_DegradedMode memverifikasi bahwa StartImmunitySync berjalan aman tanpa panic saat Redis nil.
func TestProxy_StartImmunitySync_DegradedMode(t *testing.T) {
	filter := ai.NewReflexFilter()
	reasoning := &ai.ReasoningEngine{}

	// Matikan Redis
	mtd.MtdRedis = nil

	np, err := NewNexusProxy("http://localhost:9000", filter, reasoning, nil, nil, nil)
	if err != nil {
		t.Fatalf("Failed to initialize proxy: %v", err)
	}

	// Panggil sinkronisasi (seharusnya return instan karena Redis nil)
	np.StartImmunitySync()

	// Pastikan tidak ada panic dan program berjalan
	t.Log("[PASS] StartImmunitySync returned gracefully with nil Redis client wrapper.")
}

// TestProxy_UpdateTarget memverifikasi kelancaran penggantian target reverse proxy.
func TestProxy_UpdateTarget(t *testing.T) {
	filter := ai.NewReflexFilter()
	reasoning := &ai.ReasoningEngine{}

	np, err := NewNexusProxy("http://localhost:9000", filter, reasoning, nil, nil, nil)
	if err != nil {
		t.Fatalf("Failed to initialize proxy: %v", err)
	}

	err = np.UpdateTarget("http://localhost:9001")
	if err != nil {
		t.Errorf("Failed to update target dynamically: %v", err)
	}

	// Bersihkan setelah tes
	np.ResetAntibodies()
}
