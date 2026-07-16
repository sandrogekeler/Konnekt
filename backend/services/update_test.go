package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCompareVersions(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"1.2.3", "1.2.3", 0},
		{"v1.2.3", "1.2.3", 0},
		{"1.2.4", "1.2.3", 1},
		{"1.2.3", "1.2.4", -1},
		{"1.3.0", "1.2.9", 1},
		{"2.0.0", "1.9.9", 1},
		{"1.0.0", "2.0.0", -1},
		{"1.0.0", "1.0.0-dev", 1},
		{"1.0.0-dev", "1.0.0", -1},
		{"1.0.0-alpha", "1.0.0-beta", -1},
		{"0.1.0", "0.1.0-dev", 1},
	}
	for _, c := range cases {
		if got := compareVersions(c.a, c.b); got != c.want {
			t.Errorf("compareVersions(%q, %q) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestCheckForUpdatesReportsAvailable(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != updateRepoPath {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("User-Agent") == "" {
			t.Error("expected a User-Agent header")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v0.2.0","html_url":"https://example.com/release","body":"notes","published_at":"2026-07-16T00:00:00Z"}`))
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	info, err := svc.CheckForUpdates(context.Background(), "0.1.0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !info.UpdateAvailable {
		t.Error("expected UpdateAvailable to be true")
	}
	if info.LatestVersion != "v0.2.0" {
		t.Errorf("LatestVersion = %q, want %q", info.LatestVersion, "v0.2.0")
	}
	if info.ReleaseURL != "https://example.com/release" {
		t.Errorf("ReleaseURL = %q", info.ReleaseURL)
	}
	if info.CurrentVersion != "0.1.0" {
		t.Errorf("CurrentVersion = %q, want %q", info.CurrentVersion, "0.1.0")
	}
}

func TestCheckForUpdatesReportsUpToDate(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"tag_name":"v0.1.0","html_url":"https://example.com/release"}`))
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	info, err := svc.CheckForUpdates(context.Background(), "0.1.0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.UpdateAvailable {
		t.Error("expected UpdateAvailable to be false when versions match")
	}
}

func TestCheckForUpdatesNoReleasesYet(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	info, err := svc.CheckForUpdates(context.Background(), "0.1.0-dev")
	if err != nil {
		t.Fatalf("unexpected error on 404: %v", err)
	}
	if info.UpdateAvailable {
		t.Error("expected UpdateAvailable to be false when no releases exist")
	}
	if info.LatestVersion != "0.1.0-dev" {
		t.Errorf("LatestVersion = %q, want current version echoed back", info.LatestVersion)
	}
}

func TestCheckForUpdatesMalformedJSON(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{not valid json`))
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	if _, err := svc.CheckForUpdates(context.Background(), "0.1.0"); err == nil {
		t.Error("expected an error decoding malformed JSON")
	}
}

func TestCheckForUpdatesServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("boom"))
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	if _, err := svc.CheckForUpdates(context.Background(), "0.1.0"); err == nil {
		t.Error("expected an error on HTTP 500")
	}
}
