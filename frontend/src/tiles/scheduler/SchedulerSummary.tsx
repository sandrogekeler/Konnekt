import type { models } from '../../../wailsjs/go/models'

interface Props {
  graphs: models.Graph[]
}

export function SchedulerSummary({ graphs }: Props) {
  const enabled = graphs.filter(g => g.enabled).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats row */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="flex flex-col items-center">
          <span className="text-xl font-mono" style={{ color: 'var(--accent)' }}>
            {graphs.length}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            total
          </span>
        </div>
        <div style={{ width: 0.5, height: 28, background: 'var(--border-subtle)' }} />
        <div className="flex flex-col items-center">
          <span className="text-xl font-mono" style={{ color: '#22c55e' }}>
            {enabled}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            active
          </span>
        </div>
      </div>

      {/* Graph list */}
      <div className="flex-1 overflow-y-auto px-2 pb-1">
        {graphs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
              maximize to add graphs
            </span>
          </div>
        ) : (
          graphs.slice(0, 8).map(g => (
            <div
              key={g.id}
              className="flex items-center gap-1.5 py-0.5"
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: g.enabled ? '#22c55e' : 'var(--border-subtle)',
                  flexShrink: 0,
                }}
              />
              <span
                className="text-xs font-mono truncate"
                style={{ color: g.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {g.name || g.id}
              </span>
            </div>
          ))
        )}
        {graphs.length > 8 && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            +{graphs.length - 8} more
          </span>
        )}
      </div>

      <div className="px-2 pb-1">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          maximize to edit
        </span>
      </div>
    </div>
  )
}
