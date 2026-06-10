package models

type ServerStatus struct {
	Running    bool    `json:"running"`
	Uptime     string  `json:"uptime"`
	Players    int     `json:"players"`
	MaxPlayers int     `json:"maxPlayers"`
	TPS        float64 `json:"tps"`
	RAMUsed    float64 `json:"ramUsed"`
	RAMTotal   float64 `json:"ramTotal"`
}
