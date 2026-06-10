package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"konnekt/backend/models"
	"konnekt/backend/services"
)

type App struct {
	ctx           context.Context
	serverService *services.ServerService
	dataDir       string
}

func NewApp() *App {
	return &App{
		serverService: services.NewServerService(),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.serverService.SetContext(ctx)

	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	a.dataDir = filepath.Join(configDir, "konnekt")
	_ = os.MkdirAll(a.dataDir, 0755)
}

// --- Server lifecycle ---

func (a *App) StartServer(serverID string) error {
	return a.serverService.Start("server.jar", []string{"-Xmx2G", "-Xms512M"})
}

func (a *App) StopServer(serverID string) error {
	return a.serverService.Stop()
}

func (a *App) RestartServer(serverID string) error {
	if err := a.serverService.Stop(); err != nil {
		return err
	}
	return a.serverService.Start("server.jar", []string{"-Xmx2G", "-Xms512M"})
}

func (a *App) SendCommand(serverID string, command string) error {
	return a.serverService.SendCommand(command)
}

// --- Status and players ---

func (a *App) GetServerStatus(serverID string) (models.ServerStatus, error) {
	return models.ServerStatus{
		Running:    a.serverService.IsRunning(),
		Uptime:     a.serverService.Uptime(),
		Players:    0,
		MaxPlayers: 20,
		TPS:        20.0,
		RAMUsed:    0,
		RAMTotal:   2048,
	}, nil
}

func (a *App) GetPlayers(serverID string) ([]models.Player, error) {
	return []models.Player{}, nil
}

func (a *App) KickPlayer(serverID string, name string, reason string) error {
	cmd := fmt.Sprintf("kick %s %s", name, reason)
	return a.serverService.SendCommand(cmd)
}

func (a *App) BanPlayer(serverID string, name string, reason string) error {
	cmd := fmt.Sprintf("ban %s %s", name, reason)
	return a.serverService.SendCommand(cmd)
}

// --- Layout presets ---

func (a *App) GetLayoutPresets() ([]models.LayoutPreset, error) {
	data, err := os.ReadFile(filepath.Join(a.dataDir, "layout_presets.json"))
	if os.IsNotExist(err) {
		return []models.LayoutPreset{}, nil
	}
	if err != nil {
		return nil, err
	}
	var presets []models.LayoutPreset
	if err := json.Unmarshal(data, &presets); err != nil {
		return nil, err
	}
	return presets, nil
}

func (a *App) SaveLayoutPreset(name string, layout string) error {
	presets, err := a.GetLayoutPresets()
	if err != nil {
		return err
	}
	for i, p := range presets {
		if p.Name == name {
			presets[i].Layout = layout
			return a.writeLayoutPresets(presets)
		}
	}
	presets = append(presets, models.LayoutPreset{Name: name, Layout: layout})
	return a.writeLayoutPresets(presets)
}

func (a *App) DeleteLayoutPreset(name string) error {
	presets, err := a.GetLayoutPresets()
	if err != nil {
		return err
	}
	filtered := presets[:0]
	for _, p := range presets {
		if p.Name != name {
			filtered = append(filtered, p)
		}
	}
	return a.writeLayoutPresets(filtered)
}

func (a *App) writeLayoutPresets(presets []models.LayoutPreset) error {
	data, err := json.Marshal(presets)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(a.dataDir, "layout_presets.json"), data, 0644)
}

// --- Active tiles ---

func (a *App) GetActiveTiles() ([]string, error) {
	data, err := os.ReadFile(filepath.Join(a.dataDir, "active_tiles.json"))
	if os.IsNotExist(err) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	var ids []string
	if err := json.Unmarshal(data, &ids); err != nil {
		return nil, err
	}
	return ids, nil
}

func (a *App) SaveActiveTiles(ids []string) error {
	data, err := json.Marshal(ids)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(a.dataDir, "active_tiles.json"), data, 0644)
}

// --- Custom commands ---

func (a *App) GetCustomCommands() ([]string, error) {
	data, err := os.ReadFile(filepath.Join(a.dataDir, "custom_commands.json"))
	if os.IsNotExist(err) {
		return []string{}, nil
	}
	if err != nil {
		return nil, err
	}
	var cmds []string
	if err := json.Unmarshal(data, &cmds); err != nil {
		return nil, err
	}
	return cmds, nil
}

func (a *App) SaveCustomCommands(cmds []string) error {
	data, err := json.Marshal(cmds)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(a.dataDir, "custom_commands.json"), data, 0644)
}
