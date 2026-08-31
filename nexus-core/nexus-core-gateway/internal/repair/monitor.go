package repair

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
	"github.com/zeebo/blake3"
)

// FileBaseline stores the original content and hash of a protected file.
type FileBaseline struct {
	Path    string
	Content []byte
	BLAKE3  string
	Mode    os.FileMode
}

// Options configures the integrity monitor (pinned snapshot + live restore).
type Options struct {
	MonitoredDir string
	BaselinePath string
	Telemetry    *logger.Logger
	Repin        bool
	OnAlert      func(message string)
}

// IntegrityMonitor restores pinned files in place without stopping the origin process.
type IntegrityMonitor struct {
	mu           sync.RWMutex
	monitoredDir string
	baselinePath string
	baselines    map[string]FileBaseline
	telemetry    *logger.Logger
	onAlert      func(message string)
	isRunning    bool
	pinned       bool
}

// NewIntegrityMonitor builds a monitor from a directory (tests / simple callers).
func NewIntegrityMonitor(monitoredDir string, telemetry *logger.Logger) (*IntegrityMonitor, error) {
	return NewIntegrityMonitorWithOptions(Options{MonitoredDir: monitoredDir, Telemetry: telemetry})
}

// NewIntegrityMonitorWithOptions loads a pinned snapshot if present, otherwise pins disk once.
func NewIntegrityMonitorWithOptions(opts Options) (*IntegrityMonitor, error) {
	absDir, err := filepath.Abs(opts.MonitoredDir)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path: %v", err)
	}

	info, err := os.Stat(absDir)
	if err != nil {
		return nil, fmt.Errorf("monitored directory does not exist: %v", err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("monitored path is not a directory")
	}

	baselinePath := opts.BaselinePath
	if baselinePath == "" {
		baselinePath = defaultBaselinePath(absDir)
	}
	baselinePath, err = filepath.Abs(baselinePath)
	if err != nil {
		return nil, fmt.Errorf("baseline path: %w", err)
	}

	im := &IntegrityMonitor{
		monitoredDir: absDir,
		baselinePath: baselinePath,
		baselines:    make(map[string]FileBaseline),
		telemetry:    opts.Telemetry,
		onAlert:      opts.OnAlert,
	}

	_, statErr := os.Stat(baselinePath)
	switch {
	case opts.Repin || os.IsNotExist(statErr):
		if err := im.buildBaseline(); err != nil {
			return nil, err
		}
		if err := im.saveSnapshot(); err != nil {
			return nil, fmt.Errorf("pin integrity snapshot: %w", err)
		}
		im.mu.Lock()
		im.pinned = true
		im.mu.Unlock()
		log.Printf("[SELF-HEAL] Pinned new integrity snapshot at %s (%d files)", baselinePath, im.fileCount())
	case statErr != nil:
		return nil, fmt.Errorf("integrity snapshot: %w", statErr)
	default:
		if err := im.loadSnapshot(); err != nil {
			return nil, fmt.Errorf("refusing to re-baseline from live disk: %w (set INTEGRITY_REPIN=1 only on a known-good tree)", err)
		}
		log.Printf("[SELF-HEAL] Loaded pinned integrity snapshot %s (%d files) — not re-hashing live disk", baselinePath, im.fileCount())
	}

	log.Printf("[SELF-HEAL] Initialized System Integrity Monitor for: %s (%d files protected)", absDir, im.fileCount())
	return im, nil
}

// BaselinePath is the pinned snapshot file (outside the live tree when using the default).
func (im *IntegrityMonitor) BaselinePath() string {
	return im.baselinePath
}

func (im *IntegrityMonitor) fileCount() int {
	im.mu.RLock()
	defer im.mu.RUnlock()
	return len(im.baselines)
}

func (im *IntegrityMonitor) buildBaseline() error {
	im.mu.Lock()
	defer im.mu.Unlock()
	im.baselines = make(map[string]FileBaseline)

	return filepath.Walk(im.monitoredDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			if path != im.monitoredDir && shouldSkipDir(info.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		if shouldSkipFile(path, info, im.baselinePath) {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read baseline for %s: %v", path, err)
		}
		im.baselines[path] = FileBaseline{
			Path:    path,
			Content: content,
			BLAKE3:  computeHash(content),
			Mode:    info.Mode(),
		}
		return nil
	})
}

// Start watches the tree (fsnotify) and polls as backup. Origin is not restarted.
func (im *IntegrityMonitor) Start(ctx context.Context, interval time.Duration) {
	im.mu.Lock()
	if im.isRunning {
		im.mu.Unlock()
		return
	}
	im.isRunning = true
	im.mu.Unlock()

	if interval <= 0 {
		interval = 2 * time.Second
	}

	go im.startWatcher(ctx)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("[SELF-HEAL] Integrity loop started (fsnotify + poll %v)", interval)

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

// ScanAndRestore rolls back defacement and purges untracked files using the pinned snapshot.
func (im *IntegrityMonitor) ScanAndRestore() {
	im.mu.RLock()
	baselinesCopy := make(map[string]FileBaseline, len(im.baselines))
	for k, v := range im.baselines {
		baselinesCopy[k] = v
	}
	im.mu.RUnlock()

	for path, baseline := range baselinesCopy {
		start := time.Now()

		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			im.restoreFile(path, baseline, "DELETED", start)
			continue
		} else if err != nil {
			log.Printf("[SELF-HEAL-ERROR] Failed to stat file %s: %v", path, err)
			continue
		}

		content, err := os.ReadFile(path)
		if err != nil {
			log.Printf("[SELF-HEAL-ERROR] Failed to read file %s: %v", path, err)
			continue
		}

		if computeHash(content) != baseline.BLAKE3 {
			im.restoreFile(path, baseline, "MODIFIED", start)
		}
	}

	_ = filepath.Walk(im.monitoredDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			if path != im.monitoredDir && shouldSkipDir(info.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		if shouldSkipFile(path, info, im.baselinePath) {
			return nil
		}

		im.mu.RLock()
		_, isProtected := im.baselines[path]
		im.mu.RUnlock()

		if !isProtected {
			start := time.Now()
			if err := os.Remove(path); err == nil {
				latency := time.Since(start)
				log.Printf("[SELF-HEAL] Removed unauthorized file: %s | Latency: %v", path, latency)
				im.notify("UNAUTHORIZED_FILE", fmt.Sprintf("Deleted untracked file %s (%s)", filepath.Base(path), latency))
			}
		}
		return nil
	})
}

func (im *IntegrityMonitor) restoreFile(path string, baseline FileBaseline, violationType string, start time.Time) {
	_ = os.MkdirAll(filepath.Dir(path), 0755)

	err := os.WriteFile(path, baseline.Content, baseline.Mode)
	latency := time.Since(start)

	if err != nil {
		log.Printf("[SELF-HEAL-ERROR] Failed to restore file %s: %v", path, err)
		return
	}

	logMsg := fmt.Sprintf("[INTEGRITY_VIOLATION] Restored %s file: %s | Recovery: %v", violationType, filepath.Base(path), latency)
	log.Printf("[SELF-HEAL] %s", logMsg)
	im.notify(violationType, logMsg)
}

func (im *IntegrityMonitor) notify(kind, detail string) {
	if im.telemetry != nil {
		im.telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Self-Repair",
			Status:       "REPAIRING",
			DetailAction: detail,
		})
	}
	if im.onAlert != nil {
		im.onAlert(fmt.Sprintf("%s: %s", kind, detail))
	}
}

func computeHash(content []byte) string {
	h := blake3.New()
	h.Write(content)
	return fmt.Sprintf("%x", h.Sum(nil))
}
