package services

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"konnekt/backend/models"
)

var configExtensions = map[string]string{
	".properties": "properties",
	".yml":        "yaml",
	".yaml":       "yaml",
	".toml":       "toml",
	".json":       "json",
	".json5":      "json5",
	".conf":       "text",
	".cfg":        "text",
}

// serverRootNames lists config files expected directly in the server working directory.
var serverRootNames = map[string]bool{
	"server.properties":        true,
	"spigot.yml":               true,
	"bukkit.yml":               true,
	"paper.yml":                true,
	"paper-global.yml":         true,
	"paper-world-defaults.yml": true,
	"pufferfish.yml":           true,
	"purpur.yml":               true,
	"commands.yml":             true,
	"help.yml":                 true,
	"permissions.yml":          true,
}

const backupKeep = 3

type ConfigEditorService struct {
	appConfig *ConfigService
	dataDir   string
}

func NewConfigEditorService(appConfig *ConfigService) *ConfigEditorService {
	return &ConfigEditorService{appConfig: appConfig}
}

func (s *ConfigEditorService) SetDataDir(dir string) {
	s.dataDir = dir
}

// ListConfigFiles scans the server's working directory and returns discoverable
// config files grouped into Server / Plugins / Mods categories.
func (s *ConfigEditorService) ListConfigFiles(serverID string) ([]models.ConfigFile, error) {
	workDir, err := s.workingDir(serverID)
	if err != nil {
		return nil, err
	}

	var files []models.ConfigFile

	// --- Server root files ---
	rootEntries, _ := os.ReadDir(workDir)
	for _, e := range rootEntries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !serverRootNames[name] {
			continue
		}
		format := extFormat(name)
		if format == "" {
			continue
		}
		info, _ := e.Info()
		files = append(files, makeConfigFile(workDir, filepath.Join(workDir, name), info, "server", "", format))
	}

	// Paper-specific configs in config/ subdir (paper-*.yml, purpur-*.yml)
	configDir := filepath.Join(workDir, "config")
	if cfgEntries, err := os.ReadDir(configDir); err == nil {
		for _, e := range cfgEntries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if !strings.HasPrefix(name, "paper-") && !strings.HasPrefix(name, "purpur-") {
				continue
			}
			format := extFormat(name)
			if format == "" {
				continue
			}
			info, _ := e.Info()
			files = append(files, makeConfigFile(workDir, filepath.Join(configDir, name), info, "server", "", format))
		}
	}

	// --- Plugins (depth 2 under plugins/) ---
	pluginsDir := filepath.Join(workDir, "plugins")
	if _, err := os.Stat(pluginsDir); err == nil {
		pEntries, _ := os.ReadDir(pluginsDir)

		// Files directly in plugins/
		for _, e := range pEntries {
			if e.IsDir() {
				continue
			}
			format := extFormat(e.Name())
			if format == "" {
				continue
			}
			info, _ := e.Info()
			files = append(files, makeConfigFile(workDir, filepath.Join(pluginsDir, e.Name()), info, "plugins", "", format))
		}

		// One level of plugin subdirectories
		for _, e := range pEntries {
			if !e.IsDir() || e.Name() == "update" || strings.HasPrefix(e.Name(), ".") {
				continue
			}
			pluginName := e.Name()
			subEntries, _ := os.ReadDir(filepath.Join(pluginsDir, pluginName))
			for _, sub := range subEntries {
				if sub.IsDir() {
					continue
				}
				format := extFormat(sub.Name())
				if format == "" {
					continue
				}
				info, _ := sub.Info()
				files = append(files, makeConfigFile(workDir, filepath.Join(pluginsDir, pluginName, sub.Name()), info, "plugins", pluginName, format))
			}
		}
	}

	// --- Mods: config/ (excluding paper/purpur prefixed files) ---
	if cfgEntries, err := os.ReadDir(configDir); err == nil {
		// Files directly in config/ (non-paper, non-purpur)
		for _, e := range cfgEntries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if strings.HasPrefix(name, "paper-") || strings.HasPrefix(name, "purpur-") {
				continue
			}
			format := extFormat(name)
			if format == "" {
				continue
			}
			info, _ := e.Info()
			files = append(files, makeConfigFile(workDir, filepath.Join(configDir, name), info, "mods", "", format))
		}

		// One level of mod subdirectories in config/
		for _, e := range cfgEntries {
			if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
				continue
			}
			modName := e.Name()
			subEntries, _ := os.ReadDir(filepath.Join(configDir, modName))
			for _, sub := range subEntries {
				if sub.IsDir() {
					continue
				}
				format := extFormat(sub.Name())
				if format == "" {
					continue
				}
				info, _ := sub.Info()
				files = append(files, makeConfigFile(workDir, filepath.Join(configDir, modName, sub.Name()), info, "mods", modName, format))
			}
		}
	}

	return files, nil
}

