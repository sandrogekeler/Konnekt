import type { models } from '../../../../wailsjs/go/models'
import { CATEGORY_COLOR, CATEGORY_ICON } from './blockMeta'

const CATEGORIES = ['trigger', 'action', 'control', 'notify'] as const

interface Props {
  blockDefs: models.BlockDef[]
  onAdd: (def: models.BlockDef) => void
}

export function BlockPalette({ blockDefs, onAdd }: Props) {
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
        <div className="text-xs font-mono mb-2" style={{ color: 'var(--text-faint)' }}>
          blocks
        </div>

        {CATEGORIES.map(cat => {
          const defs = blockDefs.filter(d => d.category === cat)
          if (defs.length === 0) return null
          const color = CATEGORY_COLOR[cat]
          const icon  = CATEGORY_ICON[cat]

          return (
            <div key={cat} className="mb-3">
              <div
                className="text-xs font-mono uppercase mb-1 flex items-center gap-1"
                style={{ color }}
              >
                <span>{icon}</span>
                <span>{cat}</span>
              </div>

              {defs.map(def => (
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
