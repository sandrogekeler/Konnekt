import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as App from '../../wailsjs/go/main/App'
import { useServerConfigStore } from './useServerConfigStore'
import type { ServerConfig } from '../types'

vi.mock('../../wailsjs/go/main/App')

function cfg(id: string, name = id): ServerConfig {
  return { id, name, jarPath: '', jvmArgs: [], workingDir: '', mcVersion: '1.21', loader: 'paper' }
}

describe('useServerConfigStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useServerConfigStore.setState({ configs: [], activeId: '' })
  })

  describe('loadConfigs', () => {
    it('keeps a valid activeId', async () => {
      vi.mocked(App.GetServerConfigs).mockResolvedValue([cfg('a'), cfg('b')])
      vi.mocked(App.GetActiveServerID).mockResolvedValue('b')
      await useServerConfigStore.getState().loadConfigs()
      expect(useServerConfigStore.getState().activeId).toBe('b')
    })

    it('falls back to the first config id when activeId is missing', async () => {
      vi.mocked(App.GetServerConfigs).mockResolvedValue([cfg('a'), cfg('b')])
      vi.mocked(App.GetActiveServerID).mockResolvedValue('')
      await useServerConfigStore.getState().loadConfigs()
      expect(useServerConfigStore.getState().activeId).toBe('a')
    })

    it('falls back to the first config id when the saved activeId no longer exists', async () => {
      vi.mocked(App.GetServerConfigs).mockResolvedValue([cfg('a'), cfg('b')])
      vi.mocked(App.GetActiveServerID).mockResolvedValue('stale-id')
      await useServerConfigStore.getState().loadConfigs()
      expect(useServerConfigStore.getState().activeId).toBe('a')
    })

    it('results in an empty activeId when there are no configs', async () => {
      vi.mocked(App.GetServerConfigs).mockResolvedValue([])
      vi.mocked(App.GetActiveServerID).mockResolvedValue('')
      await useServerConfigStore.getState().loadConfigs()
      expect(useServerConfigStore.getState().activeId).toBe('')
    })

    it('degrades to empty state when both IPC calls reject', async () => {
      vi.mocked(App.GetServerConfigs).mockRejectedValue(new Error('no bridge'))
      vi.mocked(App.GetActiveServerID).mockRejectedValue(new Error('no bridge'))
      await useServerConfigStore.getState().loadConfigs()
      expect(useServerConfigStore.getState().configs).toEqual([])
      expect(useServerConfigStore.getState().activeId).toBe('')
    })
  })

  describe('saveConfig', () => {
    it('inserts a new config and persists it', async () => {
      await useServerConfigStore.getState().saveConfig(cfg('a'))
      expect(useServerConfigStore.getState().configs).toEqual([cfg('a')])
      expect(App.SaveServerConfig).toHaveBeenCalledWith(cfg('a'))
    })

    it('updates an existing config in place by id', async () => {
      useServerConfigStore.setState({ configs: [cfg('a', 'Old Name')], activeId: 'a' })
      await useServerConfigStore.getState().saveConfig(cfg('a', 'New Name'))
      expect(useServerConfigStore.getState().configs).toEqual([cfg('a', 'New Name')])
    })

    it('sets activeId to the new config id when previously empty', async () => {
      await useServerConfigStore.getState().saveConfig(cfg('a'))
      expect(useServerConfigStore.getState().activeId).toBe('a')
    })

    it('leaves activeId untouched when one is already set', async () => {
      useServerConfigStore.setState({ configs: [cfg('a')], activeId: 'a' })
      await useServerConfigStore.getState().saveConfig(cfg('b'))
      expect(useServerConfigStore.getState().activeId).toBe('a')
    })
  })

  describe('deleteConfig', () => {
    it('removes the config by id and persists the deletion', async () => {
      useServerConfigStore.setState({ configs: [cfg('a'), cfg('b')], activeId: 'b' })
      await useServerConfigStore.getState().deleteConfig('a')
      expect(useServerConfigStore.getState().configs).toEqual([cfg('b')])
      expect(App.DeleteServerConfig).toHaveBeenCalledWith('a')
      expect(useServerConfigStore.getState().activeId).toBe('b')
    })

    it('reassigns activeId to the first remaining config when the active one is deleted', async () => {
      useServerConfigStore.setState({ configs: [cfg('a'), cfg('b')], activeId: 'a' })
      await useServerConfigStore.getState().deleteConfig('a')
      expect(useServerConfigStore.getState().activeId).toBe('b')
    })

    it('reassigns activeId to empty when the last config is deleted', async () => {
      useServerConfigStore.setState({ configs: [cfg('a')], activeId: 'a' })
      await useServerConfigStore.getState().deleteConfig('a')
      expect(useServerConfigStore.getState().activeId).toBe('')
    })
  })

  describe('setActiveId', () => {
    it('sets state and persists the new active id', async () => {
      await useServerConfigStore.getState().setActiveId('c')
      expect(useServerConfigStore.getState().activeId).toBe('c')
      expect(App.SetActiveServerID).toHaveBeenCalledWith('c')
    })
  })
})
