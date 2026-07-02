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

- [ ] `go vet ./...` and `gofmt -l .` report nothing.
- [ ] No blank `_ =` error-ignores in Go, except documented `//nolint` cases
      (e.g. `backend/services/eventbus.go`).
- [ ] `pnpm lint` runs against a real ESLint config and passes.
- [ ] Formatting (Prettier/Biome or equivalent) is consistent and enforced,
      not manual.
- [ ] `pnpm typecheck` has zero errors; no `any` anywhere (CLAUDE.md rule) —
      use `unknown` and narrow instead.
- [ ] Nothing under `frontend/src/wailsjs/` has been hand-edited (it's
      auto-generated; regenerate via `wails generate module` instead).
- [ ] No inline `style={{}}` beyond genuinely dynamic/computed values
      (animation delays, transforms, react-grid-layout position props) —
      Tailwind utilities backed by CSS-variable tokens otherwise (see
      CLAUDE.md's Code style section). `eslint.config.js`'s `no-restricted-syntax`
      rule flags remaining inline styles at `warn`; ratchet per directory to
      `error` as Milestone 2's migration clears each tile.
- [ ] No committed build artifacts (`*.syso`, `frontend/dist/`, `build/bin/`)
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
- [ ] CI is green on every push/PR (see backlog: GitHub Actions).
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

- [ ] Heavy per-tile dependencies are lazy-loaded on demand, following the
      existing pattern in `frontend/src/tiles/worlds/index.tsx` (`React.lazy`
      + `Suspense`) — check that recharts (performance tile) and three.js
      (backups tile) use the same approach rather than loading eagerly.
- [ ] Production bundle size stays within an agreed budget (define one, e.g.
      main chunk size in KB gzip), checked in CI.
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
- [ ] Production bundle has been profiled recently (e.g. `vite build` output
      or a bundle analyzer) and heavy libraries remain lazy rather than eager.

---

## Remediation backlog

Concrete, prioritized follow-ups based on the most recent review. This section
*is* allowed to go stale/get checked off — unlike the checklist above, it's a
todo list, not a target.

**P0 — CI foundation**
- Add `.github/workflows/ci.yml` running on push/PR: `go vet ./...` +
  `go test ./...`, `pnpm typecheck`, `pnpm lint`, and a `wails build` (or
  `pnpm build`) smoke check. Cache Go modules and the pnpm store. (Not yet
  done — the tooling below now exists locally, still needs to run in CI.)

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
- ~724 `style={{}}` usages remain across the codebase (baseline: 665/60 files
  at the start of this work; count grew slightly as the ESLint rule reformats
  reveal more). Migrate tile-by-tile, static values only — genuinely dynamic
  ones (computed transforms, animation delays, RGL positions) stay inline and
  are exempt. Start with `frontend/src/components/ui/*` (shared primitives),
  then per-tile. Flip the `no-restricted-syntax` rule from `warn` → `error` in
  `frontend/eslint.config.js` per directory as each is cleared.

**P2 — React Compiler-readiness lint rules**
- Revisit enabling `eslint-plugin-react-hooks`'s full `recommended`/
  `recommended-latest` rule set (`purity`, `refs`, `set-state-in-effect`,
  `immutability`, etc.) — currently scoped down to classic `rules-of-hooks` +
  `exhaustive-deps` only (see Lint/format enforcement above). The ~60 findings
  it currently surfaces are concentrated in the r3f scene code and would need
  a dedicated pass with test coverage in place first.

**P1 — Test coverage + gate**
- Add `vitest` + `@testing-library/react` to the frontend; start with store
  logic and critical hooks.
- Expand Go tests beyond `nbt_test.go` / `scheduler_expr_test.go` to cover
  RCON, the Modrinth client, backup create/restore, and config path-traversal
  guards.
- Enforce a coverage floor in CI once a baseline exists, and ratchet it up
  over time.

**P1 — Code-split heavy tiles**
- Apply the Worlds `React.lazy` pattern to the performance tile (recharts) and
  backups tile (three.js).
- Add a bundle-size budget check to CI.

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

**P2 — Memoization pass**
- Add `React.memo` to the most expensive tile components (3D scenes, chart
  tiles) identified during a profiling pass.
