import { useState, useEffect, useCallback } from 'react'
import { SendCommand, GetCustomCommands, SaveCustomCommands, StartServer, StopServer, RestartServer } from '../../../wailsjs/go/main/App'
import type { TileProps } from '../../types'

interface ModalState {
  type: 'kick' | 'ban'
  playerName: string
  reason: string
}

const BUILT_IN: Array<{ label: string; cmd: string | null; special?: 'kick' | 'ban'; lifecycle?: 'start' | 'stop' | 'restart' }> = [
  { label: 'Start',   cmd: null, lifecycle: 'start' },
  { label: 'Stop',    cmd: null, lifecycle: 'stop' },
  { label: 'Restart', cmd: null, lifecycle: 'restart' },
  { label: 'Save All', cmd: 'save-all' },
  { label: 'List', cmd: 'list' },
  { label: 'Set Day', cmd: 'time set day' },
  { label: 'Clear Weather', cmd: 'weather clear' },
  { label: 'Freeze Time', cmd: 'gamerule doDaylightCycle false' },
  { label: 'Kick Player', cmd: null, special: 'kick' },
  { label: 'Ban Player', cmd: null, special: 'ban' },
]

function CmdButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1.5 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all text-left truncate"
    >
      {label}
    </button>
  )
}

export function QuickCommandsTile({ serverId }: TileProps) {
  const [customCmds, setCustomCmds] = useState<string[]>([])
  const [newCmd, setNewCmd] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)

  useEffect(() => {
    GetCustomCommands().then(setCustomCmds).catch(console.error)
  }, [])

  const send = useCallback(
    (cmd: string) => {
      SendCommand(serverId, cmd).catch(console.error)
    },
    [serverId],
  )

  const handleLifecycle = useCallback(
    (action: 'start' | 'stop' | 'restart') => {
      const fns = {
        start:   () => StartServer(serverId),
        stop:    () => StopServer(serverId),
        restart: () => RestartServer(serverId),
      }
      fns[action]().catch(console.error)
    },
    [serverId],
  )

  const addCustom = useCallback(async () => {
    if (!newCmd.trim()) return
    const next = [...customCmds, newCmd.trim()]
    await SaveCustomCommands(next)
    setCustomCmds(next)
    setNewCmd('')
  }, [newCmd, customCmds])

  const removeCustom = useCallback(
    async (cmd: string) => {
      const next = customCmds.filter((c) => c !== cmd)
      await SaveCustomCommands(next)
      setCustomCmds(next)
    },
    [customCmds],
  )

  const submitModal = useCallback(() => {
    if (!modal) return
    const cmd =
      modal.type === 'kick'
        ? `kick ${modal.playerName}${modal.reason ? ' ' + modal.reason : ''}`
        : `ban ${modal.playerName}${modal.reason ? ' ' + modal.reason : ''}`
    send(cmd)
    setModal(null)
  }, [modal, send])

  return (
    <div className="flex flex-col h-full px-3 py-2 gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {BUILT_IN.map((item) => (
          <CmdButton
            key={item.label}
            label={item.label}
            onClick={() => {
              if (item.special) {
                setModal({ type: item.special, playerName: '', reason: '' })
              } else if (item.lifecycle) {
                handleLifecycle(item.lifecycle)
              } else if (item.cmd) {
                send(item.cmd)
              }
            }}
          />
        ))}
      </div>

      {customCmds.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {customCmds.map((cmd) => (
            <div key={cmd} className="flex gap-1">
              <button
                onClick={() => send(cmd)}
                className="flex-1 px-2 py-1.5 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all text-left truncate"
                title={cmd}
              >
                {cmd}
              </button>
              <button
                onClick={() => removeCustom(cmd)}
                className="px-1.5 text-xs text-white/25 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-1.5">
        <input
          type="text"
          value={newCmd}
          onChange={(e) => setNewCmd(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Add command..."
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
        />
        <button
          onClick={addCustom}
          className="px-2 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
        >
          Add
        </button>
      </div>

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
