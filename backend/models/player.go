package models

type Player struct {
	Name         string   `json:"name"`
	UUID         string   `json:"uuid"`
	Online       bool     `json:"online"`
	IP           string   `json:"ip"`
	LastOnline   int64    `json:"lastOnline"` // unix ms; 0 = unknown
	OpLevel      int      `json:"opLevel"`    // 0 = not op
	Whitelisted  bool     `json:"whitelisted"`
	Banned       bool     `json:"banned"`
	BanReason    string   `json:"banReason"`
	PrimaryGroup string   `json:"primaryGroup"` // LuckPerms (Phase 3)
	Groups       []string `json:"groups"`       // LuckPerms (Phase 3)
}
