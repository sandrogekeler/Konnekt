---
description: Reconcile Linear (KonnektMC) against agent_docs/ROADMAP.md and post project status updates
---

Reconcile the **KonnektMC** Linear team against this repo's roadmap. See
`agent_docs/LINEAR.md` for the full structure (initiatives, projects,
milestones, labels, cycle cadence) — read it first if this is a cold start.

## 1. Gather current state

- Read `agent_docs/ROADMAP.md` in full.
- Run `git log --since="2 weeks ago" --oneline` (and skim merged PRs if `gh`
  is available) to see what actually shipped recently.
- `list_issues team=KonnektMC` (paginate with `includeArchived:false`) to see
  the current board across all five projects.

## 2. Reconcile roadmap → Linear

For every roadmap line:

- **`[ ]` with no matching Linear issue** — create one in the right project
  (Backups — Beta Hardening / Beta Tiles / Beta Features / Remote Access —
  Dashboard over Web), with a `Source: agent_docs/ROADMAP.md § <section>` line
  in the description, matching label(s) (`Beta` and/or `Remote Access` plus
  `Bug`/`Feature`/`Improvement`), and a reasonable priority (data-loss /
  correctness issues > new features > nice-to-haves).
- **`[x]` or shipped per git history, but its Linear issue isn't Done** — move
  it to Done (`save_issue(state: "Done")`).
- **`[~]` partial** — leave as-is unless the description now needs updating to
  reflect what's actually partial.
- Do **not** create per-item issues for the Alpha project — Alpha is tracked
  via its four Done milestones only, per `agent_docs/LINEAR.md`.
- Do not touch KON-5 style pre-existing bugs unless the roadmap or git history
  gives a specific reason to.

## 3. Refresh milestones

If a Remote Access phase issue closes, check whether its milestone
(`Phase N — ...`) should be considered complete (all issues under it Done).
Linear infers milestone completion from its issues, so no manual toggle is
needed — just confirm it looks right with `get_project`.

## 4. Post status updates

For each of the four Beta-side projects (`Backups — Beta Hardening`,
`Beta Tiles`, `Beta Features`, `Remote Access — Dashboard over Web`), post a
`save_status_update` (type: project) covering:

- **Shipped** since the last update (check `get_status_updates` for the
  previous one to avoid repeating it)
- **At risk** — call out anything blocking or any correctness/data-loss issue
  ahead of feature work
- **Next** — what should logically come next given priorities

Keep each update short (3 short paragraphs max, matching the style of the
existing updates). Set `health` to `onTrack` / `atRisk` / `offTrack` honestly
— don't default to onTrack.

## 5. Report

Summarize what changed in this pass: issues created, issues moved to Done,
and a one-line health readout per project. If nothing changed, say so plainly
— don't invent activity.
