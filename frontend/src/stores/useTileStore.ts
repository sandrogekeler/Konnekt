import { create } from 'zustand'
import { GetActiveTiles, SaveActiveTiles } from '../../wailsjs/go/main/App'
import { TILE_REGISTRY } from '../tiles/registry'

interface TileStore {
  activeTileIds: string[]
  crateTileIds: string[]
  loadTiles: () => Promise<void>
  addTile: (id: string) => Promise<void>
  removeTile: (id: string) => Promise<void>
}

const ALL_TILE_IDS = TILE_REGISTRY.map((t) => t.id)

export const useTileStore = create<TileStore>((set, get) => ({
  activeTileIds: [],
  crateTileIds: ALL_TILE_IDS,

  loadTiles: async () => {
    let saved: string[] = []
    try { saved = await GetActiveTiles() } catch { /* Wails IPC unavailable */ }
    const active = saved.length > 0 ? saved : ['console', 'stats', 'players', 'quick-commands']
    const crate = ALL_TILE_IDS.filter((id) => !active.includes(id))
    set({ activeTileIds: active, crateTileIds: crate })
  },

  addTile: async (id: string) => {
    const { activeTileIds, crateTileIds } = get()
    if (activeTileIds.includes(id)) return
    const next = [...activeTileIds, id]
    try { await SaveActiveTiles(next) } catch { /* best-effort */ }
    set({
      activeTileIds: next,
      crateTileIds: crateTileIds.filter((c) => c !== id),
    })
  },

  removeTile: async (id: string) => {
    const { activeTileIds, crateTileIds } = get()
    const next = activeTileIds.filter((a) => a !== id)
    try { await SaveActiveTiles(next) } catch { /* best-effort */ }
    set({
      activeTileIds: next,
      crateTileIds: [...crateTileIds, id],
    })
  },
}))
