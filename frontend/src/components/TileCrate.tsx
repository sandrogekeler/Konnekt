import { useRef } from 'react'
import type { TileDefinition } from '../types'
import { useTileStore } from '../stores/useTileStore'
import { useUiStore } from '../stores/useUiStore'
import { TILE_REGISTRY } from '../tiles/registry'

// Pixels the pointer must travel before a press becomes a drag (vs a click).
const DRAG_THRESHOLD = 5

export function TileCrate() {
  const { activeTileIds, addTile } = useTileStore()
  const { requestMaximize, requestCloseMaximize, flashTile, setDraggingTileId } = useUiStore()

  // Utility tiles (non-maximizable) sit in their own group at the top; the
  // maximizable modules form the main list below.
  const utilityTiles = TILE_REGISTRY.filter((t) => !t.maximizable)
  const moduleTiles = TILE_REGISTRY.filter((t) => t.maximizable)

  const handleClick = (tile: TileDefinition) => {
    if (tile.maximizable) {
      requestMaximize(tile.id, null)
      return
    }
    // Utility tile: never fullscreen. Close any open fullscreen, then add it to
    // the canvas (best available spot) if absent, and flash it green.
    requestCloseMaximize()
    if (!activeTileIds.includes(tile.id)) addTile(tile.id)
    flashTile(tile.id)
  }

  // Mouse-driven press: below the threshold it's a click (handleClick); past it
  // we hand off to the Dashboard, which renders the wireframe + grid placeholder
  // and performs the drop. Mouse events give the same smooth feel as moving a
  // tile inside the canvas (HTML5 drag-and-drop is noticeably clunkier).
  const handleShiftClick = (tile: TileDefinition) => {
    requestCloseMaximize()
    if (!activeTileIds.includes(tile.id)) addTile(tile.id)
    flashTile(tile.id)
  }

  const press = useRef<{ tile: TileDefinition; startX: number; startY: number; dragging: boolean; shiftKey: boolean } | null>(null)

  const onWindowMove = (e: MouseEvent) => {
    const p = press.current
    if (!p || p.dragging || p.shiftKey) return
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > DRAG_THRESHOLD) {
      p.dragging = true
      setDraggingTileId(p.tile.id) // Dashboard takes over move/up from here
    }
  }

  const onWindowUp = () => {
    window.removeEventListener('mousemove', onWindowMove)
    window.removeEventListener('mouseup', onWindowUp)
    const p = press.current
    press.current = null
    if (p && !p.dragging) {
      p.shiftKey ? handleShiftClick(p.tile) : handleClick(p.tile)
    }
    // If it was a drag, the Dashboard's mouseup handler does the drop + cleanup.
  }

  const onMouseDown = (tile: TileDefinition, e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault() // stop text selection / focus during a drag
    press.current = { tile, startX: e.clientX, startY: e.clientY, dragging: false, shiftKey: e.shiftKey }
    window.addEventListener('mousemove', onWindowMove)
    window.addEventListener('mouseup', onWindowUp)
  }

  const renderTile = (tile: TileDefinition) => {
    const onCanvas = activeTileIds.includes(tile.id)
    return (
      <button
        key={tile.id}
        onMouseDown={(e) => onMouseDown(tile, e)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-white/60 hover:text-white hover:bg-white/5"
        style={{ border: '0.5px solid transparent', cursor: 'grab' }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
        }}
      >
        <span className="text-base w-6 text-center">{tile.icon}</span>
        <span className="text-xs font-medium flex-1">{tile.label}</span>
        {onCanvas && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--accent)' }}
          />
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-col gap-1 p-2"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        {utilityTiles.map(renderTile)}
      </div>
      <div className="flex flex-col gap-1 p-2">
        {moduleTiles.map(renderTile)}
      </div>
    </div>
  )
}