// ReadConfigFile reads a config file, sandbox-checked against the server working dir.
func (s *ConfigEditorService) ReadConfigFile(serverID, relPath string) (string, error) {
	workDir, err := s.workingDir(serverID)
	if err != nil {
		return "", err
	}
	abs, err := s.sandbox(workDir, relPath)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// WriteConfigFile validates (JSON only for now), backs up, then writes a config file.
func (s *ConfigEditorService) WriteConfigFile(serverID, relPath, content string) error {
	workDir, err := s.workingDir(serverID)
	if err != nil {
		return err
	}
	abs, err := s.sandbox(workDir, relPath)
	if err != nil {
		return err
	}

	// Validate JSON before writing
	if strings.HasSuffix(strings.ToLower(relPath), ".json") {
		var v any
		if err := json.Unmarshal([]byte(content), &v); err != nil {
			return fmt.Errorf("invalid JSON: %w", err)
		}
	}

	if err := s.backup(serverID, abs, relPath); err != nil {
		return fmt.Errorf("backup failed: %w", err)
	}

	return os.WriteFile(abs, []byte(content), 0644)
}

func (s *ConfigEditorService) workingDir(serverID string) (string, error) {
	cfg, err := s.appConfig.GetServerConfig(serverID)
	if err != nil {
		return "", err
	}
	return cfg.WorkingDir, nil
}

func (s *ConfigEditorService) sandbox(workDir, relPath string) (string, error) {
	clean := filepath.Clean(filepath.Join(workDir, relPath))
	wd := filepath.Clean(workDir)
	if clean != wd && !strings.HasPrefix(clean, wd+string(filepath.Separator)) {
		return "", fmt.Errorf("path outside working directory")
	}
	return clean, nil
}

func (s *ConfigEditorService) backup(serverID, abs, relPath string) error {
	if _, err := os.Stat(abs); os.IsNotExist(err) {
		return nil // nothing to back up for new files
	}

	escaped := strings.ReplaceAll(filepath.ToSlash(relPath), "/", "__")
	backupDir := filepath.Join(s.dataDir, "config_backups", serverID)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return err
	}

	ts := time.Now().Format("20060102_150405")
	dst, err := os.Create(filepath.Join(backupDir, escaped+"."+ts+".bak"))
	if err != nil {
		return err
	}
	defer dst.Close()

	src, err := os.Open(abs)
	if err != nil {
		return err
	}
	defer src.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return err
	}

	s.pruneBackups(backupDir, escaped)
	return nil
}

func (s *ConfigEditorService) pruneBackups(dir, prefix string) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}
	var matching []string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), prefix+".") && strings.HasSuffix(e.Name(), ".bak") {
			matching = append(matching, e.Name())
		}
	}
	for i := 0; i < len(matching)-backupKeep; i++ {
		_ = os.Remove(filepath.Join(dir, matching[i]))
	}
}

func makeConfigFile(workDir, abs string, info os.FileInfo, category, source, format string) models.ConfigFile {
	rel, _ := filepath.Rel(workDir, abs)
	return models.ConfigFile{
		RelPath:   filepath.ToSlash(rel),
		Name:      info.Name(),
		Category:  category,
		Source:    source,
		Format:    format,
		SizeBytes: info.Size(),
		Modified:  info.ModTime().UnixMilli(),
	}
}

func extFormat(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	return configExtensions[ext]
}
