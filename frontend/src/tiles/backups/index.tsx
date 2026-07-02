import { useState, useMemo, useRef, useEffect } from 'react'
import type { TileProps } from '../../types'
import { useServerStore } from '../../stores/useServerStore'
import { useUiStore } from '../../stores/useUiStore'
import { useTileStore } from '../../stores/useTileStore'
import { useProcessesStore } from '../../stores/useProcessesStore'
import { StopServer } from '../../../wailsjs/go/main/App'
import { BackupsSummary } from './BackupsSummary'
import { BackupRunningDialog } from './BackupRunningDialog'
import { useBackups } from './useBackups'
import type { Backup } from './useBackups'
import { fmtBytes, fmtDate, extractID } from './format'
import { BackupCarousel } from './BackupCarousel'
import { SolarSystem } from './SolarSystem'
import { useBackupWorlds } from './useBackupWorlds'
import { WorldInfoPanel } from './WorldInfoPanel'
import { ServerInfoPanel } from './ServerInfoPanel'
import { Segmented } from '../../components/ui/Segmented'
import type { FocusTarget } from './focusLayout'

// ─── Confirm dialog ────────────────────────────────────────────────────────

interface ConfirmState {
  message: string
  confirmLabel: string
  danger: boolean
  onConfirm: () => void
}

function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: ConfirmState & { onCancel: () => void }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="mx-4 flex w-full max-w-xs flex-col gap-3 rounded-lg px-4 py-4"
        style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
      >
        <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded border px-3 py-1 font-mono text-xs transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm()
              onCancel()
            }}
            className="rounded border px-3 py-1 font-mono text-xs transition-colors"
            style={{
              borderColor: danger ? '#f87171' : 'var(--accent)',
              color: danger ? '#f87171' : 'var(--accent)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = danger
                ? 'rgba(248,113,113,0.12)'
                : 'color-mix(in srgb, var(--accent) 12%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tag pill ──────────────────────────────────────────────────────────────

function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-px font-mono text-xs"
      style={{
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--accent)',
        border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
      }}
    >
      #{tag}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="ml-0.5 leading-none opacity-60 transition-opacity hover:opacity-100"
        style={{ color: 'var(--accent)' }}
      >
        ×
      </button>
    </span>
  )
}

// ─── Backup row (list panel) ───────────────────────────────────────────────

interface BackupRowProps {
  backup: Backup
  serverRunning: boolean
  inProgress: boolean
  onRequestRestore: (b: Backup) => void
  onRequestDelete: (b: Backup) => void
  onUpdateMeta: (filename: string, displayName: string, tags: string[]) => void
}

