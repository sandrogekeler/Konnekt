import type { models } from '../../../wailsjs/go/models'

interface Props {
  graphs: models.Graph[]
  nextRuns: Record<string, number>
}

// Compact "in 5m" / "in 2h" / "in 3d" style relative time for a future ms epoch.
function formatNextRun(ms: number): string {
  const diff = ms - Date.now()
  if (diff <= 0) return 'now'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `in ${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.round(hours / 24)}d`
}

export function SchedulerSummary({ graphs, nextRuns }: Props) {
  const enabled = graphs.filter(g => g.enabled).length

  // Soonest upcoming scheduled run across all graphs.
  const soonest = Object.values(nextRuns)
    .filter(v => v > 0)
    .sort((a, b) => a - b)[0]

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
          graphs.slice(0, 8).map(g => {
            const next = nextRuns[g.id]
            return (
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
                  className="text-xs font-mono truncate flex-1"
                  style={{ color: g.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {g.name || g.id}
                </span>
                {g.enabled && next > 0 && (
                  <span
                    className="text-xs font-mono shrink-0"
                    style={{ color: 'var(--text-faint)' }}
                    title="Next scheduled run"
                  >
                    {formatNextRun(next)}
                  </span>
                )}
              </div>
            )
          })
        )}
        {graphs.length > 8 && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            +{graphs.length - 8} more
          </span>
        )}
      </div>

      <div className="px-2 pb-1">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          {soonest ? `next run ${formatNextRun(soonest)}` : 'maximize to edit'}
        </span>
      </div>
    </div>
  )
}
