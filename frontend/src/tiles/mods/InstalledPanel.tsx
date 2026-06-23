import { useState, useCallback } from 'react'
import { Toggle } from '../../components/ui/Toggle'
import { ModPreviewDialog } from './ModPreviewDialog'
import type {
  InstalledMod, InstallProgress, ModProject, ModVersion,
  ModUpdateInfo, ResolvedDependency,
} from './useMods'

interface Props {
  mods: InstalledMod[]
  loading: boolean
  error: string | null
  installProgress: InstallProgress
  installing: boolean
  serverRunning?: boolean
  kind?: 'mods' | 'plugins'
  updates: Record<string, ModUpdateInfo>
  onSetEnabled: (fileName: string, enabled: boolean) => Promise<void>
  onUninstall: (fileName: string) => Promise<void>
  onChangeVersion: (oldFileName: string, newVersionId: string) => Promise<void>
  // For preview dialog — mirrors useMods
  selectedProject: ModProject | null
  projectLoading: boolean
  versions: ModVersion[]
  versionsLoading: boolean
  installError: string | null
  onSelectProject: (mod: InstalledMod) => Promise<void>
  onClearProject: () => void
  onGetVersions: (projectId: string) => void
  onGetAllVersions: (projectId: string) => void
  onResolveDeps: (versionId: string) => Promise<ResolvedDependency[]>
  onInstall: (versionIds: string[]) => Promise<void>
  onOpenInBrowser: (mod: InstalledMod) => void
}

type SortKey = 'name' | 'date' | 'size' | 'updated'
type StatusFilter = 'all' | 'enabled' | 'disabled'
type SourceFilter = 'all' | 'modrinth' | 'local'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Date installed' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
]

function fmtBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

// ─── Shared popover hook ──────────────────────────────────────────────────────

function usePopover() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

