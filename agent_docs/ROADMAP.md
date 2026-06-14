# Konnekt — Feature Roadmap

This file is the authoritative feature reference for Claude Code.
When implementing any feature, check its status here first.
Do not implement Beta features during Alpha development.

---

## Status legend

- `[ ]` Not started
- `[x]` Complete
- `[~]` Partial / placeholder

---

## Alpha

### Core infrastructure

- [x] Wails v2 app scaffold (Go + React + TypeScript + Vite)
- [x] Tailwind CSS v3 design system (dark, #05060a base, #4ade80 accent)
- [x] Custom scrollbar (4px, dark minimal, matches design scheme)
- [x] JetBrains Mono + Inter fonts
- [x] Tile layout system (react-grid-layout, drag, resize, snap)
- [x] Tile crate (inactive tiles panel, add/remove from canvas)
- [ ] Tile scale and maximise
  - Per-tile zoom level (font/content scale independent of grid size)
  - Maximise button in tile header: expands tile to fill the canvas area as an overlay
  - Restore button returns tile to its previous grid position and size
  - Only one tile maximised at a time; closing restores the previous layout
- [x] Layout presets (save, restore, delete named layouts)
- [x] Default presets: "Default", "Console Focus", "Compact"
- [x] Persistence via Go JSON files (~/.config/konnekt/)
- [x] All IPC bindings generated via wails generate module
- [x] useWailsCall() hook for typed IPC error handling

### Server management

- [x] Start server (spawn Java process with configurable JVM args)
- [x] Stop server (clean process shutdown)
- [x] Restart server
- [x] Send command (write to process stdin)
- [x] Multi-server instance support (multiple server configs)
- [x] Server config storage (name, jar path, JVM args, working dir per server)
- [x] Add / remove server instances from sidebar
- [x] EULA acceptance prompt
  - Detects "eula.txt" in log stream, emits server:eula-required event
  - Amber modal with EULA link (opens system browser), Accept & Restart, Dismiss
  - On accept: writes eula=true to {workingDir}/eula.txt then restarts server
- [x] GetPlayers — log-based player tracking
  - Parses "joined the game" / "left the game" from log stream via regex
  - Thread-safe in-memory map; cleared on server stop
  - Emits player:joined and player:left events for future Notifications tile
  - Ping omitted (requires RCON); GetPlayers() returns live list

### Tiles — implemented

- [x] Console tile (live log streaming, auto-scroll, pause on scroll up,
  command input, clear console button)
- [x] Stats tile (status, players online, TPS with colour banding,
  RAM used/total with progress bar, uptime)
  - All values live: TPS via RCON (log-based fallback), RAM via gopsutil RSS,
    player count from log-parsed in-memory map; all served by GetServerStatus()
- [x] Quick commands tile (start, stop, restart, save-all, list, set day,
  clear weather, freeze time, kick/ban with modal, custom commands)

### Tiles — remaining alpha

- [x] Players tile
  
  - Online player list, polls GetPlayers() every 3 seconds
  - Kick and ban buttons per player; colour-coded modal with optional reason
  - List clears automatically when server stops

- [x] Performance tile
  
  - Time-series chart of TPS, RAM, CPU (last 1 hour)
  - Go: StatsService ring buffer, 360 snapshots at 10s intervals, emits stats:snapshot
  - Frontend: recharts ComposedChart, dual Y-axes, compact + expanded views with
    sortable summary table and toggle-able series; GetStatsHistory() for initial load

- [ ] Scheduler tile - Node Graph Interface
  
  - List of scheduled tasks (time, command or action, repeat/once)
  - Actions: restart server, save-all, run custom command, backup
  - Go: SchedulerService using time.AfterFunc / cron-style ticker
  - Add, edit, delete tasks
  - Tasks persist to ~/.config/konnekt/scheduler.json

- [ ] Worlds tile - 3D Space / Solar System Visualization
  
  - List world folders found in server working directory.
  - World visualized as planets in space, grouped into solar systems. # ADD MULTI-WORLD SERVER COMPATIBILITY PLANS
  - Show folder size, last modified date with hover tooltip.
  - Switch active world (stop server → swap level-name in server.properties → restart)
  - Delete world (with confirmation modal)

- [ ] Backups tile
  
  - Manual backup button (zip world folder → ~/.config/konnekt/backups/)
  - Backup list with timestamp, size, restore and delete actions
  - Scheduled backup config (interval: hourly/daily/weekly)
  - Restore backup (stop server → unzip → restart)
  - Go: BackupService, runs in goroutine, emits progress events

- [ ] Server Config tile
  
  - Visual editor for server.properties key/value pairs
  - Group fields: General, Performance, World, Network, Gameplay
  - Gamerule editor (per-world, fetched via RCON when server is running)
  - MOTD editor with live preview
  - Save writes directly to server.properties file
  - Go: ConfigService reads/writes server.properties preserving comments

- [ ] Notifications tile
  
  - In-app notification feed (not OS notifications for alpha)
  - Events: server started, server stopped/crashed, player joined,
    player left, TPS below threshold (<14), backup completed, backup failed
  - Go: NotificationService emits typed events, frontend subscribes
  - Dismissable, timestamped, colour-coded by severity

---

## Beta

Do not scaffold or implement these during Alpha.
Beta work begins only after all Alpha tiles are complete and stable.

### Tiles — beta

- [ ] File explorer tile
  
  - Browse server directory tree
  - View and edit text files (configs, logs) in-tile editor
  - Upload files via drag-and-drop
  - Delete files with confirmation
  - Go: FileService with sandboxed path (server working dir only)

- [ ] Audit log tile
  
  - Chronological log of all user-triggered actions
  - Events: server start/stop/restart, commands sent, kicks, bans,
    backups, config changes, file edits
  - Go: AuditService appends to ~/.config/konnekt/audit.json
  - Filter by event type, searchable

- [ ] Mod / plugin manager tile
  
  - List .jar files in /mods or /plugins directory
  - Enable / disable (move to /mods.disabled)
  - Show mod name, version (parsed from fabric.mod.json / mcmod.info)
  - Search and install mods from Modrinth (free, no API key) and CurseForge
    (requires free API key from console.curseforge.com)
  - Go: ModService downloads .jar to mods/ or plugins/, tracks installed mods
    in ~/.config/konnekt/mods.json manifest
  - CurseForge: resolve real download URL via /files/{fileId}/download-url
    (CDN auth token required — do not use direct file links)
  - Link to Modrinth/CurseForge page per installed mod
  - No auto-update in beta — manual install and remove only

- [ ] Player profiles tile
  
  - Per-player history: sessions, total playtime, first seen, last seen
  - Notes field per player
  - Go: PlayerHistoryService, records join/leave events from log stream
  - Persists to ~/.config/konnekt/players.json

- [ ] Player skin preview tile
  
  - Fetch skin from Mojang API (api.mojang.com) using player UUID
  - Render 2D face sprite (front-facing head only for simplicity)
  - Show for currently online players
  - Cache skins locally, respect Mojang rate limits

### Features — beta

- [ ] Public server IP via tunnel (playit.gg)
  
  - Launches and manages the playit-agent binary as a child process
  - Go: TunnelService — download agent on first use, persist auth token,
    parse stdout to extract the public address (e.g. yourserver.joinmc.link)
  - Frontend: shows tunnel status (connecting / active / stopped) and the
    public address with a copy button
  - playit.gg chosen: purpose-built for game servers, free tier gives a
    persistent address (unlike ngrok free), no account required for basic use
  - Agent binary cached in app data dir; user can also provide their own path

- [ ] Extended performance history (24h, 7-day) with persistent storage
- [ ] OS desktop notifications (Wails runtime.EventsEmit → OS notify)
- [ ] App auto-updater (check GitHub releases, prompt to update)
- [ ] Dark/light theme toggle (extend CSS variables, persist preference)
- [ ] Keyboard shortcuts (configurable, stored in settings)
- [ ] Settings page (global JVM defaults, notification preferences,
  backup retention policy, theme)

---

## Implementation notes for Claude Code

### Adding a tile (checklist)

1. Create `frontend/src/tiles/<TileName>/index.tsx`
2. Create `frontend/src/tiles/<TileName>/types.ts` if the tile has
   its own local state shape
3. Register in `frontend/src/tiles/registry.ts` — extend the array,
   never restructure the file
4. If new Go data is needed:
   a. Add struct to `backend/models/` if it crosses the IPC boundary
   b. Add method to relevant service in `backend/services/` c. Bind method on App struct in `backend/app.go` d. Run `wails generate module` to regenerate TS bindings
   e. Import from `frontend/src/wailsjs/go/main/` in the tile
5. Run `pnpm typecheck` and `go vet ./...` before marking done

### Event naming convention

Wails runtime events use colon-namespaced strings:

- `log:line` — console log line from server stdout
- `stats:snapshot` — periodic stats update
- `notification:event` — user-facing notification
- `backup:progress` — backup operation progress
- `backup:complete` — backup finished
- `backup:error` — backup failed

Define all event name constants in `frontend/src/lib/constants.ts` and `backend/services/events.go` — never hardcode event strings inline.

### Go service pattern

Each service follows this shape:

```go
type MyService struct {
    ctx context.Context
    // fields
}

func NewMyService() *MyService {
    return &MyService{}
}

func (s *MyService) SetContext(ctx context.Context) {
    s.ctx = ctx
}
```

Services are instantiated in `app.go`, context is set in `startup()`.
