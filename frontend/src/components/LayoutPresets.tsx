import { useState } from 'react'
import { useLayoutStore } from '../stores/useLayoutStore'
import { SaveLayoutPreset } from '../../wailsjs/go/main/App'
import { DEFAULT_LAYOUT_PRESETS } from '../lib/constants'

export function LayoutPresets() {
  const { presets, activePresetName, savePreset, loadPreset, loadPresets, deletePreset } = useLayoutStore()
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

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
        className="flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wider transition-colors w-full"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
      >
        <span>Layouts</span>
        <span style={{ display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}>▾</span>
      </button>

      <div style={{ maxHeight: collapsed ? '0px' : '2000px', transition: 'max-height 200ms ease', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ minHeight: 0, minWidth: 0 }} className="flex flex-col gap-2">

      {presets.map((preset) => (
        <div
          key={preset.name}
          className="flex items-center gap-1"
        >
          <button
            onClick={() => loadPreset(preset.name)}
            className="flex-1 text-left px-3 py-1.5 rounded text-xs transition-all"
            style={{
              color: preset.name === activePresetName ? 'var(--accent)' : 'var(--text-secondary)',
              background: preset.name === activePresetName ? 'rgb(var(--accent-rgb) / 0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (preset.name !== activePresetName) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-surface)'
              }
            }}
            onMouseLeave={(e) => {
              if (preset.name !== activePresetName) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }
            }}
          >
            {preset.name}
          </button>
          {preset.name !== 'Default' && (
            <button
              onClick={() => deletePreset(preset.name)}
              className="px-1.5 text-xs transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
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
          className="flex-1 min-w-0 rounded px-2 py-1 text-xs outline-none"
          style={{
            background: 'var(--hover-surface)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)' }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)' }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 px-2 py-1 text-xs rounded transition-colors disabled:opacity-40"
          style={{ border: '0.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
          }}
        >
          Save
        </button>
      </div>

      <button
        onClick={handleReset}
        disabled={resetting}
        className="mt-1 text-xs transition-colors disabled:opacity-40 text-left px-1"
        style={{ color: 'var(--text-faint)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
      >
        {resetting ? 'Resetting…' : '↺ Reset to defaults'}
      </button>

      </div>
      </div>
    </div>
  )
}
