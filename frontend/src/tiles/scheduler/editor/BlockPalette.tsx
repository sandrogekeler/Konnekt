import type { models } from '../../../../wailsjs/go/models'
import { CATEGORY_COLOR, CATEGORY_ICON, orderedCategories } from './blockMeta'
import { useSettingsStore } from '../../../stores/useSettingsStore'

interface Props {
  blockDefs: models.BlockDef[]
  onAdd: (def: models.BlockDef) => void
}

export function BlockPalette({ blockDefs, onAdd }: Props) {
  const { settings, update } = useSettingsStore()
  const collapsed = settings.schedulerPaletteCollapsed
  const closed = settings.schedulerPaletteClosedCategories

  const categories = orderedCategories(blockDefs)

  function toggleCollapsed() {
    update({ schedulerPaletteCollapsed: !collapsed })
  }

  function toggleCategory(cat: string) {
    update({ schedulerPaletteClosedCategories: { ...closed, [cat]: !closed[cat] } })
  }

  if (collapsed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 20,
          borderRight: '0.5px solid var(--border-subtle)',
          background: 'var(--bg-base)',
          cursor: 'pointer',
        }}
        onClick={toggleCollapsed}
        title="Expand blocks"
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'var(--text-faint)',
            userSelect: 'none',
          }}
        >
          ›
        </span>
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
        <div
          className="mb-2 flex items-center font-mono text-xs"
          style={{ color: 'var(--text-faint)' }}
        >
          <span className="flex-1">blocks</span>
          <span
            onClick={toggleCollapsed}
            title="Collapse palette"
            style={{ cursor: 'pointer', userSelect: 'none', paddingLeft: 4 }}
          >
            ‹
          </span>
        </div>

        {categories.map((cat) => {
          const defs = blockDefs.filter((d) => d.category === cat)
          if (defs.length === 0) return null
          const color = CATEGORY_COLOR[cat] ?? '#6b7280'
          const icon = CATEGORY_ICON[cat] ?? '?'
          const isClosed = !!closed[cat]

          return (
            <div key={cat} className="mb-3">
              <div
                className="mb-1 flex cursor-pointer items-center gap-1 font-mono text-xs uppercase select-none"
                style={{ color }}
                onClick={() => toggleCategory(cat)}
              >
                <span style={{ fontSize: 9 }}>{isClosed ? '▸' : '▾'}</span>
                <span>{icon}</span>
                <span>{cat}</span>
              </div>

              {!isClosed &&
                defs.map((def) => (
                  <div
                    key={def.id}
                    draggable
                    onClick={() => onAdd(def)}
                    onDragStart={(e) => e.dataTransfer.setData('blockType', def.id)}
                    title={def.description}
                    className="mb-0.5 cursor-pointer rounded px-2 py-1 select-none"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '0.5px solid var(--border-subtle)',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor = color)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.borderColor =
                        'var(--border-subtle)')
                    }
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
