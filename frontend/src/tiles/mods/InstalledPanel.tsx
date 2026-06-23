import { useState } from 'react'
import { Toggle } from '../../components/ui/Toggle'
import type { InstalledMod, InstallProgress } from './useMods'

interface Props {
  mods: InstalledMod[]
  loading: boolean
  error: string | null
  installProgress: InstallProgress
  installing: boolean
  serverRunning?: boolean
  kind?: 'mods' | 'plugins'
  onSetEnabled: (fileName: string, enabled: boolean) => Promise<void>
  onUninstall: (fileName: string) => Promise<void>
}

function fmtBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

export function InstalledPanel({
  mods, loading, error, installProgress, installing, serverRunning,
  kind = 'mods', onSetEnabled, onUninstall,
}: Props) {
  const [search, setSearch] = useState('')
  const [togglingFile, setTogglingFile] = useState<string | null>(null)
  const [uninstallingFile, setUninstallingFile] = useState<string | null>(null)
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null)

  const filtered = mods.filter(m =>
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.fileName.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = async (fileName: string, enabled: boolean) => {
    setTogglingFile(fileName)
    try {
      await onSetEnabled(fileName, enabled)
    } finally {
      setTogglingFile(null)
    }
  }

  const handleUninstall = async (fileName: string) => {
    setUninstallingFile(fileName)
    try {
      await onUninstall(fileName)
    } finally {
      setUninstallingFile(null)
      setConfirmUninstall(null)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Search</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name…"
          className="flex-1 min-w-0 bg-transparent text-xs font-mono outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ color: 'var(--text-muted)', fontSize: 11 }}
          >✕</button>
        )}
      </div>

      {/* Server-running hint */}
      {serverRunning && (
        <div
          className="px-3 py-1.5 text-xs shrink-0"
          style={{
            background: 'rgba(245,158,11,0.08)',
            color: 'var(--warning)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          Changes take effect after server restart
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="px-3 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        )}
        {error && (
          <div className="px-3 py-2 text-xs" style={{ color: 'var(--danger)' }}>{error}</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-3 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            {mods.length === 0
              ? `No ${kind} found in this server's ${kind}/ directory.`
              : 'No results match your search.'}
          </div>
        )}

        {filtered.map(mod => {
          const bareName = mod.fileName.replace(/\.disabled$/, '')
          const isInstalling = !!installProgress[bareName] || !!installProgress[mod.fileName]
          const pct = installProgress[bareName] ?? installProgress[mod.fileName] ?? 0
          const isToggling = togglingFile === mod.fileName
          const isUninstalling = uninstallingFile === mod.fileName

          return (
            <div
              key={mod.fileName}
              className="flex items-center gap-3 px-3 py-2 transition-colors"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                opacity: mod.enabled ? 1 : 0.45,
                background: 'transparent',
              }}
            >
              {/* Enable/disable toggle */}
              <Toggle
                checked={mod.enabled}
                onChange={v => handleToggle(mod.fileName, v)}
                disabled={isToggling || installing}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="truncate text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {mod.displayName}
                  </span>
                  {mod.versionNumber && (
                    <span className="shrink-0 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {mod.versionNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-xs font-mono truncate"
                    style={{ color: 'var(--text-faint)', fontSize: 10 }}
                  >
                    {mod.fileName}
                  </span>
                  <span
                    className="shrink-0 px-1 rounded text-xs"
                    style={{
                      background: mod.source === 'modrinth'
                        ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                      color: mod.source === 'modrinth'
                        ? 'var(--accent)' : 'var(--text-muted)',
                      fontSize: 10,
                    }}
                  >
                    {mod.source}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                    {fmtBytes(mod.sizeBytes)}
                  </span>
                </div>
                {isInstalling && (
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>

              {/* Uninstall */}
              {confirmUninstall === mod.fileName ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleUninstall(mod.fileName)}
                    disabled={isUninstalling}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ background: 'var(--danger)', color: '#fff', opacity: isUninstalling ? 0.5 : 1 }}
                  >
                    {isUninstalling ? '…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmUninstall(null)}
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmUninstall(mod.fileName)}
                  className="shrink-0 px-2 py-0.5 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                  title="Uninstall"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
