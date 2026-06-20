import { useMemo, useState } from 'react'
import { useNotificationsStore } from '../../stores/useNotificationsStore'
import type { NotifKind } from '../../stores/useNotificationsStore'
import { Segmented } from '../../components/ui/Segmented'
import type { TileProps } from '../../types'

const KIND_ICON: Record<NotifKind, string> = {
  crash: '⚠',
  join:  '●',
  info:  '·',
  warn:  '⚠',
  error: '✕',
}

const KIND_COLOR: Record<NotifKind, string> = {
  crash: '#f87171',
  join:  'var(--accent)',
  info:  'var(--text-muted)',
  warn:  '#fb923c',
  error: '#f87171',
}

// Filter options — "errors" matches both 'error' and 'crash' (same severity).
type KindFilter = 'all' | 'join' | 'info' | 'warn' | 'errors'

const FILTER_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all',    label: 'All' },
  { value: 'join',   label: 'Joins' },
  { value: 'info',   label: 'Info' },
  { value: 'warn',   label: 'Warn' },
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

  const filtered = useMemo(
    () => [...items].reverse().filter((item) => matchesFilter(item.kind, filter)),
    [items, filter],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Filter toolbar */}
      <div className="flex items-center px-3 pt-2 pb-1 shrink-0">
        <Segmented options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            No notifications yet
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-xs font-mono py-2" style={{ color: 'var(--text-faint)' }}>
            No matching notifications
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-xs">
              <span
                className="shrink-0 font-mono"
                style={{ color: KIND_COLOR[item.kind] }}
              >
                {KIND_ICON[item.kind]}
              </span>
              <span className="shrink-0 font-mono" style={{ color: 'var(--text-faint)' }}>
                {item.timestamp}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <button
          onClick={clear}
          className="text-xs transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
