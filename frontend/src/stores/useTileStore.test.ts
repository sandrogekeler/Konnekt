import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as App from '../../wailsjs/go/main/App'
import { useTileStore } from './useTileStore'
import { TILE_REGISTRY } from '../tiles/registry'

vi.mock('../../wailsjs/go/main/App')

const ALL_TILE_IDS = TILE_REGISTRY.map((t) => t.id)
const DEFAULT_ACTIVE = ['console', 'stats', 'players', 'quick-commands']

describe('useTileStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTileStore.setState({ activeTileIds: [], crateTileIds: ALL_TILE_IDS })
  })

  describe('loadTiles', () => {
    it('uses the saved active list when present, crate is its complement', async () => {
      vi.mocked(App.GetActiveTiles).mockResolvedValue(['console', 'worlds'])
      await useTileStore.getState().loadTiles()
      const { activeTileIds, crateTileIds } = useTileStore.getState()
      expect(activeTileIds).toEqual(['console', 'worlds'])
      expect(crateTileIds).toEqual(ALL_TILE_IDS.filter((id) => id !== 'console' && id !== 'worlds'))
    })

    it('falls back to the 4 default tiles when the saved list is empty', async () => {
      vi.mocked(App.GetActiveTiles).mockResolvedValue([])
      await useTileStore.getState().loadTiles()
      expect(useTileStore.getState().activeTileIds).toEqual(DEFAULT_ACTIVE)
    })

    it('falls back to the 4 default tiles when GetActiveTiles rejects', async () => {
      vi.mocked(App.GetActiveTiles).mockRejectedValue(new Error('no wails bridge'))
      await useTileStore.getState().loadTiles()
      expect(useTileStore.getState().activeTileIds).toEqual(DEFAULT_ACTIVE)
    })
  })

  describe('addTile', () => {
    it('is a no-op when the tile is already active', async () => {
      useTileStore.setState({
        activeTileIds: ['console'],
        crateTileIds: ALL_TILE_IDS.filter((i) => i !== 'console'),
      })
      await useTileStore.getState().addTile('console')
      expect(App.SaveActiveTiles).not.toHaveBeenCalled()
      expect(useTileStore.getState().activeTileIds).toEqual(['console'])
    })

    it('appends a new tile, persists it, and removes it from the crate', async () => {
      useTileStore.setState({
        activeTileIds: ['console'],
        crateTileIds: ALL_TILE_IDS.filter((i) => i !== 'console'),
      })
      await useTileStore.getState().addTile('worlds')
      const { activeTileIds, crateTileIds } = useTileStore.getState()
      expect(activeTileIds).toEqual(['console', 'worlds'])
      expect(crateTileIds).not.toContain('worlds')
      expect(App.SaveActiveTiles).toHaveBeenCalledWith(['console', 'worlds'])
    })
  })

  describe('removeTile', () => {
    it('moves the tile from active to crate and persists', async () => {
      useTileStore.setState({ activeTileIds: ['console', 'worlds'], crateTileIds: [] })
      await useTileStore.getState().removeTile('console')
      const { activeTileIds, crateTileIds } = useTileStore.getState()
      expect(activeTileIds).toEqual(['worlds'])
      expect(crateTileIds).toEqual(['console'])
      expect(App.SaveActiveTiles).toHaveBeenCalledWith(['worlds'])
    })
  })
})
