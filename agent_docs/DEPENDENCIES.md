# Konnekt — Dependency Policy & Inventory

Referenced by `agent_docs/CLAUDE.md` ("Do not add new Go dependencies without
checking `agent_docs/DEPENDENCIES.md`") and
`agent_docs/HEALTH_CHECKLIST.md`'s Scalable pillar. Keep this current when
dependencies are added, removed, or repurposed — it's a decision record, not a
lockfile mirror.

## Policy

**Before adding a Go dependency:**
- Prefer the standard library. This app runs local-first on the user's
  machine — every dependency is something that has to be vetted, updated, and
  trusted with local file/process access.
- Justify anything beyond the existing surface (process/OS stats, the Wails
  runtime itself, Windows syscalls). If stdlib or an existing dependency
  already covers it, don't add a new one.
- Record the addition here with a one-line rationale in the same PR.

**Before adding an npm dependency:**
- Prefer what's already in the tree (e.g. reuse Zustand for state, Tailwind
  utilities for styling — see `CLAUDE.md`'s Code style section) over a new
  library that does the same job differently.
- Heavy/rarely-used dependencies must be lazy-loaded (`React.lazy` +
  `Suspense`), per the existing `worlds` (three.js) and `performance`
  (recharts) pattern — see the Scalable pillar in `HEALTH_CHECKLIST.md`.
- Check the production bundle budget (`pnpm check-bundle`, 550 KB gzip entry
  chunk) isn't blown by the addition.
- Record the addition here with a one-line rationale in the same PR.

**Periodically** (see `HEALTH_CHECKLIST.md`'s Scalable pillar): confirm
dependencies are still current and that nothing here is unused or duplicated
with another library doing the same job.

## Current inventory

### Go (`go.mod`, direct requires)

| Module | Rationale |
|---|---|
| `github.com/shirou/gopsutil/v4` | Cross-platform CPU/RAM stats polling (`backend/services/stats.go`) |
| `github.com/wailsapp/wails/v2` | App shell — Go↔WebView bridge, IPC binding generation |
| `golang.org/x/sys` | Windows syscalls for Job Object child-process cleanup (`backend/services/server_windows.go`) |

All other Go modules in `go.mod` are transitive (`// indirect`), pulled in by
the three direct dependencies above (mostly Wails' own runtime/webview/toast
stack and gopsutil's per-OS backends).

### Frontend (`frontend/package.json`, direct dependencies)

| Package | Rationale |
|---|---|
| `react`, `react-dom` | UI framework |
| `zustand` | Per-domain state stores (`CLAUDE.md`'s "one Zustand store per domain" rule) |
| `react-grid-layout` | Tile drag/resize/snap grid system |
| `recharts` | Performance-tile charts, lazy-loaded (`tiles/performance/charts.tsx`) |
| `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing` | Worlds tile's 3D planetary scene, lazy-loaded (`tiles/worlds/scene/`) |
| `@xyflow/react` | Node-graph editor for the scheduler tile's block system (`tiles/scheduler/editor/`) |
| `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/state`, `@codemirror/view`, `@uiw/react-codemirror` | server.properties / config file editor (`tiles/config/EditorPanel.tsx`) |
| `react-markdown`, `remark-gfm`, `rehype-raw` | Rendering mod descriptions / changelogs in the mods tile |
| `smol-toml`, `yaml` | Parsing server config formats in the config tile |
| `skinview3d` | **Reserved, not yet wired up** — for the Beta "player skin preview" tile (`ROADMAP.md` line 246). Not imported under `frontend/src/` today; keep until that tile is built, then wire it up or remove |

Dev-only tooling (build, lint, format, test — Vite, TypeScript, ESLint,
Prettier, Vitest, Tailwind, etc.) isn't itemized here; it's inspectable
directly from `devDependencies` in `frontend/package.json` and doesn't ship in
the production bundle.

## Removed

- `uplot` — was listed as a direct dependency but never imported under
  `frontend/src/`; the performance tile's charts use `recharts` exclusively.
  Removed (see `HEALTH_CHECKLIST.md`'s "P2 — Repo hygiene").
