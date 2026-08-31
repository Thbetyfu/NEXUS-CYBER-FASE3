package repair

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const snapshotVersion = 1

type snapshotFile struct {
	Rel     string `json:"rel"`
	Mode    uint32 `json:"mode"`
	BLAKE3  string `json:"blake3"`
	Content string `json:"content_b64"`
}

type snapshotDoc struct {
	Version        int            `json:"version"`
	MonitoredDir   string         `json:"monitored_dir"`
	CreatedAt      string         `json:"created_at"`
	Files          []snapshotFile `json:"files"`
	ManifestBLAKE3 string         `json:"manifest_blake3"`
}

func defaultBaselinePath(monitoredAbs string) string {
	parent := filepath.Dir(monitoredAbs)
	sum := computeHash([]byte(monitoredAbs))
	if len(sum) > 16 {
		sum = sum[:16]
	}
	return filepath.Join(parent, ".nexus-integrity-"+sum+".json")
}

func (im *IntegrityMonitor) saveSnapshot() error {
	im.mu.RLock()
	defer im.mu.RUnlock()

	files := make([]snapshotFile, 0, len(im.baselines))
	for abs, b := range im.baselines {
		rel, err := filepath.Rel(im.monitoredDir, abs)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		files = append(files, snapshotFile{
			Rel:     rel,
			Mode:    uint32(b.Mode),
			BLAKE3:  b.BLAKE3,
			Content: base64.StdEncoding.EncodeToString(b.Content),
		})
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Rel < files[j].Rel })

	doc := snapshotDoc{
		Version:      snapshotVersion,
		MonitoredDir: im.monitoredDir,
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
		Files:        files,
	}
	doc.ManifestBLAKE3 = snapshotManifestHash(files)

	raw, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(im.baselinePath), 0755); err != nil {
		return err
	}
	return os.WriteFile(im.baselinePath, raw, 0600)
}

func (im *IntegrityMonitor) loadSnapshot() error {
	raw, err := os.ReadFile(im.baselinePath)
	if err != nil {
		return err
	}
	var doc snapshotDoc
	if err := json.Unmarshal(raw, &doc); err != nil {
		return fmt.Errorf("integrity snapshot JSON: %w", err)
	}
	if doc.Version != snapshotVersion {
		return fmt.Errorf("integrity snapshot version %d unsupported", doc.Version)
	}
	if snapshotManifestHash(doc.Files) != doc.ManifestBLAKE3 {
		return fmt.Errorf("integrity snapshot manifest BLAKE3 mismatch (file tampered)")
	}

	next := make(map[string]FileBaseline, len(doc.Files))
	for _, f := range doc.Files {
		body, err := base64.StdEncoding.DecodeString(f.Content)
		if err != nil {
			return fmt.Errorf("integrity snapshot content %s: %w", f.Rel, err)
		}
		if computeHash(body) != f.BLAKE3 {
			return fmt.Errorf("integrity snapshot content hash mismatch: %s", f.Rel)
		}
		abs := filepath.Join(im.monitoredDir, filepath.FromSlash(f.Rel))
		next[abs] = FileBaseline{
			Path:    abs,
			Content: body,
			BLAKE3:  f.BLAKE3,
			Mode:    os.FileMode(f.Mode),
		}
	}

	im.mu.Lock()
	im.baselines = next
	im.pinned = true
	im.mu.Unlock()
	return nil
}

func snapshotManifestHash(files []snapshotFile) string {
	sorted := append([]snapshotFile(nil), files...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Rel < sorted[j].Rel })
	var b strings.Builder
	for _, f := range sorted {
		b.WriteString(f.Rel)
		b.WriteByte('\n')
		b.WriteString(f.BLAKE3)
		b.WriteByte('\n')
		b.WriteString(f.Content)
		b.WriteByte('\n')
	}
	return computeHash([]byte(b.String()))
}
