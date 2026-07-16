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
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'
import { CHANGELOG, CHANGELOG_URL } from '../lib/changelog'
import type { ChangelogEntry } from '../lib/changelog'

type UpdateFn = (patch: Partial<AppSettings>) => Promise<void>

type Section = 'appearance' | 'general' | 'console' | 'notifications' | 'changelog' | 'about'

const NAV: { id: Section; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'general', label: 'General' },
  { id: 'console', label: 'Console' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'changelog', label: "What's New" },
  { id: 'about', label: 'About' },
]

const THEME_OPTIONS = [
  { value: 'light' as const, label: '☀ Light' },
  { value: 'dark' as const, label: '◐ Dark' },
  { value: 'system' as const, label: '⊙ System' },
]

const BG_STYLE_OPTIONS = [
  { value: 'solid' as const, label: 'Solid' },
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="modal-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="modal-panel-in bg-canvas border-border-subtle flex h-[480px] w-[640px] overflow-hidden rounded-xl border-[0.5px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        {/* Left nav */}
        <div className="bg-surface border-border-subtle flex w-40 shrink-0 flex-col gap-0.5 border-r-[0.5px] p-3">
          <div className="border-border-subtle border-b-[0.5px] px-2 pt-1 pb-3">
            <span className="font-title text-text-muted text-xs font-semibold tracking-wider uppercase">
              Settings
            </span>
          </div>
          <div className="mt-2 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  section === item.id
                    ? 'text-accent bg-accent/10'
                    : 'text-text-secondary bg-transparent'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="border-border-subtle flex shrink-0 items-center justify-between border-b-[0.5px] px-5 py-3">
            <span className="text-text-primary text-sm font-semibold">
              {NAV.find((n) => n.id === section)?.label}
            </span>
            <button
              onClick={onClose}
              className="text-text-muted flex h-6 w-6 items-center justify-center rounded text-sm transition-colors"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {section === 'appearance' && <AppearancePane settings={settings} update={update} />}
            {section === 'general' && <GeneralPane settings={settings} update={update} />}
            {section === 'console' && <ConsolePane settings={settings} update={update} />}
            {section === 'notifications' && (
              <NotificationsPane settings={settings} update={update} />
            )}
            {section === 'changelog' && <ChangelogPane />}
            {section === 'about' && <AboutPane />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared local components ──────────────────────────────────────────────────

function ColorField({
  value,
  onChange,
  presets,
}: {
  value: string
  onChange: (hex: string) => void
  presets: { label: string; hex: string }[]
}) {
  const isPreset = presets.some((p) => p.hex.toLowerCase() === value.toLowerCase())
  return (
    <div className="flex flex-wrap items-center gap-2">
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
        className="border-border-hover relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-full border-[1.5px] border-dashed transition-transform hover:scale-110"
        // eslint-disable-next-line no-restricted-syntax -- value is an arbitrary runtime hex color, not a static token
        style={{
          background: isPreset ? 'var(--hover-surface)' : value,
          outline: !isPreset ? `2.5px solid ${value}` : '2.5px solid transparent',
          outlineOffset: 2,
        }}
        title="Custom color"
      >
        {isPreset && (
          <span className="text-text-muted absolute inset-0 flex items-center justify-center text-[10px]">
            +
          </span>
        )}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute h-0 w-0 opacity-0"
        />
      </label>
    </div>
  )
}

function SkinCard({
  skin,
  selected,
  onClick,
}: {
  skin: SkinDefinition
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-21 shrink-0 flex-col gap-1.5 rounded-lg border-[1.5px] p-2 transition-colors ${
        selected ? 'border-accent bg-accent/8' : 'border-border-subtle bg-hover'
      }`}
    >
      <div className="flex h-[18px] gap-0.5 overflow-hidden rounded-sm">
        {skin.previewColors.map((color, i) => (
          // eslint-disable-next-line no-restricted-syntax -- color is a runtime hex from skin.previewColors, not a static token
          <div key={i} className="flex-1" style={{ background: color }} />
        ))}
      </div>
      <span
        className={`text-left text-[11px] leading-tight ${selected ? 'text-accent' : 'text-text-secondary'}`}
      >
        {skin.name}
      </span>
    </button>
  )
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearancePane({ settings, update }: { settings: AppSettings; update: UpdateFn }) {
  return (
    <div>
      {/* Skin gallery */}
      <div className="border-border-subtle border-b-[0.5px] py-3">
        <span className="text-text-primary text-sm">Skin</span>
        <p className="text-text-muted mt-0.5 mb-3 text-xs">Built-in surface and border palette.</p>
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
        <Segmented
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
        />
      </SettingRow>

      {/* Accent color */}
      <div className="border-border-subtle border-b-[0.5px] py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <span className="text-text-primary text-sm">Accent color</span>
            <p className="text-text-muted mt-0.5 text-xs">
              Highlights, active states, and status indicators.
            </p>
          </div>
          <div
            className="h-6 w-6 shrink-0 rounded-full [outline:1.5px_solid_var(--border-hover)] [outline-offset:2px]"
            // eslint-disable-next-line no-restricted-syntax -- settings.accentColor is a runtime user-chosen hex, not a static token
            style={{ background: settings.accentColor }}
          />
        </div>
        <ColorField
          value={settings.accentColor}
          onChange={(accentColor) => update({ accentColor })}
          presets={ACCENT_PRESETS}
        />
      </div>

      {/* Status colors */}
      <div className="border-border-subtle border-b-[0.5px] py-3">
        <span className="text-text-primary text-sm">Status colors</span>
        <p className="text-text-muted mt-0.5 mb-3 text-xs">
          Used for success, warnings, and errors across the app.
        </p>
        <div className="flex flex-col gap-3">
          {(
            [
              { label: 'Success', key: 'successColor' as const, presets: SUCCESS_PRESETS },
              { label: 'Warning', key: 'warningColor' as const, presets: WARNING_PRESETS },
              { label: 'Error', key: 'dangerColor' as const, presets: DANGER_PRESETS },
            ] as const
          ).map(({ label, key, presets }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-text-secondary w-14 shrink-0 text-xs">{label}</span>
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
          <span className="text-text-faint text-sm">Import custom skin…</span>
          <span className="bg-hover text-text-faint border-border-subtle rounded border-[0.5px] px-1.5 py-0.5 text-[10px]">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralPane({ settings, update }: { settings: AppSettings; update: UpdateFn }) {
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

function ConsolePane({ settings, update }: { settings: AppSettings; update: UpdateFn }) {
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
      <SettingRow label="Buffer size" description="Maximum number of log lines kept in memory.">
        <input
          type="number"
          min={100}
          max={10000}
          step={100}
          value={settings.consoleBufferLines}
          onChange={(e) => update({ consoleBufferLines: Math.max(100, Number(e.target.value)) })}
          className="bg-hover border-border-subtle text-text-primary w-20 rounded border-[0.5px] px-2 py-1 text-right text-xs outline-none"
        />
      </SettingRow>
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsPane({ settings, update }: { settings: AppSettings; update: UpdateFn }) {
  return (
    <div>
      <SettingRow label="Crash alerts" description="Notify when the server stops unexpectedly.">
        <Toggle checked={settings.notifyOnCrash} onChange={(v) => update({ notifyOnCrash: v })} />
      </SettingRow>
      <SettingRow
        label="Player join/leave alerts"
        description="Notify when a player joins or leaves the server."
      >
        <Toggle checked={settings.notifyOnJoin} onChange={(v) => update({ notifyOnJoin: v })} />
      </SettingRow>
    </div>
  )
}

// ─── Changelog ────────────────────────────────────────────────────────────────

function ChangelogItem({ entry }: { entry: ChangelogEntry }) {
  const [showMinor, setShowMinor] = useState(false)
  const formattedDate = new Date(entry.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="border-border-subtle border-b-[0.5px] py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-text-primary text-sm">{entry.label}</span>
        <span className="text-text-muted shrink-0 text-xs">{formattedDate}</span>
      </div>
      <ul className="mt-1.5 flex flex-col gap-1">
        {entry.highlights.map((item, i) => (
          <li key={i} className="text-text-secondary flex gap-1.5 text-xs">
            <span className="text-text-faint">–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {entry.minor && entry.minor.length > 0 && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowMinor((v) => !v)}
            className="text-text-faint hover:text-text-muted text-[11px] transition-colors"
          >
            {showMinor ? '−' : '+'} {entry.minor.length} smaller change
            {entry.minor.length === 1 ? '' : 's'}
          </button>
          {showMinor && (
            <ul className="mt-1 flex flex-col gap-1">
              {entry.minor.map((item, i) => (
                <li key={i} className="text-text-muted flex gap-1.5 text-xs">
                  <span className="text-text-faint">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ChangelogPane() {
  const [showEarlier, setShowEarlier] = useState(false)
  const recent = CHANGELOG.slice(0, 3)
  const earlier = CHANGELOG.slice(3)

  const openChangelog = () => {
    try {
      BrowserOpenURL(CHANGELOG_URL)
    } catch {
      /* non-Wails context */
    }
  }

  return (
    <div className="flex flex-col py-2">
      <div className="flex flex-col">
        {recent.map((entry) => (
          <ChangelogItem key={entry.label} entry={entry} />
        ))}
      </div>

      {earlier.length > 0 && (
        <div className="border-border-subtle border-b-[0.5px] py-2">
          <button
            onClick={() => setShowEarlier((v) => !v)}
            className="text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            {showEarlier ? '▾' : '▸'} Earlier updates
          </button>
          {showEarlier && (
            <div className="mt-1 flex flex-col">
              {earlier.map((entry) => (
                <ChangelogItem key={entry.label} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={openChangelog}
        className="text-accent border-accent/30 bg-accent/10 hover:bg-accent/15 mt-3 rounded border-[0.5px] py-1.5 text-xs transition-colors"
      >
        View full changelog on GitHub ↗
      </button>
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutPane() {
  const openFolder = () => {
    try {
      OpenDataDir().catch(() => {})
    } catch {
      /* non-Wails context */
    }
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <span className="text-text-primary text-sm font-semibold">Konnekt</span>
        <span className="text-text-muted text-xs">Minecraft Server Manager</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-text-secondary flex items-center justify-between text-xs">
          <span>License</span>
          <span className="text-text-muted">MIT</span>
        </div>
        <div className="text-text-secondary flex items-center justify-between text-xs">
          <span>Data directory</span>
          <button
            onClick={openFolder}
            className="text-text-muted font-mono text-[11px] transition-colors"
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            }}
            title="Open config folder"
          >
            ~/.config/konnekt ↗
          </button>
        </div>
      </div>
    </div>
  )
}
