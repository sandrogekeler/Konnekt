import { useProcessesStore } from '../stores/useProcessesStore'

export function ActiveProcesses() {
  const processes = useProcessesStore((s) => s.processes)
  const list = Object.values(processes)
  if (list.length === 0) return null

  return (
    <div
      className="shrink-0 flex flex-col gap-2 px-3 py-2"
      style={{ borderTop: '0.5px solid var(--border-subtle)' }}
    >
      {list.map((p) => (
        <div key={p.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
              {p.label}
            </span>
            <span className="text-xs font-mono shrink-0" style={{ color: p.status === 'failed' ? 'var(--danger)' : 'var(--text-faint)' }}>
              {p.status === 'running' ? `${p.percent}%` : p.status === 'done' ? '✓' : '✗'}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 2, background: 'var(--border-subtle)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${p.percent}%`,
                background: p.status === 'failed' ? 'var(--danger)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
