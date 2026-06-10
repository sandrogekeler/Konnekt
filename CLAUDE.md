# Konnekt

A desktop Minecraft server dashboard built with Wails v2 + React + TypeScript.
Modular tile-based UI. Dark console aesthetic. Local-first, no cloud dependency.

## Stack

- **Shell**: Wails v2 (Go backend + system WebView)
- **Backend**: Go (`backend/`)
- **Frontend**: React 19 + TypeScript + Vite (`frontend/`)
- **Styling**: Tailwind CSS v3
- **State**: Zustand
- **Tile grid**: react-grid-layout
- **IPC**: Wails auto-generated bindings (`frontend/src/wailsjs/`)
- **Package manager**: pnpm (frontend), Go modules (backend)

## Project structure

```
backend/
  app.go              # Wails app entrypoint, binds all services
  services/
    server.go         # Process management (spawn/kill Java, log streaming)
    rcon.go           # RCON client
    backup.go
    scheduler.go
    config.go         # server.properties read/write
    stats.go          # CPU/RAM/TPS polling
  models/
    server.go         # Shared Go structs (auto-bound to TS)
    player.go
    layout.go
  main.go

frontend/
  src/
    components/       # Reusable UI components
    tiles/            # One folder per tile (index.tsx + types.ts)
      registry.ts     # Central tile registry — extend, never restructure
    stores/           # Zustand stores (one per domain)
    hooks/            # Custom React hooks
    lib/              # Shared utilities, constants
    types/            # Global TypeScript types
    wailsjs/          # Auto-generated — DO NOT EDIT MANUALLY
```

## Architecture rules

- **Tiles are self-contained**: each tile in `frontend/src/tiles/` owns its own
  data fetching, state, and rendering. No cross-tile dependencies.
- **Go owns all side effects**: process spawning, file I/O, RCON, scheduling.
  Never call OS-level operations from the frontend.
- **IPC via generated bindings only**: always import from `wailsjs/go/` — never
  use raw `window.go` or string-based calls.
- **One Zustand store per domain**: `useServerStore`, `useLayoutStore`,
  `useTileStore`, `useSchedulerStore`. Do not mix domains.
- **Go structs = TypeScript types**: define data shapes in `backend/models/`,
  Wails generates the TS equivalents automatically on `wails dev`.

## Tile system

Adding a new tile:
1. Create `frontend/src/tiles/MyTile/index.tsx` and `types.ts`
2. Register it in `frontend/src/tiles/registry.ts` with `id`, `label`,
   `icon`, `defaultW`, `defaultH`, `minW`, `minH`, and `component`
3. No changes to core layout system required

Tile registry entry shape:
```ts
{
  id: string
  label: string
  icon: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  component: React.FC<TileProps>
}
```

## IPC conventions

- Bind Go methods on the `App` struct in `backend/app.go`
- Method names: `PascalCase` in Go → `PascalCase` in generated TS bindings
- Always return `(T, error)` from bound Go methods
- Handle errors in frontend with a shared `useWailsCall()` hook
- Re-run `wails generate module` after adding new bound methods

## Code style

- Functional components only, no class components
- `import type` for type-only imports
- No `any` — use `unknown` and narrow
- Prefer named exports; default export only for page-level components
- Tailwind only for styling — no inline `style={{}}` except react-grid-layout
  position props
- Go: `gofmt` enforced, errors always handled (no blank `_` ignores)

## Build & dev commands

```bash
wails dev             # Hot-reload dev mode (runs Vite + Go together)
wails build           # Production binary
wails generate module # Regenerate TS bindings after Go changes
pnpm typecheck        # tsc --noEmit (run from frontend/)
pnpm lint             # ESLint (run from frontend/)
go vet ./...          # Go static analysis (run from backend/)
```

Always run `pnpm typecheck` and `go vet ./...` after a series of changes.

## Rocky Linux 10 build note

If WebKit detection fails, build with:
```bash
wails build -tags webkit2_41
wails dev -tags webkit2_41
```
Run `wails doctor` first — it will tell you exactly which tag to use.

## Alpha scope — do not implement beyond this

See `agent_docs/ROADMAP.md` for full breakdown.

Alpha: multi-server management, start/stop/restart, live console, real-time
stats, performance history (1h), player list + kick/ban, quick commands +
custom commands, scheduled tasks, world management, manual + scheduled backups,
server.properties editor, tile layout system (drag/resize/snap/crate/presets
with save/restore), notifications.

Beta features (file explorer, audit log, mod manager, player profiles, skin
previews, extended history) are in `agent_docs/ROADMAP.md` — do NOT scaffold
during alpha.

## Do not

- Do not edit files under `frontend/src/wailsjs/` — they are auto-generated
- Do not call OS or filesystem operations from frontend TypeScript
- Do not use `localStorage` or `sessionStorage` — persist via Go file I/O
  writing JSON to the Wails app data directory
- Do not add new Go dependencies without checking `agent_docs/DEPENDENCIES.md`
- Do not restructure `frontend/src/tiles/registry.ts` mid-feature — extend only
- Do not use `useEffect` for data that should come from a Wails event listener