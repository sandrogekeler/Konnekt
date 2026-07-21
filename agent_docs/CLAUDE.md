# Konnekt

A desktop Minecraft server dashboard built with Wails v2 + React + TypeScript.
Modular tile-based UI. Dark console aesthetic. Local-first, no cloud dependency.

## Stack

- **Shell**: Wails v2 (Go backend + system WebView)
- **Backend**: Go (`backend/`)
- **Frontend**: React 19 + TypeScript + Vite (`frontend/`)
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Tile grid**: react-grid-layout
- **IPC**: Wails auto-generated bindings (`frontend/wailsjs/`)
- **Package manager**: pnpm (frontend), Go modules (backend)

## Project structure

```
app.go, main.go, version.go  # Wails entrypoint, App struct, version (repo root)
backend/
  services/           # Process mgmt, RCON, backups, scheduler, config, stats, updates
  models/             # Shared Go structs (auto-bound to TS)

frontend/
  wailsjs/            # Auto-generated bindings — DO NOT EDIT MANUALLY
  src/
    components/       # Reusable UI components
    tiles/            # One folder per tile (index.tsx + types.ts)
      registry.ts     # Central tile registry — extend, never restructure
    stores/           # Zustand stores (one per domain)
    hooks/            # Custom React hooks
    lib/              # Shared utilities, constants
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
   `icon`, `defaultW`, `defaultH`, `minW`, `minH`, and `component` — extend
   this file, never restructure it
3. No changes to core layout system required

## IPC conventions

- Bind Go methods on the `App` struct in `app.go` (repo root)
- Method names: `PascalCase` in Go → `PascalCase` in generated TS bindings
- Always return `(T, error)` from bound Go methods
- Handle errors in frontend with a shared `useWailsCall()` hook
- Re-run `wails generate module` after adding new bound methods

## Code style

- Functional components only, no class components
- `import type` for type-only imports
- No `any` — use `unknown` and narrow
- Prefer named exports; default export only for page-level components
- Styling via Tailwind utilities backed by the CSS-variable token system
  (`frontend/src/style.css` `@theme inline` + `frontend/src/lib/theme.ts`
  `applySkin()`). Inline `style={{}}` is reserved for genuinely dynamic/computed
  values (animation delays, transforms, react-grid-layout position props) — not
  for static styling. The codebase is mid-migration from an earlier
  inline-styles-everywhere convention; see `agent_docs/HEALTH_CHECKLIST.md`
  Milestone 2 for the tile-by-tile migration in progress.
- Go: `gofmt` enforced, errors always handled (no blank `_` ignores)
- Heavy per-tile dependencies (three.js, recharts) are lazy-loaded via
  `React.lazy` + `Suspense` (see `frontend/src/tiles/worlds/index.tsx`); keep
  the entry bundle under the 550 KB gzip budget enforced by `pnpm check-bundle`.

## Build & dev commands

```bash
wails dev             # Hot-reload dev mode (runs Vite + Go together)
wails build           # Production binary
wails generate module # Regenerate TS bindings after Go changes
pnpm typecheck        # tsc --noEmit (run from frontend/)
pnpm lint             # ESLint (run from frontend/)
pnpm test             # vitest (run from frontend/)
pnpm format           # Prettier --write (run from frontend/)
pnpm check-bundle     # Enforce 550 KB gzip entry-chunk budget (run from frontend/)
go vet ./...          # Go static analysis (repo root — single module)
go test ./...         # Go tests (repo root)
```

Always run `pnpm typecheck`, `pnpm lint`, and `go vet ./...` after a series of
changes. A lefthook pre-commit hook already runs Prettier + ESLint +
`tsc --noEmit` on staged frontend files and `gofmt` + `go vet` on staged Go
files; CI (`.github/workflows/ci.yml`) re-runs typecheck/lint/build/test on
every push and PR.

## Testing

- Frontend: `vitest` + `jsdom` + `@testing-library/react`. Mock Wails
  bindings with `vi.mock('.../wailsjs/go/main/App')` rather than requiring a
  real Wails bridge — see any `frontend/src/stores/*.test.ts` for the pattern.
- Backend: standard `go test`, table-driven where it fits; use
  `httptest.Server` for HTTP clients (see `update_test.go`, `modrinth_test.go`).
- New logic (Go services, Zustand store logic, pure helpers) should ship with
  tests.

## Versioning & releases

`version.go`'s `Version` var is the single source of the app version,
mirrored in `wails.json`'s `info.productVersion`. `.github/workflows/release.yml`
builds and publishes on `v*` tags; the in-app updater
(`backend/services/update.go`) checks GitHub Releases. Only relevant when
cutting a release.

## Linux builds

The published Linux release (`konnekt-linux-amd64` + an `.rpm`) is built with
`-tags webkit2_41` against webkit2gtk-4.1 (see
`.github/workflows/release.yml`'s `build-linux`/`package-rpm` jobs and
`build/linux/`), which covers Rocky/RHEL 10, Fedora 36+, Ubuntu 22.04+, and
Debian 12+. Rocky/RHEL 9 is not supported — it never received webkit2gtk-4.1
and EL10 dropped 4.0, so the two aren't binary-compatible.

On a Rocky Linux 10 dev machine (or any distro on the 4.1 side), if WebKit
detection fails, build with:
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

- Do not edit files under `frontend/wailsjs/` — they are auto-generated
- Do not call OS or filesystem operations from frontend TypeScript
- Do not use `localStorage` or `sessionStorage` — persist via Go file I/O
  writing JSON to the Wails app data directory
- Do not add new Go dependencies without checking `agent_docs/DEPENDENCIES.md`
- Do not restructure `frontend/src/tiles/registry.ts` mid-feature — extend only
- Do not use `useEffect` for data that should come from a Wails event listener