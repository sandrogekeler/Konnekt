import { useEffect, useState } from 'react'
import type { models } from '../../../../wailsjs/go/models'

interface Props {
  graph: models.Graph
  nodeId: string
  onPreview: (graph: models.Graph, nodeId: string) => Promise<models.NodePreview>
}

// Live dry-run "spreadsheet": attributes the node references/defines with their
// current values, plus a console line for what the block would do. No side effects.
export function NodeDataPanel({ graph, nodeId, onPreview }: Props) {
  const [preview, setPreview] = useState<models.NodePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    onPreview(graph, nodeId)
      .then(p => { if (!cancelled) setPreview(p) })
      .catch(e => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [graph, nodeId, onPreview])

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontFamily: 'monospace', color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
        Data preview
      </div>

      {error && (
        <div className="text-xs font-mono" style={{ color: '#ef4444' }}>{error}</div>
      )}

      {/* Attribute table */}
      <div className="flex flex-col gap-1">
        <span style={labelStyle}>attributes</span>
        {preview && preview.attributes && preview.attributes.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {preview.attributes.map(a => (
              <div
                key={a.name}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded"
                style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
              >
                <span className="text-xs font-mono" style={{ color: a.writable ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  @{a.name}
                  {!a.writable && a.type !== 'custom' && (
                    <span className="ml-1" style={{ fontSize: 8, color: 'var(--text-faint)' }}>(read-only)</span>
                  )}
                  {a.type === 'custom' && (
                    <span className="ml-1" style={{ fontSize: 8, color: '#7c3aed' }}>(custom)</span>
                  )}
                </span>
                <span className="text-xs font-mono" style={{ color: a.error ? '#ef4444' : 'var(--accent)' }}>
                  {a.error ? a.error : (a.value === '' ? '—' : a.value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            no attributes referenced
          </span>
        )}
      </div>

      {/* Console */}
      <div className="flex flex-col gap-1">
        <span style={labelStyle}>console</span>
        <div
          className="px-2 py-1 rounded text-xs font-mono flex flex-col gap-0.5"
          style={{ background: 'var(--bg-base)', border: '0.5px solid var(--border-subtle)', minHeight: 26 }}
        >
          {preview && preview.console && preview.console.length > 0 ? (
            preview.console.map((line, i) => (
              <span
                key={i}
                style={{ color: (line.startsWith('ERROR') || line.startsWith('would fail')) ? '#ef4444' : 'var(--text-secondary)' }}
              >
                {line}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--text-faint)' }}>—</span>
          )}
        </div>
      </div>
    </div>
  )
}