function BackupRow({
  backup,
  serverRunning,
  inProgress,
  onRequestRestore,
  onRequestDelete,
  onUpdateMeta,
}: BackupRowProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  const tagRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingName) nameRef.current?.focus()
  }, [editingName])
  useEffect(() => {
    if (addingTag) tagRef.current?.focus()
  }, [addingTag])

  function startEditName() {
    setNameInput(backup.displayName)
    setEditingName(true)
  }

  function commitName() {
    setEditingName(false)
    const trimmed = nameInput.trim()
    if (trimmed !== backup.displayName) {
      onUpdateMeta(backup.filename, trimmed, backup.tags)
    }
  }

  function commitTag() {
    const t = tagInput.trim().replace(/^#/, '')
    setAddingTag(false)
    setTagInput('')
    if (t && !backup.tags.includes(t)) {
      onUpdateMeta(backup.filename, backup.displayName, [...backup.tags, t])
    }
  }

  function removeTag(tag: string) {
    onUpdateMeta(
      backup.filename,
      backup.displayName,
      backup.tags.filter((t) => t !== tag),
    )
  }

  const displayLabel = backup.displayName || extractID(backup.filename)

  return (
    <div
      className="flex flex-col gap-1 px-3 py-2"
      style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
    >
      {/* Name + tags row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {editingName ? (
          <input
            ref={nameRef}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitName()
              }
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="border-b bg-transparent font-mono text-xs outline-none"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--accent)', minWidth: 80 }}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              startEditName()
            }}
            className="text-left font-mono text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Click to rename"
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
          >
            {displayLabel}
          </button>
        )}
        {backup.tags.map((tag) => (
          <TagPill key={tag} tag={tag} onRemove={() => removeTag(tag)} />
        ))}
        {addingTag ? (
          <input
            ref={tagRef}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onBlur={commitTag}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitTag()
              }
              if (e.key === 'Escape') {
                setAddingTag(false)
                setTagInput('')
              }
            }}
            placeholder="#tag"
            className="w-16 border-b bg-transparent font-mono text-xs outline-none"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setAddingTag(true)
            }}
            className="font-mono text-xs transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
            }}
          >
            + tag
          </button>
        )}
      </div>

      {/* Meta + actions row */}
      <div className="flex items-center justify-between gap-2">
        {inProgress ? (
          <span className="animate-pulse font-mono text-xs" style={{ color: 'var(--accent)' }}>
            backing up…
          </span>
        ) : (
          <span className="truncate font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
            {backup.filename} · {fmtDate(backup.createdAt)} · {fmtBytes(backup.sizeBytes)}
          </span>
        )}
        {!inProgress && (
          <div className="flex shrink-0 items-center gap-2 font-mono text-xs">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRequestRestore(backup)
              }}
              disabled={serverRunning}
              className="transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              style={{ color: 'var(--accent)' }}
              title={serverRunning ? 'Stop the server before restoring' : 'Restore this backup'}
              onMouseEnter={(e) => {
                if (!serverRunning) (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              }}
            >
              restore
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRequestDelete(backup)
              }}
              className="transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = '#f87171'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
              }}
            >
              delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Focus state ───────────────────────────────────────────────────────────
// FocusTarget is defined in focusLayout.ts and re-exported from there.

// ─── Tile ──────────────────────────────────────────────────────────────────

export function BackupsTile({ serverId, maximized }: TileProps) {
  if (!maximized) return <BackupsSummary serverId={serverId} />
  return <BackupsTileExpanded serverId={serverId} />
}

