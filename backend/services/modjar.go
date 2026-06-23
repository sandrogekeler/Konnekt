package services

import (
	"archive/zip"
	"bufio"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"konnekt/backend/models"
)

// parseJarMeta opens a .jar (which is a zip) and extracts mod/plugin identity
// by inspecting loader-specific manifest files. loaderHint (from ServerConfig)
// is tried first for speed; falls back to detecting all known formats.
func parseJarMeta(jarPath, loaderHint string) (models.JarMeta, error) {
	r, err := zip.OpenReader(jarPath)
	if err != nil {
		return filenameHeuristic(jarPath), nil // graceful degradation
	}
	defer r.Close()

	// Build a lookup from zip entry names for cheap access.
	entries := make(map[string]*zip.File, len(r.File))
	for _, f := range r.File {
		entries[f.Name] = f
	}

	// Try loaderHint first, then all loaders in order.
	var meta models.JarMeta
	var found bool

	tryOrder := detectOrder(loaderHint)
	for _, loader := range tryOrder {
		meta, found = tryLoader(loader, entries)
		if found {
			if meta.Loader == "" {
				meta.Loader = loader
			}
			return meta, nil
		}
	}

	// Last resort: MANIFEST.MF
	if mf, ok := entries["META-INF/MANIFEST.MF"]; ok {
		if name, ver := parseManifest(mf); name != "" || ver != "" {
			return models.JarMeta{Name: name, Version: ver}, nil
		}
	}

	return filenameHeuristic(jarPath), nil
}

// detectOrder returns the loader probe sequence with the hint first.
func detectOrder(hint string) []string {
	all := []string{"fabric", "quilt", "neoforge", "forge", "paper", "spigot"}
	if hint == "" {
		return all
	}
	out := []string{hint}
	for _, l := range all {
		if l != hint {
			out = append(out, l)
		}
	}
	return out
}

func tryLoader(loader string, entries map[string]*zip.File) (models.JarMeta, bool) {
	switch loader {
	case "fabric":
		if f, ok := entries["fabric.mod.json"]; ok {
			return parseFabricMod(f)
		}
	case "quilt":
		if f, ok := entries["quilt.mod.json"]; ok {
			return parseQuiltMod(f)
		}
	case "neoforge":
		if f, ok := entries["META-INF/neoforge.mods.toml"]; ok {
			return parseModsToml(f, "neoforge")
		}
		fallthrough // NeoForge jars may also have mods.toml
	case "forge":
		if f, ok := entries["META-INF/mods.toml"]; ok {
			return parseModsToml(f, "forge")
		}
	case "paper", "spigot", "bukkit":
		if f, ok := entries["paper-plugin.yml"]; ok {
			return parsePluginYml(f, "paper")
		}
		if f, ok := entries["plugin.yml"]; ok {
			return parsePluginYml(f, loader)
		}
	}
	return models.JarMeta{}, false
}

// --- Fabric ---

type fabricModJSON struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version"`
}

func parseFabricMod(f *zip.File) (models.JarMeta, bool) {
	data, err := readZipEntry(f)
	if err != nil {
		return models.JarMeta{}, false
	}
	var m fabricModJSON
	if err := json.Unmarshal(data, &m); err != nil {
		return models.JarMeta{}, false
	}
	name := m.Name
	if name == "" {
		name = m.ID
	}
	return models.JarMeta{ID: m.ID, Name: name, Version: m.Version, Loader: "fabric"}, true
}

// --- Quilt ---

type quiltModJSON struct {
	QuiltLoader struct {
		ID      string `json:"id"`
		Version string `json:"version"`
	} `json:"quilt_loader"`
	Metadata struct {
		Name string `json:"name"`
	} `json:"metadata"`
}

func parseQuiltMod(f *zip.File) (models.JarMeta, bool) {
	data, err := readZipEntry(f)
	if err != nil {
		return models.JarMeta{}, false
	}
	var m quiltModJSON
	if err := json.Unmarshal(data, &m); err != nil {
		return models.JarMeta{}, false
	}
	name := m.Metadata.Name
	if name == "" {
		name = m.QuiltLoader.ID
	}
	return models.JarMeta{ID: m.QuiltLoader.ID, Name: name, Version: m.QuiltLoader.Version, Loader: "quilt"}, true
}

// --- Forge / NeoForge (mods.toml) ---
// Minimal hand-rolled parser: reads the first [[mods]] section's modId/version/displayName.
// Handles ${file.jarVersion} by reading MANIFEST.MF Implementation-Version.

