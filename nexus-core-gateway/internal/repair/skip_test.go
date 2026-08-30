package repair

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func TestUploadsDirIsNotPurged(t *testing.T) {
	tel, err := logger.NewLogger()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		tel.Close()
		os.Remove("nexus_traffic.log")
		os.Remove("nexus_ai_events.log")
	})

	root := t.TempDir()
	dist := filepath.Join(root, "dist")
	uploads := filepath.Join(dist, "uploads")
	if err := os.MkdirAll(uploads, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>ok</html>"), 0644); err != nil {
		t.Fatal(err)
	}

	im, err := NewIntegrityMonitorWithOptions(Options{
		MonitoredDir: dist,
		BaselinePath: filepath.Join(t.TempDir(), "pin.json"),
		Telemetry:    tel,
	})
	if err != nil {
		t.Fatal(err)
	}

	photo := filepath.Join(uploads, "guest.png")
	if err := os.WriteFile(photo, []byte("png-bytes"), 0644); err != nil {
		t.Fatal(err)
	}
	im.ScanAndRestore()
	if _, err := os.Stat(photo); err != nil {
		t.Fatalf("gallery upload must survive integrity purge: %v", err)
	}
}
