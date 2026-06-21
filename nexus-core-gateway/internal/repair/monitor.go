package repair

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

// FileBaseline stores the original content and hash of a protected file
type FileBaseline struct {
	Path     string
	Content  []byte
	SHA256   string
	Mode     os.FileMode
}

// IntegrityMonitor checks a directory recursively and restores any modified/deleted files instantly
type IntegrityMonitor struct {
	mu           sync.RWMutex
	monitoredDir string
	baselines    map[string]FileBaseline // key: relative or absolute path
	telemetry    *logger.Logger
	isRunning    bool
}

// NewIntegrityMonitor creates a new file integrity monitor and establishes a secure baseline in RAM
func NewIntegrityMonitor(monitoredDir string, telemetry *logger.Logger) (*IntegrityMonitor, error) {
	absDir, err := filepath.Abs(monitoredDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %v", err)
	}

	// Verify target directory exists
	info, err := os.Stat(absDir)
	if err != nil {
		return nil, fmt.Errorf("monitored directory does not exist: %v", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("monitored path is not a directory")
	}

	im := &IntegrityMonitor{
		monitoredDir: absDir,
		baselines:    make(map[string]FileBaseline),
		telemetry:    telemetry,
	}

	// Build baseline cache
	if err := im.buildBaseline(); err != nil {
		return nil, err
	}

	log.Printf("[SELF-HEAL] Initialized System Integrity Monitor for: %s (%d files protected)", absDir, len(im.baselines))
	return im, nil
}

// buildBaseline scans the target directory and caches baseline states
func (im *IntegrityMonitor) buildBaseline() error {
	im.mu.Lock()
	defer im.mu.Unlock()

	return filepath.Walk(im.monitoredDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories themselves, only protect files
		if info.IsDir() {
			return nil
		}

		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read baseline for %s: %v", path, err)
		}

		hash := computeHash(content)
		im.baselines[path] = FileBaseline{
			Path:    path,
			Content: content,
			SHA256:  hash,
			Mode:    info.Mode(),
		}
		return nil
	})
}

// Start begins the periodic background integrity verification loop
func (im *IntegrityMonitor) Start(ctx context.Context, interval time.Duration) {
	im.mu.Lock()
	if im.isRunning {
		im.mu.Unlock()
		return
	}
	im.isRunning = true
	im.mu.Unlock()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("[SELF-HEAL] System Integrity Monitor background thread started (Interval: %v)", interval)

	for {
		select {
		case <-ticker.C:
			im.ScanAndRestore()
		case <-ctx.Done():
			log.Println("[SELF-HEAL] System Integrity Monitor stopped.")
			return
		}
	}
}

// ScanAndRestore performs a rescan and immediately rolls back any violations to baseline states (<10ms latency)
func (im *IntegrityMonitor) ScanAndRestore() {
	im.mu.RLock()
	// Create a copy of baselines to inspect without holding the read lock long
	baselinesCopy := make(map[string]FileBaseline, len(im.baselines))
	for k, v := range im.baselines {
		baselinesCopy[k] = v
	}
	im.mu.RUnlock()

	// Keep track of visited paths during scan to detect deleted files
	visited := make(map[string]bool)

	for path, baseline := range baselinesCopy {
		start := time.Now()

		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			// FILE DELETED: Restore immediately
			im.restoreFile(path, baseline, "DELETED", start)
			visited[path] = true
			continue
		} else if err != nil {
			log.Printf("[SELF-HEAL-ERROR] Failed to stat file %s: %v", path, err)
			continue
		}

		visited[path] = true

		// Check for modifications
		content, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[SELF-HEAL-ERROR] Failed to read file %s: %v", path, err)
			continue
		}

		currentHash := computeHash(content)
		if currentHash != baseline.SHA256 {
			// FILE MODIFIED (e.g. web deface): Restore immediately
			im.restoreFile(path, baseline, "MODIFIED", start)
		}
	}

	// Check if any untracked new files were added to the directory (potential webshell uploads)
	_ = filepath.Walk(im.monitoredDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}

		// If a file is not in the baseline, it is an unauthorized addition (e.g., webshell.php)
		im.mu.RLock()
		_, isProtected := im.baselines[path]
		im.mu.RUnlock()

		if !isProtected {
			start := time.Now()
			// Delete unauthorized file immediately
			if err := os.Remove(path); err == nil {
				latency := time.Since(start)
				log.Printf("[SELF-HEAL] Removed unauthorized file: %s | Latency: %v", path, latency)
				
				if im.telemetry != nil {
					im.telemetry.LogAIEvent(logger.AIEventLog{
						Timestamp:    time.Now(),
						Layer:        "Self-Repair",
						Status:       "REPAIRING",
						DetailAction: fmt.Sprintf("[UNAUTHORIZED_FILE] Web-shell attempt blocked. Deleted untracked file: %s (Time: %s)", filepath.Base(path), latency),
					})
				}
			}
		}
		return nil
	})
}

func (im *IntegrityMonitor) restoreFile(path string, baseline FileBaseline, violationType string, start time.Time) {
	// Ensure parent directory exists (in case the entire structure was deleted)
	_ = os.MkdirAll(filepath.Dir(path), 0755)

	err := os.WriteFile(path, baseline.Content, baseline.Mode)
	latency := time.Since(start)

	if err != nil {
		log.Printf("[SELF-HEAL-ERROR] Failed to restore file %s: %v", path, err)
		return
	}

	logMsg := fmt.Sprintf("[INTEGRITY_VIOLATION] Restored %s file: %s | Recovery: %v", violationType, filepath.Base(path), latency)
	log.Printf("[SELF-HEAL] %s", logMsg)

	// Send live log to the SOC Command Center terminal
	if im.telemetry != nil {
		im.telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Self-Repair",
			Status:       "REPAIRING",
			DetailAction: logMsg,
		})
	}
}

// computeHash calculates the SHA-256 hex string of bytes
func computeHash(content []byte) string {
	h := sha256.New()
	h.Write(content)
	return fmt.Sprintf("%x", h.Sum(nil))
}

// Helper to copy file
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	if err != nil {
		return err
	}
	return out.Sync()
}
