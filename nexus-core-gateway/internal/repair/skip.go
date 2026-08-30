package repair

import (
	"os"
	"path/filepath"
	"strings"
)

const maxBaselineFileBytes = 2 << 20 // 2 MiB — skip binaries that would bloat RAM/snapshot

var skipDirNames = map[string]struct{}{
	"node_modules": {},
	".git":         {},
	".next":        {},
	"coverage":     {},
	".turbo":       {},
	".cache":       {},
	"vendor":       {},
	"uploads":      {}, // gallery/user photos — must not be purged as "webshell"
}

func shouldSkipDir(name string) bool {
	_, ok := skipDirNames[strings.ToLower(name)]
	return ok
}

func isBaselineArtifact(path, baselinePath string) bool {
	base := strings.ToLower(filepath.Base(path))
	if strings.HasPrefix(base, ".nexus-integrity-") && strings.HasSuffix(base, ".json") {
		return true
	}
	if base == "integrity-baseline.json" {
		return true
	}
	if baselinePath == "" {
		return false
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return false
	}
	want, err := filepath.Abs(baselinePath)
	if err != nil {
		return false
	}
	return abs == want
}

func shouldSkipFile(path string, info os.FileInfo, baselinePath string) bool {
	if info == nil || info.IsDir() {
		return true
	}
	if isBaselineArtifact(path, baselinePath) {
		return true
	}
	if info.Size() > maxBaselineFileBytes {
		return true
	}
	return false
}
