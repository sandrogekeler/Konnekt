import { useEffect, useCallback } from 'react'
import { ReactGridLayout } from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { useTileStore } from '../stores/useTileStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import { TILE_REGISTRY } from '../tiles/registry'
import { TileWrapper } from '../tiles/TileWrapper'
import { COLS, ROW_HEIGHT } from '../lib/constants'

const SERVER_ID = 'default'

export function Dashboard() {
  const { activeTileIds, loadTiles, removeTile } = useTileStore()
  const { currentLayout, updateLayout, loadPresets } = useLayoutStore()

  useEffect(() => {
    Promise.all([loadTiles(), loadPresets()]).catch(console.error)
  }, [loadTiles, loadPresets])

  const handleLayoutChange = useCallback(
    (layout: Layout) => {
      updateLayout([...layout])
    },
    [updateLayout],
  )

  const tilesOnCanvas = activeTileIds
    .map((id) => TILE_REGISTRY.find((t) => t.id === id))
    .filter((t): t is (typeof TILE_REGISTRY)[number] => t !== undefined)

  const mergedLayout: LayoutItem[] = tilesOnCanvas.map((tile) => {
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
  })

  return (
    <div className="w-full overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <ReactGridLayout
        layout={mergedLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={1400}
        draggableHandle=".drag-handle"
        onLayoutChange={handleLayoutChange}
        margin={[8, 8]}
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
                <TileComponent serverId={SERVER_ID} />
              </TileWrapper>
            </div>
          )
        })}
      </ReactGridLayout>
    </div>
  )
}
