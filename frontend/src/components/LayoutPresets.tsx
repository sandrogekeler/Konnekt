import { useState } from 'react'
import { useLayoutStore } from '../stores/useLayoutStore'
import { SaveLayoutPreset } from '../../wailsjs/go/main/App'
import { DEFAULT_LAYOUT_PRESETS } from '../lib/constants'

export function LayoutPresets() {
  const { presets, activePresetName, savePreset, loadPreset, loadPresets, deletePreset } = useLayoutStore()
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      for (const p of DEFAULT_LAYOUT_PRESETS) {
        await SaveLayoutPreset(p.name, p.layout).catch(() => {})
      }
      await loadPresets()
      loadPreset('Default')
    } finally {
      setResetting(false)
    }
  }

  const handleSave = async () => {
    const name = newName.trim() || activePresetName
    if (!name) return
    setSaving(true)
    await savePreset(name)
    setNewName('')
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2 p-2 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between px-1 text-xs text-white/40 font-medium uppercase tracking-wider hover:text-white/60 transition-colors w-full"
      >
        <span>Layouts</span>
        <span style={{ display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>▾</span>
      </button>

      <div style={{ display: 'grid', gridTemplateRows: collapsed ? '0fr' : '1fr', transition: 'grid-template-rows 200ms ease', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ minHeight: 0, minWidth: 0 }} className="flex flex-col gap-2">

      {presets.map((preset) => (
        <div
          key={preset.name}
          className="flex items-center gap-1"
        >
          <button
            onClick={() => loadPreset(preset.name)}
            className={`flex-1 text-left px-3 py-1.5 rounded text-xs transition-all ${
              preset.name === activePresetName
                ? 'text-green-400 bg-green-400/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {preset.name}
          </button>
          {preset.name !== 'Default' && (
            <button
              onClick={() => deletePreset(preset.name)}
              className="px-1.5 text-xs text-white/20 hover:text-red-400 transition-colors"
              title="Delete preset"
            >
              ×
            </button>
          )}
        </div>
      ))}

      <div className="flex gap-1 mt-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder={activePresetName || 'Preset name...'}
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="mt-1 text-xs text-white/20 hover:text-white/40 transition-colors disabled:opacity-40 text-left px-1"
      >
        {resetting ? 'Resetting…' : '↺ Reset to defaults'}
      </button>

      </div>
      </div>
    </div>
  )
}
