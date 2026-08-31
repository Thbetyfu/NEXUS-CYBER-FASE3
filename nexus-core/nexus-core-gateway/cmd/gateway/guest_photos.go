package main

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
)

type guestPhoto struct {
	URL  string
	Mime string
	Data []byte
}

var guestPhotoStore struct {
	mu    sync.Mutex
	items []guestPhoto
}

const maxGuestPhotos = 24

func rememberGuestPhoto(id, mime string, data []byte) string {
	url := "/api/guest-photos/" + id
	guestPhotoStore.mu.Lock()
	defer guestPhotoStore.mu.Unlock()
	guestPhotoStore.items = append([]guestPhoto{{URL: url, Mime: mime, Data: data}}, guestPhotoStore.items...)
	if len(guestPhotoStore.items) > maxGuestPhotos {
		guestPhotoStore.items = guestPhotoStore.items[:maxGuestPhotos]
	}
	return url
}

func guestPhotoURLs() []string {
	guestPhotoStore.mu.Lock()
	defer guestPhotoStore.mu.Unlock()
	out := make([]string, 0, len(guestPhotoStore.items))
	for _, p := range guestPhotoStore.items {
		out = append(out, p.URL)
	}
	return out
}

func guestPhotosListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(guestPhotoURLs())
	}
}

func guestPhotoFileHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/guest-photos/")
		if id == "" || strings.Contains(id, "/") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		want := "/api/guest-photos/" + id
		guestPhotoStore.mu.Lock()
		defer guestPhotoStore.mu.Unlock()
		for _, p := range guestPhotoStore.items {
			if p.URL == want {
				w.Header().Set("Content-Type", p.Mime)
				w.Header().Set("Cache-Control", "no-store")
				_, _ = w.Write(p.Data)
				return
			}
		}
		w.WriteHeader(http.StatusNotFound)
	}
}
