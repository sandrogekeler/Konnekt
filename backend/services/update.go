package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"konnekt/backend/models"
)

const (
	updateAPIBase   = "https://api.github.com"
	updateRepoPath  = "/repos/sandrogekeler/Konnekt/releases/latest"
	updateUserAgent = "Konnekt-UpdateChecker"
)

// UpdateService checks GitHub Releases for a newer Konnekt version. GitHub
// Releases *is* the version database here — each release is a git tag with
// per-platform binaries attached as assets, no separate backend needed.
// baseURL is injectable (unlike modrinth.go's hardcoded modrinthBase) so
// tests can point it at an httptest.Server.
type UpdateService struct {
	http    *http.Client
	baseURL string
}

func NewUpdateService() *UpdateService {
	return &UpdateService{
		http:    &http.Client{Timeout: 30 * time.Second},
		baseURL: updateAPIBase,
	}
}

type ghRelease struct {
	TagName     string `json:"tag_name"`
	HTMLURL     string `json:"html_url"`
	Body        string `json:"body"`
	PublishedAt string `json:"published_at"`
}

// CheckForUpdates compares currentVersion (e.g. "0.1.0" or "0.1.0-dev")
// against the latest published GitHub release. A 404 (no releases exist
// yet) reports "up to date" rather than an error — that's the expected
// state until the project cuts its first release.
func (s *UpdateService) CheckForUpdates(ctx context.Context, currentVersion string) (models.UpdateInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.baseURL+updateRepoPath, nil)
	if err != nil {
		return models.UpdateInfo{}, fmt.Errorf("update check: build request: %w", err)
	}
	req.Header.Set("User-Agent", updateUserAgent)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := s.http.Do(req)
	if err != nil {
		return models.UpdateInfo{}, fmt.Errorf("update check: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return models.UpdateInfo{CurrentVersion: currentVersion, LatestVersion: currentVersion}, nil
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return models.UpdateInfo{}, fmt.Errorf("update check: read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return models.UpdateInfo{}, fmt.Errorf("update check: HTTP %d: %s", resp.StatusCode, truncate(string(body), 200))
	}

	var raw ghRelease
	if err := json.Unmarshal(body, &raw); err != nil {
		return models.UpdateInfo{}, fmt.Errorf("update check: decode response: %w", err)
	}

	info := models.UpdateInfo{
		CurrentVersion: currentVersion,
		LatestVersion:  raw.TagName,
		ReleaseURL:     raw.HTMLURL,
		ReleaseNotes:   raw.Body,
		PublishedAt:    raw.PublishedAt,
	}
	if raw.TagName != "" && compareVersions(raw.TagName, currentVersion) > 0 {
		info.UpdateAvailable = true
	}
	return info, nil
}

// compareVersions returns -1 if a < b, 0 if equal, 1 if a > b, treating both
// as vMAJOR.MINOR.PATCH[-prerelease] (a leading "v" is optional on either
// side). A release sorts higher than the same MAJOR.MINOR.PATCH with a
// prerelease suffix; two prerelease suffixes fall back to a string compare
// (good enough for "-dev" vs. a real prerelease tag, not full semver
// precedence).
func compareVersions(a, b string) int {
	coreA, preA := splitVersion(a)
	coreB, preB := splitVersion(b)

	partsA := parseVersionCore(coreA)
	partsB := parseVersionCore(coreB)

	for i := 0; i < 3; i++ {
		if partsA[i] != partsB[i] {
			if partsA[i] < partsB[i] {
				return -1
			}
			return 1
		}
	}

	switch {
	case preA == "" && preB == "":
		return 0
	case preA == "" && preB != "":
		return 1
	case preA != "" && preB == "":
		return -1
	default:
		return strings.Compare(preA, preB)
	}
}

func splitVersion(v string) (core string, prerelease string) {
	v = strings.TrimPrefix(v, "v")
	if idx := strings.IndexByte(v, '-'); idx >= 0 {
		return v[:idx], v[idx+1:]
	}
	return v, ""
}

func parseVersionCore(core string) [3]int {
	var out [3]int
	parts := strings.SplitN(core, ".", 3)
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(parts[i])
		if err != nil {
			continue // non-numeric component treated as 0
		}
		out[i] = n
	}
	return out
}
