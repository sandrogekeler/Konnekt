package models

type ServerConfig struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	JarPath    string   `json:"jarPath"`
	JvmArgs    []string `json:"jvmArgs"`
	WorkingDir string   `json:"workingDir"`
	MCVersion  string   `json:"mcVersion"` // e.g. "1.20.1"; empty = undetected
	Loader     string   `json:"loader"`    // fabric|forge|neoforge|quilt|paper|spigot|bukkit|purpur|velocity|vanilla
}

type ServerStatus struct {
	Running    bool    `json:"running"`
	Uptime     string  `json:"uptime"`
	Players    int     `json:"players"`
	MaxPlayers int     `json:"maxPlayers"`
	TPS        float64 `json:"tps"`
	RAMUsed    float64 `json:"ramUsed"`
	RAMTotal   float64 `json:"ramTotal"`
}

type StatsSnapshot struct {
	Timestamp  int64   `json:"timestamp"`
	TPS        float64 `json:"tps"`
	RAMUsedMB  float64 `json:"ramUsedMB"`
	RAMTotalMB float64 `json:"ramTotalMB"`
	CPUPercent float64 `json:"cpuPercent"`
	Players    int     `json:"players"`
}
