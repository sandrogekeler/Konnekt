import { create } from 'zustand'
import type { LayoutItem } from 'react-grid-layout'
import type { LayoutPreset } from '../types'
import { DEFAULT_LAYOUT_PRESETS } from '../lib/constants'
import {
  GetLayoutPresets,
  SaveLayoutPreset,
  DeleteLayoutPreset,
} from '../../wailsjs/go/main/App'

interface LayoutStore {
  presets: LayoutPreset[]
  activePresetName: string
  currentLayout: LayoutItem[]
  loadPresets: () => Promise<void>
  savePreset: (name: string) => Promise<void>
  loadPreset: (name: string) => void
  deletePreset: (name: string) => Promise<void>
  updateLayout: (layout: LayoutItem[]) => void
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  presets: [],
  activePresetName: 'Default',
  currentLayout: [],

  loadPresets: async () => {
    const remote = await GetLayoutPresets()
    let presets: LayoutPreset[] = remote ?? []

    if (presets.length === 0) {
      for (const p of DEFAULT_LAYOUT_PRESETS) {
        await SaveLayoutPreset(p.name, p.layout)
      }
      presets = DEFAULT_LAYOUT_PRESETS
    }

    const active = presets[0]
    const layout: LayoutItem[] = active ? JSON.parse(active.layout) : []
    set({ presets, activePresetName: active?.name ?? 'Default', currentLayout: layout })
  },

  savePreset: async (name: string) => {
    const { currentLayout } = get()
    const layoutStr = JSON.stringify(currentLayout)
    await SaveLayoutPreset(name, layoutStr)
    const updated: LayoutPreset = { name, layout: layoutStr }
    set((s) => {
      const idx = s.presets.findIndex((p) => p.name === name)
      const presets =
        idx >= 0
          ? s.presets.map((p, i) => (i === idx ? updated : p))
          : [...s.presets, updated]
      return { presets, activePresetName: name }
    })
  },

  loadPreset: (name: string) => {
    const { presets } = get()
    const preset = presets.find((p) => p.name === name)
    if (!preset) return
    const layout: LayoutItem[] = JSON.parse(preset.layout)
    set({ activePresetName: name, currentLayout: layout })
  },

  deletePreset: async (name: string) => {
    await DeleteLayoutPreset(name)
    set((s) => ({
      presets: s.presets.filter((p) => p.name !== name),
      activePresetName:
        s.activePresetName === name ? (s.presets[0]?.name ?? '') : s.activePresetName,
    }))
  },

  updateLayout: (layout: LayoutItem[]) => set({ currentLayout: layout }),
}))