function BackupsTileExpanded({ serverId }: { serverId: string }) {
  const { status } = useServerStore()
  const {
    backups,
    loading,
    listError,
    creating,
    creatingFilename,
    actionError,
    create,
    restore,
    remove,
    updateMeta,
    openDir,
  } = useBackups(serverId)
  const activeProcess = useProcessesStore((s) => s.processes[serverId])
  const [view, setView] = useState<'server' | 'world'>('server')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [search, setSearch] = useState('')
  const [showRunningDialog, setShowRunningDialog] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  // Single source of truth so either input can open AND close the panel.
  // Mouse position (handleStageMouseMove) and keyboard (↓/↑ in the carousel)
  // both drive this directly.
  const [panelOpen, setPanelOpen] = useState(false)
  const listPanelRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setFocusedIndex(0)
  }, [search])

  function handleCreateClick() {
    if (status.running) {
      setShowRunningDialog(true)
    } else {
      create()
    }
  }

  async function stopAndBackUp() {
    setShowRunningDialog(false)
    setStopping(true)
    try {
      await StopServer(serverId)
    } catch {
      /* server may already be stopped */
    }
    setStopping(false)
    await create()
  }

  const serverBackups = useMemo(() => backups.filter((b) => b.kind === 'server'), [backups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return serverBackups
    if (q.startsWith('#')) {
      const tag = q.slice(1)
      return serverBackups.filter((b) => b.tags.some((t) => t.toLowerCase().includes(tag)))
    }
    return serverBackups.filter(
      (b) =>
        b.filename.toLowerCase().includes(q) ||
        (b.displayName && b.displayName.toLowerCase().includes(q)) ||
        fmtDate(b.createdAt).toLowerCase().includes(q),
    )
  }, [serverBackups, search])

  const clampedFocused = Math.min(focusedIndex, Math.max(0, filtered.length - 1))

  const focusedFilename = filtered[clampedFocused]?.filename
  const previewWorlds = useBackupWorlds(serverId, focusedFilename)
  const [focus, setFocus] = useState<FocusTarget>(null)
  // Clear focus when the selected backup changes.
  useEffect(() => {
    setFocus(null)
  }, [focusedFilename])

  const anyFocus = focus !== null

  // Keep the highlighted list row visible when navigating with the keyboard,
  // scrolling ONLY within the list panel (never ancestors — scrollIntoView
  // adjusted the stage/tile while the panel was still off-screen, which caused
  // the open-animation jump).
  useEffect(() => {
    if (!panelOpen) return
    const container = listPanelRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(`[data-row-idx="${clampedFocused}"]`)
    if (!el) return
    const top = el.offsetTop
    const bottom = top + el.offsetHeight
    if (top < container.scrollTop) {
      container.scrollTop = top
    } else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight
    }
  }, [clampedFocused, panelOpen])

  function requestRestore(backup: Backup) {
    if (status.running) return
    const target = backup.kind === 'server' ? 'server files' : 'world folder'
    setConfirm({
      message: `Restore "${backup.displayName || extractID(backup.filename)}"? This will replace your current ${target}.`,
      confirmLabel: 'Restore',
      danger: false,
      onConfirm: () => restore(backup.filename),
    })
  }

  function requestDelete(backup: Backup) {
    setConfirm({
      message: `Delete "${backup.displayName || extractID(backup.filename)}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => remove(backup.filename),
    })
  }

  function openScheduler() {
    const { addTile, activeTileIds } = useTileStore.getState()
    if (!activeTileIds.includes('scheduler')) addTile('scheduler')
    useUiStore.getState().requestMaximize('scheduler', null)
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header row */}
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-2"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <Segmented
          options={[
            { value: 'server', label: 'Server' },
            { value: 'world', label: 'Worlds' },
          ]}
          value={view}
          onChange={setView}
          compact
          slide
        />

        {view === 'server' && (
          <>
            <span className="flex-1 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
              {filtered.length}
              {filtered.length !== serverBackups.length ? `/${serverBackups.length}` : ''} backup
              {serverBackups.length !== 1 ? 's' : ''}
            </span>

            <button
              onClick={openDir}
              className="shrink-0 font-mono text-xs transition-colors"
              style={{ color: 'var(--text-faint)' }}
              title="Open backup folder"
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
              }}
            >
              ↗
            </button>

            <button
              onClick={openScheduler}
              className="shrink-0 rounded border px-2 py-0.5 font-mono text-xs transition-colors"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
                background: 'transparent',
              }}
              title="Set up scheduled backups in the Scheduler tile"
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.borderColor = 'var(--border-hover)'
                b.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement
                b.style.borderColor = 'var(--border-subtle)'
                b.style.color = 'var(--text-muted)'
              }}
            >
              schedule
            </button>

            <button
              onClick={handleCreateClick}
              disabled={creating || stopping}
              className="shrink-0 rounded border px-2 py-0.5 font-mono text-xs transition-colors disabled:opacity-40"
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!creating && !stopping)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'color-mix(in srgb, var(--accent) 10%, transparent)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {stopping ? 'Stopping server…' : creating ? 'Backing up…' : 'Back up now'}
            </button>
          </>
        )}

        {view === 'world' && <span className="flex-1" />}
      </div>

      {view === 'world' ? (
        <div
          className="flex flex-1 items-center justify-center px-6 text-center font-mono text-xs"
          style={{ color: 'var(--text-faint)' }}
        >
          World-specific backups are managed in the Worlds tile. Dedicated management here is coming
          soon.
        </div>
      ) : (
        <>
          {/* Progress bar */}
          {activeProcess?.status === 'running' && (
            <div
              className="w-full shrink-0"
              style={{ height: 2, background: 'var(--border-subtle)' }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${activeProcess.percent}%`, background: 'var(--accent)' }}
              />
            </div>
          )}

          {/* Search row */}
          <div
            className="shrink-0 px-3 py-2"
            style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 rounded px-2 py-1"
              style={{ border: '0.5px solid var(--border-subtle)', background: 'var(--bg-base)' }}
              onFocusCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'
              }}
              onBlurCapture={(e) => {
                ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
              }}
            >
              <span className="shrink-0 text-xs select-none" style={{ color: 'var(--text-faint)' }}>
                ⌕
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by #tag, date, or ID"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs outline-none"
                style={{ color: 'var(--text-secondary)', caretColor: 'var(--accent)' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="shrink-0 text-xs leading-none transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Error banner */}
          {actionError && (
            <div
              className="shrink-0 px-3 py-1 font-mono text-xs"
              style={{ color: '#f87171', borderBottom: '0.5px solid var(--border-subtle)' }}
            >
              {actionError}
            </div>
          )}

          {/* Stage: carousel + slide-up list panel */}
          <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
            {/* Dim overlay — fades in behind planets and panel when a panel is focused.
                Made clickable when active so clicking outside the HUD closes it. */}
            <div
              className="absolute inset-0"
              style={{
                background: 'rgba(0,0,0,0.55)',
                zIndex: 2,
                opacity: anyFocus ? 1 : 0,
                transition: 'opacity 300ms ease',
                pointerEvents: anyFocus ? 'auto' : 'none',
                cursor: anyFocus ? 'pointer' : 'default',
              }}
              onClick={() => setFocus(null)}
            />

            {/* Solar system — sun + orbiting worlds.
                Scales down from top-center when the list panel opens so the sky
                tucks above the rising carousel. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 3,
                transformOrigin: 'top center',
                transform: panelOpen ? 'scale(0.36)' : 'scale(1)',
                transition: 'transform 220ms ease',
                pointerEvents: 'none',
              }}
            >
              <SolarSystem
                key={focusedFilename}
                worlds={previewWorlds}
                focus={focus}
                onWorldClick={(w) => {
                  if (focus?.kind === 'world' && focus.world.name === w.name) {
                    setFocus(null)
                  } else {
                    setPanelOpen(false)
                    setFocus({ kind: 'world', world: w })
                  }
                }}
                onServerClick={() => {
                  if (focus?.kind === 'server') {
                    setFocus(null)
                  } else {
                    setPanelOpen(false)
                    setFocus({ kind: 'server' })
                  }
                }}
              />
            </div>

            {/* Close zone — transparent, covers the upper stage; closes the panel when
                the cursor re-enters this area while the panel is open. Without this,
                onMouseLeave on the stage only fires when leaving the window entirely
                because the stage fills almost the whole maximized tile. */}
            <div
              className="absolute top-0 right-0 left-0 z-[9]"
              style={{
                bottom: '42%',
                pointerEvents: panelOpen ? 'auto' : 'none',
              }}
              onMouseMove={() => setPanelOpen(false)}
            />

            {/* Hover-zone hint — opens explorer only when cursor enters this strip */}
            <div
              className="absolute right-0 bottom-0 left-0 flex items-center justify-center"
              style={{
                height: 56,
                background: 'rgba(255,255,255,0.025)',
                borderTop: '0.5px solid var(--border-subtle)',
                zIndex: 5,
                opacity: panelOpen || anyFocus ? 0 : 1,
                transition: 'opacity 180ms ease',
                cursor: 'pointer',
                pointerEvents: !panelOpen && !anyFocus ? 'auto' : 'none',
              }}
              onMouseEnter={() => setPanelOpen(true)}
            >
              <div
                style={{
                  width: 32,
                  height: 3,
                  borderRadius: 2,
                  background: 'var(--text-faint)',
                  opacity: 0.4,
                }}
              />
            </div>

            {/* Carousel zone — rides up when the list panel opens.
                z-4 when browsing so cards render above planet previews.
                z-1 when a planet is focused so the dim overlay covers it. */}
            <div
              className="absolute right-0 left-0"
              style={{
                height: '36%',
                bottom: panelOpen ? '42%' : '7%',
                transition: 'bottom 220ms ease',
                zIndex: anyFocus ? 1 : 4,
              }}
            >
              {loading && (
                <div
                  className="flex h-full items-center justify-center font-mono text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  Loading…
                </div>
              )}
              {!loading && listError && (
                <div
                  className="flex h-full items-center justify-center px-4 text-center font-mono text-xs"
                  style={{ color: '#f87171' }}
                >
                  {listError}
                </div>
              )}
              {!loading && !listError && serverBackups.length === 0 && (
                <div
                  className="flex h-full items-center justify-center font-mono text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  No full-server backups yet — click "Back up now" to create one
                </div>
              )}
              {!loading && !listError && serverBackups.length > 0 && filtered.length === 0 && (
                <div
                  className="flex h-full items-center justify-center font-mono text-xs"
                  style={{ color: 'var(--text-faint)' }}
                >
                  No backups match "{search}"
                </div>
              )}
              {!loading && !listError && filtered.length > 0 && (
                <BackupCarousel
                  backups={filtered}
                  focusedIndex={clampedFocused}
                  onFocusChange={setFocusedIndex}
                  panelOpen={panelOpen}
                  onOpenPanel={() => setPanelOpen(true)}
                  onClosePanel={() => setPanelOpen(false)}
                  serverRunning={status.running}
                  creatingFilename={creatingFilename}
                  onRequestRestore={requestRestore}
                  onRequestDelete={requestDelete}
                  wheelTargetRef={stageRef}
                />
              )}
            </div>

            {/* List panel — overlays bottom of carousel, GPU-accelerated slide only */}
            <div
              ref={listPanelRef}
              className="absolute right-0 bottom-0 left-0 overflow-y-auto"
              style={{
                height: '42%',
                zIndex: 10,
                transform: panelOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 220ms ease',
                borderTop: '0.5px solid var(--border-subtle)',
                background: 'var(--bg-base)',
              }}
            >
              {filtered.map((b, idx) => (
                <div
                  key={b.filename}
                  data-row-idx={idx}
                  className="relative"
                  onClick={(e) => {
                    const t = e.target as Element
                    if (!t.closest('button') && !t.closest('input')) setFocusedIndex(idx)
                  }}
                  style={{ cursor: 'default' }}
                >
                  {idx === clampedFocused && (
                    <div
                      className="absolute top-0 bottom-0 left-0"
                      style={{ width: 2, background: 'var(--accent)', zIndex: 1 }}
                    />
                  )}
                  <BackupRow
                    backup={b}
                    serverRunning={status.running}
                    inProgress={b.filename === creatingFilename}
                    onRequestRestore={requestRestore}
                    onRequestDelete={requestDelete}
                    onUpdateMeta={updateMeta}
                  />
                </div>
              ))}
            </div>

            {/* World info panel — slides in from the right when a planet is focused */}
            {focus?.kind === 'world' && (
              <WorldInfoPanel world={focus.world} onClose={() => setFocus(null)} />
            )}

            {/* Server info panel — slides in when the server sphere is focused */}
            {focus?.kind === 'server' && filtered[clampedFocused] && (
              <ServerInfoPanel
                backup={filtered[clampedFocused]}
                worlds={previewWorlds}
                onClose={() => setFocus(null)}
              />
            )}
          </div>
        </>
      )}

      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
      {showRunningDialog && (
        <BackupRunningDialog
          onBackUpNow={() => {
            setShowRunningDialog(false)
            create()
          }}
          onStopAndBackUp={stopAndBackUp}
          onCancel={() => setShowRunningDialog(false)}
        />
      )}
    </div>
  )
}
