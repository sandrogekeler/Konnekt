import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  SendCommand,
  GetCommandButtons,
  SaveCommandButtons,
  GetCustomCommands,
  StartServer,
  StopServer,
  RestartServer,
} from '../../../wailsjs/go/main/App'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { TileProps } from '../../types'

interface ModalState {
  type: 'kick' | 'ban'
  playerName: string
  reason: string
}

type CmdKind = 'cmd' | 'lifecycle' | 'special'

interface CmdItem {
  id: string
  label: string
  kind: CmdKind
  value: string // cmd string | 'start'|'stop'|'restart' | 'kick'|'ban'
}

type PresetTemplate = Omit<CmdItem, 'id'>

const PRESETS: PresetTemplate[] = [
  { label: 'Start',         kind: 'lifecycle', value: 'start' },
  { label: 'Stop',          kind: 'lifecycle', value: 'stop' },
  { label: 'Restart',       kind: 'lifecycle', value: 'restart' },
  { label: 'Save All',      kind: 'cmd',       value: 'save-all' },
  { label: 'List',          kind: 'cmd',       value: 'list' },
  { label: 'Set Day',       kind: 'cmd',       value: 'time set day' },
  { label: 'Set Night',     kind: 'cmd',       value: 'time set night' },
  { label: 'Clear Weather', kind: 'cmd',       value: 'weather clear' },
  { label: 'Rain',          kind: 'cmd',       value: 'weather rain' },
  { label: 'Freeze Time',   kind: 'cmd',       value: 'gamerule doDaylightCycle false' },
  { label: 'Unfreeze Time', kind: 'cmd',       value: 'gamerule doDaylightCycle true' },
  { label: 'Peaceful',      kind: 'cmd',       value: 'difficulty peaceful' },
  { label: 'Kick Player',   kind: 'special',   value: 'kick' },
  { label: 'Ban Player',    kind: 'special',   value: 'ban' },
]

const DEFAULT_LABELS = new Set([
  'Start', 'Stop', 'Restart', 'Save All', 'List',
  'Set Day', 'Clear Weather', 'Freeze Time', 'Kick Player', 'Ban Player',
])

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `c${Date.now()}-${Math.random().toString(36).slice(2)}`

