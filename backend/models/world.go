package models

// WorldSystem is one Minecraft world save, presented as a "solar system":
// the overworld is the central planet and its dimensions are moons.
// Paper/Spigot splits dimensions into sibling folders (world_nether, world_the_end);
// vanilla keeps them as DIM-1/DIM1 subfolders. Both layouts are normalized here.
type WorldSystem struct {
	Name       string           `json:"name"`       // base level-name, e.g. "world"
	Active     bool             `json:"active"`     // matches server.properties level-name
	TotalSize  int64            `json:"totalSize"`  // bytes across all dimensions
	Modified   int64            `json:"modified"`   // newest mtime across dimensions (unix ms)
	Dimensions []WorldDimension `json:"dimensions"`
	Meta       WorldMeta        `json:"meta"`
}

type WorldDimension struct {
	Kind     string `json:"kind"`     // "overworld" | "nether" | "the_end"
	Path     string `json:"path"`     // absolute path on disk
	Size     int64  `json:"size"`     // bytes
	Modified int64  `json:"modified"` // unix ms
}

// WorldMeta holds data read from level.dat via the built-in NBT reader.
// All fields are best-effort; Found=false means the file was missing or unreadable.
type WorldMeta struct {
	Found      bool   `json:"found"`
	LevelName  string `json:"levelName"`
	Version    string `json:"version"`
	GameMode   string `json:"gameMode"`   // "survival" | "creative" | "adventure" | "spectator"
	Difficulty string `json:"difficulty"` // "peaceful" | "easy" | "normal" | "hard"
	Hardcore   bool   `json:"hardcore"`
	LastPlayed int64  `json:"lastPlayed"` // unix ms
	Seed       string `json:"seed"`       // best-effort; empty if not found
	SpawnX     int    `json:"spawnX"`
	SpawnY     int    `json:"spawnY"`
	SpawnZ     int    `json:"spawnZ"`
}
