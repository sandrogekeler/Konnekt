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
- [ ] New transition/animation durations and easing curves reuse an existing
      `--duration-*`/`--ease-*` token (`frontend/src/style.css`'s `@theme
      inline` block) unless the motion is genuinely unique (e.g. a one-off
      decorative loop) — no undocumented one-off magic numbers. This isn't
      "all animations must look identical": a snappy hover, a panel
      slide/open-close, and a decorative splash/spin legitimately warrant
      different timing — the goal is a shared vocabulary for the common
      cases, not uniformity.
- [x] No committed build artifacts (`*.syso`, `frontend/dist/`, `build/bin/`)
      — `.gitignore` covers them.
- [x] No stray root-level scratch/design docs left un-triaged (either promoted
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
- [x] Local-first invariant holds: no `localStorage`/`sessionStorage` usage;
      all persistence goes through Go file I/O into the Wails app data dir.
      Repo-wide grep confirms zero occurrences under `frontend/src/`. The one
      violation found (scheduler `BlockPalette.tsx`'s palette-collapse and
      per-category-collapse prefs) has been migrated onto `AppSettings` →
      `app_settings.json`, the same Go-backed path console/notify prefs
      already use — see backlog.

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
  rather than duplicating the rule block). Confirmed green on `main`:
  https://github.com/sandrogekeler/Konnekt/actions/runs/28630261474
  - ⚠️ **Regression this slice shipped, fixed later:** the commit dropped the
    leading space in the outer div's conditional class string
    (`` `relative h-full${maximized ? '' : ' tile-outer'}` `` →
    `...: 'tile-outer'`), fusing `h-full` and `tile-outer` into the invalid
    token `h-fulltile-outer` for every *non-maximized* tile. Since
    `.tile-wrapper` is `position:absolute; inset:0`, losing `h-full` on its
    parent collapsed all tiles to 0px height — the whole dashboard canvas
    rendered empty (only maximized tiles, which take the `''` branch, were
    fine). Fixed by moving the separator space *outside* the interpolation
    (`` `relative h-full ${maximized ? '' : 'tile-outer'}` ``). **Lesson for
    future className migrations:** conditional class strings with a
    leading/trailing space inside the conditional are fragile; keep the
    separating space outside the `${}`. And verify migrated tiles by their
    rendered *geometry* (non-zero `getBoundingClientRect().height`), not just
    computed `background-color` — a 0-height element still reports its color.
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
- ✅ Third slice done: batched all five remaining small single-file tiles in
  one pass — `stats`, `notifications`, `quick-commands`, `performance`,
  `console` (40 occurrences total, exact count corrected from the earlier
  census, which missed the `style={cond ? {...} : {}}` ternary form).
  `notifications` fully converts to zero remaining inline styles (including a
  `KIND_COLOR` → `KIND_CLASS` static Tailwind-class lookup, replacing the
  removed CSS-var lookup — `NotifKind` is a closed string-literal union, so
  this is exactly as static as a boolean ternary). `stats`/`quick-commands`/
  `performance` each keep exactly one genuinely-computed exception (a
  percentage-width bar fill, and a floating dropdown's
  `getBoundingClientRect`-derived position). `console` keeps 4 documented
  exceptions, all `fontFamily: "'JetBrains Mono', monospace"` — see the new
  `--font-mono` token-gap entry below. The eslint ratchet's `files` glob also
  caught one leftover from the earlier code-split session:
  `performance/charts.tsx`'s recharts `<Legend>` label color (a ternary
  between two static `rgba()` values, converted the same way). Global warning
  count: 706 → 665.
  - `#f87171` in `quick-commands.tsx` turned out to be exactly Tailwind's
    default `red-400` — converted to named classes with opacity modifiers
    (`bg-red-400/15`, `border-red-400/30`, `text-red-400`) instead of
    arbitrary hex brackets.
  - Verified live: `stats`' status dot correctly shows `bg-red-500` with
    `box-shadow: none` in the offline state (computed style, confirming the
    ternary's false branch); `console`'s command input still resolves
    `font-family: "JetBrains Mono", monospace` exactly; the quick-commands
    kick/ban modal panel opened and its `background-color`/`border-color`
    matched the source arbitrary values exactly (`rgb(13,14,20)` = `#0d0e14`,
    `white/10` border). No new console errors beyond the same pre-existing
    `quick-commands` `window.go`-unavailable mount errors seen in prior
    sessions. Confirmed green on `main`:
    https://github.com/sandrogekeler/Konnekt/actions/runs/28631150720
- Missing `--font-mono` theme token found during this pass, tracked
  separately: see "P2 — Missing `--font-mono` theme token" below.
- ✅ Fourth slice done: the **mods tile** — the single largest remaining
  cluster, all 9 files (`frontend/src/tiles/mods/**`: `InstalledPanel.tsx`,
  `ModPreviewDialog.tsx`, `ContentDetailPanel.tsx`, `BrowsePanel.tsx`,
  `index.tsx`, `DependencyDialog.tsx`, `ContentCard.tsx`, `Pagination.tsx`,
  `ModAboutBody.tsx`). 176 → 7 remaining, all genuinely dynamic and documented
  with `eslint-disable-next-line no-restricted-syntax`: three live-percent
  progress-bar widths (`index.tsx` x2, `InstalledPanel.tsx`), two live
  user-controlled grid-column counts (`InstalledPanel.tsx`, `BrowsePanel.tsx`),
  and the resizable detail panel's live `panelWidth`-derived width/transform
  (`BrowsePanel.tsx` x2). Global warning count: 668 → 492. Added
  `src/tiles/mods/**/*.tsx` to the ratcheted-`error` `files` glob in
  `frontend/eslint.config.js`; `pnpm lint` passes with 0 errors, confirming
  every remaining inline style in the tile is a documented exception.
  - Static ternaries between two fixed values (color, background, opacity,
    border, font-weight) converted to conditional `className`s throughout,
    per the established rule — including several 3-way ternaries (e.g. a
    version-type color lookup keyed by a plain `string` field, mirrored the
    same way an already-existing ternary chain in `ModPreviewDialog.tsx`
    handled it, for consistency between the two files).
  - New conversion patterns established this pass, verified live via computed
    `getComputedStyle()` checks against a running `pnpm dev` server (not just
    typecheck/lint): `color-mix(in srgb, ...)` values as Tailwind arbitrary
    `bg-[...]`/`border-[...]` (verified the mixed color resolves correctly);
    `mask-image`/`-webkit-mask-image` gradients as arbitrary properties
    (`[mask-image:...]`); `line-clamp-2` replacing the manual
    `-webkit-box`/`-webkit-line-clamp` trick; `caret-accent` for `caretColor`;
    opacity ternaries mapped onto Tailwind's opacity scale exactly (`0.55` →
    `opacity-55`, `0.2` → `opacity-20`); a fixed-duration `transform`
    transition (`280ms cubic-bezier(0.4,0,0.2,1)`) converted to
    `duration-[280ms] ease-in-out` since Tailwind's `ease-in-out` *is* that
    exact bezier curve — the `PANEL_SLIDE_MS` constant that previously held
    this value was removed as dead code once inlined into the class, with a
    comment linking the two so a future duration change updates both;
    `calc(100vw-48px)`-style arbitrary values confirmed Tailwind auto-inserts
    the required operator spacing even without explicit underscores.
  - Not independently verified: the mods tile itself rendering end-to-end
    inside the app. `index.tsx`'s `useMods` hook calls `EventsOn` and
    `DetectServerLoader` on mount and crashes without the Wails bridge, so
    only the 8 pure-presentational child components could be exercised
    (verified via direct computed-style checks against a running Vite dev
    server, not a full component mount) — a full visual pass needs `wails dev`
    with a configured server, same limitation noted for backups/performance in
    prior sessions.
- ✅ **Fifth slice done: the backups tile** — the largest remaining cluster at
  the time (116 → 19, all 7 files: `index.tsx`, `SolarSystem.tsx`,
  `BackupCard.tsx`, `BackupCarousel.tsx`, `ServerInfoPanel.tsx`,
  `WorldInfoPanel.tsx`, `WireframeSphere.tsx`; `BackupsSummary.tsx` and
  `BackupRunningDialog.tsx` reach **zero** remaining inline styles). Every
  survivor carries a documented `eslint-disable-next-line` exception. Global
  frontend-wide count: 451 → 354. Added `src/tiles/backups/**/*.tsx` to the
  ratcheted-`error` `files` glob in `frontend/eslint.config.js`; `pnpm lint`
  passes with 0 errors.
  - Same "static ternary between two fixed values → conditional `className`"
    rule applied throughout (e.g. `BackupCard`'s `focused`-driven width/height/
    border/background, the dim-overlay's opacity/pointer-events/cursor triad).
    One refinement discovered this pass: a **CSS `rotate()`/grid-template-rows
    two-value ternary is also "two fixed values"**, not just color/border
    ternaries — `ServerInfoPanel.tsx`'s collapse-chevron `rotate(180deg)`/
    `rotate(0deg)` converted cleanly to Tailwind's native `rotate-180`/
    `rotate-0` utilities (the original plan for this file assumed these had to
    stay inline; they didn't).
  - **Multi-property/multi-easing `transition` strings don't fit one Tailwind
    utility** and were kept inline as a distinct, deliberate exception
    category (not "computed", just not expressible in one class): `BackupCard`
    mixes a 260ms custom-bezier (width/min-height) with a 200ms ease
    (padding/border-color/background) in one declaration; `SolarSystem.tsx`'s
    shared `FOCUS_TRANSITION` constant (imported from `focusLayout.ts`) mixes
    left/top at 380ms bezier with opacity at 250ms ease. Where a transition
    targets only *one* property at *one* duration/easing (e.g. the scaled-
    sphere's `transform 350ms cubic-bezier(...)`), it converts cleanly to
    `transition-transform duration-[350ms] ease-[cubic-bezier(...)]` — Tailwind
    arbitrary values pass the raw CSS timing-function through unchanged,
    including the literal `ease` keyword (`ease-[ease]`), which is **not**
    the same curve as Tailwind's own `ease-in-out` alias.
  - `SolarSystem.tsx` had more static wins than the original per-file plan
    assumed: `focusLayout.ts` was checked directly, confirming `FOCUS.left`/
    `FOCUS.top` are compile-time constants — so `SunNode`'s position ternary
    (`isFocused ? FOCUS.left : '50%'`) is between two *fixed* values (unlike
    `WorldNode`'s analogous ternary, which mixes that same constant with a
    genuinely per-world computed `${cfg.x}%`, and correctly stays inline).
    `SunNode`'s wrapper reduced to a single inline `style` holding only the
    shared `FOCUS_TRANSITION` constant.
  - `#f87171` confirmed to equal the `--danger` token exactly
    (`rgb(248 113 113)` in `style.css`'s `@theme inline` block) — converted
    every occurrence to `text-danger`/`border-danger`/`bg-[color-mix(in_srgb,var(--danger)_·%,transparent)]`
    instead of the literal hex, so these follow the theme (unlike the
    already-`red-400`-converted quick-commands case, `--danger` isn't
    Tailwind's stock `red-400` value, so the token, not a stock color name,
    is the correct target here). `#22c55e` (Tailwind's exact `green-500`)
    converted to the named class per the established quick-commands
    precedent.
  - Verified: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors — one
    genuine bug caught and fixed by the lint gate itself: converting
    `SolarSystem.tsx`'s opacity ternaries to `opacity-35`/`opacity-100`
    classes left the `FOCUS_FADED_OPACITY` import unused, which
    `@typescript-eslint/no-unused-vars` flagged as an error and was removed),
    `pnpm test` (131/131, unchanged), `pnpm build` (entry chunk 490.77 KB →
    479.3 KB gzip — a net *decrease*, consistent with removing inline style
    objects rather than adding code), `pnpm check-bundle` (479.3 KB, well
    under the 550 KB budget).
  - Not independently verified: live rendering of the tile itself. Same
    environment limitation noted for every prior tile pass — `useBackups`/
    `useBackupWorlds` call the Wails bridge on mount, and this sandbox has no
    configured Minecraft server, so the sidebar's tile-activation guard
    no-ops for server-scoped tiles before the component even mounts (couldn't
    get as far as the mods/worlds passes, which at least reached
    Wails-bridge-crash on mount). The app shell and every already-mounted
    tile (Console, Stats, Commands, Players) rendered correctly throughout
    with no new console errors beyond the pre-existing `quick-commands`
    `window.go`-unavailable one. A full visual pass needs `wails dev` with a
    configured server, same as backups/worlds/performance previously.
- ~317 `style={{}}` usages remain across the rest of the codebase (~31
  files). Continue tile-by-tile — the remaining hotspots: scheduler (90),
  config (80), the rest of `components/` (70), worlds (45), players (32).
  These will need more deliberate scoping (likely per-tile, not batched) and,
  for several, live `wails dev` + a configured server to fully verify beyond
  what this sandbox's headless preview can reach.

**P2 — React Compiler-readiness lint rules**
- Revisit enabling `eslint-plugin-react-hooks`'s full `recommended`/
  `recommended-latest` rule set (`purity`, `refs`, `set-state-in-effect`,
  `immutability`, etc.) — currently scoped down to classic `rules-of-hooks` +
  `exhaustive-deps` only (see Lint/format enforcement above). The ~60 findings
  it currently surfaces are concentrated in the r3f scene code and would need
  a dedicated pass with test coverage in place first.

**P2 — Missing `--font-mono` theme token**
- Found during the Milestone 2 third slice: `frontend/src/style.css`'s
  `@theme inline` block registers color tokens but has no `--font-mono`
  override, so the bare `font-mono` Tailwind utility (already used in several
  places across the codebase) resolves to Tailwind's *default* monospace
  stack, not the app's actual font (JetBrains Mono, per `CLAUDE.md`).
  Registering `--font-mono: 'JetBrains Mono', 'Fira Code', monospace;` (the
  exact stack already used in `style.css`'s `.mod-body code` rule) would let
  `console.tsx`'s 4 documented inline-style exceptions, and any similar sites
  found in future migration passes, convert to a plain `font-mono` class.
  Deliberately not fixed as part of the Milestone 2 pass — every *existing*
  bare `font-mono` usage project-wide needs auditing first, since some may
  currently be relying on Tailwind's default stack rather than an inline
  override masking the gap; flipping the token blind would be a wide,
  unverified visual change across the whole codebase.
- Follow-up finding (repo-hygiene pass): the audit turned up 246 `font-mono`
  usages across 39 files, all currently resolving to Tailwind's *default*
  monospace stack. More importantly, `frontend/src/style.css` has no
  `@font-face` for JetBrains Mono at all — the only bundled font is Satoshi
  (used for `sans`, not `mono`). So today's bare `font-mono` and a would-be
  `--font-mono: 'JetBrains Mono', ...` token both fall through to whatever
  monospace the OS provides; registering the token wouldn't visibly change
  anything until JetBrains Mono is actually bundled as a webfont. Still
  deferred — now blocked on "bundle the font" as a prerequisite, not just
  "audit existing usages."

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
- ✅ **Scheduler backend engine — closed the critical gap.** A dedicated
  4-pillar audit of the scheduler (see the new backlog entry below) found the
  ~3,100-line execution engine essentially untested — only `scheduler_expr.go`
  and `scheduler_validate.go` had test files; `runGraph`/`executeNode`,
  triggers, cron/interval matching, next-run calc, and all block executors had
  zero coverage. Added:
  `scheduler_engine_test.go` (`runGraph` integration: control-flow ordering,
  data-flow through pure-data pull-eval + the data-over-config overlay,
  `onFailed` branching, the data-type-validation short-circuit, the
  control-cycle/`maxNodesPerRun` guard, the concurrency guard; plus direct
  `ExecContext` getter tests and `execConstant`/`execMathOp`/`execCondition`/
  `execDelay`/`execRandomNumber` executor tests — including pinning down two
  existing behaviors as tests, not fixes: `GetFloat` silently falls back to
  its default on an unparseable string, and `execCondition`'s `gt`/`lt` are
  lexicographic string comparisons, not numeric),
  `scheduler_triggers_test.go` (`cronMatches` field types incl. `*/n` steps/
  ranges/lists, `cooldownAllows`), `scheduler_nextrun_test.go` (`nextTimeOfDay`,
  `nextCron`, `nextInterval`, `findTriggerNode`). One production change: a
  nil-guard in `activeServerID()` so the engine is constructable without a
  full `ConfigService`, enabling headless tests (`EventBus.Emit` was already
  nil-context-safe). Verified the data-type-validation guard test actually
  fails when that guard is disabled, then restored it — same technique as the
  zip-slip test above.
- ✅ **Wails-mocked store tests — harness established, 4 stores + `useScheduler`
  covered.** Added the first `vi.mock('../../wailsjs/go/main/App')` pattern in
  the repo (a plain hoisted auto-mock — no `vite.config.ts` or setup-file
  changes needed): `useSettingsStore.test.ts` (7 tests — payload merge,
  invalid-value fallback per validated field, load-rejects-to-defaults),
  `useTileStore.test.ts` (6 — saved/empty/rejecting `loadTiles`, dedup on
  `addTile`, active↔crate moves), `useLayoutStore.test.ts` (13 — preset
  seeding, active-layout override, insert-vs-update `savePreset`, delete
  reassignment), `useServerConfigStore.test.ts` (13 — stale/missing-activeId
  fallback, insert-vs-update, delete reassignment), and
  `frontend/src/tiles/scheduler/useScheduler.test.ts` (4, via `renderHook` +
  `vi.useFakeTimers` — mount fetch, save/run refresh, the 30s next-run poll and
  its unmount cleanup), closing the second (frontend hook) half of the
  scheduler test-coverage backlog alongside the earlier `graphMapping.ts` pass.
  Frontend test count: 88 → 131.
  - **One real bug found and fixed, not just documented**: `useLayoutStore.ts`'s
    `deletePreset` computed the reassigned `activePresetName` from
    `s.presets[0]` — the *pre-filter* array — so deleting the active preset
    reassigned back to that same now-deleted name whenever it happened to be
    first in the list (the common case, since "Default" is always seeded
    first). `LayoutPresets.tsx` highlights the active preset by exact name
    match, so this silently left **no** preset shown as active after such a
    delete, and its save-fallback (`newName.trim() || activePresetName`) would
    have resurrected the deleted preset's name on the next save. Fixed by
    reading the *filtered* list's first entry instead — same
    write-test-first/find-real-bug technique as the earlier `RenameWorld` and
    zip-slip fixes. Verified the fix by first watching the un-fixed test fail,
    then confirming green after the source fix (plus a second, unrelated
    fault-injection check: temporarily dropped `useTileStore.addTile`'s dedup
    guard and confirmed its test fails, then restored it).
  - Still untested: the two custom hooks (`useWailsCall`, `usePopover`), and
    the binding-backed tile hooks (`useMods`, `useBackups`, `useWorlds`,
    `usePerformanceHistory`) — the harness above is now a documented,
    copy-pasteable pattern for covering them.
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
- ✅ Created `agent_docs/DEPENDENCIES.md` — policy + rationale table for every
  direct Go and npm dependency, referenced from `CLAUDE.md`.
- ✅ Triaged the root-level `scheduler-blocks-rework.md` design doc: promoted
  to `agent_docs/scheduler-blocks-rework.md` rather than deleted — it's the
  spec base for the scheduler's block/node system (triggers, attributes,
  math, data-type→color legend, which stays fixed) and remains useful input
  for the node-system rework tracked below.
- ✅ Removed the unused `uplot` npm dependency (confirmed unimported anywhere
  under `frontend/src/` — the performance tile's charts use `recharts`
  exclusively). `skinview3d` is **kept intentionally**: reserved for the
  not-yet-built Beta "player skin preview" tile (`ROADMAP.md`), documented in
  `agent_docs/DEPENDENCIES.md` so it isn't mistaken for dead weight later.
- ✅ Deleted the stale root-level `Roadmap.md` — a status log fully superseded
  by `agent_docs/ROADMAP.md` (which it already deferred to for feature scope)
  and out of date (e.g. still listed "Split the JS bundle" as planned
  Infrastructure work, done in the code-split pass above). Root now has no
  `.md` files besides `README.md`.

**P1 — Scheduler node-system deep analysis**
- ✅ **Architecture confirmed sound.** Three parallel Explore agents mapped the
  xyflow editor, the Go engine, and the contract between them: it's a hybrid
  control-flow + data-flow graph interpreter — xyflow is a pure visual editor
  serializing losslessly to a shared `models.Graph`; the real node engine
  (BFS control-flow execution, lazy pull-eval of pure-data nodes, an
  attribute scope with expression parsing) lives in Go, as it must (blocks
  spawn Java, send RCON, write backups — CLAUDE.md: "Go owns all side
  effects"). Keeping xyflow over switching to `rete` was the right call —
  rete's value-add is its own JS-side execution engine, which this app can't
  use. The control-pin/data-pin split mirrors Unreal Blueprints and Blender's
  node graph — the right base structure.
- ✅ **Data-type flow enforcement shipped** (the one real gap found: ports
  declared a type but nothing checked it). New `frontend/.../portTypes.ts` +
  `backend/services/scheduler_validate.go` share a type-resolution model,
  enforced at authoring time (`isValidConnection` rejects incompatible drags)
  and run time (`runGraph` fails loudly instead of silently coercing). Also
  fixed `data.constant`'s output port (was hardcoded `"string"`, is now
  `"auto"`).
- ✅ **Connection-handle UX fixed**: the visible port dot was also the entire
  grab/drop hit area (too small); the `Handle`'s own box (xyflow's real hit
  area) is now an 18px zone with a small decorative dot inside it, plus a
  node-background/border-contrast fix.
- ✅ **Full 4-pillar Health Checklist audit performed** (3 parallel Explore
  agents + hand-verification of every load-bearing claim):
  - **Performant: PASS.** `BlockNode` is `React.memo`; context value +
    `defMap`/cycle-detection sets all `useMemo`'d; static `nodeTypes`/
    `edgeTypes`; 200-cap history ring; deliberate cadences (30s frontend
    countdown, 1-min backend ticker); 500-node/30-min/60s-per-node guards.
  - **Clean: GAP.** 89 inline `style={{}}` across 8 scheduler files
    (`frontend/src/tiles/scheduler/**`) — the largest untouched cluster in
    the Milestone 2 inline-style migration (see that section above); not yet
    in the ESLint error-ratchet glob.
  - **Scalable: 1 GAP remaining.** No `useSchedulerStore` — state lives in
    local `useState` inside `useScheduler.ts`, contradicting CLAUDE.md's
    one-Zustand-store-per-domain rule (confirmed drift, not just suspected).
    The other Scalable gap this audit found — `localStorage` used directly in
    `frontend/src/tiles/scheduler/editor/BlockPalette.tsx` for palette
    collapsed/closed state, a direct violation of CLAUDE.md's explicit "no
    `localStorage`/`sessionStorage`; persist via Go file I/O" rule — is now
    ✅ **fixed**: migrated onto `AppSettings.schedulerPaletteCollapsed` /
    `.schedulerPaletteClosedCategories`, persisted through the existing
    `GetAppSettings`/`SaveAppSettings` binding (no new Go methods, bindings
    regenerated via `wails generate module`). Verified live with a
    mocked-Wails-bridge preview: toggling the palette collapse and a category
    group calls `SaveAppSettings` with the new fields, and `localStorage`
    stays at 0 keys throughout.
  - **Stable: critical gap, now closed for the backend engine** (this
    session's main remediation — see the P1 test-coverage entry above for
    what shipped). Two smaller Stable gaps remain, not yet fixed: the 30s
    next-run poll in `useScheduler.ts` should be a Wails event instead
    (CLAUDE.md's no-`useEffect`-polling rule), and `useScheduler` swallows
    IPC failures silently (no offline/error state surfaced to the UI).
- ✅ **`graphMapping.ts` frontend test coverage added**: 26 tests in the new
  `frontend/src/tiles/scheduler/editor/graphMapping.test.ts` covering
  `graphToFlow`/`flowToGraph` (including a dedicated round-trip test),
  `isValidConnection`, `detectControlCycles`, `randId`, and `defaultConfig` —
  all pure logic, no Wails binding mocks needed, following the same
  `as unknown as models.X` stub convention as the sibling `portTypes.test.ts`.
  Verified the round-trip and cycle-detection tests actually fail when their
  underlying guards are disabled (the `data:`-prefix kind inference in
  `flowToGraph`, and the `reachableFrom` reachability check in
  `detectControlCycles`), then restored both — same technique as the backend
  zip-slip/data-type-validation tests. `pnpm test` (88 tests), `pnpm typecheck`,
  and `pnpm lint` all green.
- **Remaining scheduler backlog** (deferred, not fixed this session):
  the `useSchedulerStore` Zustand migration; the scheduler's inline-style
  Milestone-2 slice; the next-run poll → event switch; offline-error surfacing
  in `useScheduler`. (The `localStorage` → Go-file-I/O migration and
  `useScheduler`-hook test coverage, both listed here previously, have since
  been completed.)

**P2 — Memoization pass**
- Add `React.memo` to the most expensive tile components (3D scenes, chart
  tiles) identified during a profiling pass.
