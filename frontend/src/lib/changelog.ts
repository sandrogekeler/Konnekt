export interface ChangelogEntry {
  /** Human title of what changed, e.g. 'Brand & UI polish'. No semver exists yet. */
  label: string
  /** ISO date 'YYYY-MM-DD', used for ordering + display. */
  date: string
  /** Headline, user-facing changes — always visible. */
  highlights: string[]
  /** Smaller changes, collapsed behind a per-entry dropdown. */
  minor?: string[]
}

// Ordered newest-first. Keep this the single source of truth for the in-app
// "What's New" pane; prepend new releases at the top.
//
// Convention: add exactly one entry per calendar date — fold everything that
// shipped that day into its highlights/minor rather than adding a second
// entry with the same date. groupByDate() below merges same-date entries
// defensively (folding later entries' highlights/minor into the first one
// seen and dropping their labels) so a slip doesn't break the UI, but that's
// a safety net, not something to lean on when curating.
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    label: 'In-place auto-updater',
    date: '2026-07-16',
    highlights: [
      'Settings → About’s "Download & Install" now downloads, verifies, and installs updates in place, then restarts the app — no more manual download',
    ],
    minor: [
      'Added a tag-triggered release pipeline that publishes checksummed Windows binaries to GitHub Releases',
    ],
  },
  {
    label: 'Brand & UI polish',
    date: '2026-07-14',
    highlights: [
      'New brand typography across the app (Satoshi / Excon / Ranade type system)',
      'Added the Konnekt landing page',
    ],
    minor: [
      'Migrated more of the UI to token-backed Tailwind utility classes so light/dark/accent skins apply uniformly',
    ],
  },
  {
    label: 'Backups & scheduler fixes',
    date: '2026-07-06',
    highlights: [
      'Backups solar-system view now animates every sphere in uniformly',
      'Fixed the worlds/dimensions dropdown not collapsing fully on WebKit WebViews',
    ],
    minor: [
      'Scheduler block-palette preferences now persist through app settings instead of browser storage',
    ],
  },
  {
    label: 'Scheduler graph typing',
    date: '2026-07-03',
    highlights: [
      'Scheduler now enforces data-port type compatibility when wiring graph edges, preventing invalid connections',
    ],
    minor: [
      'Added test coverage for graph mapping and store logic',
      'Fixed a layout-preset deletion bug',
    ],
  },
]

/**
 * Merges entries that share the same date into a single display entry.
 * Assumes newest-first input. The first entry seen for a date keeps its
 * label; any later entries for that same date fold their highlights/minor
 * into it and are dropped, preserving overall newest-first order.
 */
export function groupByDate(entries: readonly ChangelogEntry[]): ChangelogEntry[] {
  const merged = new Map<string, ChangelogEntry>()

  for (const entry of entries) {
    const existing = merged.get(entry.date)
    if (!existing) {
      merged.set(entry.date, {
        ...entry,
        highlights: [...entry.highlights],
        minor: entry.minor ? [...entry.minor] : undefined,
      })
      continue
    }
    existing.highlights.push(...entry.highlights)
    if (entry.minor && entry.minor.length > 0) {
      existing.minor = [...(existing.minor ?? []), ...entry.minor]
    }
  }

  return [...merged.values()]
}

// "Open GitHub for older changelogs" target — GitHub Releases, now that
// .github/workflows/release.yml cuts them on every v* tag push.
export const CHANGELOG_URL = 'https://github.com/sandrogekeler/Konnekt/releases'
