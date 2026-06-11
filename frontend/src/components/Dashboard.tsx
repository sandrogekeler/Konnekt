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

function findBestPosition(
  occupied: readonly LayoutItem[],
  w: number,
  h: number,
  cols: number,
): { x: number; y: number } {
  const valid = occupied.filter((l) => isFinite(l.y))
  for (let y = 0; y < 500; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const fits = !valid.some(
        (l) =>
          x     < l.x + l.w &&
          x + w > l.x       &&
          y     < l.y + l.h &&
          y + h > l.y,
      )
      if (fits) return { x, y }
    }
  }
  const maxY = valid.reduce((m, l) => Math.max(m, l.y + l.h), 0)
  return { x: 0, y: maxY }
}

export function Dashboard() {
  const { activeTileIds, loadTiles, removeTile } = useTileStore()
  const { currentLayout, updateLayout, loadPresets } = useLayoutStore()
  const { activeId: serverId } = useServerConfigStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)

  // initialLayout is the positions passed to RGL on (re)mount.
  // layoutKey forces a clean remount when the layout changes externally.
  // RGL manages its own drag/resize state after mount — we never update
  // the layout prop during normal interaction, only on preset switches,
  // tile add/remove, and initial load.
  const [initialLayout, setInitialLayout] = useState<LayoutItem[] | null>(null)
  const [layoutKey, setLayoutKey] = useState(0)
  const skipNextSyncRef = useRef(false) // set by persistLayout to skip the Zustand echo
  const isFirstMountRef = useRef(true)  // avoids an unnecessary remount on first load

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
        result.push({ ...saved, minW: tile.minW, minH: tile.minH })
      } else {
        const { x, y } = findBestPosition(placed, tile.defaultW, tile.defaultH, COLS)
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

  // On external layout changes: update the positions RGL will mount with.
  // First change: just set positions (no remount needed, RGL isn't mounted yet).
  // Subsequent changes: increment key to force a clean remount so RGL
  // initialises drag/resize listeners against the correct positions.
  // Changes triggered by persistLayout are skipped via skipNextSyncRef.
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }
    if (mergedLayout.length === 0) return
    setInitialLayout(mergedLayout)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
    } else {
      setLayoutKey((k) => k + 1)
    }
  }, [mergedLayout])

  // Persist drag/resize results to Zustand. Does NOT update any React state —
  // RGL holds the live positions in its own internal state after mount.
  const persistLayout = useCallback((layout: readonly LayoutItem[]) => {
    skipNextSyncRef.current = true
    updateLayout(layout)
  }, [updateLayout])

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-y-auto"
      style={{ background: 'var(--bg-base)' }}
    >
      {initialLayout !== null && (
        <ReactGridLayout
          key={layoutKey}
          layout={initialLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={canvasWidth}
          compactType={null}
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
      )}
    </div>
  )
}
