package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"konnekt/backend/models"
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

func TestCheckForUpdatesParsesAssets(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name": "v0.2.0",
			"html_url": "https://example.com/release",
			"assets": [
				{"name": "konnekt-windows-amd64.exe", "browser_download_url": "https://example.com/dl/exe", "size": 123},
				{"name": "checksums.txt", "browser_download_url": "https://example.com/dl/checksums", "size": 45}
			]
		}`))
	}))
	defer ts.Close()

	svc := &UpdateService{http: ts.Client(), baseURL: ts.URL}
	info, err := svc.CheckForUpdates(context.Background(), "0.1.0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(info.Assets) != 2 {
		t.Fatalf("expected 2 assets, got %d: %+v", len(info.Assets), info.Assets)
	}
	if info.Assets[0].Name != "konnekt-windows-amd64.exe" || info.Assets[0].DownloadURL != "https://example.com/dl/exe" || info.Assets[0].Size != 123 {
		t.Errorf("unexpected first asset: %+v", info.Assets[0])
	}
}

// platformAssetNameFor takes goos/goarch as explicit parameters (rather than
// reading runtime.GOOS/GOARCH) specifically so every platform's naming can be
// tested from a single dev machine, regardless of what it's actually running.
func TestPlatformAssetNameFor(t *testing.T) {
	cases := []struct {
		goos, goarch string
		want         string
		wantErr      bool
	}{
		{"windows", "amd64", "konnekt-windows-amd64.exe", false},
		{"windows", "arm64", "konnekt-windows-arm64.exe", false},
		{"darwin", "amd64", "", true},
		{"linux", "amd64", "", true},
	}
	for _, c := range cases {
		got, err := platformAssetNameFor(c.goos, c.goarch)
		if c.wantErr {
			if err == nil {
				t.Errorf("platformAssetNameFor(%q, %q): expected an error, got %q", c.goos, c.goarch, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("platformAssetNameFor(%q, %q): unexpected error: %v", c.goos, c.goarch, err)
		}
		if got != c.want {
			t.Errorf("platformAssetNameFor(%q, %q) = %q, want %q", c.goos, c.goarch, got, c.want)
		}
	}
}

func TestSelectPlatformAssets(t *testing.T) {
	assets := []models.UpdateAsset{
		{Name: "konnekt-windows-amd64.exe", DownloadURL: "https://example.com/exe"},
		{Name: "checksums.txt", DownloadURL: "https://example.com/checksums"},
	}

	asset, checksums, err := selectPlatformAssets(assets, "windows", "amd64")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if asset.Name != "konnekt-windows-amd64.exe" {
		t.Errorf("asset.Name = %q", asset.Name)
	}
	if checksums.Name != "checksums.txt" {
		t.Errorf("checksums.Name = %q", checksums.Name)
	}

	if _, _, err := selectPlatformAssets(assets, "darwin", "amd64"); err == nil {
		t.Error("expected an error for a platform with no published asset naming")
	}

	if _, _, err := selectPlatformAssets(nil, "windows", "amd64"); err == nil {
		t.Error("expected an error when the platform's asset is missing from the release")
	}

	missingChecksums := []models.UpdateAsset{{Name: "konnekt-windows-amd64.exe"}}
	if _, _, err := selectPlatformAssets(missingChecksums, "windows", "amd64"); err == nil {
		t.Error("expected an error when checksums.txt is missing from the release")
	}
}

func TestParseChecksums(t *testing.T) {
	body := "ABCDEF0123  konnekt-windows-amd64.exe\n" +
		"\n" +
		"1122334455 konnekt-windows-arm64.exe\n" +
		"malformed-line-with-no-filename\n"

	got := parseChecksums([]byte(body))

	if got["konnekt-windows-amd64.exe"] != "abcdef0123" {
		t.Errorf("amd64 entry = %q, want lowercased %q", got["konnekt-windows-amd64.exe"], "abcdef0123")
	}
	if got["konnekt-windows-arm64.exe"] != "1122334455" {
		t.Errorf("arm64 entry = %q", got["konnekt-windows-arm64.exe"])
	}
	if len(got) != 2 {
		t.Errorf("expected 2 parsed entries (malformed line skipped), got %d: %v", len(got), got)
	}
}

// TestDownloadAndApplySuccess exercises the real download+checksum-verify+
// selfupdate.Apply path end-to-end, with TargetPath pointed at a temp file
// instead of the actual running executable — the seam downloadAndApply exists
// for. Confirms the temp file's contents are replaced with the served asset.
func TestDownloadAndApplySuccess(t *testing.T) {
	newContent := []byte("konnekt-fake-binary-content-v2")
	sum := sha256.Sum256(newContent)
	hexSum := hex.EncodeToString(sum[:])

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(newContent)))
		_, _ = w.Write(newContent)
	}))
	defer ts.Close()

	target := filepath.Join(t.TempDir(), "konnekt-target.exe")
	if err := os.WriteFile(target, []byte("old-binary-content"), 0755); err != nil {
		t.Fatalf("seed target file: %v", err)
	}

	svc := &UpdateService{http: ts.Client()}
	asset := models.UpdateAsset{Name: "konnekt-windows-amd64.exe", DownloadURL: ts.URL}
	if err := svc.downloadAndApply(context.Background(), asset, hexSum, target); err != nil {
		t.Fatalf("downloadAndApply: %v", err)
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read target after apply: %v", err)
	}
	if string(got) != string(newContent) {
		t.Errorf("target content = %q, want %q", got, newContent)
	}
}

// TestDownloadAndApplyChecksumMismatch confirms a bad checksum is rejected
// before the target file is ever touched — selfupdate verifies before it
// commits the swap, so the original binary must survive a failed update.
func TestDownloadAndApplyChecksumMismatch(t *testing.T) {
	newContent := []byte("konnekt-fake-binary-content-v2")
	wrongSum := sha256.Sum256([]byte("this-is-not-the-real-content"))
	hexSum := hex.EncodeToString(wrongSum[:])

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(newContent)
	}))
	defer ts.Close()

	target := filepath.Join(t.TempDir(), "konnekt-target.exe")
	original := []byte("old-binary-content")
	if err := os.WriteFile(target, original, 0755); err != nil {
		t.Fatalf("seed target file: %v", err)
	}

	svc := &UpdateService{http: ts.Client()}
	asset := models.UpdateAsset{Name: "konnekt-windows-amd64.exe", DownloadURL: ts.URL}
	if err := svc.downloadAndApply(context.Background(), asset, hexSum, target); err == nil {
		t.Fatal("expected an error on checksum mismatch")
	}

	got, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read target after failed apply: %v", err)
	}
	if string(got) != string(original) {
		t.Errorf("target file was modified despite the checksum mismatch: got %q, want unchanged %q", got, original)
	}
}
