import { useEffect, useMemo, useCallback, useRef, useState, Fragment, useLayoutEffect } from 'react'
import { ReactGridLayout } from 'react-grid-layout/legacy'
import type { LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useTileStore } from '../stores/useTileStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { useServerConfigStore } from '../stores/useServerConfigStore'
import { useUiStore } from '../stores/useUiStore'
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

// Resolve a desired drop cell to the nearest free cell so a dropped tile never
// lands on top of an existing one. RGL seeds the dropping item without a
// collision check, so we guard the final placement here.
function resolveDropCell(
  occupied: readonly LayoutItem[],
  desiredX: number, desiredY: number,
  w: number, h: number, cols: number,
): { x: number; y: number } {
  const valid = occupied.filter((l) => isFinite(l.y))
  const fits = (x: number, y: number) =>
    x >= 0 && x <= cols - w && y >= 0 &&
    !valid.some((l) => x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y)
  if (fits(desiredX, desiredY)) return { x: desiredX, y: desiredY }
  for (let r = 1; r < 100; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (fits(desiredX + dx, desiredY + dy)) return { x: desiredX + dx, y: desiredY + dy }
      }
    }
  }
  return findBestPosition(valid, w, h, cols)
}

const ANIM_MS = 120
const MARGIN = 12
const CONTAINER_PADDING = 12

// Flip animation transform relative to the canvas container, not the viewport.
function flipTransform(rect: DOMRect, containerRect: DOMRect, padding: number) {
  const fullW = containerRect.width - padding * 2
  const fullH = containerRect.height - padding * 2
  const sx = rect.width / fullW
  const sy = rect.height / fullH
  const tx = (rect.left + rect.width / 2) - (containerRect.left + containerRect.width / 2)
  const ty = (rect.top + rect.height / 2) - (containerRect.top + containerRect.height / 2)
  return `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`
}

