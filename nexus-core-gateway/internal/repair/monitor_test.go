package repair

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestIntegrityMonitorRestoreAndPurge(t *testing.T) {
	// 1. Inisialisasi dummy logger
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	defer func() {
		tel.Close()
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	}()

	// 2. Buat folder temporary untuk testing
	tmpDir, err := os.MkdirTemp("", "nexus_integrity_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Buat file baseline steril awal
	testFilePath := filepath.Join(tmpDir, "index.html")
	originalContent := []byte("<html><body>Sterile Baseline Visual Website</body></html>")
	err = os.WriteFile(testFilePath, originalContent, 0644)
	if err != nil {
		t.Fatalf("Failed to write initial test file: %v", err)
	}

	// 3. Inisialisasi IntegrityMonitor
	im, err := NewIntegrityMonitor(tmpDir, tel)
	if err != nil {
		t.Fatalf("Failed to initialize Integrity Monitor: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Jalankan scanning dengan interval cepat (50ms)
	go im.Start(ctx, 50*time.Millisecond)

	// Berikan waktu inisialisasi
	time.Sleep(100 * time.Millisecond)

	// --- TEST CASE 1: File Modifikasi (Defacement) harus di-rollback otomatis ---
	modifiedContent := []byte("<html><body>HACKED BY ZEUS SECURITY TEAM</body></html>")
	err = os.WriteFile(testFilePath, modifiedContent, 0644)
	if err != nil {
		t.Fatalf("Failed to modify test file: %v", err)
	}

	// Tunggu pemindaian (100ms)
	time.Sleep(100 * time.Millisecond)

	// Baca kembali berkas untuk memastikan telah di-rollback ke konten awal
	contentAfterMod, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("Failed to read test file: %v", err)
	}
	if string(contentAfterMod) != string(originalContent) {
		t.Errorf("Expected restored content '%s', got '%s'", string(originalContent), string(contentAfterMod))
	}

	// --- TEST CASE 2: File Dihapus harus dipulihkan otomatis ---
	err = os.Remove(testFilePath)
	if err != nil {
		t.Fatalf("Failed to delete test file: %v", err)
	}

	// Tunggu pemindaian
	time.Sleep(100 * time.Millisecond)

	// Pastikan file telah muncul kembali dengan isi yang benar
	contentAfterDel, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("Failed to read restored test file: %v", err)
	}
	if string(contentAfterDel) != string(originalContent) {
		t.Errorf("Expected recreated content '%s', got '%s'", string(originalContent), string(contentAfterDel))
	}

	// --- TEST CASE 3: File Tidak Dikenal (Unauthorized File) harus dihapus otomatis ---
	untrackedFilePath := filepath.Join(tmpDir, "unauthorized_file.txt")
	safePayload := []byte("unauthorized text content")
	err = os.WriteFile(untrackedFilePath, safePayload, 0600)
	if err != nil {
		t.Fatalf("Failed to write untracked file: %v", err)
	}

	// Tunggu pemindaian
	time.Sleep(100 * time.Millisecond)

	// Pastikan file tidak dikenal telah terhapus otomatis dari disk
	_, err = os.Stat(untrackedFilePath)
	if !os.IsNotExist(err) {
		t.Error("Expected unauthorized file to be deleted automatically, but it still exists")
	}
}
