import { useState } from 'react'
import { useLayoutStore } from '../stores/useLayoutStore'

export function LayoutPresets() {
  const { presets, activePresetName, savePreset, loadPreset, deletePreset } = useLayoutStore()
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const name = newName.trim() || activePresetName
    if (!name) return
    setSaving(true)
    await savePreset(name)
    setNewName('')
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="text-xs text-white/40 px-1 font-medium uppercase tracking-wider">Layouts</div>

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
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}
