package models

type ConfigFile struct {
	RelPath   string `json:"relPath"`
	Name      string `json:"name"`
	Category  string `json:"category"` // "server" | "plugins" | "mods"
	Source    string `json:"source"`   // plugin/mod folder name; empty for root-level files
	Format    string `json:"format"`   // "properties" | "yaml" | "json" | "json5" | "toml" | "text"
	SizeBytes int64  `json:"sizeBytes"`
	Modified  int64  `json:"modified"` // Unix milliseconds
}
