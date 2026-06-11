import { useEffect, useState, useCallback } from 'react'
import { GetPlayers, KickPlayer, BanPlayer } from '../../../wailsjs/go/main/App'
import type { TileProps, Player } from '../../types'

interface ModalState {
  player: string
  action: 'kick' | 'ban'
  reason: string
}

export function PlayersTile({ serverId }: TileProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)

  useEffect(() => {
    const poll = async () => {
      const list = await GetPlayers(serverId).catch(() => null)
      if (list) setPlayers(list)
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [serverId])

  const openModal = useCallback((player: string, action: 'kick' | 'ban') => {
    setModal({ player, action, reason: '' })
  }, [])

  const submitModal = useCallback(async () => {
    if (!modal) return
    const fn = modal.action === 'kick' ? KickPlayer : BanPlayer
    await fn(serverId, modal.player, modal.reason).catch(console.error)
    setModal(null)
  }, [modal, serverId])

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {players.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/25 text-xs font-mono">
            No players online
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {players.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between py-1.5 px-2 rounded"
                style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
              >
                <span className="text-xs text-white/80 font-mono truncate">{p.name}</span>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => openModal(p.name, 'kick')}
                    className="px-2 py-0.5 text-xs rounded border border-yellow-400/20 text-yellow-400/60 hover:text-yellow-400 hover:border-yellow-400/40 transition-colors"
                  >
                    kick
                  </button>
                  <button
                    onClick={() => openModal(p.name, 'ban')}
                    className="px-2 py-0.5 text-xs rounded border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors"
                  >
                    ban
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-72 rounded-xl p-5 flex flex-col gap-3 font-mono"
            style={{ background: '#0d0e14', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase tracking-wider ${modal.action === 'kick' ? 'text-yellow-400' : 'text-red-400'}`}>
                {modal.action}
              </span>
              <span className="text-xs text-white/60">{modal.player}</span>
            </div>
            <input
              type="text"
              value={modal.reason}
              onChange={(e) => setModal((m) => m && { ...m, reason: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submitModal()}
              placeholder="Reason (optional)"
              autoFocus
              className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={submitModal}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                  modal.action === 'kick'
                    ? 'border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10'
                    : 'border-red-400/30 text-red-400 hover:bg-red-400/10'
                }`}
              >
                Confirm
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-3 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
