# Konnekt — Convention Drift Audit (2026-07-18)

A point-in-time audit answering one question: **how much did the codebase drift
from its own conventions while `CLAUDE.md` was not being auto-loaded?**

Unlike `HEALTH_CHECKLIST.md` (an evergreen, re-runnable yardstick), this is a
dated snapshot — it records what was true on 2026-07-18 and is not meant to be
kept current. See `agent_docs/CLAUDE.md` for the conventions themselves and
`agent_docs/HEALTH_CHECKLIST.md` for the ongoing quality gate.

## Why this audit exists

Claude Code auto-loads the **repo-root** `CLAUDE.md` every session and only
pulls *child-directory* CLAUDE.md files in on demand. The project's real
architecture conventions live in `agent_docs/CLAUDE.md`, so they only load when
something under `agent_docs/` is read — not during normal feature work.

Timeline (via `git log --follow`):

- **2026-06-10** (`2da7ca6`) — initial scaffold; full `CLAUDE.md` at repo root.
- **2026-06-11** (`1fdad4a`) — "move CLAUDE.md to agent_docs"; root file gone.
- **2026-07-08** (`0ba49b3`) — root `CLAUDE.md` returns, but with **graphify
  content only**.
- **2026-07-18** — root `CLAUDE.md` fixed to `@`-import `agent_docs/CLAUDE.md`,
  restoring auto-load. This audit run immediately after.

So for roughly **five weeks** the conventions were not auto-loaded.

## Method

Read-only investigation: targeted `grep` sweeps over `frontend/src` and
`backend/`/root Go files for each documented convention, direct reads of
suspect call sites, and `graphify query`/`explain`/`path` runs to assess the
graph as a context source. No code was modified.

## What held (no drift)

| Convention | Result |
| --- | --- |
| No `any` (use `unknown`) | Only 1 occurrence — the documented `frontend/src/tiles/worlds/scene/Sun.tsx:45` exception. |
| No `localStorage`/`sessionStorage` | Zero under `frontend/src`. |
| IPC via generated bindings (no raw `window.go`) | Only a comment in `frontend/src/main.tsx`; no real calls. |
| Tiles self-contained (no cross-tile imports) | Zero tile→sibling-tile imports. |
| Functional components only | Only class is `components/ErrorBoundary.tsx` — React's required exception for error boundaries. |
| Named exports (default only for page-level) | Only `App.tsx` uses `export default` (page-level). |
| `EventsOn` cleaned up on unmount | Verified in `worlds/useWorlds.ts`, `performance/usePerformanceHistory.ts`, `mods/useMods.ts`, `components/SettingsModal.tsx` — all return teardown. |
| Go bound methods return `(T, error)` | True for all but one (see drift #2). |

The strong takeaway: the conventions that would most obviously rot under
unguided AI editing (`any`, `localStorage`, cross-tile coupling, leaked
subscriptions) all held.

## What drifted

All items below except #2 were **already tracked** in
`HEALTH_CHECKLIST.md`'s Remediation backlog before this audit.

1. **`useSchedulerStore` was never built.** Scheduler state lives in local
   `useState` in `frontend/src/tiles/scheduler/useScheduler.ts:16-20`, violating
   the "one Zustand store per domain" rule. `agent_docs/CLAUDE.md`'s architecture
   rule even *names* `useSchedulerStore` as an example store — it references
   something that doesn't exist.
   _Tracked: yes (scheduler node-system backlog entry)._
2. **`GetAppVersion() string`** (`app.go:151`) is the only bound `App` method
   that doesn't return `(T, error)`. Low-risk (a version string can't fail), but
   it's the one exception to the rule.
   _Tracked: only via the general Stable-pillar item; now called out explicitly
   in the backlog._
3. **Scheduler 30s next-run poll** (`useScheduler.ts:48`) is `useEffect`
   polling that should be a Wails event, and `useScheduler` swallows IPC errors
   silently (no offline/error state surfaced).
   _Tracked: yes (scheduler node-system backlog entry)._
4. **Inline-style migration incomplete** — ~143 `style={{}}` across ~35 files
   (worlds + players tiles remain). This is explicit in-progress work
   (Milestone 2), not drift that was "lost."
   _Tracked: yes (Milestone 2)._

Deliberate polls that are **not** drift: the 150ms console-batch flush
(`App.tsx`), stats (~10s) and TPS (~15s) sampling, and player-roster RCON polls
have no natural push event and are acknowledged as deliberate cadences in the
checklist's Performant pillar.

## Graphify assessment

Graphify works well as a context source and is worth using per
`CLAUDE.md`'s guidance:

- `graphify query "how does the scheduler execute a graph"` returned a correctly
  scoped BFS subgraph — `SchedulerService`, `ExecContext`, `BlockRegistry`,
  `validateGraphDataTypes`, `registerBuiltins`, etc., each with `file:line`.
- `graphify explain "EventBus"` listed all 8 service dependents plus degree and
  community — an accurate dependency picture.
- `graphify path "SchedulerService" "RconService"` found the shortest
  relationship (both connect through `App`), with a minor equal-score ambiguity
  warning.

It is **AST-based**: structurally precise and cheap to keep current
(`graphify update .`), but shallow on semantics — no `GEMINI_API_KEY` /
`GOOGLE_API_KEY` is set, so there's no LLM semantic extraction. Best for
navigation and "where does X live / what touches Y"; pair it with source reads
for behavioral detail.

## Conclusion

Very little was actually lost. `HEALTH_CHECKLIST.md` functioned as the
compensating control — its periodic audits read the conventions directly and
caught the drift that exists (all of it is in its backlog). The real deficiency
was **reactive** enforcement (caught at audit time) instead of **preventive**
enforcement (avoided at write time). Now that the root `CLAUDE.md` auto-imports
`agent_docs/CLAUDE.md`, write-time prevention is restored, and the checklist
returns to being a backstop rather than the only line of defense.

No remediation is required beyond what the backlog already lists.
