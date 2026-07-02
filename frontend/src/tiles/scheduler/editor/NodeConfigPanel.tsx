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
        .filter((e) => e.target === nodeId && (e.data as { kind?: string })?.kind === 'data')
        .map((e) => (e.targetHandle ?? '').replace('data:', '')),
    )
  }, [edges, nodeId])

  if (!def) {
    return (
      <div className="p-3">
        <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
          unknown block type
        </span>
      </div>
    )
  }

  const fields = (def.configSchema ?? []).filter((f) => f.key !== '_collapsed')

  if (fields.length === 0) {
    return (
      <div className="p-3">
        <div
          className="mb-2 font-mono text-xs font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {def.label}
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
          {def.description}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        {def.label}
      </div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {def.description}
      </div>

      {fields.map((field) => {
        const val = data.config?.[field.key] ?? field.default ?? ''
        const isWired = wiredKeys.has(field.key)

        return (
          <div key={field.key} className="flex flex-col gap-0.5">
            <label
              className="flex items-center gap-1 font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {field.label}
              {field.required && <span style={{ color: '#ef4444' }}>*</span>}
              {isWired && (
                <span
                  className="ml-1 rounded px-1 text-xs"
                  style={{ background: '#1e3a5f', color: '#60a5fa', fontSize: 9 }}
                >
                  wired
                </span>
              )}
            </label>

            {isWired ? (
              <div
                className="rounded px-2 py-1 font-mono text-xs"
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
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(val)}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {val ? 'true' : 'false'}
                </span>
              </label>
            ) : field.type === 'select' ? (
              <select
                value={String(val)}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="rounded px-2 py-1 font-mono text-xs"
                style={{
                  background: 'var(--bg-base)',
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'attribute' ? (
              <>
                <input
                  type="text"
                  list={`attrs-${nodeId}-${field.key}`}
                  value={String(val)}
                  placeholder="@server.motd or @myValue"
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="rounded px-2 py-1 font-mono text-xs"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
                <datalist id={`attrs-${nodeId}-${field.key}`}>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </datalist>
                <span className="text-xs" style={{ color: 'var(--text-faint)', fontSize: 9 }}>
                  Type a built-in or custom attribute name.
                </span>
              </>
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={val === '' ? '' : Number(val)}
                onChange={(e) =>
                  onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))
                }
                className="rounded px-2 py-1 font-mono text-xs"
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
                onChange={(e) => onChange(field.key, e.target.value)}
                rows={2}
                className="resize-none rounded px-2 py-1 font-mono text-xs"
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
                onChange={(e) => onChange(field.key, e.target.value)}
                className="rounded px-2 py-1 font-mono text-xs"
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
