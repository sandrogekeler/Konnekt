import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import type { AppSettings } from '../types'
import { ACCENT_PRESETS } from '../lib/theme'
import { Toggle } from './ui/Toggle'
import { Segmented } from './ui/Segmented'
import { ColorSwatch } from './ui/ColorSwatch'
import { SettingRow } from './ui/SettingRow'
import { OpenDataDir } from '../../wailsjs/go/main/App'

type UpdateFn = (patch: Partial<AppSettings>) => Promise<void>

type Section = 'appearance' | 'general' | 'console' | 'notifications' | 'about'

const NAV: { id: Section; label: string }[] = [
  { id: 'appearance',    label: 'Appearance'    },
  { id: 'general',       label: 'General'       },
  { id: 'console',       label: 'Console'       },
  { id: 'notifications', label: 'Notifications' },
  { id: 'about',         label: 'About'         },
]

const THEME_OPTIONS = [
  { value: 'light' as const,  label: '☀ Light'  },
  { value: 'dark'  as const,  label: '◐ Dark'   },
  { value: 'system' as const, label: '⊙ System' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const { settings, update } = useSettingsStore()
  const [section, setSection] = useState<Section>('appearance')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isPresetColor = ACCENT_PRESETS.some((p) => p.hex.toLowerCase() === settings.accentColor.toLowerCase())

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="flex rounded-xl overflow-hidden"
        style={{
          width: 640,
          height: 480,
          background: 'var(--bg-base)',
          border: '0.5px solid var(--border-subtle)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left nav */}
        <div
          className="flex flex-col gap-0.5 p-3 shrink-0"
          style={{
            width: 160,
            borderRight: '0.5px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="px-2 pt-1 pb-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
              Settings
            </span>
          </div>
          <div className="flex flex-col gap-0.5 mt-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="px-2 py-1.5 rounded-lg text-left text-sm transition-colors"
                style={{
                  color: section === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                  background: section === item.id ? 'rgb(var(--accent-rgb) / 0.1)' : 'transparent',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {NAV.find((n) => n.id === section)?.label}
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-sm transition-colors rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {section === 'appearance' && <AppearancePane settings={settings} update={update} isPresetColor={isPresetColor} />}
            {section === 'general'    && <GeneralPane    settings={settings} update={update} />}
            {section === 'console'    && <ConsolePane    settings={settings} update={update} />}
            {section === 'notifications' && <NotificationsPane settings={settings} update={update} />}
            {section === 'about'      && <AboutPane />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearancePane({ settings, update, isPresetColor }: {
  settings: AppSettings
  update: UpdateFn
  isPresetColor: boolean
}) {
  return (
    <div>
      <SettingRow label="Theme" description="Light, dark, or follow your OS preference.">
        <Segmented
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
        />
      </SettingRow>

      <div className="py-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Accent color</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Highlights, active states, and status indicators.
            </p>
          </div>
          <div
            className="w-6 h-6 rounded-full shrink-0"
            style={{ background: settings.accentColor, outline: '1.5px solid var(--border-hover)', outlineOffset: 2 }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_PRESETS.map((preset) => (
            <ColorSwatch
              key={preset.hex}
              hex={preset.hex}
              label={preset.label}
              selected={settings.accentColor.toLowerCase() === preset.hex.toLowerCase()}
              onClick={() => update({ accentColor: preset.hex })}
            />
          ))}
          {/* Custom color input */}
          <label
            className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 transition-transform hover:scale-110 cursor-pointer"
            style={{
              background: isPresetColor ? 'var(--hover-surface)' : settings.accentColor,
              border: '1.5px dashed var(--border-hover)',
              outline: !isPresetColor ? `2.5px solid ${settings.accentColor}` : '2.5px solid transparent',
              outlineOffset: 2,
            }}
            title="Custom color"
          >
            {isPresetColor && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>+</span>
            )}
            <input
              type="color"
              value={settings.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="absolute opacity-0 w-0 h-0"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralPane({ settings, update }: {
  settings: AppSettings
  update: UpdateFn
}) {
  return (
    <div>
      <SettingRow
        label="Auto-start active server"
        description="Automatically start the selected server when Konnekt launches."
      >
        <Toggle
          checked={settings.autoStartActiveServer}
          onChange={(v) => update({ autoStartActiveServer: v })}
        />
      </SettingRow>
      <SettingRow
        label="Confirm before stopping"
        description="Show a confirmation dialog before stopping a running server."
      >
        <Toggle
          checked={settings.confirmBeforeStop}
          onChange={(v) => update({ confirmBeforeStop: v })}
        />
      </SettingRow>
    </div>
  )
}

// ─── Console ─────────────────────────────────────────────────────────────────

function ConsolePane({ settings, update }: {
  settings: AppSettings
  update: UpdateFn
}) {
  return (
    <div>
      <SettingRow
        label="Show timestamps"
        description="Prefix each log line with the server timestamp."
      >
        <Toggle
          checked={settings.consoleTimestamps}
          onChange={(v) => update({ consoleTimestamps: v })}
        />
      </SettingRow>
      <SettingRow
        label="Buffer size"
        description="Maximum number of log lines kept in memory."
      >
        <input
          type="number"
          min={100}
          max={10000}
          step={100}
          value={settings.consoleBufferLines}
          onChange={(e) => update({ consoleBufferLines: Math.max(100, Number(e.target.value)) })}
          className="w-20 text-xs text-right rounded px-2 py-1 outline-none"
          style={{
            background: 'var(--hover-surface)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      </SettingRow>
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsPane({ settings, update }: {
  settings: AppSettings
  update: UpdateFn
}) {
  return (
    <div>
      <SettingRow
        label="Crash alerts"
        description="Notify when the server stops unexpectedly."
      >
        <Toggle
          checked={settings.notifyOnCrash}
          onChange={(v) => update({ notifyOnCrash: v })}
        />
      </SettingRow>
      <SettingRow
        label="Player join alerts"
        description="Notify when a player joins the server."
      >
        <Toggle
          checked={settings.notifyOnJoin}
          onChange={(v) => update({ notifyOnJoin: v })}
        />
      </SettingRow>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutPane() {
  const openFolder = () => {
    try { OpenDataDir().catch(() => {}) } catch { /* non-Wails context */ }
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Konnekt</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Minecraft Server Manager</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>License</span>
          <span style={{ color: 'var(--text-muted)' }}>MIT</span>
        </div>
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Data directory</span>
          <button
            onClick={openFolder}
            className="font-mono text-[11px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            title="Open config folder"
          >
            ~/.config/konnekt ↗
          </button>
        </div>
      </div>
    </div>
  )
}
