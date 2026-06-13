import { create } from 'zustand'
import type { AppSettings } from '../types'
import { applyTheme } from '../lib/theme'
import { GetAppSettings, SaveAppSettings } from '../../wailsjs/go/main/App'

const DEFAULTS: AppSettings = {
  theme: 'dark',
  accentColor: '#4ade80',
  autoStartActiveServer: false,
  confirmBeforeStop: false,
  consoleBufferLines: 1000,
  consoleTimestamps: false,
  notifyOnCrash: false,
  notifyOnJoin: false,
}

interface SettingsStore {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULTS,
  loaded: false,

  load: async () => {
    let settings = { ...DEFAULTS }
    try {
      const s = await GetAppSettings()
      const theme = (['light', 'dark', 'system'] as const).includes(s.theme as AppSettings['theme'])
        ? (s.theme as AppSettings['theme'])
        : DEFAULTS.theme
      settings = { ...DEFAULTS, ...s, theme }
    } catch { /* non-Wails context */ }
    applyTheme(settings.theme, settings.accentColor)
    set({ settings, loaded: true })
  },

  update: async (patch) => {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    applyTheme(next.theme, next.accentColor)
    try { await SaveAppSettings(next as any) } catch { /* best-effort */ }
  },
}))
