import { useTileStore } from '../stores/useTileStore'
import { TILE_REGISTRY } from '../tiles/registry'

export function TileCrate() {
  const { crateTileIds, addTile } = useTileStore()

  const crateTiles = crateTileIds
    .map((id) => TILE_REGISTRY.find((t) => t.id === id))
    .filter(Boolean) as typeof TILE_REGISTRY

  if (crateTiles.length === 0) {
    return (
      <div className="p-3 text-xs text-white/25 text-center">All tiles on canvas</div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {crateTiles.map((tile) => (
        <button
          key={tile.id}
          onClick={() => addTile(tile.id)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-white/60 hover:text-white hover:bg-white/5"
          style={{ border: '0.5px solid transparent' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
          }}
        >
          <span className="text-base w-6 text-center">{tile.icon}</span>
          <span className="text-xs font-medium">{tile.label}</span>
        </button>
      ))}
    </div>
  )
}
