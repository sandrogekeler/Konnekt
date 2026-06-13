package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"konnekt/backend/models"
	"konnekt/backend/services"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx           context.Context
	serverService *services.ServerService
	configService *services.ConfigService
	rconService   *services.RconService
	statsService  *services.StatsService
	dataDir       string
}

func NewApp() *App {
	rcon := services.NewRconService()
	srv := services.NewServerService()
	srv.SetRcon(rcon)
	return &App{
		serverService: srv,
		configService: services.NewConfigService(),
		rconService:   rcon,
		statsService:  services.NewStatsService(srv),
	}
}

func (a *App) beforeClose(ctx context.Context) bool {
	if a.serverService.IsRunning() {
		_ = a.serverService.Stop()
	}
	return false
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.serverService.SetContext(ctx)
	a.statsService.SetContext(ctx)

	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	a.dataDir = filepath.Join(configDir, "konnekt")
	_ = os.MkdirAll(a.dataDir, 0755)
	a.configService.SetDataDir(a.dataDir)
}

// --- File dialogs ---

func (a *App) BrowseJarFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Server JAR",
		Filters: []runtime.FileFilter{
			{DisplayName: "JAR Files (*.jar)", Pattern: "*.jar"},
		},
	})
}

func (a *App) BrowseDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Working Directory",
	})
}

// --- Server config ---

func (a *App) GetServerConfigs() ([]models.ServerConfig, error) {
	return a.configService.GetServerConfigs()
}

func (a *App) SaveServerConfig(cfg models.ServerConfig) error {
	return a.configService.SaveServerConfig(cfg)
}

func (a *App) DeleteServerConfig(id string) error {
	return a.configService.DeleteServerConfig(id)
}

func (a *App) GetActiveServerID() (string, error) {
	return a.configService.GetActiveServerID()
}

func (a *App) SetActiveServerID(id string) error {
	return a.configService.SetActiveServerID(id)
}

func (a *App) GetAppSettings() (models.AppSettings, error) {
	return a.configService.GetAppSettings()
}

func (a *App) SaveAppSettings(s models.AppSettings) error {
	return a.configService.SaveAppSettings(s)
}

// --- Server lifecycle ---

func (a *App) StartServer(serverID string) error {
	cfg, err := a.configService.GetServerConfig(serverID)
	if err != nil {
		return err
	}
	return a.serverService.Start(serverID, cfg.JarPath, cfg.JvmArgs, cfg.WorkingDir)
}

func (a *App) StopServer(serverID string) error {
	return a.serverService.Stop()
}

func (a *App) RestartServer(serverID string) error {
	if err := a.serverService.Stop(); err != nil {
		return err
	}
	cfg, err := a.configService.GetServerConfig(serverID)
	if err != nil {
		return err
	}
	return a.serverService.Start(serverID, cfg.JarPath, cfg.JvmArgs, cfg.WorkingDir)
}

func (a *App) AcceptEula(serverID string) error {
	cfg, err := a.configService.GetServerConfig(serverID)
	if err != nil {
		return err
	}
	content := "# EULA accepted via Konnekt\neula=true\n"
	return os.WriteFile(filepath.Join(cfg.WorkingDir, "eula.txt"), []byte(content), 0644)
}

func (a *App) SendCommand(serverID string, command string) error {
	return a.serverService.SendCommand(command)
}

// --- Status and players ---

func (a *App) GetServerStatus(serverID string) (models.ServerStatus, error) {
	return models.ServerStatus{
		Running:    a.serverService.IsRunning(),
		Uptime:     a.serverService.Uptime(),
		Players:    a.serverService.PlayerCount(),
		MaxPlayers: a.serverService.MaxPlayers(),
		TPS:        a.serverService.CurrentTPS(),
		RAMUsed:    a.serverService.RAMUsedMB(),
		RAMTotal:   a.serverService.RAMTotalMB(),
	}, nil
}

func (a *App) GetStatsHistory(serverID string) ([]models.StatsSnapshot, error) {
	return a.statsService.GetStatsHistory(), nil
}

func (a *App) GetPlayers(serverID string) ([]models.Player, error) {
	return a.serverService.GetActivePlayers(), nil
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

// --- Active (working) layout ---
// The current on-screen tile arrangement, persisted independently of the named
// layout presets so drags/resizes survive a restart without overwriting templates.

func (a *App) GetActiveLayout() (string, error) {
	data, err := os.ReadFile(filepath.Join(a.dataDir, "active_layout.json"))
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (a *App) SaveActiveLayout(layout string) error {
	return os.WriteFile(filepath.Join(a.dataDir, "active_layout.json"), []byte(layout), 0644)
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

// --- Command buttons (unified, ordered, customizable) ---

func (a *App) GetCommandButtons() (string, error) {
	data, err := os.ReadFile(filepath.Join(a.dataDir, "command_buttons.json"))
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (a *App) SaveCommandButtons(data string) error {
	return os.WriteFile(filepath.Join(a.dataDir, "command_buttons.json"), []byte(data), 0644)
}
