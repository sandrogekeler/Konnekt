import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { models } from '../../../../wailsjs/go/models'
import { CATEGORY_COLOR, CATEGORY_ICON, orderedCategories } from './blockMeta'

const PANEL_W = 160

interface Props {
  blockDefs: models.BlockDef[]
  screenPos: { x: number; y: number }
  onPick: (def: models.BlockDef) => void
  onClose: () => void
}

export function QuickAddMenu({ blockDefs, screenPos, onPick, onClose }: Props) {
  const [query, setQuery]                   = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [highlightIdx, setHighlightIdx]     = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const categories = orderedCategories(blockDefs)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return blockDefs.filter(d =>
      d.label.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q),
    )
  }, [blockDefs, query])

  const isSearching = query.trim().length > 0

  useEffect(() => { setHighlightIdx(0) }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (!isSearching) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[highlightIdx]) onPick(filtered[highlightIdx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isSearching, filtered, highlightIdx, onPick])

  const vw = window.innerWidth
  const vh = window.innerHeight

  const primaryLeft = screenPos.x + PANEL_W > vw ? screenPos.x - PANEL_W : screenPos.x
  const menuHeight  = 30 + (isSearching
    ? Math.min(filtered.length, 10) * 26 + 4
    : categories.length * 28 + 4)
  const primaryTop = screenPos.y + menuHeight > vh
    ? Math.max(0, screenPos.y - menuHeight)
    : screenPos.y

  const flyoutLeft  = primaryLeft + PANEL_W + PANEL_W > vw
    ? primaryLeft - PANEL_W
    : primaryLeft + PANEL_W

  const activeDefs  = activeCategory ? blockDefs.filter(d => d.category === activeCategory) : []
  const activeColor = activeCategory ? (CATEGORY_COLOR[activeCategory] ?? '#6b7280') : '#6b7280'

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: primaryLeft,
    top: primaryTop,
    zIndex: 1001,
    width: PANEL_W,
    background: 'var(--bg-surface)',
    border: '0.5px solid var(--border-subtle)',
    borderRadius: 4,
    overflow: 'hidden',
  }

  return createPortal(
    <>
      {/* Dismiss backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} onClick={onClose} />

      {/* Primary panel */}
      <div style={panelStyle}>

        {/* Search input */}
        <div style={{
          padding: '5px 8px',
          borderBottom: '0.5px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="search blocks…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 11,
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Results area */}
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {isSearching ? (
            filtered.length === 0 ? (
              <div style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-faint)' }}>
                no results
              </div>
            ) : (
              filtered.map((def, i) => {
                const color   = CATEGORY_COLOR[def.category] ?? '#6b7280'
                const isHilit = i === highlightIdx
                return (
                  <div
                    key={def.id}
                    title={def.description}
                    onClick={() => onPick(def)}
                    onMouseEnter={() => setHighlightIdx(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: 'var(--text-primary)',
                      background: isHilit ? 'var(--bg-base)' : 'transparent',
                      borderLeft: isHilit ? `2px solid ${color}` : '2px solid transparent',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ flex: 1 }}>{def.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                      {def.category}
                    </span>
                  </div>
                )
              })
            )
          ) : (
            categories.map(cat => {
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
            })
          )}
        </div>
      </div>

      {/* Fly-out for category browse — hidden when searching */}
      {!isSearching && activeCategory && (
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
