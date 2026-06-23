# Konnekt — Feature Roadmap

This file is the full Alpha/Beta scope reference for Claude Code.
When implementing any feature, check its status here first.

For a running log of what has actually shipped recently, see the root
`Roadmap.md` — that file tracks current status; this one defines the full scope.

Note: some Beta features (Settings page, theme toggle, desktop notifications)
were shipped early during Alpha. Their status below reflects reality.

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
- [x] Startup splash screen (Satoshi Black "Konnekt" in accent green, 1s fade+glow animation)
- [x] Tile layout system (react-grid-layout, drag, resize, snap)
- [x] Tile crate (inactive tiles panel, add/remove from canvas)
- [x] Tile scale and maximise
  - [x] Maximise button in tile header: expands tile to fill the canvas area as an overlay
  - [x] Restore button returns tile to its previous grid position and size
  - [x] Only one tile maximised at a time; closing restores the previous layout
  - [x] Smooth open/close animations: opacity fade on both flip-transform and fallback paths
  - (maximise lives in tiles/TileWrapper + Dashboard animations)
- [x] Layout presets (save, restore, delete named layouts)
- [x] Default presets: "Default", "Console Focus", "Compact", "Essentials"
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

- [x] Scheduler tile - Node Graph Interface
  - React Flow visual editor (Phase 2a): drag/drop palette, generic BlockNode renderer,
    control edges (solid) + data edges (dashed), isValidConnection rejects cross-kind wiring,
    NodeConfigPanel with per-type widgets + "wired" badge, multi-select (left-drag box),
    pan on middle mouse, delete selected, graph CRUD + enable toggle + Run now
  - Backend engine: BFS execution, concurrency guard (one run per graph), resolveDataInputs
    overlays wired edge values onto config; 17 native blocks + JSON manifest loader
  - Triggers: playerJoined/Left, serverStopped, backupCompleted/Failed, tpsThreshold,
    interval, timeOfDay, cron
  - Actions: consoleCommand, rcon, serverStart/Stop/Restart, backup, httpRequest, delay
  - Control: condition (onTrue/onFalse)
  - Notify: notify block fully wired — backend emits schedule:notify, frontend listener
    routes to emitNotification with info/warn/error kinds
  - Data category: serverAttribute (TPS/playerCount/RAM/running), randomNumber, constValue,
    mathOp (+/-/*/div/mod) — all wire into condition.left/right or any wirable field
  - Persistence to ~/.config/konnekt/scheduler.json; run history (200 records in-memory)
  - [x] Graph entrance animation on maximize: nodes stagger-fade in, edges draw in
    via AnimatedEdge (SVG pathLength stroke-dashoffset technique); handle re-measurement
    deferred until after animations so connections land at correct positions
  - [x] Phase 2b complete:
    - Live node highlighting: GraphEditor subscribes to schedule:run/node events,
      pulses the running node (accent glow), colors finished nodes green/red, and
      lights fired control edges in accent; auto-clears ~2.4s after run finishes.
    - Run history persisted to ~/.config/konnekt/scheduler-history.json (load on
      startup, capped at 200; addHistory writes a snapshot outside the lock).
    - Cycle visualization: detectControlCycles() statically flags nodes/edges in a
      control-flow loop (amber) — warns before a run aborts on the maxNodesPerRun guard.
    - Next-run in compact summary: backend NextRuns() computes the next fire time for
      interval/timeOfDay/cron triggers (GetScheduleNextRuns, polled every 30s); summary
      shows per-graph "in 5m/2h/3d" + a soonest "next run" footer.

- [x] Worlds tile - 3D Solar-System World Manager
  - 3-level navigation: Galaxy (L0) → World system (L1) → Floating HUD card (L2)
  - L0: central Sun = server, each world save orbits it; active world wears rings;
    cursor parallax (useParallax lerps group rotation from pointer).
  - L1: overworld is the central body, nether/the_end are moons; OrbitControls.
  - L2: WorldHud (drei Html) anchored to the clicked body — metadata from level.dat
    (NBT reader: version, mode, difficulty, seed, last-played), size, modified, path;
    Set-active with 3-way confirm when running (Stop+restart / Stop only / Cancel),
    per-world Backup (reuses BackupService + shared progress bar), Open folder,
    Rename, Duplicate, Delete.
  - Backend: WorldService (ListWorlds, SetActiveWorld, DeleteWorld, RenameWorld,
    DuplicateWorld, OpenWorldFolder, BackupWorld); built-in NBT reader (nbt.go,
    no new Go dependency); groups Paper/Spigot siblings + vanilla DIM-1/DIM1.
  - Compact summary: world count, active world name, per-world size list.
  - three.js + @react-three/fiber + @react-three/drei; lazy-loaded so the bundle
    only ships when the tile is maximized.

- [x] Backups tile
  - [x] Manual backup button (zip full server dir → {dataDir}/backups/{serverID}/)
  - [x] Save-flush coordination: issues save-off/save-all/save-on via RCON when the server is running so the zip is consistent
  - [x] Backup list with timestamp, size, restore and delete actions; summary view when not maximised (BackupsSummary)
  - [x] Live progress UI: backup:started/progress events drive a shared ActiveProcesses bar (useProcessesStore) + BackupRunningDialog
  - [x] Restore backup (refuses while server running, safe extract-then-swap, rolls back on failure)
  - [x] Notifications: backup:completed / backup:failed events + emitNotification
  - [x] Path-traversal validation on all filename inputs
  - [x] Scheduled backups — delivered via the Scheduler tile (interval/timeOfDay/cron
    trigger → backup action block), rather than a dedicated config here
  - Go: BackupService (backup.go — ListBackups, CreateBackup, RestoreBackup, DeleteBackup); models/backup.go; frontend tiles/backups/useBackups.ts

- [x] Server Config tile  *(shipped as a general config-file editor; diverged from original spec)*
  
  - [x] File list of editable config files (server.properties, JSON, YAML, TOML)
  - [x] Form-based key/value editor with typed widgets (parsers in tiles/config/form/)
  - [x] Raw text editor with dirty-tracking, save, revert; compact summary when not maximised
  - [x] Save writes directly to the config file; offers restart when server running
  - Go: backend/services/config_editor.go — ListConfigFiles / ReadConfigFile / WriteConfigFile
  - (grouped fields / gamerule editor / MOTD preview moved to Beta — see "Tiles — beta")

- [x] Notifications tile
  
  - [x] In-app feed (reverse-chronological, timestamped, colour-coded by kind), clear-all
  - [x] OS desktop notifications too (WebView Notification API, lib/notify.ts)
  - [x] Notification kinds: crash, join, info, warn, error — each with distinct icon + colour
  - [x] Events wired: server started/stopped/crashed, player joined/left,
    backup completed/failed, scheduler notify block (info/warn/error), TPS below
    threshold (<14, edge-triggered with 14/15 hysteresis). Player-left shares the
    "Player join/leave alerts" toggle.
  - Frontend: stores/useNotificationsStore.ts (emitted client-side; no Go NotificationService)

---

## Beta

Do not scaffold or implement these during Alpha.
Beta work begins only after all Alpha tiles are complete and stable.

### Backups — beta hardening

- [x] Full-server snapshot (entire working dir: jar, plugins, configs, world) vs world-only
  — Backups tile now zips `cfg.WorkingDir`; backups tagged `kind: "server" | "world"` in
  meta.json; restore branches on kind; legacy backups derived from filename convention
- [ ] Worlds tile: create / list / restore / delete **per-world** backups (currently only
  create exists via `CreateWorldBackup`; world backups land in the shared backup dir but
  are not surfaced in the Worlds tile)
- [ ] Backups tile: view and manage **all world-specific backups** in the "World-specific"
  segment (currently a note-only placeholder; replaces it with carousel + list)
- [ ] Scheduler tile: world-specific backup action (choose target world, not just full-server)
- [ ] Multi-dimension worlds: also back up `world_nether` / `world_the_end`
  (Paper/Spigot/Bukkit split dimensions into sibling folders; `worldPath()`
  currently zips only the single `level-name` folder — silent data loss on
  those server types)
- [ ] Retention / pruning policy: auto-delete backups by count, total size, or age
- [ ] Cancel an in-progress backup
- [ ] Concurrency guard in `CreateBackup` to prevent overlapping scheduled + manual runs
- [ ] Integrity check / corrupt-zip detection on restore (beyond `zip.OpenReader` error)
- [ ] Import / restore from an external backup file (drag-in or file picker)

### Tiles — beta

- [ ] Server Config tile — beta enhancements
  
  - The tile already shipped in Alpha as a general config-file editor; these are
    deferred refinements on top of it.
  - [ ] Grouped server.properties fields (General/Performance/World/Network/Gameplay)
  - [ ] Gamerule editor (per-world, fetched via RCON when server is running)
  - [ ] MOTD editor with live preview
  - Go: backend/services/config_editor.go (extend existing service)

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
  - Note: this exposes the Minecraft *game* port only. For remote access to the
    Konnekt dashboard itself, see "Remote access — full dashboard over the web"
    below (uses cloudflared for an HTTPS console URL).

- [ ] Extended performance history (24h, 7-day) with persistent storage
- [~] OS desktop notifications — shipped early, via WebView Notification API
  (lib/notify.ts), not the planned Wails runtime.EventsEmit → OS notify route
- [ ] App auto-updater (check GitHub releases, prompt to update)
- [x] Dark/light theme toggle — shipped early: light/dark/system + accent picker,
  CSS variable tokens, persisted (lib/theme.ts, useSettingsStore)
- [ ] Keyboard shortcuts (configurable, stored in settings)
- [~] Settings page — shipped early: theme, accent colour, auto-start active server,
  confirm-before-stop, console buffer/timestamps, crash/join notifications, open data dir.
  Not yet: global JVM defaults, backup retention policy.

### Remote access — full dashboard over the web

Expose the entire Konnekt dashboard to a remote browser (phone/laptop) via a
zero-config tunnel, secured with a password + session token. The remote client
is a responsive web page served by the app itself — no native mobile app, no
second frontend build.

**Core idea:** Wails injects `window.go.main.App.*` (IPC) and `window.runtime.*`
(events) into the local WebView. A remote browser has neither. Rather than
rewrite every tile's IPC calls, the frontend detects plain-browser mode and
injects a **shim** that implements those same globals against an embedded HTTP
server. Tiles render remotely with zero per-tile changes (every generated
binding funnels through `window['go']['main']['App'][Method]`).

**Sequencing decision:** Phases 1–5 are deferred until after all Beta tiles ship.
The shim is tile-agnostic, so Phases 1–2 cost the same now or later, while the
expensive-to-retrofit groundwork (Phase 0 — EventBus, console replay buffer,
uniform `(T, error)` bindings) is already done. Beta also adds the most
remote-hostile surface (file explorer, mod manager → native file I/O, downloads),
all of which Phase 5 must adapt; building remote first would mean redoing that
work per tile. Auth + tunnel (Phases 3–4) also expose the dashboard to the web,
so they should land once against a stable, hardened feature set. Until then, the
only ongoing cost is the remote-readiness checklist under "Adding a tile" below.

- [x] **Phase 0 — Event hub refactor**
  - `EventBus` (backend/services/eventbus.go) is now the single emit path; every
    service routes through `bus.Emit(event, data)` instead of calling
    `runtime.EventsEmit` directly. Wired into server.go (log lines, eula, player
    joined/left, server stopped), stats.go (snapshots), backup.go (started/
    progress/completed/failed/restore). The remote WS fan-out seam is marked in
    `Emit()` for Phase 1 — no service bypasses it.
- [ ] **Phase 1 — `RemoteService` (backend/services/remote.go)**
  - Embedded `net/http` server, off by default, started on demand, bound to
    `127.0.0.1` (tunnel terminates TLS at the edge — see Phase 4).
  - Serves the existing embedded `frontend/dist` (reuse `main.go`'s `embed.FS`).
  - `POST /api/rpc` — generic reflection dispatcher over the bound `App`; body
    `{method, args}` → invoke → `(result, error)` JSON. One dispatcher covers
    all ~40 methods and stays correct as new ones are added.
  - `GET /ws` — WebSocket subscribed to the EventBus; carries a replay buffer
    (reuse the console buffer cap) so a reconnecting mobile client catches up.
- [ ] **Phase 2 — Frontend remote runtime (lib/remoteRuntime.ts, loaded first)**
  - Detect `window.go == null` → remote mode.
  - Inject `window.go.main.App` proxy → POSTs to `/api/rpc`.
  - Inject `window.runtime.EventsOn/Off/Emit` → backed by the WebSocket.
  - Login gate renders before the dashboard mounts.
  - **Highest-risk phase — build and prove on LAN first.**
- [ ] **Phase 3 — Auth (password + token)**
  - Password set in Settings → Remote Access; stored only as an argon2/bcrypt
    hash in `~/.config/konnekt/remote.json` (never plaintext).
  - `POST /api/login` verifies password → signed, expiring session token;
    required on all `/api/rpc` and `/ws`. Rate-limit login with lockout/backoff.
  - Recommended extra: desktop-side "approve new device" prompt on first
    connection from an unknown client.
- [ ] **Phase 4 — Tunnel transport (cloudflared)**
  - `TunnelService` launches the cloudflared binary (download/cache on first
    use), parses stdout for the public `https://<random>.trycloudflare.com` URL,
    surfaces status + copy button. TLS handled at the Cloudflare edge.
  - **Note:** distinct from the playit.gg item below — playit exposes the raw
    Minecraft *game* TCP port; cloudflared exposes the *web console* (HTTPS).
- [ ] **Phase 5 — Remote-mode adaptations**
  - Disable/hide native-only methods that target the host machine
    (`BrowseJarFile`, `BrowseDirectory`, `OpenDataDir`, `OpenBackupDir` →
    `runtime.OpenFileDialog`/folder open), or replace with a server-side path
    browser.
  - WS auto-reconnect + token refresh + buffer replay for flaky mobile links.
  - Multi-client behaviour (desktop + remote at once): state already lives in
    Go; ensure every event broadcasts to all clients via the EventBus.
  - Settings UI to enable remote access, set password, start/stop tunnel.

Open questions to resolve before build: single app-wide password vs per-user
accounts (default: single); whether remote needs per-server sessions or just
mirrors the one active server like the desktop does (default: mirror).

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
6. Remote-readiness (keeps the future Remote Access feature cheap — see below):
   a. Fetch data only through generated bindings — never raw `window.go`
   b. Emit/consume events through `EventBus`, never `runtime.EventsEmit` directly
   c. Any native-only method (file dialog, OS file/folder open, host path access)
      must be flagged "needs a remote fallback in Remote Access Phase 5" at the
      call site, so it surfaces when the remote shim is built

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
