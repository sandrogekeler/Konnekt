import { create } from 'zustand'
import type { ServerConfig } from '../types'
import {
  GetServerConfigs,
  SaveServerConfig,
  DeleteServerConfig,
  GetActiveServerID,
  SetActiveServerID,
} from '../../wailsjs/go/main/App'

interface ServerConfigStore {
  configs: ServerConfig[]
  activeId: string
  loadConfigs: () => Promise<void>
  saveConfig: (cfg: ServerConfig) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setActiveId: (id: string) => Promise<void>
}

export const useServerConfigStore = create<ServerConfigStore>((set, get) => ({
  configs: [],
  activeId: '',

  loadConfigs: async () => {
    let configs: ServerConfig[] = []
    try { configs = await GetServerConfigs() } catch { /* Wails IPC unavailable */ }

    let activeId = ''
    try { activeId = await GetActiveServerID() } catch { /* Wails IPC unavailable */ }

    if (!activeId || !configs.find((c) => c.id === activeId)) {
      activeId = configs[0]?.id ?? ''
    }

    set({ configs, activeId })
  },

  saveConfig: async (cfg: ServerConfig) => {
    try { await SaveServerConfig(cfg) } catch { /* best-effort */ }
    set((s) => {
      const idx = s.configs.findIndex((c) => c.id === cfg.id)
      const configs = idx >= 0
        ? s.configs.map((c, i) => (i === idx ? cfg : c))
        : [...s.configs, cfg]
      const activeId = s.activeId || cfg.id
      return { configs, activeId }
    })
  },

  deleteConfig: async (id: string) => {
    try { await DeleteServerConfig(id) } catch { /* best-effort */ }
    set((s) => {
      const configs = s.configs.filter((c) => c.id !== id)
      const activeId = s.activeId === id ? (configs[0]?.id ?? '') : s.activeId
      return { configs, activeId }
    })
  },

  setActiveId: async (id: string) => {
    try { await SetActiveServerID(id) } catch { /* best-effort */ }
    set({ activeId: id })
  },
}))
