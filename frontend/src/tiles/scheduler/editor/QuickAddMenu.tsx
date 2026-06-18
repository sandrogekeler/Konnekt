import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { models } from '../../../../wailsjs/go/models'
import { CATEGORY_COLOR, CATEGORY_ICON, orderedCategories } from './blockMeta'

const PANEL_W = 140

interface Props {
  blockDefs: models.BlockDef[]
  screenPos: { x: number; y: number }
  onPick: (def: models.BlockDef) => void
  onClose: () => void
}

export function QuickAddMenu({ blockDefs, screenPos, onPick, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const categories = orderedCategories(blockDefs)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Anchor primary panel to cursor; flip side if it would overflow viewport
  const menuHeight  = categories.length * 28 + 4
  const primaryLeft = screenPos.x + PANEL_W > vw ? screenPos.x - PANEL_W : screenPos.x
  const primaryTop  = screenPos.y + menuHeight > vh
    ? Math.max(0, screenPos.y - menuHeight)
    : screenPos.y

  // Fly-out: prefer right; flip left if it would overflow
  const flyoutLeft = primaryLeft + PANEL_W + PANEL_W > vw
    ? primaryLeft - PANEL_W
    : primaryLeft + PANEL_W

  const activeDefs  = activeCategory ? blockDefs.filter(d => d.category === activeCategory) : []
  const activeColor = activeCategory ? (CATEGORY_COLOR[activeCategory] ?? '#6b7280') : '#6b7280'

  return createPortal(
    <>
      {/* Dismiss backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
        onClick={onClose}
      />

      {/* Primary panel: categories */}
      <div
        style={{
          position: 'fixed',
          left: primaryLeft,
          top: primaryTop,
          zIndex: 1001,
          width: PANEL_W,
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {categories.map(cat => {
          const color    = CATEGORY_COLOR[cat] ?? '#6b7280'
          const icon     = CATEGORY_ICON[cat] ?? '?'
          const isActive = activeCategory === cat
          return (
            <div
              key={cat}
              onMouseEnter={() => setActiveCategory(cat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                cursor: 'default',
                fontSize: 11,
                fontFamily: 'monospace',
                color,
                background: isActive ? 'var(--bg-base)' : 'transparent',
                borderLeft: isActive ? `2px solid ${color}` : '2px solid transparent',
                userSelect: 'none',
              }}
            >
              <span>{icon}</span>
              <span style={{ textTransform: 'uppercase', flex: 1 }}>{cat}</span>
              <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>›</span>
            </div>
          )
        })}
      </div>

      {/* Fly-out panel: blocks for active category */}
      {activeCategory && (
        <div
          style={{
            position: 'fixed',
            left: flyoutLeft,
            top: primaryTop,
            zIndex: 1001,
            width: PANEL_W,
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          {activeDefs.map(def => (
            <div
              key={def.id}
              title={def.description}
              onClick={() => onPick(def)}
              style={{
                padding: '5px 8px',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'monospace',
                color: 'var(--text-primary)',
                borderLeft: '2px solid transparent',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderLeftColor = activeColor
                el.style.background = 'var(--bg-base)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderLeftColor = 'transparent'
                el.style.background = 'transparent'
              }}
            >
              {def.label}
            </div>
          ))}
        </div>
      )}
    </>,
    document.body,
  )
}
