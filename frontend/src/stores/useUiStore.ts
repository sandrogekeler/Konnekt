import { create } from 'zustand'

interface UiStore {
  // Fullscreen request raised by the navbar; consumed + cleared by Dashboard.
  maximizeRequest: { id: string; rect: DOMRect | null } | null
  requestMaximize: (id: string, rect: DOMRect | null) => void
  clearMaximizeRequest: () => void
  // Bumped to ask Dashboard to close any open fullscreen (e.g. utility-tile click).
  closeRequest: number
  requestCloseMaximize: () => void
  // Which module is mid-drag, so Dashboard can size the RGL drop placeholder.
  draggingTileId: string | null
  setDraggingTileId: (id: string | null) => void
  // Tile to briefly glow green on the canvas (utility-tile click).
  flashTileId: string | null
  flashTile: (id: string) => void
}

export const useUiStore = create<UiStore>((set) => ({
  maximizeRequest: null,
  requestMaximize: (id, rect) => set({ maximizeRequest: { id, rect } }),
  clearMaximizeRequest: () => set({ maximizeRequest: null }),

  closeRequest: 0,
  requestCloseMaximize: () => set((s) => ({ closeRequest: s.closeRequest + 1 })),

  draggingTileId: null,
  setDraggingTileId: (id) => set({ draggingTileId: id }),

  flashTileId: null,
  flashTile: (id) => {
    set({ flashTileId: id })
    setTimeout(() => {
      set((s) => (s.flashTileId === id ? { flashTileId: null } : s))
    }, 1200)
  },
}))
