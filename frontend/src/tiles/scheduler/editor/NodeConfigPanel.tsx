import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import type { models } from '../../../../wailsjs/go/models'
import type { NodeData } from './graphMapping'

interface Props {
  nodeId: string
  data: NodeData
  def: models.BlockDef | undefined
  edges: Edge[]
  onChange: (key: string, value: unknown) => void
}

export function NodeConfigPanel({ nodeId, data, def, edges, onChange }: Props) {
  // Keys that are wired via a data edge — shown as read-only.
  const wiredKeys = useMemo(() => {
    return new Set(
      edges
        .filter(e => e.target === nodeId && (e.data as { kind?: string })?.kind === 'data')
        .map(e => (e.targetHandle ?? '').replace('data:', ''))
    )
  }, [edges, nodeId])

  if (!def) {
    return (
      <div className="p-3">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          unknown block type
        </span>
      </div>
    )
  }

  const fields = def.configSchema ?? []

  if (fields.length === 0) {
    return (
      <div className="p-3">
        <div className="text-xs font-mono mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          {def.label}
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          {def.description}
        </span>
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
        {def.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {def.description}
      </div>

      {fields.map(field => {
        const val = data.config?.[field.key] ?? field.default ?? ''
        const isWired = wiredKeys.has(field.key)

        return (
          <div key={field.key} className="flex flex-col gap-0.5">
            <label className="text-xs font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              {field.label}
              {field.required && <span style={{ color: '#ef4444' }}>*</span>}
              {isWired && (
                <span
                  className="ml-1 px-1 rounded text-xs"
                  style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: 9 }}
                >
                  wired
                </span>
              )}
            </label>

            {isWired ? (
              <div
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background: 'var(--bg-base)',
                  border: '0.5px solid #1e3a5f',
                  color: '#60a5fa',
                  minHeight: 26,
                }}
              >
                ← data edge
              </div>
            ) : field.type === 'bool' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={e => onChange(field.key, e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {Boolean(val) ? 'true' : 'false'}
                </span>
              </label>
            ) : field.type === 'select' ? (
              <select
                value={String(val)}
                onChange={e => onChange(field.key, e.target.value)}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={val === '' ? '' : Number(val)}
                onChange={e => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            ) : field.type === 'command' ? (
              <textarea
                value={String(val)}
                onChange={e => onChange(field.key, e.target.value)}
                rows={2}
                className="px-2 py-1 rounded text-xs font-mono resize-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            ) : (
              <input
                type="text"
                value={String(val)}
                onChange={e => onChange(field.key, e.target.value)}
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  background: 'var(--bg-surface)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
