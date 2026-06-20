# Konnekt Roadmap

Running log of current status. For the full Alpha/Beta feature scope and
per-feature breakdown, see `agent_docs/ROADMAP.md`.

## Recently shipped

- **Console search/filter + log-level highlighting** — slim toolbar above the log area with a text filter input, All/Warn/Error segmented control, and match count. Matched query text highlighted inline. Log-level classification upgraded to parse the real MC `[thread/LEVEL]` prefix (falls back to heuristics for unstructured lines).
- **Notifications filter by kind** — All / Joins / Info / Warn / Errors segmented filter above the feed; Errors groups `crash` + `error`; per-filter empty states.

- **Worlds tile (alpha-complete)** — 3D solar-system world manager: Galaxy view (Sun = server, worlds as orbiting planets, active wears rings, cursor parallax) → World System view (overworld + dimension moons) → floating HUD card per body (level.dat metadata via built-in NBT reader, set-active with 3-way running-server confirm, per-world backup reusing the shared progress bar, rename, duplicate, open folder, delete). Backend: WorldService + zero-dependency NBT reader. three.js / react-three-fiber lazy-loaded on maximize.
- **Scheduler tile — Phase 2b (alpha-complete)** — live run highlighting (running node pulses with an accent glow, finished nodes go green/red, fired control edges light up, auto-clears ~2.4s after a run), run history persisted to `scheduler-history.json` across restarts, static control-cycle warning (amber nodes/edges flagged before a run aborts on the node-count guard), and a next-run countdown in the compact summary (`GetScheduleNextRuns` computes the next fire for interval/timeOfDay/cron triggers, polled every 30s).
- **EventBus refactor** (Remote Access Phase 0) — all services now emit through a single `EventBus` (backend/services/eventbus.go) instead of calling `runtime.EventsEmit` directly. Server, stats, and backup events all route through it; the remote WebSocket fan-out seam is staged for Phase 1.
- **Backups tile** — manual create (zip world folder with save-flush coordination when server running), list with size/timestamp, restore (safe swap, refuses while server running), delete. Live progress bar (shared ActiveProcesses) + running dialog, summary view when compact. In-app + desktop notifications on completion/failure. Path-traversal protected.
- **Settings page** — Light/Dark/System theme, accent color picker, all sections wired: auto-start, confirm-before-stop, console timestamps + buffer cap, crash + join notifications (desktop + in-app feed), open config folder.
- **Theme token system** — CSS variable tokens across shared chrome; light mode works app-wide on core components.
- **Notifications tile** — live reverse-chronological feed (crash ⚠ / join ●), replaces placeholder.
- **Layout rework** — spring animations on tile flip and maximize, collapsible layouts menu.

---

## Planned

### Polish & UX
- Light mode: convert remaining deep tile internals (performance table, charts, players, worlds, backups, server-config) to CSS variable tokens
- Minimize to system tray

### Features
- Check for updates (GitHub releases API)
- Server resource packs / datapacks management tab
- Player history log (join/leave times persisted across sessions)
- Worlds tile: world size display, per-world backup trigger

### Infrastructure
- Split the JS bundle (dynamic imports for heavy tiles — recharts, etc.)
- Export / import app settings (backup + migrate between machines)
