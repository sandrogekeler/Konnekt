import { useState } from 'react'
import type { models } from '../../../../wailsjs/go/models'
import { CATEGORY_COLOR, CATEGORY_ICON, orderedCategories } from './blockMeta'

const LS_COLLAPSED = 'scheduler.palette.collapsed'
const LS_CLOSED    = 'scheduler.palette.closed'

interface Props {
  blockDefs: models.BlockDef[]
  onAdd: (def: models.BlockDef) => void
}

export function BlockPalette({ blockDefs, onAdd }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(LS_COLLAPSED) === 'true',
  )
  const [closed, setClosed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_CLOSED) ?? '{}') } catch { return {} }
  })

  const categories = orderedCategories(blockDefs)

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(LS_COLLAPSED, String(next))
  }

  function toggleCategory(cat: string) {
    const next = { ...closed, [cat]: !closed[cat] }
    setClosed(next)
    localStorage.setItem(LS_CLOSED, JSON.stringify(next))
  }

  if (collapsed) {
    return (
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          width: 20,
          borderRight: '0.5px solid var(--border-subtle)',
          background: 'var(--bg-base)',
          cursor: 'pointer',
        }}
        onClick={toggleCollapsed}
        title="Expand blocks"
      >
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-faint)', userSelect: 'none' }}>›</span>
      </div>
    )
  }

  return (
    <div
      className="shrink-0 overflow-y-auto"
      style={{
        width: 192,
        borderRight: '0.5px solid var(--border-subtle)',
        background: 'var(--bg-base)',
      }}
    >
      <div className="px-2 py-2">
        <div className="text-xs font-mono mb-2 flex items-center" style={{ color: 'var(--text-faint)' }}>
          <span className="flex-1">blocks</span>
          <span
            onClick={toggleCollapsed}
            title="Collapse palette"
            style={{ cursor: 'pointer', userSelect: 'none', paddingLeft: 4 }}
          >
            ‹
          </span>
        </div>

        {categories.map(cat => {
          const defs = blockDefs.filter(d => d.category === cat)
          if (defs.length === 0) return null
          const color    = CATEGORY_COLOR[cat] ?? '#6b7280'
          const icon     = CATEGORY_ICON[cat] ?? '?'
          const isClosed = !!closed[cat]

          return (
            <div key={cat} className="mb-3">
              <div
                className="text-xs font-mono uppercase mb-1 flex items-center gap-1 cursor-pointer select-none"
                style={{ color }}
                onClick={() => toggleCategory(cat)}
              >
                <span style={{ fontSize: 9 }}>{isClosed ? '▸' : '▾'}</span>
                <span>{icon}</span>
                <span>{cat}</span>
              </div>

              {!isClosed && defs.map(def => (
                <div
                  key={def.id}
                  draggable
                  onClick={() => onAdd(def)}
                  onDragStart={e => e.dataTransfer.setData('blockType', def.id)}
                  title={def.description}
                  className="px-2 py-1 mb-0.5 rounded cursor-pointer select-none"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '0.5px solid var(--border-subtle)',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = color)}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)')}
                >
                  {def.label}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
