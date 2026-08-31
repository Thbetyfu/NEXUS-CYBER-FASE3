package repair

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

func (im *IntegrityMonitor) startWatcher(ctx context.Context) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Printf("[SELF-HEAL-WARN] fsnotify unavailable (%v); poll-only integrity checks remain", err)
		return
	}
	defer watcher.Close()

	if err := im.addWatchTree(watcher, im.monitoredDir); err != nil {
		log.Printf("[SELF-HEAL-WARN] fsnotify watch tree: %v", err)
		return
	}

	log.Printf("[SELF-HEAL] fsnotify watching %s (poll backup still runs)", im.monitoredDir)

	debounce := time.NewTimer(time.Hour)
	if !debounce.Stop() {
		select {
		case <-debounce.C:
		default:
		}
	}
	armed := false

	flush := func() {
		armed = false
		im.ScanAndRestore()
	}

	for {
		select {
		case <-ctx.Done():
			return
		case err, ok := <-watcher.Errors:
			if !ok {
				return
			}
			log.Printf("[SELF-HEAL-WARN] fsnotify: %v", err)
		case ev, ok := <-watcher.Events:
			if !ok {
				return
			}
			if ev.Op&(fsnotify.Create|fsnotify.Write|fsnotify.Remove|fsnotify.Rename) == 0 {
				continue
			}
			if ev.Op&fsnotify.Create != 0 {
				info, err := os.Stat(ev.Name)
				if err == nil && info.IsDir() && !shouldSkipDir(info.Name()) {
					_ = im.addWatchTree(watcher, ev.Name)
				}
			}
			if !armed {
				armed = true
				debounce.Reset(75 * time.Millisecond)
			} else {
				if !debounce.Stop() {
					select {
					case <-debounce.C:
					default:
					}
				}
				debounce.Reset(75 * time.Millisecond)
			}
		case <-debounce.C:
			flush()
		}
	}
}

func (im *IntegrityMonitor) addWatchTree(watcher *fsnotify.Watcher, root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info == nil || !info.IsDir() {
			return nil
		}
		if path != root && shouldSkipDir(info.Name()) {
			return filepath.SkipDir
		}
		return watcher.Add(path)
	})
}
