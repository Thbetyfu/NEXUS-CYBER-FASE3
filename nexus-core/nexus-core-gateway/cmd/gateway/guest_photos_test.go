package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGuestPhotoStoreRoundTrip(t *testing.T) {
	guestPhotoStore.mu.Lock()
	guestPhotoStore.items = nil
	guestPhotoStore.mu.Unlock()

	url := rememberGuestPhoto("abc", "image/png", []byte{0x89, 0x50, 0x4e, 0x47})
	if url != "/api/guest-photos/abc" {
		t.Fatalf("url = %s", url)
	}

	list := httptest.NewRequest(http.MethodGet, "/api/photos", nil)
	rr := httptest.NewRecorder()
	guestPhotosListHandler().ServeHTTP(rr, list)
	if rr.Code != http.StatusOK {
		t.Fatalf("list status %d", rr.Code)
	}
	var photos []string
	if err := json.Unmarshal(rr.Body.Bytes(), &photos); err != nil {
		t.Fatal(err)
	}
	if len(photos) != 1 || photos[0] != url {
		t.Fatalf("photos = %#v", photos)
	}

	file := httptest.NewRequest(http.MethodGet, url, nil)
	rrFile := httptest.NewRecorder()
	guestPhotoFileHandler().ServeHTTP(rrFile, file)
	if rrFile.Code != http.StatusOK {
		t.Fatalf("file status %d", rrFile.Code)
	}
	if rrFile.Header().Get("Content-Type") != "image/png" {
		t.Fatalf("mime %s", rrFile.Header().Get("Content-Type"))
	}
}

func TestGetCleanIPSplitsHostPort(t *testing.T) {
	if got := getCleanIP("192.0.2.1:12345"); got != "192.0.2.1" {
		t.Fatalf("ipv4: %s", got)
	}
	if got := getCleanIP("[2001:db8::1]:8080"); got != "2001:db8::1" {
		t.Fatalf("ipv6: %s", got)
	}
}
