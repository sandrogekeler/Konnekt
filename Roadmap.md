# Konnekt Roadmap

## Recently shipped

- **Settings page** — Light/Dark/System theme, accent color picker, all sections wired: auto-start, confirm-before-stop, console timestamps + buffer cap, crash + join notifications (desktop + in-app feed), open config folder.
- **Theme token system** — CSS variable tokens across shared chrome; light mode works app-wide on core components.
- **Notifications tile** — live reverse-chronological feed (crash ⚠ / join ●), replaces placeholder.
- **Layout rework** — spring animations on tile flip and maximize, collapsible layouts menu.

---

## Planned

### Polish & UX
- Notifications tile: filter by kind (crash / join / all)
- Console: search / filter bar
- Console: syntax highlighting for log levels in the tile
- Light mode: convert remaining deep tile internals (performance table, charts, players, worlds, backups, server-config) to CSS variable tokens
- Minimize to system tray

### Features
- Check for updates (GitHub releases API)
- Server resource packs / datapacks management tab
- Player history log (join/leave times persisted across sessions)
- Scheduler: recurring task editor (currently placeholder)
- Worlds tile: world size display, per-world backup trigger
- Backups tile: restore flow (copy backup → working dir)

### Infrastructure
- Split the JS bundle (dynamic imports for heavy tiles — recharts, etc.)
- Export / import app settings (backup + migrate between machines)
