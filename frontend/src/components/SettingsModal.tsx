import { useEffect, useRef, useState } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import type { AppSettings } from '../types'
import {
  ACCENT_PRESETS,
  SUCCESS_PRESETS,
  WARNING_PRESETS,
  DANGER_PRESETS,
  BUILTIN_SKINS,
} from '../lib/theme'
import type { SkinDefinition } from '../lib/theme'
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
  { value: 'light'  as const, label: '☀ Light'  },
  { value: 'dark'   as const, label: '◐ Dark'   },
  { value: 'system' as const, label: '⊙ System' },
]

const BG_STYLE_OPTIONS = [
  { value: 'solid'    as const, label: 'Solid'    },
  { value: 'gradient' as const, label: 'Gradient' },
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
            {section === 'appearance'    && <AppearancePane    settings={settings} update={update} />}
            {section === 'general'       && <GeneralPane       settings={settings} update={update} />}
            {section === 'console'       && <ConsolePane       settings={settings} update={update} />}
            {section === 'notifications' && <NotificationsPane settings={settings} update={update} />}
            {section === 'about'         && <AboutPane />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared local components ──────────────────────────────────────────────────

function ColorField({ value, onChange, presets }: {
  value: string
  onChange: (hex: string) => void
  presets: { label: string; hex: string }[]
}) {
  const isPreset = presets.some((p) => p.hex.toLowerCase() === value.toLowerCase())
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((preset) => (
        <ColorSwatch
          key={preset.hex}
          hex={preset.hex}
          label={preset.label}
          selected={value.toLowerCase() === preset.hex.toLowerCase()}
          onClick={() => onChange(preset.hex)}
        />
      ))}
      <label
        className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 transition-transform hover:scale-110 cursor-pointer"
        style={{
          background: isPreset ? 'var(--hover-surface)' : value,
          border: '1.5px dashed var(--border-hover)',
          outline: !isPreset ? `2.5px solid ${value}` : '2.5px solid transparent',
          outlineOffset: 2,
        }}
        title="Custom color"
      >
        {isPreset && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>+</span>
        )}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute opacity-0 w-0 h-0"
        />
      </label>
    </div>
  )
}

function SkinCard({ skin, selected, onClick }: { skin: SkinDefinition; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1.5 p-2 rounded-lg shrink-0 transition-colors"
      style={{
        width: 84,
        border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
        background: selected ? 'rgb(var(--accent-rgb) / 0.08)' : 'var(--hover-surface)',
      }}
    >
      <div className="flex gap-0.5 rounded-sm overflow-hidden" style={{ height: 18 }}>
        {skin.previewColors.map((color, i) => (
          <div key={i} className="flex-1" style={{ background: color }} />
        ))}
      </div>
      <span
        className="text-[11px] text-left leading-tight"
        style={{ color: selected ? 'var(--accent)' : 'var(--text-secondary)' }}
      >
        {skin.name}
      </span>
    </button>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearancePane({ settings, update }: {
  settings: AppSettings
  update: UpdateFn
}) {
  return (
    <div>
      {/* Skin gallery */}
      <div className="py-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Skin</span>
        <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-muted)' }}>
          Built-in surface and border palette.
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {BUILTIN_SKINS.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              selected={settings.skinId === skin.id}
              onClick={() => update({ skinId: skin.id })}
            />
          ))}
        </div>
      </div>

      {/* Mode */}
      <SettingRow label="Mode" description="Light, dark, or follow your OS preference.">
        <Segmented options={THEME_OPTIONS} value={settings.theme} onChange={(theme) => update({ theme })} />
      </SettingRow>

      {/* Accent color */}
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
        <ColorField
          value={settings.accentColor}
          onChange={(accentColor) => update({ accentColor })}
          presets={ACCENT_PRESETS}
        />
      </div>

      {/* Status colors */}
      <div className="py-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Status colors</span>
        <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-muted)' }}>
          Used for success, warnings, and errors across the app.
        </p>
        <div className="flex flex-col gap-3">
          {(
            [
              { label: 'Success', key: 'successColor' as const, presets: SUCCESS_PRESETS },
              { label: 'Warning', key: 'warningColor' as const, presets: WARNING_PRESETS },
              { label: 'Danger',  key: 'dangerColor'  as const, presets: DANGER_PRESETS  },
            ] as const
          ).map(({ label, key, presets }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-xs shrink-0 w-14" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <ColorField
                value={settings[key]}
                onChange={(hex) => update({ [key]: hex } as Partial<AppSettings>)}
                presets={presets}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Background style */}
      <SettingRow label="Background" description="Subtle accent glow behind the interface.">
        <Segmented
          options={BG_STYLE_OPTIONS}
          value={settings.backgroundStyle}
          onChange={(backgroundStyle) => update({ backgroundStyle })}
        />
      </SettingRow>

      {/* Import stub */}
      <div className="py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-faint)' }}>Import custom skin…</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--hover-surface)',
              color: 'var(--text-faint)',
              border: '0.5px solid var(--border-subtle)',
            }}
          >
            Coming soon
          </span>
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
        label="Player join/leave alerts"
        description="Notify when a player joins or leaves the server."
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