function makeItem(t: PresetTemplate): CmdItem {
  return { id: newId(), ...t }
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

interface DropdownPos {
  // Only one of top/bottom is set depending on which direction has more room.
  top?: number
  bottom?: number
  left: number
  width: number
  maxHeight: number
}

export function QuickCommandsTile({ serverId }: TileProps) {
  const [items, setItems] = useState<CmdItem[]>([])
  const [newCmd, setNewCmd] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [confirmAction, setConfirmAction] = useState<'stop' | 'restart' | null>(null)
  const [editing, setEditing] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragIndex = useRef<number | null>(null)
  const presetsButtonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const confirmBeforeStop = useSettingsStore((s) => s.settings.confirmBeforeStop)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await GetCommandButtons()
        if (raw) {
          const parsed = JSON.parse(raw) as CmdItem[]
          if (Array.isArray(parsed) && !cancelled) {
            setItems(parsed)
            return
          }
        }
      } catch (err) {
        console.error(err)
      }
      const seed = PRESETS.filter((p) => DEFAULT_LABELS.has(p.label)).map(makeItem)
      try {
        const legacy = await GetCustomCommands()
        for (const cmd of legacy) {
          if (cmd && cmd.trim()) seed.push(makeItem({ label: cmd, kind: 'cmd', value: cmd }))
        }
      } catch (err) {
        console.error(err)
      }
      if (cancelled) return
      setItems(seed)
      SaveCommandButtons(JSON.stringify(seed)).catch(console.error)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Close the presets dropdown when clicking outside of it.
  useEffect(() => {
    if (!dropdownPos) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        presetsButtonRef.current &&
        !presetsButtonRef.current.contains(e.target as Node)
      ) {
        setDropdownPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownPos])

  const openPresets = useCallback(() => {
    if (dropdownPos) {
      setDropdownPos(null)
      return
    }
    const btn = presetsButtonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const w = Math.max(rect.width, 240)
    const margin = 8
    const spaceAbove = rect.top - margin
    const spaceBelow = window.innerHeight - rect.bottom - margin
    if (spaceAbove >= spaceBelow) {
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: w,
        maxHeight: spaceAbove,
      })
    } else {
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: w,
        maxHeight: spaceBelow,
      })
    }
  }, [dropdownPos])

  const persist = useCallback((next: CmdItem[]) => {
    setItems(next)
    SaveCommandButtons(JSON.stringify(next)).catch(console.error)
  }, [])

  const send = useCallback(
    (cmd: string) => {
      SendCommand(serverId, cmd).catch(console.error)
    },
    [serverId],
  )

  const execLifecycle = useCallback(
    (action: string) => {
      const fns: Record<string, () => Promise<void>> = {
        start:   () => StartServer(serverId),
        stop:    () => StopServer(serverId),
        restart: () => RestartServer(serverId),
      }
      fns[action]?.().catch(console.error)
    },
    [serverId],
  )

  const handleLifecycle = useCallback(
    (action: string) => {
      if (confirmBeforeStop && (action === 'stop' || action === 'restart')) {
        setConfirmAction(action as 'stop' | 'restart')
        return
      }
      execLifecycle(action)
    },
    [confirmBeforeStop, execLifecycle],
  )

  const run = useCallback(
    (item: CmdItem) => {
      if (item.kind === 'special') {
        setModal({ type: item.value as 'kick' | 'ban', playerName: '', reason: '' })
      } else if (item.kind === 'lifecycle') {
        handleLifecycle(item.value)
      } else {
        send(item.value)
      }
    },
    [handleLifecycle, send],
  )

  const addCustom = useCallback(() => {
    const v = newCmd.trim()
    if (!v) return
    persist([...items, makeItem({ label: v, kind: 'cmd', value: v })])
    setNewCmd('')
  }, [newCmd, items, persist])

  const addPreset = useCallback(
    (t: PresetTemplate) => {
      persist([...items, makeItem(t)])
    },
    [items, persist],
  )

  const removeItem = useCallback(
    (id: string) => {
      persist(items.filter((it) => it.id !== id))
    },
    [items, persist],
  )

  const onDrop = useCallback(
    (to: number) => {
      const from = dragIndex.current
      dragIndex.current = null
      setOverIndex(null)
      if (from === null || from === to) return
      persist(arrayMove(items, from, to))
    },
    [items, persist],
  )

  const submitModal = useCallback(() => {
    if (!modal) return
    const cmd = `${modal.type} ${modal.playerName}${modal.reason ? ' ' + modal.reason : ''}`
    send(cmd)
    setModal(null)
  }, [modal, send])

  const toggleEdit = useCallback(() => {
    setEditing((e) => !e)
    setDropdownPos(null)
  }, [])

  return (
    <div className="flex flex-col h-full px-3 py-2 gap-2">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/25 text-xs">
            Press Edit to add commands.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((item, i) =>
              editing ? (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    dragIndex.current = i
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (overIndex !== i) setOverIndex(i)
                  }}
                  onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
                  onDrop={() => onDrop(i)}
                  onDragEnd={() => {
                    dragIndex.current = null
                    setOverIndex(null)
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border text-white/70 cursor-grab transition-colors ${
                    overIndex === i ? 'border-white/40 bg-white/10' : 'border-white/10'
                  }`}
                >
                  <span className="text-white/25 select-none leading-none">⠿</span>
                  <span className="flex-1 truncate" title={item.value}>
                    {item.label}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="px-1 text-white/30 hover:text-red-400 transition-colors leading-none"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => run(item)}
                  title={item.value}
                  className="px-2 py-1.5 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all text-left truncate"
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col gap-1.5">
        {editing && (
          <div className="relative">
            <input
              type="text"
              value={newCmd}
              onChange={(e) => setNewCmd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="Add command..."
              className="w-full bg-white/5 border border-white/10 rounded px-2 pr-7 py-1 text-xs font-mono text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
            />
            <button
              onClick={addCustom}
              title="Add command"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80 transition-colors text-sm leading-none"
            >
              +
            </button>
          </div>
        )}
        <div className="flex gap-1.5 justify-between">
          {editing && (
            <button
              ref={presetsButtonRef}
              onClick={openPresets}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                dropdownPos
                  ? 'border-white/25 text-white bg-white/5'
                  : 'border-white/10 text-white/60 hover:text-white hover:border-white/25'
              }`}
            >
              + Presets
            </button>
          )}
          <button
            onClick={toggleEdit}
            className={`ml-auto px-2 py-1 text-xs rounded border transition-colors ${
              editing
                ? 'border-white/25 text-white bg-white/5'
                : 'border-white/10 text-white/60 hover:text-white hover:border-white/25'
            }`}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              bottom: dropdownPos.bottom,
              left: dropdownPos.left,
              minWidth: dropdownPos.width,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              overflowY: 'auto',
              zIndex: 9999,
              background: '#0d0e14',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  addPreset(p)
                  setDropdownPos(null)
                }}
                title={p.value}
                className="px-2 py-1.5 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all text-left truncate"
              >
                {p.label}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="rounded-xl p-5 w-72 flex flex-col gap-4"
            style={{ background: 'var(--bg-base)', border: '0.5px solid var(--border-subtle)' }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {confirmAction === 'stop' ? 'Stop server?' : 'Restart server?'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {confirmAction === 'stop'
                  ? 'This will stop the running server. Any unsaved progress may be lost.'
                  : 'This will restart the running server. Players will be briefly disconnected.'}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { execLifecycle(confirmAction); setConfirmAction(null) }}
                className="px-3 py-1.5 text-xs rounded transition-colors"
                style={{ background: 'rgba(248,113,113,0.15)', border: '0.5px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.25)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.15)' }}
              >
                {confirmAction === 'stop' ? 'Stop' : 'Restart'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="rounded-xl p-5 w-80 flex flex-col gap-3"
            style={{ background: '#0d0e14', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <h3 className="text-sm font-semibold capitalize">{modal.type} Player</h3>
            <input
              type="text"
              value={modal.playerName}
              onChange={(e) => setModal((m) => m && { ...m, playerName: e.target.value })}
              placeholder="Player name"
              autoFocus
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
            />
            <input
              type="text"
              value={modal.reason}
              onChange={(e) => setModal((m) => m && { ...m, reason: e.target.value })}
              placeholder="Reason (optional)"
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/20"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitModal}
                className="px-3 py-1.5 text-xs rounded bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                {modal.type === 'kick' ? 'Kick' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
