import { useMemo, useState } from 'react'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import type { NotifKind } from '../../stores/useNotificationsStore'
import { Segmented } from '../../components/ui/Segmented'
import type { TileProps } from '../../types'

const KIND_ICON: Record<NotifKind, string> = {
  crash: '⚠',
  join: '●',
  info: '·',
  warn: '⚠',
  error: '✕',
}

const KIND_CLASS: Record<NotifKind, string> = {
  crash: 'text-danger',
  join: 'text-accent',
  info: 'text-text-muted',
  warn: 'text-warning',
  error: 'text-danger',
}

// Filter options — "errors" matches both 'error' and 'crash' (same severity).
type KindFilter = 'all' | 'join' | 'info' | 'warn' | 'errors'

const FILTER_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'join', label: 'Joins' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'errors', label: 'Errors' },
]

function matchesFilter(kind: NotifKind, filter: KindFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'errors') return kind === 'error' || kind === 'crash'
  return kind === filter
}

export function NotificationsTile(_props: TileProps) {
  const { items, clear } = useNotificationsStore()
  const [filter, setFilter] = useState<KindFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = useMemo(
    () => [...items].reverse().filter((item) => matchesFilter(item.kind, filter)),
    [items, filter],
  )

  const activeLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'All'

  return (
    <div className="flex h-full flex-col">
      {/* Filter toolbar — collapsed by default */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex items-center gap-1 text-xs transition-colors ${
            filterOpen ? 'text-text-secondary' : 'text-text-faint'
          }`}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = filterOpen
              ? 'var(--text-secondary)'
              : 'var(--text-faint)'
          }}
        >
          <span>{filterOpen ? '▾' : '▸'}</span>
          <span className="font-mono">{filterOpen ? 'Filter' : activeLabel}</span>
        </button>
        {filterOpen && (
          <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} compact />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {items.length === 0 ? (
          <div className="text-text-faint flex h-full items-center justify-center font-mono text-xs">
            No notifications yet
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-text-faint py-2 font-mono text-xs">No matching notifications</div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 font-mono ${KIND_CLASS[item.kind]}`}>
                {KIND_ICON[item.kind]}
              </span>
              <span className="text-text-faint shrink-0 font-mono">{item.timestamp}</span>
              <span className="text-text-secondary">{item.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <button
          onClick={clear}
          className="text-text-faint text-xs transition-colors"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