function SortMenu({ sort, onSort }: { sort: SortKey; onSort: (v: SortKey) => void }) {
  const { open, toggle, close } = usePopover()
  const label = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort'

  return (
    <div className="relative shrink-0">
      <button
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors"
        style={{
          border: '0.5px solid var(--border-subtle)',
          background: open ? 'var(--hover-surface)' : 'transparent',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>↕</span>
        {label}
      </button>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={close} />}
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 201,
          minWidth: 160,
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transformOrigin: 'top right',
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
        }}
      >
        {SORT_OPTIONS.map(opt => {
          const active = opt.value === sort
          return (
            <button
              key={opt.value}
              onClick={() => { onSort(opt.value); close() }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-primary)',
                background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ width: 12, color: 'var(--accent)', opacity: active ? 1 : 0 }}>✓</span>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Filter dropdown ──────────────────────────────────────────────────────────

interface FilterMenuProps {
  statusFilter: StatusFilter
  sourceFilter: SourceFilter
  onStatusFilter: (v: StatusFilter) => void
  onSourceFilter: (v: SourceFilter) => void
}

function FilterMenu({ statusFilter, sourceFilter, onStatusFilter, onSourceFilter }: FilterMenuProps) {
  const { open, toggle, close } = usePopover()
  const active = statusFilter !== 'all' || sourceFilter !== 'all'

  return (
    <div className="relative shrink-0">
      <button
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors"
        style={{
          border: '0.5px solid var(--border-subtle)',
          background: open ? 'var(--hover-surface)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>☰</span>
        Filter{active ? ' ·' : ''}
      </button>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={close} />}
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 201,
          minWidth: 160,
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transformOrigin: 'top right',
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
        }}
      >
        <div className="px-3 py-1.5 text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10, borderBottom: '0.5px solid var(--border-subtle)' }}>
          Status
        </div>
        {(['all', 'enabled', 'disabled'] as StatusFilter[]).map(v => {
          const active = statusFilter === v
          const label = v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)
          return (
            <button
              key={v}
              onClick={() => onStatusFilter(v)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-primary)',
                background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ width: 12, color: 'var(--accent)', opacity: active ? 1 : 0 }}>✓</span>
              {label}
            </button>
          )
        })}
        <div className="px-3 py-1.5 text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10, borderTop: '0.5px solid var(--border-subtle)', borderBottom: '0.5px solid var(--border-subtle)' }}>
          Source
        </div>
        {(['all', 'modrinth', 'local'] as SourceFilter[]).map(v => {
          const active = sourceFilter === v
          const label = v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)
          return (
            <button
              key={v}
              onClick={() => onSourceFilter(v)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-primary)',
                background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ width: 12, color: 'var(--accent)', opacity: active ? 1 : 0 }}>✓</span>
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function InstalledPanel({
  mods, loading, error, installProgress, installing, serverRunning, kind = 'mods',
  updates,
  onSetEnabled, onUninstall, onChangeVersion,
  selectedProject, projectLoading, versions, versionsLoading, installError,
  onSelectProject, onClearProject, onGetVersions, onGetAllVersions,
  onResolveDeps, onInstall, onOpenInBrowser,
}: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [togglingFile, setTogglingFile] = useState<string | null>(null)
  const [uninstallingFile, setUninstallingFile] = useState<string | null>(null)
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null)
  const [previewMod, setPreviewMod] = useState<InstalledMod | null>(null)
  const [numCols, setNumCols] = useState(1)

  // Filter + sort
  const filtered = mods
    .filter(m => {
      if (statusFilter === 'enabled' && !m.enabled) return false
      if (statusFilter === 'disabled' && m.enabled) return false
      if (sourceFilter !== 'all' && m.source !== sourceFilter) return false
      const q = search.toLowerCase()
      return !q || m.displayName.toLowerCase().includes(q) || m.fileName.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      if (sortKey === 'name') return a.displayName.localeCompare(b.displayName)
      if (sortKey === 'size') return b.sizeBytes - a.sizeBytes
      // date: newest first; unknowns (0) sink to bottom
      if (a.installedAt === 0 && b.installedAt === 0) return 0
      if (a.installedAt === 0) return 1
      if (b.installedAt === 0) return -1
      return b.installedAt - a.installedAt
    })

  const handleToggle = async (fileName: string, enabled: boolean) => {
    setTogglingFile(fileName)
    try { await onSetEnabled(fileName, enabled) }
    finally { setTogglingFile(null) }
  }

  const handleUninstall = async (fileName: string) => {
    setUninstallingFile(fileName)
    try { await onUninstall(fileName) }
    finally { setUninstallingFile(null); setConfirmUninstall(null) }
  }

  const openPreview = async (mod: InstalledMod) => {
    setPreviewMod(mod)
    if (mod.source === 'modrinth' && mod.projectId) {
      await onSelectProject(mod)
    }
  }

  const closePreview = () => {
    setPreviewMod(null)
    onClearProject()
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter…"
          className="flex-1 min-w-0 bg-transparent text-xs font-mono outline-none"
          style={{ color: 'var(--text-primary)', minWidth: 60 }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', fontSize: 11 }}>✕</button>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <FilterMenu
            statusFilter={statusFilter}
            sourceFilter={sourceFilter}
            onStatusFilter={setStatusFilter}
            onSourceFilter={setSourceFilter}
          />
          <SortMenu sort={sortKey} onSort={setSortKey} />
          {/* Column picker */}
          <div className="flex items-center rounded overflow-hidden shrink-0" style={{ border: '0.5px solid var(--border-subtle)' }}>
            {([1, 2, 3, 4] as const).map(n => (
              <button
                key={n}
                onClick={() => setNumCols(n)}
                className="flex items-center justify-center text-xs font-mono transition-colors"
                style={{
                  width: 22,
                  height: 24,
                  background: numCols === n ? 'var(--hover-surface)' : 'transparent',
                  color: numCols === n ? 'var(--accent)' : 'var(--text-faint)',
                  borderRight: n < 4 ? '0.5px solid var(--border-subtle)' : 'none',
                }}
                title={`${n} column${n > 1 ? 's' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Server-running hint */}
      {serverRunning && (
        <div
          className="px-3 py-1.5 text-xs shrink-0"
          style={{
            background: 'rgba(245,158,11,0.08)',
            color: 'var(--warning)',
            borderBottom: '0.5px solid var(--border-subtle)',
          }}
        >
          Changes take effect after server restart
        </div>
      )}

      {/* List */}
      <div
        className="flex-1 overflow-y-auto min-h-0 p-2"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 1fr)`, gap: 8, alignContent: 'start' }}
      >
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
              : 'No results match your filter.'}
          </div>
        )}

        {filtered.map(mod => {
          const bareName = mod.fileName.replace(/\.disabled$/, '')
          const isInstalling = !!installProgress[bareName] || !!installProgress[mod.fileName]
          const pct = installProgress[bareName] ?? installProgress[mod.fileName] ?? 0
          const isToggling = togglingFile === mod.fileName
          const isUninstalling = uninstallingFile === mod.fileName
          const updateInfo = updates[mod.fileName]
          const hasUpdate = updateInfo?.updateAvailable

          return (
            <div
              key={mod.fileName}
              className="flex items-center gap-3 transition-colors group"
              style={{
                background: 'var(--bg-surface)',
                border: '0.5px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '10px 12px',
                opacity: mod.enabled ? 1 : 0.55,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--hover-surface)'
                el.style.borderColor = 'var(--border-hover)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--bg-surface)'
                el.style.borderColor = 'var(--border-subtle)'
              }}
            >
              {/* Icon */}
              <div className="shrink-0" style={{ width: 40, height: 40 }}>
                {mod.iconUrl ? (
                  <img
                    src={mod.iconUrl}
                    alt=""
                    className="rounded"
                    style={{ width: 40, height: 40, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="rounded flex items-center justify-center text-xs font-mono w-full h-full"
                    style={{ background: 'var(--border-subtle)', color: 'var(--text-faint)' }}
                  >
                    &lt;&gt;
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={() => openPreview(mod)}
                    className="truncate text-xs font-semibold text-left hover:underline"
                    style={{ color: 'var(--text-primary)', background: 'none', padding: 0 }}
                  >
                    {mod.displayName}
                  </button>
                  {numCols === 1 && mod.versionNumber && (
                    <span className="shrink-0 text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                      v{mod.versionNumber}
                    </span>
                  )}
                  {numCols === 1 && (
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
                  )}
                </div>
                {numCols === 1 && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono truncate" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                      {mod.fileName}
                    </span>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                      {fmtBytes(mod.sizeBytes)}
                    </span>
                  </div>
                )}
                {isInstalling && (
                  <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Change version button */}
                {mod.source === 'modrinth' && mod.projectId && (
                  <button
                    onClick={() => openPreview(mod)}
                    className="relative flex items-center justify-center rounded text-xs transition-colors"
                    style={{
                      width: 26,
                      height: 26,
                      border: '0.5px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      background: 'transparent',
                    }}
                    title={hasUpdate ? `Update available: v${updateInfo.latestVersionNumber}` : 'Change version'}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    ◎
                    {hasUpdate && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          border: '1.5px solid var(--bg-base)',
                        }}
                      />
                    )}
                  </button>
                )}

                {/* Enable/disable toggle */}
                <Toggle
                  checked={mod.enabled}
                  onChange={v => handleToggle(mod.fileName, v)}
                  disabled={isToggling || installing}
                />

                {/* Delete */}
                {confirmUninstall === mod.fileName ? (
                  <div className="flex items-center gap-1">
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
                    className="flex items-center justify-center rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                    style={{
                      width: 26,
                      height: 26,
                      border: '0.5px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      background: 'transparent',
                    }}
                    title="Uninstall"
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--danger) 12%, transparent)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview dialog */}
      {previewMod && (
        <ModPreviewDialog
          mod={previewMod}
          updateInfo={updates[previewMod.fileName]}
          project={selectedProject}
          projectLoading={projectLoading}
          versions={versions}
          versionsLoading={versionsLoading}
          installing={installing}
          installError={installError}
          onClose={closePreview}
          onGetVersions={onGetVersions}
          onGetAllVersions={onGetAllVersions}
          onResolveDeps={onResolveDeps}
          onInstall={onInstall}
          onChangeVersion={onChangeVersion}
          onOpenInBrowser={() => {
            onOpenInBrowser(previewMod)
            closePreview()
          }}
        />
      )}
    </div>
  )
}