export function Dashboard() {
  const { activeTileIds, loadTiles, removeTile } = useTileStore()
  const { currentLayout, updateLayout, loadPresets } = useLayoutStore()
  const { activeId: serverId } = useServerConfigStore()
  const {
    maximizeRequest, clearMaximizeRequest,
    closeRequest, draggingTileId, flashTileId,
  } = useUiStore()

  // containerRef: the positioned root used to anchor the absolute overlay
  const containerRef = useRef<HTMLDivElement>(null)
  // canvasRef: the scrollable grid area — sized by ResizeObserver for RGL width
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [maximizedId, setMaximizedId] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const originRectRef = useRef<DOMRect | null>(null)
  const prevCloseReqRef = useRef(closeRequest)
  // Live pointer position (viewport coords) while dragging a tile from the navbar.
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null)

  // colWidth mirrors RGL's calcGridColWidth exactly
  const colWidth = useMemo(
    () => (canvasWidth - MARGIN * (COLS - 1) - CONTAINER_PADDING * 2) / COLS,
    [canvasWidth],
  )

  const openMaximize = useCallback((id: string, originRect?: DOMRect | null) => {
    if (originRect !== undefined) {
      originRectRef.current = originRect
    } else {
      const el = document.querySelector(`[data-tile-id="${id}"]`)
      originRectRef.current = el ? el.getBoundingClientRect() : null
    }
    setClosing(false)
    setMaximizedId(id)
  }, [])

  const closeMaximize = useCallback(() => {
    setClosing(true)
  }, [])

  const toggleMaximize = useCallback((id: string) => {
    if (maximizedId) closeMaximize()
    else openMaximize(id)
  }, [maximizedId, openMaximize, closeMaximize])

  // Consume maximize requests raised by the navbar
  useEffect(() => {
    if (!maximizeRequest) return
    openMaximize(maximizeRequest.id, maximizeRequest.rect)
    clearMaximizeRequest()
  }, [maximizeRequest, openMaximize, clearMaximizeRequest])

  // Consume close requests raised by the navbar (utility-tile click)
  useEffect(() => {
    if (closeRequest === prevCloseReqRef.current) return
    prevCloseReqRef.current = closeRequest
    closeMaximize()
  }, [closeRequest, closeMaximize])

  // Unmount overlay after close animation finishes
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(() => {
      setMaximizedId(null)
      setClosing(false)
      originRectRef.current = null
    }, ANIM_MS + 20)
    return () => clearTimeout(timer)
  }, [closing])

  // Expand animation — runs synchronously after the overlay mounts
  useLayoutEffect(() => {
    if (!maximizedId) return
    const rect = originRectRef.current
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    const padding = 24 // p-6

    if (backdropRef.current) {
      const el = backdropRef.current
      el.style.transition = 'none'
      el.style.backgroundColor = 'rgba(0,0,0,0)'
      void el.offsetHeight
      el.style.transition = `background-color ${ANIM_MS}ms ease`
      el.style.backgroundColor = 'rgba(0,0,0,0.6)'
    }

    if (panelRef.current && rect) {
      const panel = panelRef.current
      panel.style.transition = 'none'
      panel.style.transformOrigin = 'center'
      panel.style.transform = flipTransform(rect, containerRect, padding)
      void panel.offsetHeight
      panel.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      panel.style.transform = 'translate(0px, 0px) scale(1, 1)'
    }
  }, [maximizedId]) // intentionally excludes `closing` — only fires on open

  // Collapse animation — runs when closing becomes true
  useLayoutEffect(() => {
    if (!closing) return
    const rect = originRectRef.current
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    const padding = 24

    if (backdropRef.current) {
      backdropRef.current.style.transition = `background-color ${ANIM_MS}ms ease`
      backdropRef.current.style.backgroundColor = 'rgba(0,0,0,0)'
    }

    if (panelRef.current && rect) {
      const panel = panelRef.current
      panel.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.2, 0, 0, 1)`
      panel.style.transform = flipTransform(rect, containerRect, padding)
    }
  }, [closing])

  useEffect(() => {
    Promise.all([loadTiles(), loadPresets()]).catch(console.error)
  }, [loadTiles, loadPresets])

  useEffect(() => {
    if (!maximizedId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMaximize() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [maximizedId, closeMaximize])

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

  // Free placement: persist exactly where the user drops/drags/resizes tiles.
  const persistLayout = useCallback(
    (layout: readonly LayoutItem[]) => {
      const stripped = layout.map(({ minW: _mw, minH: _mh, ...rest }) => rest as LayoutItem)
      updateLayout(stripped)
    },
    [updateLayout],
  )

  // Tile being dragged from the navbar, if it isn't already on canvas
  const draggingTile = draggingTileId
    ? TILE_REGISTRY.find((t) => t.id === draggingTileId)
    : undefined

  const colStep = colWidth + MARGIN
  const rowStep = ROW_HEIGHT + MARGIN

  // --- Mouse-driven drag-to-add (navbar → canvas) ----------------------------
  // Geometry the window listeners need, kept in a ref so the once-mounted
  // listeners always read current values without re-subscribing.
  const geomRef = useRef({ colWidth, mergedLayout })
  geomRef.current = { colWidth, mergedLayout }

  // Map a viewport point to the grid cell the tile would land on (its top-left),
  // collision-resolved so it never lands on an existing tile. Returns null when
  // the pointer is outside the canvas.
  const pointerToCell = useCallback((clientX: number, clientY: number, tile: { defaultW: number; defaultH: number }) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null
    const { colWidth: cw, mergedLayout: ml } = geomRef.current
    const cStep = cw + MARGIN
    const rStep = ROW_HEIGHT + MARGIN
    const itemPxW = cStep * tile.defaultW - MARGIN
    const itemPxH = rStep * tile.defaultH - MARGIN
    // Cursor in scroll-content space, tile centered on it
    const curX = clientX - rect.left
    const curY = clientY - rect.top + canvas.scrollTop
    const pxX = Math.max(0, curX - itemPxW / 2)
    const pxY = Math.max(0, curY - itemPxH / 2)
    const gx = Math.max(0, Math.min(Math.round((pxX - CONTAINER_PADDING) / cStep), COLS - tile.defaultW))
    const gy = Math.max(0, Math.round((pxY - CONTAINER_PADDING) / rStep))
    return resolveDropCell(ml, gx, gy, tile.defaultW, tile.defaultH, COLS)
  }, [])

  // Mounted once: track the pointer while dragging and perform the drop on
  // release. Reads live state via getState() to stay closure-stable.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!useUiStore.getState().draggingTileId) return
      setDragPointer({ x: e.clientX, y: e.clientY })
    }
    const onUp = (e: MouseEvent) => {
      const id = useUiStore.getState().draggingTileId
      setDragPointer(null)
      if (!id) return
      useUiStore.getState().setDraggingTileId(null)
      if (useTileStore.getState().activeTileIds.includes(id)) return
      const tile = TILE_REGISTRY.find((t) => t.id === id)
      if (!tile) return
      const cell = pointerToCell(e.clientX, e.clientY, tile)
      if (!cell) return // released outside the canvas → cancel
      const cl = useLayoutStore.getState().currentLayout
      const persisted: LayoutItem = { i: id, x: cell.x, y: cell.y, w: tile.defaultW, h: tile.defaultH }
      useLayoutStore.getState().updateLayout([...cl.filter((l) => l.i !== id), persisted])
      useTileStore.getState().addTile(id)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [pointerToCell])

  // Drop target cell + on-screen rectangles for the placeholder and wireframe.
  const dropCell = dragPointer && draggingTile ? pointerToCell(dragPointer.x, dragPointer.y, draggingTile) : null
  const dragVisual = dragPointer && draggingTile ? (() => {
    const itemPxW = colStep * draggingTile.defaultW - MARGIN
    const itemPxH = rowStep * draggingTile.defaultH - MARGIN
    // Wireframe: free-floating, centered on the cursor (viewport-fixed coords)
    const wireframe = {
      left: dragPointer.x - itemPxW / 2,
      top: dragPointer.y - itemPxH / 2,
      width: itemPxW,
      height: itemPxH,
    }
    // Placeholder: snapped to the grid cell, inside the scrollable canvas
    const placeholder = dropCell ? (() => {
      const scrollTop = canvasRef.current?.scrollTop ?? 0
      return {
        left: colStep * dropCell.x + CONTAINER_PADDING,
        top: rowStep * dropCell.y + CONTAINER_PADDING - scrollTop,
        width: itemPxW,
        height: itemPxH,
      }
    })() : null
    return { wireframe, placeholder }
  })() : null

  return (
    // containerRef is the positioned root for the absolute overlay — it covers
    // only the canvas area, so the navbar stays visible during fullscreen.
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <div
        ref={canvasRef}
        className="w-full h-full overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-base)',
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: `${colStep}px ${rowStep}px`,
          backgroundPosition: `${CONTAINER_PADDING}px ${CONTAINER_PADDING}px`,
          backgroundAttachment: 'local',
        }}
      >
        <ReactGridLayout
          layout={mergedLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={canvasWidth}
          compactType={null}
          preventCollision
          draggableHandle=".drag-handle"
          onDragStop={persistLayout}
          onResizeStop={persistLayout}
          margin={[MARGIN, MARGIN]}
          containerPadding={[CONTAINER_PADDING, CONTAINER_PADDING]}
          resizeHandles={['se']}
        >
          {tilesOnCanvas.map((tile) => {
            const TileComponent = tile.component
            return (
              <div key={tile.id} data-tile-id={tile.id}>
                <TileWrapper
                  id={tile.id}
                  label={tile.label}
                  icon={tile.icon}
                  onRemove={removeTile}
                  maximizable={tile.maximizable}
                  onToggleMaximize={toggleMaximize}
                  flash={flashTileId === tile.id}
                >
                  <TileComponent serverId={serverId} />
                </TileWrapper>
              </div>
            )
          })}
        </ReactGridLayout>
      </div>

      {/* Grid placeholder — snapped, collision-free slot the tile will land in.
          Absolute inside containerRef (subtracts scrollTop for the visible spot). */}
      {dragVisual?.placeholder && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid var(--border-subtle)',
            ...dragVisual.placeholder,
          }}
        />
      )}

      {/* Wireframe — follows the cursor freely, like the tile being moved. */}
      {dragVisual && (
        <div
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 60,
            borderRadius: 10,
            border: '2px solid var(--accent)',
            background: 'rgba(74, 222, 128, 0.06)',
            ...dragVisual.wireframe,
          }}
        />
      )}

      {maximizedId && (() => {
        const tile = TILE_REGISTRY.find((t) => t.id === maximizedId)
        if (!tile) return null
        const TileComponent = tile.component
        return (
          <Fragment>
            {/* Backdrop — animated separately from panel so only the bg fades */}
            <div
              ref={backdropRef}
              className="absolute inset-0 z-50"
              onClick={!closing ? closeMaximize : undefined}
            />
            {/* Panel — pointer-events-none on container so backdrop receives clicks */}
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div
                ref={panelRef}
                className="w-full h-full pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <TileWrapper
                  id={tile.id}
                  label={tile.label}
                  icon={tile.icon}
                  onRemove={removeTile}
                  maximizable
                  maximized
                  onToggleMaximize={toggleMaximize}
                >
                  <TileComponent serverId={serverId} />
                </TileWrapper>
              </div>
            </div>
          </Fragment>
        )
      })()}
    </div>
  )
}