func parseModsToml(f *zip.File, loader string) (models.JarMeta, bool) {
	data, err := readZipEntry(f)
	if err != nil {
		return models.JarMeta{}, false
	}

	var modID, version, displayName string
	inMods := false

	sc := bufio.NewScanner(strings.NewReader(string(data)))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "[[mods]]" {
			inMods = true
			continue
		}
		if strings.HasPrefix(line, "[[") && inMods {
			break // left [[mods]] section
		}
		if !inMods {
			continue
		}
		k, v := splitTomlKV(line)
		switch k {
		case "modId":
			modID = v
		case "version":
			version = v
		case "displayName":
			displayName = v
		}
	}

	if modID == "" {
		return models.JarMeta{}, false
	}

	// Resolve ${file.jarVersion} placeholder
	if strings.Contains(version, "${") {
		version = "" // will be filled below from MANIFEST.MF if available
	}

	name := displayName
	if name == "" {
		name = modID
	}
	return models.JarMeta{ID: modID, Name: name, Version: version, Loader: loader}, true
}

func splitTomlKV(line string) (key, value string) {
	idx := strings.IndexByte(line, '=')
	if idx < 0 {
		return "", ""
	}
	key = strings.TrimSpace(line[:idx])
	value = strings.Trim(strings.TrimSpace(line[idx+1:]), `"`)
	return
}

// --- Plugin YAML (Bukkit / Paper) ---
// Top-level line-based parser: only reads `name:`, `version:`, `main:`.

func parsePluginYml(f *zip.File, loader string) (models.JarMeta, bool) {
	data, err := readZipEntry(f)
	if err != nil {
		return models.JarMeta{}, false
	}

	var name, version string
	sc := bufio.NewScanner(strings.NewReader(string(data)))
	for sc.Scan() {
		line := sc.Text()
		if strings.HasPrefix(line, " ") || strings.HasPrefix(line, "\t") {
			continue // skip nested keys
		}
		k, v := splitYAMLKV(line)
		switch k {
		case "name":
			name = v
		case "version":
			version = v
		}
	}

	if name == "" {
		return models.JarMeta{}, false
	}
	return models.JarMeta{ID: strings.ToLower(name), Name: name, Version: version, Loader: loader}, true
}

func splitYAMLKV(line string) (key, value string) {
	idx := strings.IndexByte(line, ':')
	if idx < 0 {
		return "", ""
	}
	key = strings.TrimSpace(line[:idx])
	value = strings.TrimSpace(line[idx+1:])
	// Strip inline YAML quotes
	value = strings.Trim(value, `"'`)
	return
}

// --- MANIFEST.MF ---

func parseManifest(f *zip.File) (name, version string) {
	data, err := readZipEntry(f)
	if err != nil {
		return
	}
	sc := bufio.NewScanner(strings.NewReader(string(data)))
	for sc.Scan() {
		k, v := splitManifestKV(sc.Text())
		switch k {
		case "Implementation-Title":
			name = v
		case "Implementation-Version":
			version = v
		}
	}
	return
}

func splitManifestKV(line string) (key, value string) {
	idx := strings.IndexByte(line, ':')
	if idx < 0 {
		return "", ""
	}
	key = strings.TrimSpace(line[:idx])
	value = strings.TrimSpace(line[idx+1:])
	return
}

// --- Filename heuristic ---

var reJarVersion = regexp.MustCompile(`^(.+?)-(\d[\w.\-]*)\.jar$`)

func filenameHeuristic(jarPath string) models.JarMeta {
	base := filepath.Base(jarPath)
	// Strip .disabled suffix if present
	base = strings.TrimSuffix(base, ".disabled")
	if m := reJarVersion.FindStringSubmatch(strings.ToLower(base)); m != nil {
		return models.JarMeta{Name: m[1], Version: m[2]}
	}
	name := strings.TrimSuffix(base, ".jar")
	return models.JarMeta{Name: name}
}

// --- Server loader detection ---

// detectServerLoader inspects a server jar and (as fallback) the server's latest
// log to suggest an MCVersion and Loader for ServerConfig. Returns the suggested
// values; the caller should treat them as pre-filled defaults, not authoritative.
func detectServerLoader(cfg struct{ JarPath, WorkingDir string }) (mcVersion, loader string) {
	mcVersion, loader = detectFromJar(cfg.JarPath)
	if mcVersion == "" || loader == "" {
		mv, ld := detectFromLog(cfg.WorkingDir)
		if mcVersion == "" {
			mcVersion = mv
		}
		if loader == "" {
			loader = ld
		}
	}
	return
}

