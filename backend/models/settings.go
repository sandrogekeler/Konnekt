package models

type AppSettings struct {
	Theme       string `json:"theme"`       // "light" | "dark" | "system"
	AccentColor string `json:"accentColor"` // hex e.g. "#4ade80"

	AutoStartActiveServer bool `json:"autoStartActiveServer"`
	ConfirmBeforeStop     bool `json:"confirmBeforeStop"`

	ConsoleBufferLines int  `json:"consoleBufferLines"`
	ConsoleTimestamps  bool `json:"consoleTimestamps"`

	NotifyOnCrash bool `json:"notifyOnCrash"`
	NotifyOnJoin  bool `json:"notifyOnJoin"`
}
