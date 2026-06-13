import { useNotificationsStore } from '../../stores/useNotificationsStore'
import type { NotifKind } from '../../stores/useNotificationsStore'
import type { TileProps } from '../../types'

const KIND_ICON: Record<NotifKind, string> = {
  crash: '⚠',
  join:  '●',
  info:  '·',
}

const KIND_COLOR: Record<NotifKind, string> = {
  crash: '#f87171',
  join:  'var(--accent)',
  info:  'var(--text-muted)',
}

export function NotificationsTile(_props: TileProps) {
  const { items, clear } = useNotificationsStore()

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm font-mono" style={{ color: 'var(--text-faint)' }}>
        No notifications yet
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        {[...items].reverse().map((item) => (
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
        ))}
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
