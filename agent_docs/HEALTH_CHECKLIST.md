# Konnekt — Project Health Checklist

An evergreen yardstick for periodically measuring project health across four
pillars: **Clean, Stable, Scalable/Future-proof, Performant**. Run this check
before each milestone (e.g. alpha → beta) or roughly monthly.

**How to use this doc:** compare the current codebase against the items below.
Do **not** edit this list to match whatever the code currently does — it's the
target, not a snapshot. When a gap is found, track it as a backlog item (see
`Remediation backlog` below or the repo's issue tracker), fix it, then re-run
the checklist. This file should look almost the same every time you open it;
only the backlog section should churn.

See `agent_docs/CLAUDE.md` for architecture conventions and build commands, and
`agent_docs/ROADMAP.md` for feature scope. This doc doesn't duplicate either —
it's the quality gate that sits alongside them.

Canonical local commands (from `CLAUDE.md`):
```bash
go vet ./...           # Go static analysis (repo root)
go test ./...           # Go tests
pnpm typecheck          # tsc --noEmit (from frontend/)
pnpm lint               # ESLint (from frontend/)
wails build              # Production build smoke test
```

---

## 1. Clean

- [x] `go vet ./...` and `gofmt -l .` report nothing.
- [x] No blank `_ =` error-ignores in Go, except documented `//nolint` cases
      (e.g. `backend/services/eventbus.go`). See backlog
      ("P2 — Undocumented blank error-ignores").
- [x] `pnpm lint` runs against a real ESLint config and passes.
- [x] Formatting (Prettier/Biome or equivalent) is consistent and enforced,
      not manual (lefthook pre-commit hook: Prettier + ESLint + `tsc --noEmit`
      on staged frontend files, `gofmt` + `go vet` on staged Go files).
- [x] `pnpm typecheck` has zero errors; no `any` anywhere (CLAUDE.md rule) —
      use `unknown` and narrow instead. One documented exception:
      `frontend/src/tiles/worlds/scene/Sun.tsx` (known `three`/`@react-three/fiber`
      cross-package type mismatch).
- [ ] Nothing under `frontend/src/wailsjs/` has been hand-edited (it's
      auto-generated; regenerate via `wails generate module` instead).
- [ ] No inline `style={{}}` beyond genuinely dynamic/computed values
      (animation delays, transforms, react-grid-layout position props) —
      Tailwind utilities backed by CSS-variable tokens otherwise (see
      CLAUDE.md's Code style section). `eslint.config.js`'s `no-restricted-syntax`
      rule flags remaining inline styles at `warn`; ratchet per directory to
      `error` as Milestone 2's migration clears each tile.
- [x] No committed build artifacts (`*.syso`, `frontend/dist/`, `build/bin/`)
      — `.gitignore` covers them.
- [ ] No stray root-level scratch/design docs left un-triaged (either promoted
      into `agent_docs/` or deleted once the work lands).
- [ ] `agent_docs/CLAUDE.md` and `agent_docs/ROADMAP.md` still reflect the
      actual stack/structure/scope — update them when they drift.
- [ ] No obviously dead code (unused exports, unreachable branches, orphaned
      files) left behind after refactors.

## 2. Stable

- [ ] Automated tests exist and pass for critical paths: RCON client, Modrinth
      API client, backup create/restore, config path-traversal guards,
      scheduler engine (Go); Zustand store logic and critical hooks (frontend).
- [x] CI is green on every push/PR (see backlog: GitHub Actions).
- [ ] All Go methods bound to the Wails `App` struct return `(T, error)`, and
      errors are wrapped with context (`fmt.Errorf("...: %w", err)`).
- [ ] Every `EventsOn` listener registered in a component is cleaned up on
      unmount — no leaked subscriptions.
- [ ] No frontend data is driven by `useEffect` polling when it should be a
      Wails event listener (CLAUDE.md rule).
- [ ] Process lifecycle stays safe: Windows Job Object child cleanup intact
      (`backend/services/server_windows.go`), RCON dial/operation timeouts
      present (`backend/services/rcon.go`), Modrinth HTTP client keeps its
      timeout + 429/`Retry-After` retry handling (`backend/services/modrinth.go`).
- [ ] `ErrorBoundary` wraps the app and the UI degrades gracefully when the
      Minecraft server process is offline or unreachable.

## 3. Scalable / Future-proof

- [x] Heavy per-tile dependencies are lazy-loaded on demand, following the
      existing pattern in `frontend/src/tiles/worlds/index.tsx` (`React.lazy`
      + `Suspense`): worlds' three.js/@react-three scene, and now recharts
      (performance tile — see backlog). The backups tile has **no** three.js
      dependency — its "planets" are pure SVG/CSS (`WireframeSphere.tsx`,
      `SolarSystem.tsx`); a repo-wide grep confirms `three`/`@react-three`
      appear only under `worlds/scene/`.
- [x] Production bundle size stays within an agreed budget (550 KB gzip on the
      entry chunk, ~12% headroom over the measured post-split size), checked
      in CI (`frontend/scripts/check-bundle-size.mjs`, `pnpm check-bundle`).
- [ ] `frontend/src/tiles/registry.ts` was extended, not restructured, when
      new tiles were added.
- [ ] Each Zustand store still owns exactly one domain — no cross-domain state
      mixing creeping in.
- [ ] Go structs in `backend/models/` remain the single source of truth for
      TypeScript types; bindings were regenerated (`wails generate module`)
      after backend model changes.
- [ ] Dependencies (Go modules, npm packages) are reasonably current, with no
      unmaintained or duplicated libraries doing the same job.
- [ ] New Go dependencies were checked against `agent_docs/DEPENDENCIES.md`
      before being added (create this file if it doesn't exist yet — see
      backlog).
- [ ] Local-first invariant holds: no `localStorage`/`sessionStorage` usage;
      all persistence goes through Go file I/O into the Wails app data dir.

## 4. Performant

- [ ] Console log lines are still batched (150ms flush window in `App.tsx`) so
      re-render rate stays bounded on busy servers.
- [ ] Circular/ring buffers still cap memory growth: performance history
      (`usePerformanceHistory.ts`), console buffer (`useConsoleStore.ts`, user
      configurable cap), backend stats history and console ring buffer
      (`backend/services/stats.go`, `backend/services/server.go`).
- [ ] Poll cadences remain deliberate and haven't crept down accidentally: TPS
      RCON poll (~15s, with server-flavor caching), stats tick (~10s),
      scheduler next-run countdown (~30s).
- [ ] Expensive tile subtrees are memoized (`React.memo` / `useMemo` /
      `useCallback`) so parent re-renders don't cascade into them — pay
      particular attention to the 3D scenes (backups sphere, worlds planetary
      system) and chart-heavy tiles.
- [x] Production bundle has been profiled recently (e.g. `vite build` output
      or a bundle analyzer) and heavy libraries remain lazy rather than eager
      (three.js via Worlds, recharts via Performance — see Scalable pillar).

---

## Remediation backlog

Concrete, prioritized follow-ups based on the most recent review. This section
*is* allowed to go stale/get checked off — unlike the checklist above, it's a
todo list, not a target.

**P0 — CI foundation**
- ✅ Added `.github/workflows/ci.yml`: `frontend` job (ubuntu-latest —
  `pnpm typecheck` + `pnpm lint` + `pnpm build`) and `backend` job
  (windows-latest, matching the shipping target — `gofmt -l` + `go vet ./...` +
  `go test ./...` + `go build ./...`), both with dependency caching
  (`setup-node`'s `cache: pnpm`, `setup-go`'s `cache: true`). Runs on push to
  `main` and on every PR. `wails build` packaging deferred (see below) — the
  light `go build`/`pnpm build` smoke check was judged sufficient for now.
  Fixed the 14 Go files that weren't `gofmt`-clean as a prerequisite. Confirmed
  green on `main`: https://github.com/sandrogekeler/Konnekt/actions/runs/28618749554
- Follow-up (not yet done): a release-tag-gated full `wails build` packaging
  job, for stronger end-to-end confidence than the `go build`/`pnpm build`
  smoke check gives.

**Done — Lint/format enforcement (frontend)**
- ✅ Migrated `frontend/` from Tailwind v3 (barely used) to v4, mapped the
  existing CSS-variable token system into `@theme inline`
  (`frontend/src/style.css`) so `applySkin()` keeps working unchanged.
- ✅ Added a real ESLint flat config (`frontend/eslint.config.js`):
  `typescript-eslint` + classic `react-hooks` rules (`rules-of-hooks`,
  `exhaustive-deps`) + `react-refresh` + a `warn`-level `no-restricted-syntax`
  rule flagging inline `style={{}}` (see Clean pillar, item 6, and Milestone 2
  below). `pnpm lint` now runs and passes.
  - Deliberately **not** enabled: `eslint-plugin-react-hooks`'s
    `recommended`/`recommended-latest` configs, which bundle React Compiler
    readiness rules (`purity`, `refs`, `set-state-in-effect`, etc.). These flag
    ~60 findings, mostly in the react-three-fiber scene code
    (`frontend/src/tiles/worlds/scene/`) where imperative per-frame ref sync is
    the standard r3f pattern, not a bug. Revisit if the project adopts the
    React Compiler.
- ✅ Added Prettier + `prettier-plugin-tailwindcss`
  (`frontend/.prettierrc.json`). **Not** run as a one-time mass reformat —
  Prettier's opinionated formatter expands the codebase's condensed
  single-line block style (e.g. `catch { /* comment */ }`) across ~105 files,
  which would be a large, low-value diff. Applied incrementally instead, via
  the pre-commit hook below (format-on-touch).
- ✅ Added a pre-commit hook (`lefthook.yml`, root `package.json`) running
  Prettier + ESLint + `tsc --noEmit` on staged frontend files, and `gofmt` +
  `go vet` on staged Go files.
- ✅ Cleared the real debt the new tooling surfaced: empty catch blocks, unused
  vars/imports, ternary-as-statement, redundant boolean casts, a genuine
  conditional-hooks bug in `frontend/src/tiles/worlds/index.tsx` (hooks were
  declared after an early `return`), and 9 `any` usages down to 1 documented,
  justified exception (`frontend/src/tiles/worlds/scene/Sun.tsx` — a
  known `three`/`@react-three/fiber` cross-package type mismatch).

**P1 — Inline styles → Tailwind utilities (Milestone 2)**
- ✅ First slice done: `frontend/src/components/ui/*` (5 files —
  `SettingRow`, `Toggle`, `Segmented` fully migrated; `ColorSwatch` and the
  animation-driven parts of `Popover` correctly stay inline as documented
  `eslint-disable-next-line no-restricted-syntax` exceptions — arbitrary hex
  colors and open/close-animation transforms aren't visible to Tailwind's
  static class scanner). Global warning count: 725 → 711. Ratcheted
  `no-restricted-syntax` from `warn` → `error` for `src/components/ui/**/*.tsx`
  in `frontend/eslint.config.js` (as a config object placed *after* the global
  rules block — flat-config applies later array entries' matching rules on
  top of earlier ones, opposite of what might be assumed). This is the
  reusable template for future per-directory passes. Confirmed green on
  `main`: https://github.com/sandrogekeler/Konnekt/actions/runs/28628543709
  - Two conversion rules established during this pass: (1) Tailwind v4's JIT
    scanner only sees literal class-name strings in source — a
    template-interpolated arbitrary class (e.g. `` `min-w-[${width}px]` ``) is
    invisible to it and produces no CSS, so prop/state-driven numeric values
    must stay inline; (2) a boolean ternary between two *static* values (e.g.
    `checked ? 'var(--accent)' : 'var(--border-hover)'`) is not "genuinely
    dynamic" — convert to a conditional `className`, reserving `style={{}}`
    for values that are actually computed/interpolated.
  - Verified in-browser via the Settings modal (gear icon — pure client
    state, no Wails backend needed): `Toggle`'s checked/unchecked colors and
    slide animation, `Segmented`'s Light/Dark/System pill, and `ColorSwatch`
    all confirmed pixel-correct via computed-style inspection (e.g. the
    selected pill's `background-color` resolved to `rgb(74, 222, 128)` =
    `#4ade80`, the accent color, exactly as expected from the `@theme inline`
    token mapping). `Popover` could not be live-verified the same way — its
    only real consumers are in the Mods tile (`BrowsePanel.tsx`,
    `InstalledPanel.tsx`), which calls `EventsOn` on mount and crashes without
    the Wails bridge (same pre-existing environment limitation as the
    performance-tile check in the prior session, unrelated to this change).
    Indirect confirmation instead: `Popover`'s `shadow-[...]` arbitrary-value
    syntax is identical in form to `Toggle`'s, which *was* verified live
    (`box-shadow` computed to `rgba(0,0,0,0.3) 0px 1px 3px 0px`, matching the
    class exactly).
- ✅ Second slice done: `frontend/src/tiles/TileWrapper/index.tsx` — the
  shared wrapper every tile renders inside (`CLAUDE.md`'s "Tile system"),
  same "shared primitive" philosophy as the `ui/*` slice. All 5 occurrences
  converted to Tailwind utilities; this is the **first directory in the
  migration to reach zero remaining inline styles** — no `eslint-disable`
  exceptions needed, unlike `ui/*`. Global warning count: 711 → 706. Added
  `src/tiles/TileWrapper/**/*.tsx` to the same ratcheted-`error` `files` glob
  in `frontend/eslint.config.js` as `ui/*` (merged into one config object
  rather than duplicating the rule block).
  - The three `onMouseEnter`/`onMouseLeave` pairs that imperatively set
    `e.currentTarget.style.borderColor`/`.style.color` were left untouched —
    not the JSX `style=` attribute the lint rule targets, and out of scope to
    redesign. Verified live that this doesn't change runtime behavior: the
    default border/text-color values now come from `className`, but the
    hover handlers still directly set an inline `style` override, which wins
    over `className` at the same specificity today exactly as it did before.
  - Verified live in-browser (default dashboard, no Wails backend needed —
    every visible tile uses this wrapper): computed styles matched exactly,
    including the unusual `backgroundImage:
    linear-gradient(var(--bg-surface),var(--bg-surface))` (a same-color-twice
    trick) which resolved to identical gradient stops before and after.
    Toggling a tile's maximize/restore confirmed the `cursor: maximized ?
    'default' : 'grab'` ternary → conditional `className` conversion is
    correct: querying all `.drag-handle` elements while one tile was
    maximized showed `cursor: grab` on the four background grid tiles and
    `cursor: default` on the maximized overlay's own handle. Confirmed the
    hover border-color swap still fires (inspected the element's `style`
    attribute directly: `border-color: var(--border-hover)` on hover,
    reverting to `var(--border-subtle)` on mouseleave).
- ~706 `style={{}}` usages remain across the rest of the codebase (~54 files).
  Continue tile-by-tile, static values only — genuinely dynamic ones stay
  inline. Repeat the pattern: convert, then add that directory to the
  ratcheted-`error` `files` glob with documented exceptions for the rest.
  Next-smallest candidates: stats (6), notifications (7), quick-commands (7),
  performance (9), console (11).

**P2 — React Compiler-readiness lint rules**
- Revisit enabling `eslint-plugin-react-hooks`'s full `recommended`/
  `recommended-latest` rule set (`purity`, `refs`, `set-state-in-effect`,
  `immutability`, etc.) — currently scoped down to classic `rules-of-hooks` +
  `exhaustive-deps` only (see Lint/format enforcement above). The ~60 findings
  it currently surfaces are concentrated in the r3f scene code and would need
  a dedicated pass with test coverage in place first.

**P1 — Test coverage + gate**
- ✅ Stood up the frontend test harness: `vitest` (pinned to `^3` — `vitest@4`
  requires Vite 6+, this repo is still on `vite@^5.4.21`) + `jsdom` +
  `@testing-library/react`/`dom`, wired via a `test` block in
  `frontend/vite.config.ts` and a `pnpm test` script. Added to the CI
  `frontend` job (`.github/workflows/ci.yml`), after `pnpm lint`.
  Confirmed green on `main`:
  https://github.com/sandrogekeler/Konnekt/actions/runs/28620873038
- ✅ Frontend: 39 tests covering the pure/no-Wails-mocking logic —
  `lib/format.ts`, `lib/layout.ts` (`collapseEmptyRows`), and three stores'
  pure logic: `useConsoleStore` (`classifyLine` + buffer-cap eviction on
  `appendLine`/`batchAppend`), `useNotificationsStore` (200-item cap),
  `useProcessesStore` (state machine + the 3s auto-remove timer via
  `vi.useFakeTimers`).
- ✅ Backend: 21 new tests (up from 2 pre-existing) —
  `rcon_test.go` (packet marshal/unmarshal round-trip over `net.Pipe`, the
  10–4096 byte length-bounds guard, colour-code stripping),
  `backup_test.go` (`validateFilename`, zip create/restore round-trip, and
  the zip-slip extraction guard — confirmed this test actually fails when the
  guard is removed, then restored it),
  `config_editor_test.go` (the path-traversal `sandbox()` guard),
  `modrinth_test.go` (`buildFacets` facet-string assembly).
- Deferred follow-up — **Wails-mocked store tests**: `useTileStore`,
  `useLayoutStore`, `useServerConfigStore`, `useSettingsStore` all call
  generated `wailsjs/go/main/App` bindings directly; testing their
  load/save/CRUD logic needs `vi.mock('../../wailsjs/go/main/App')`. Also
  untested: the two custom hooks (`useWailsCall`, `usePopover`).
- Deferred follow-up — **Modrinth HTTP-path coverage**: `ModrinthClient`
  hardcodes `modrinthBase = "https://api.modrinth.com/v2"` with no injectable
  base URL, so the 429/`Retry-After` retry logic and search-hit dedup can't be
  driven by an `httptest.Server` yet. Needs a small constructor refactor
  (injectable base URL) before those paths are testable.
- Deferred follow-up — **coverage floor**: still no numeric threshold in CI;
  add one once a stable baseline is established across both suites.

**P1 — Code-split heavy tiles**
- ✅ **Correction to this item's original premise**: exploration found the
  backups tile has no three.js dependency at all — its "planets" are pure
  SVG/CSS (`frontend/src/tiles/backups/WireframeSphere.tsx`,
  `SolarSystem.tsx`). three.js/@react-three only appear under
  `frontend/src/tiles/worlds/scene/`, already lazy-loaded. So recharts (only
  in the performance tile) was the sole remaining eager heavy dependency.
- ✅ Split recharts out of `frontend/src/tiles/performance/index.tsx` into a
  new `charts.tsx` (the tile's only `recharts` import), lazy-loaded via
  `React.lazy` + `Suspense` for both the compact `SparkChart` and the
  expanded `HistoryChart` — same pattern as Worlds. Shared pure helpers
  (`fmtTime`, `fmtTps`, `tpsColor`, `tpsStrokeColor`) moved to `helpers.ts` to
  avoid duplication between `index.tsx` and `charts.tsx`.
  Effect: entry chunk gzip dropped from 595.00 KB → 490.53 KB (Vite's own
  report); recharts now ships as its own ~103 KB gzip chunk, fetched only
  once real chart data exists (confirmed in a dev-mode network trace — the
  `charts.tsx` module is never requested while the history buffer is empty).
- ✅ Added `frontend/scripts/check-bundle-size.mjs` (no new dependency — uses
  `node:zlib`): gzips each `dist/assets/*.js`, asserts the entry
  (`index-*.js`) chunk stays under a 550 KB budget, prints a per-chunk table.
  Wired in as `pnpm check-bundle`, run in the CI `frontend` job right after
  `pnpm build`. Verified the gate actually fails when the budget is
  temporarily set below the real size, then restored it. Confirmed green on
  `main`: https://github.com/sandrogekeler/Konnekt/actions/runs/28622676087
- Not independently verified: live chart rendering with real streaming data
  in a browser. The Wails IPC bridge (`window.go`/`window.runtime`) only
  exists inside the native `wails dev` process — unreachable from the
  headless-Chrome preview tooling used for this pass, which can only run the
  bare Vite dev server (no backend). Confirmed the code-split mechanism
  itself is sound (chunk separation, on-demand fetch, all typecheck/lint/test
  gates green); a full data-driven visual check needs `wails dev` with a
  configured Minecraft server.
- Unused dependency found during this pass, tracked separately: see
  "P2 — Repo hygiene" below (`uplot` / `skinview3d`).

**P2 — Undocumented blank error-ignores**
- ✅ Resolved. All 28 blank `_ = ` / `_, _ = ` sites across
  `backend/services/{backup,config_editor,players,modservice,scheduler_blocks,
  scheduler_engine,server,server_windows,server_other}.go` now carry a
  `//nolint:errcheck // <reason>` comment (no `golangci-lint` config exists in
  this repo — `//nolint` is a human-readable documentation convention here,
  not machine-enforced). 27 were genuinely safe best-effort/fire-and-forget
  code (rollback cleanup, progress-estimate walks, best-effort manifest/meta
  persistence, RCON save-flush during backup, OS-handle-close/process-kill
  teardown) — verified individually by reading each call site in context, not
  assumed.
  - One real bug found and fixed, not just documented: `worlds.go`'s
    `RenameWorld` renamed a world's folder on disk, then discarded the error
    from writing the new name into `server.properties`'s `level-name`. A
    failed write there would have left `RenameWorld` returning success while
    the server's config pointed at a folder that no longer existed — the
    server would fail to find its world on next start. Now propagates the
    error (`fmt.Errorf("world folder renamed but level-name update failed: %w", err)`),
    a safe, backward-compatible fix since the function already returns
    `error` and no caller needed to change.
  - Verification: `gofmt -l .` clean, `go vet ./...` + `go test ./... -count=1`
    + `go build ./...` green, and the audit grep
    (`grep -rn "_ = \|_, _ = " backend --include="*.go" | grep -v "_test.go" | grep -v "nolint"`)
    returns nothing. Confirmed green on `main`:
    https://github.com/sandrogekeler/Konnekt/actions/runs/28629364439

**P2 — Structured logging**
- Replace ad-hoc `fmt.Errorf`-only error reporting on the backend with
  `log/slog` for diagnosable runtime logs, keeping the existing `EventBus`
  emissions for UI-facing notifications.

**P2 — Repo hygiene**
- ✅ `*.syso` added to `.gitignore` (`konnekt-res.syso` was untracked and
  uncovered).
- Create `agent_docs/DEPENDENCIES.md`, which `CLAUDE.md` already references
  but which doesn't exist yet.
- Triage/relocate the root-level `scheduler-blocks-rework.md` design doc.
- Remove (or wire up) two unused npm dependencies found during the code-split
  pass: `uplot` and `skinview3d` in `frontend/package.json` are imported
  nowhere under `frontend/src/`. `skinview3d` is presumably reserved for the
  not-yet-built Beta "player skin preview" tile (see `ROADMAP.md`) — confirm
  intent before removing it specifically. Unimported code isn't bundled, so
  this doesn't affect bundle size; it's dependency-surface hygiene only.

**P2 — Memoization pass**
- Add `React.memo` to the most expensive tile components (3D scenes, chart
  tiles) identified during a profiling pass.