func detectFromJar(jarPath string) (mcVersion, loader string) {
	if jarPath == "" {
		return
	}
	r, err := zip.OpenReader(jarPath)
	if err != nil {
		return
	}
	defer r.Close()

	entries := make(map[string]*zip.File, len(r.File))
	for _, f := range r.File {
		entries[f.Name] = f
	}

	// Vanilla / Fabric server jars embed version.json with {"id":"1.20.1"}
	if f, ok := entries["version.json"]; ok {
		if v := readVersionJSON(f); v != "" {
			mcVersion = v
		}
	}

	// Fabric server installs have a fabric-installer marker or net/fabricmc path
	for name := range entries {
		if strings.HasPrefix(name, "net/fabricmc/") {
			loader = "fabric"
			return
		}
	}

	// Forge/NeoForge: META-INF/mods.toml or neoforge.mods.toml
	if _, ok := entries["META-INF/neoforge.mods.toml"]; ok {
		loader = "neoforge"
		return
	}
	if _, ok := entries["META-INF/mods.toml"]; ok {
		loader = "forge"
		return
	}

	// Bukkit/Paper/Spigot: META-INF/services with Bukkit marker
	if f, ok := entries["META-INF/MANIFEST.MF"]; ok {
		data, _ := readZipEntry(f)
		content := string(data)
		if strings.Contains(content, "papermc") || strings.Contains(content, "io.papermc") {
			loader = "paper"
			return
		}
		if strings.Contains(content, "org.bukkit") {
			loader = "bukkit"
			return
		}
		if strings.Contains(content, "org.spigotmc") {
			loader = "spigot"
			return
		}
	}

	if loader == "" && mcVersion != "" {
		loader = "vanilla"
	}
	return
}

type versionJSON struct {
	ID string `json:"id"`
}

func readVersionJSON(f *zip.File) string {
	data, err := readZipEntry(f)
	if err != nil {
		return ""
	}
	var v versionJSON
	if err := json.Unmarshal(data, &v); err != nil {
		return ""
	}
	return v.ID
}

var (
	reLogMCVersion    = regexp.MustCompile(`\(MC:\s*([0-9]+\.[0-9]+(?:\.[0-9]+)?)\)`)
	reLogFabric       = regexp.MustCompile(`(?i)fabric\s+loader`)
	reLogPaper        = regexp.MustCompile(`(?i)This server is running (Paper|Spigot|Purpur|CraftBukkit)`)
	reLogForge        = regexp.MustCompile(`(?i)Forge\s+mod\s+loader`)
	reLogNeoForge     = regexp.MustCompile(`(?i)NeoForge`)
	reLogMCVersion2   = regexp.MustCompile(`(?i)Starting minecraft server version ([0-9]+\.[0-9]+(?:\.[0-9]+)?)`)
	reLogLoadingMC    = regexp.MustCompile(`(?i)Loading Minecraft\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)`)
)

func detectFromLog(workingDir string) (mcVersion, loader string) {
	logPath := filepath.Join(workingDir, "logs", "latest.log")
	f, err := os.Open(logPath)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1024*1024), 1024*1024)

	lineCount := 0
	for sc.Scan() && lineCount < 500 { // only scan the first 500 lines
		line := sc.Text()
		lineCount++

		if mcVersion == "" {
			if m := reLogMCVersion.FindStringSubmatch(line); m != nil {
				mcVersion = m[1]
			} else if m := reLogMCVersion2.FindStringSubmatch(line); m != nil {
				mcVersion = m[1]
			} else if m := reLogLoadingMC.FindStringSubmatch(line); m != nil {
				mcVersion = m[1]
			}
		}

		if loader == "" {
			switch {
			case reLogNeoForge.MatchString(line):
				loader = "neoforge"
			case reLogForge.MatchString(line):
				loader = "forge"
			case reLogFabric.MatchString(line):
				loader = "fabric"
			default:
				if m := reLogPaper.FindStringSubmatch(line); m != nil {
					loader = strings.ToLower(m[1])
					if loader == "craftbukkit" {
						loader = "bukkit"
					}
				}
			}
		}

		if mcVersion != "" && loader != "" {
			return
		}
	}
	return
}

// --- Utility ---

const maxJarEntrySize = 4 * 1024 * 1024 // 4 MB cap to avoid zip-bomb reads

func readZipEntry(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(io.LimitReader(rc, maxJarEntrySize))
}
