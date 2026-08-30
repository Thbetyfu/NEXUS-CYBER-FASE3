package repair

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func newTestLogger(t *testing.T) *logger.Logger {
	t.Helper()
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatalf("Failed to initialize logger: %v", err)
	}
	t.Cleanup(func() {
		tel.Close()
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	})
	return tel
}

func TestIntegrityMonitorRestoreAndPurge(t *testing.T) {
	tel := newTestLogger(t)

	tmpDir, err := os.MkdirTemp("", "nexus_integrity_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tmpDir) })

	testFilePath := filepath.Join(tmpDir, "index.html")
	originalContent := []byte("<html><body>Sterile Baseline Visual Website</body></html>")
	if err := os.WriteFile(testFilePath, originalContent, 0644); err != nil {
		t.Fatalf("Failed to write initial test file: %v", err)
	}

	im, err := NewIntegrityMonitor(tmpDir, tel)
	if err != nil {
		t.Fatalf("Failed to initialize Integrity Monitor: %v", err)
	}
	t.Cleanup(func() { os.Remove(im.BaselinePath()) })

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go im.Start(ctx, 50*time.Millisecond)
	time.Sleep(80 * time.Millisecond)

	modifiedContent := []byte("<html><body>HACKED BY ZEUS SECURITY TEAM</body></html>")
	if err := os.WriteFile(testFilePath, modifiedContent, 0644); err != nil {
		t.Fatalf("Failed to modify test file: %v", err)
	}
	time.Sleep(200 * time.Millisecond)

	contentAfterMod, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("Failed to read test file: %v", err)
	}
	if string(contentAfterMod) != string(originalContent) {
		t.Errorf("Expected restored content '%s', got '%s'", string(originalContent), string(contentAfterMod))
	}

	if err := os.Remove(testFilePath); err != nil {
		t.Fatalf("Failed to delete test file: %v", err)
	}
	time.Sleep(200 * time.Millisecond)

	contentAfterDel, err := os.ReadFile(testFilePath)
	if err != nil {
		t.Fatalf("Failed to read restored test file: %v", err)
	}
	if string(contentAfterDel) != string(originalContent) {
		t.Errorf("Expected recreated content '%s', got '%s'", string(originalContent), string(contentAfterDel))
	}

	untrackedFilePath := filepath.Join(tmpDir, "unauthorized_file.txt")
	if err := os.WriteFile(untrackedFilePath, []byte("unauthorized text content"), 0600); err != nil {
		t.Fatalf("Failed to write untracked file: %v", err)
	}
	time.Sleep(200 * time.Millisecond)

	if _, err := os.Stat(untrackedFilePath); !os.IsNotExist(err) {
		t.Error("Expected unauthorized file to be deleted automatically, but it still exists")
	}
}

func TestIntegrityPinSurvivesRestartWithoutRebaseline(t *testing.T) {
	tel := newTestLogger(t)
	tmpDir := t.TempDir()
	pinFile := filepath.Join(t.TempDir(), "pin.json")

	index := filepath.Join(tmpDir, "index.html")
	good := []byte("GOOD-SITE")
	if err := os.WriteFile(index, good, 0644); err != nil {
		t.Fatal(err)
	}

	first, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: tmpDir,
		BaselinePath: pinFile,
		Telemetry:    tel,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(first.BaselinePath()); err != nil {
		t.Fatalf("expected snapshot: %v", err)
	}

	defaced := []byte("DEFACED")
	if err := os.WriteFile(index, defaced, 0644); err != nil {
		t.Fatal(err)
	}

	second, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: tmpDir,
		BaselinePath: pinFile,
		Telemetry:    tel,
	})
	if err != nil {
		t.Fatal(err)
	}
	second.ScanAndRestore()

	got, err := os.ReadFile(index)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(good) {
		t.Fatalf("pin must restore GOOD-SITE after simulated restart, got %q", got)
	}
}

func TestIntegrityCorruptSnapshotDoesNotAdoptDeface(t *testing.T) {
	tel := newTestLogger(t)
	tmpDir := t.TempDir()
	pinFile := filepath.Join(t.TempDir(), "pin.json")
	index := filepath.Join(tmpDir, "index.html")
	if err := os.WriteFile(index, []byte("GOOD"), 0644); err != nil {
		t.Fatal(err)
	}
	if _, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: tmpDir,
		BaselinePath: pinFile,
		Telemetry:    tel,
	}); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(pinFile, []byte("{not-json"), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(index, []byte("DEFACED"), 0644); err != nil {
		t.Fatal(err)
	}
	_, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: tmpDir,
		BaselinePath: pinFile,
		Telemetry:    tel,
	})
	if err == nil {
		t.Fatal("expected error on tampered snapshot")
	}
	if !strings.Contains(err.Error(), "refusing to re-baseline") && !strings.Contains(err.Error(), "JSON") && !strings.Contains(err.Error(), "mismatch") {
		t.Fatalf("unexpected error: %v", err)
	}
	got, _ := os.ReadFile(index)
	if string(got) != "DEFACED" {
		t.Fatal("monitor must not rewrite disk when snapshot load fails at init")
	}
}

func TestIntegrityAlertOnRestore(t *testing.T) {
	tel := newTestLogger(t)
	tmpDir := t.TempDir()
	index := filepath.Join(tmpDir, "index.html")
	if err := os.WriteFile(index, []byte("OK"), 0644); err != nil {
		t.Fatal(err)
	}
	var alerts atomic.Int32
	im, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: tmpDir,
		BaselinePath: filepath.Join(t.TempDir(), "pin.json"),
		Telemetry:    tel,
		OnAlert:      func(string) { alerts.Add(1) },
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(index, []byte("BAD"), 0644); err != nil {
		t.Fatal(err)
	}
	im.ScanAndRestore()
	if alerts.Load() < 1 {
		t.Fatal("expected pager/alert hook on restore")
	}
}
