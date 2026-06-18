package services

import (
	"archive/zip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"konnekt/backend/models"
)

type BackupService struct {
	config  *ConfigService
	server  *ServerService
	ctx     context.Context
	dataDir string
	bus     *EventBus
}

func NewBackupService(cfg *ConfigService, srv *ServerService) *BackupService {
	return &BackupService{config: cfg, server: srv}
}

func (s *BackupService) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *BackupService) SetBus(b *EventBus) {
	s.bus = b
}

func (s *BackupService) SetDataDir(dir string) {
	s.dataDir = dir
}

func (s *BackupService) backupDir(serverID string) (string, error) {
	dir := filepath.Join(s.dataDir, "backups", serverID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}
	return dir, nil
}

func (s *BackupService) worldPath(serverID string) (string, error) {
	cfg, err := s.config.GetServerConfig(serverID)
	if err != nil {
		return "", err
	}
	props, err := readProperties(filepath.Join(cfg.WorkingDir, "server.properties"))
	if err != nil {
		return "", err
	}
	levelName := props["level-name"]
	if levelName == "" {
		levelName = "world"
	}
	return filepath.Join(cfg.WorkingDir, levelName), nil
}

// ─── Metadata sidecar ─────────────────────────────────────────────────────

type backupFileMeta struct {
	DisplayName string   `json:"displayName,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

func (s *BackupService) loadMeta(dir string) (map[string]backupFileMeta, error) {
	data, err := os.ReadFile(filepath.Join(dir, "meta.json"))
	if os.IsNotExist(err) {
		return make(map[string]backupFileMeta), nil
	}
	if err != nil {
		return nil, err
	}
	var m map[string]backupFileMeta
	if err := json.Unmarshal(data, &m); err != nil {
		return make(map[string]backupFileMeta), nil
	}
	return m, nil
}

func (s *BackupService) saveMeta(dir string, m map[string]backupFileMeta) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "meta.json"), data, 0644)
}

// ─── Public methods ────────────────────────────────────────────────────────

func (s *BackupService) ListBackups(serverID string) ([]models.Backup, error) {
	dir, err := s.backupDir(serverID)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	meta, _ := s.loadMeta(dir)

	var backups []models.Backup
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".zip") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		m := meta[e.Name()]
		tags := m.Tags
		if tags == nil {
			tags = []string{}
		}
		backups = append(backups, models.Backup{
			Filename:    e.Name(),
			CreatedAt:   info.ModTime().UnixMilli(),
			SizeBytes:   info.Size(),
			DisplayName: m.DisplayName,
			Tags:        tags,
		})
	}
	sort.Slice(backups, func(i, j int) bool {
		return backups[i].CreatedAt > backups[j].CreatedAt
	})
	return backups, nil
}

func (s *BackupService) CreateBackup(serverID string) (models.Backup, error) {
	worldDir, err := s.worldPath(serverID)
	if err != nil {
		return models.Backup{}, err
	}
	if _, err := os.Stat(worldDir); err != nil {
		return models.Backup{}, fmt.Errorf("world folder not found: %s", worldDir)
	}

	backupDir, err := s.backupDir(serverID)
	if err != nil {
		return models.Backup{}, err
	}

	// Format: {5-digit-id}_{DD}_{MM}_{YY}_{HHMMSS}.zip
	filename := fmt.Sprintf("%s_%s.zip", shortID(), time.Now().Format("02_01_06_150405"))
	destPath := filepath.Join(backupDir, filename)

	s.bus.Emit(EventBackupStarted, map[string]string{"serverID": serverID})

	if s.server != nil && s.server.PrepareForBackup() {
		defer s.server.ResumeSaves()
	}

	var lastPct int = -1
	onProgress := func(pct int) {
		if pct > lastPct {
			lastPct = pct
			s.bus.Emit(EventBackupProgress, map[string]interface{}{
				"serverID": serverID,
				"percent":  pct,
			})
		}
	}

	if err := zipDirWithProgress(worldDir, destPath, onProgress); err != nil {
		s.bus.Emit(EventBackupFailed, map[string]interface{}{
			"serverID": serverID,
			"error":    err.Error(),
		})
		return models.Backup{}, err
	}

	info, err := os.Stat(destPath)
	if err != nil {
		return models.Backup{}, err
	}
	b := models.Backup{
		Filename:  filename,
		CreatedAt: info.ModTime().UnixMilli(),
		SizeBytes: info.Size(),
		Tags:      []string{},
	}
	s.bus.Emit(EventBackupCompleted, map[string]interface{}{
		"serverID": serverID,
		"filename": b.Filename,
	})
	return b, nil
}

func (s *BackupService) RestoreBackup(serverID, filename string) error {
	if err := validateFilename(filename); err != nil {
		return err
	}
	if s.server.IsRunning() {
		return errors.New("stop the server before restoring a backup")
	}

	backupDir, err := s.backupDir(serverID)
	if err != nil {
		return err
	}
	zipPath := filepath.Join(backupDir, filename)

	worldDir, err := s.worldPath(serverID)
	if err != nil {
		return err
	}

	tmp, err := os.MkdirTemp(filepath.Dir(worldDir), "konnekt-restore-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmp)

	if err := unzipTo(zipPath, tmp); err != nil {
		s.bus.Emit(EventBackupFailed, map[string]string{"error": err.Error()})
		return err
	}

	aside := worldDir + ".bak-" + time.Now().Format("20060102-150405")
	if err := os.Rename(worldDir, aside); err != nil && !os.IsNotExist(err) {
		return err
	}
	if err := os.Rename(tmp, worldDir); err != nil {
		_ = os.Rename(aside, worldDir)
		s.bus.Emit(EventBackupFailed, map[string]string{"error": err.Error()})
		return err
	}
	_ = os.RemoveAll(aside)

	s.bus.Emit(EventRestoreCompleted, map[string]string{"serverID": serverID, "filename": filename})
	return nil
}

func (s *BackupService) DeleteBackup(serverID, filename string) error {
	if err := validateFilename(filename); err != nil {
		return err
	}
	backupDir, err := s.backupDir(serverID)
	if err != nil {
		return err
	}
	// Prune metadata entry too
	if meta, err := s.loadMeta(backupDir); err == nil {
		delete(meta, filename)
		_ = s.saveMeta(backupDir, meta)
	}
	return os.Remove(filepath.Join(backupDir, filename))
}

func (s *BackupService) UpdateBackupMeta(serverID, filename, displayName string, tags []string) (models.Backup, error) {
	if err := validateFilename(filename); err != nil {
		return models.Backup{}, err
	}
	backupDir, err := s.backupDir(serverID)
	if err != nil {
		return models.Backup{}, err
	}
	info, err := os.Stat(filepath.Join(backupDir, filename))
	if err != nil {
		return models.Backup{}, err
	}

	// Sanitize tags: strip leading #, trim spaces, drop empty
	var clean []string
	for _, t := range tags {
		t = strings.TrimSpace(strings.TrimPrefix(t, "#"))
		if t != "" {
			clean = append(clean, t)
		}
	}
	if clean == nil {
		clean = []string{}
	}

	meta, err := s.loadMeta(backupDir)
	if err != nil {
		return models.Backup{}, err
	}
	meta[filename] = backupFileMeta{
		DisplayName: strings.TrimSpace(displayName),
		Tags:        clean,
	}
	if err := s.saveMeta(backupDir, meta); err != nil {
		return models.Backup{}, err
	}

	return models.Backup{
		Filename:    filename,
		CreatedAt:   info.ModTime().UnixMilli(),
		SizeBytes:   info.Size(),
		DisplayName: strings.TrimSpace(displayName),
		Tags:        clean,
	}, nil
}

func (s *BackupService) OpenBackupDir(serverID string) error {
	dir, err := s.backupDir(serverID)
	if err != nil {
		return err
	}
	return OpenPath(dir)
}

// ─── Helpers ───────────────────────────────────────────────────────────────

func validateFilename(filename string) error {
	if filename != filepath.Base(filename) || strings.ContainsAny(filename, `/\`) {
		return errors.New("invalid backup filename")
	}
	if !strings.HasSuffix(filename, ".zip") {
		return errors.New("invalid backup filename")
	}
	return nil
}

func shortID() string {
	src := rand.NewSource(time.Now().UnixNano())
	r := rand.New(src) //nolint:gosec
	return fmt.Sprintf("%05d", r.Intn(100000))
}

func dirSize(srcDir string) int64 {
	var total int64
	_ = filepath.Walk(srcDir, func(_ string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			total += info.Size()
		}
		return nil
	})
	return total
}

func zipDirWithProgress(srcDir, destZip string, onProgress func(int)) error {
	total := dirSize(srcDir)

	f, err := os.Create(destZip)
	if err != nil {
		return err
	}
	defer f.Close()

	w := zip.NewWriter(f)
	defer w.Close()

	var written int64
	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if filepath.Base(path) == "session.lock" {
				return nil
			}
			return err
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		if info.IsDir() {
			if rel != "." {
				_, err = w.Create(rel + "/")
			}
			return err
		}
		// session.lock is held exclusively by the running server; it contains no
		// world data and is recreated automatically on next start.
		if info.Name() == "session.lock" {
			return nil
		}
		fw, err := w.Create(rel)
		if err != nil {
			return err
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer src.Close()
		n, err := io.Copy(fw, src)
		written += n
		if total > 0 && onProgress != nil {
			onProgress(int(written * 100 / total))
		}
		return err
	})
}

func unzipTo(zipPath, destDir string) error {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		target := filepath.Join(destDir, filepath.FromSlash(f.Name))
		if !strings.HasPrefix(filepath.Clean(target)+string(os.PathSeparator), filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal path in zip: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}
		out, err := os.Create(target)
		if err != nil {
			return err
		}
		rc, err := f.Open()
		if err != nil {
			out.Close()
			return err
		}
		_, err = io.Copy(out, rc)
		rc.Close()
		out.Close()
		if err != nil {
			return err
		}
	}
	return nil
}
