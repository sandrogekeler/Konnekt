export interface ChangelogEntry {
  /** Human label for the release, e.g. 'Alpha — July 2026'. No semver exists yet. */
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
export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    label: 'Alpha — Brand & UI polish',
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
    label: 'Alpha — Backups & scheduler fixes',
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
    label: 'Alpha — Scheduler graph typing',
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

// "Open GitHub for older changelogs" target. Commit history is guaranteed
// non-empty (unlike /releases, which has no tags yet); swap to
// `.../Konnekt/releases` once the project starts cutting GitHub Releases.
export const CHANGELOG_URL = 'https://github.com/sandrogekeler/Konnekt/commits/main'
