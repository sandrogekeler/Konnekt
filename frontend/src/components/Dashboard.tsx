import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { ReactGridLayout } from 'react-grid-layout/legacy'
import type { LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useTileStore } from '../stores/useTileStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { useServerConfigStore } from '../stores/useServerConfigStore'
import { TILE_REGISTRY } from '../tiles/registry'
import { TileWrapper } from '../tiles/TileWrapper'
import { COLS, ROW_HEIGHT } from '../lib/constants'

// New tiles always land at the left edge, stacked below existing content.
// Sequential new tiles in the same pass stack on top of each other.
function getAppendPosition(occupied: readonly LayoutItem[], h: number): { x: number; y: number } {
  const maxY = occupied
    .filter((l) => isFinite(l.y))
    .reduce((m, l) => Math.max(m, l.y + l.h), 0)
  return { x: 0, y: maxY }
}

export function Dashboard() {
  const { activeTileIds, loadTiles, removeTile } = useTileStore()
  const { currentLayout, updateLayout, loadPresets } = useLayoutStore()
  const { activeId: serverId } = useServerConfigStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  // Local layout — what ReactGridLayout reads directly.
  // Kept separate from Zustand so RGL's internal drag/resize state is never
  // overwritten by a subscriber re-render mid-interaction.
  const [layoutState, setLayoutState] = useState<LayoutItem[]>([])
  const skipNextSyncRef = useRef(false)

  useEffect(() => {
    Promise.all([loadTiles(), loadPresets()]).catch(console.error)
  }, [loadTiles, loadPresets])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setCanvasWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const tilesOnCanvas = useMemo(
    () =>
      activeTileIds
        .map((id) => TILE_REGISTRY.find((t) => t.id === id))
        .filter((t): t is (typeof TILE_REGISTRY)[number] => t !== undefined),
    [activeTileIds],
  )

  const mergedLayout = useMemo(() => {
    const activeIds = new Set(tilesOnCanvas.map((t) => t.id))
    const savedItems = currentLayout.filter((l) => isFinite(l.y) && activeIds.has(l.i))
    const placed: LayoutItem[] = [...savedItems]
    const result: LayoutItem[] = []

    for (const tile of tilesOnCanvas) {
      const saved = savedItems.find((l) => l.i === tile.id)
      if (saved) {
        // Always carry minW/minH so resize constraints survive save/load cycles
        result.push({ ...saved, minW: tile.minW, minH: tile.minH })
      } else {
        // New tile: append at left edge below all existing content
        const { x, y } = getAppendPosition(placed, tile.defaultH)
        const item: LayoutItem = {
          i: tile.id,
          x, y,
          w: tile.defaultW,
          h: tile.defaultH,
          minW: tile.minW,
          minH: tile.minH,
        }
        result.push(item)
        placed.push(item)
      }
    }

    return result
  }, [tilesOnCanvas, currentLayout])

  // Sync local layout from mergedLayout on external changes:
  // app boot, preset switches, tile add/remove.
  // Skipped when the change was caused by our own persistLayout call.
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }
    setLayoutState(mergedLayout)
  }, [mergedLayout])

  // User finished a drag or resize — capture the final positions immediately
  // into local state, then persist to Zustand for save/restore.
  // onLayoutChange is intentionally NOT used: feeding RGL's output back as a
  // controlled prop on every change triggers a normalisation oscillation.
  const persistLayout = useCallback((layout: readonly LayoutItem[]) => {
    skipNextSyncRef.current = true
    setLayoutState([...layout])
    updateLayout(layout)
  }, [updateLayout])

  return (
    <div
      ref={canvasRef}
      className="w-full overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}
    >
      <ReactGridLayout
        layout={layoutState}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={canvasWidth}
        draggableHandle=".drag-handle"
        onDragStop={persistLayout}
        onResizeStop={persistLayout}
        margin={[12, 12]}
        containerPadding={[12, 12]}
        resizeHandles={['se']}
      >
        {tilesOnCanvas.map((tile) => {
          const TileComponent = tile.component
          return (
            <div key={tile.id}>
              <TileWrapper
                id={tile.id}
                label={tile.label}
                icon={tile.icon}
                onRemove={removeTile}
              >
                <TileComponent serverId={serverId} />
              </TileWrapper>
            </div>
          )
        })}
      </ReactGridLayout>
    </div>
  )
}
