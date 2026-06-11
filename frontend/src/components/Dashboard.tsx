import { useEffect, useMemo, useCallback } from 'react'
import { ReactGridLayout } from 'react-grid-layout/legacy'
import type { LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useTileStore } from '../stores/useTileStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { useServerConfigStore } from '../stores/useServerConfigStore'
import { TILE_REGISTRY } from '../tiles/registry'
import { TileWrapper } from '../tiles/TileWrapper'
import { COLS, ROW_HEIGHT } from '../lib/constants'

export function Dashboard() {
  const { activeTileIds, loadTiles, removeTile } = useTileStore()
  const { currentLayout, updateLayout, loadPresets } = useLayoutStore()
  const { activeId: serverId } = useServerConfigStore()

  useEffect(() => {
    Promise.all([loadTiles(), loadPresets()]).catch(console.error)
  }, [loadTiles, loadPresets])

  const tilesOnCanvas = useMemo(
    () =>
      activeTileIds
        .map((id) => TILE_REGISTRY.find((t) => t.id === id))
        .filter((t): t is (typeof TILE_REGISTRY)[number] => t !== undefined),
    [activeTileIds],
  )

  const mergedLayout = useMemo(
    () =>
      tilesOnCanvas.map((tile) => {
        const saved = currentLayout.find((l) => l.i === tile.id)
        return saved ?? {
          i: tile.id,
          x: 0,
          y: Infinity,
          w: tile.defaultW,
          h: tile.defaultH,
          minW: tile.minW,
          minH: tile.minH,
        }
      }),
    [tilesOnCanvas, currentLayout],
  )

  const persistLayout = useCallback(
    (layout: readonly LayoutItem[]) => updateLayout(layout),
    [updateLayout],
  )

  return (
    <div className="w-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <ReactGridLayout
        layout={mergedLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={1400}
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
