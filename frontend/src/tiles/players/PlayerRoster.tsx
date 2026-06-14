import { useEffect, useState } from 'react'
import { GetPlayerRoster } from '../../../wailsjs/go/main/App'
import type { Player } from '../../types'

interface Props {
  serverId: string
  onSelectPlayer: (player: Player) => void
}

type SortKey = 'name' | 'opLevel'

function AvatarHead({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false)
  const key = player.uuid || player.name
  if (failed) {
    return (
      <div
        className="w-6 h-6 rounded-sm shrink-0 flex items-center justify-center text-[10px] font-mono"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
      >
        {player.name[0]?.toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={`https://mc-heads.net/avatar/${key}/24`}
      alt={player.name}
      width={24}
      height={24}
      className="rounded-sm shrink-0"
      onError={() => setFailed(true)}
    />
  )
}

export function PlayerRoster({ serverId, onSelectPlayer }: Props) {
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  useEffect(() => {
    const poll = async () => {
      const list = await GetPlayerRoster(serverId).catch(() => null)
      if (list) setPlayers(list)
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [serverId])

  const filtered = players
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'opLevel') return b.opLevel - a.opLevel
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div
        className="flex gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 rounded px-2 py-1 text-xs font-mono outline-none transition-colors"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded px-2 py-1 text-xs font-mono outline-none"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <option value="name">Name</option>
          <option value="opLevel">OP level</option>
        </select>
      </div>

      {/* list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-xs font-mono"
            style={{ color: 'var(--text-faint)' }}
          >
            {search ? 'No matches' : 'No players online'}
          </div>
        ) : (
          filtered.map((p) => (
            <button
              key={p.name}
              onClick={() => onSelectPlayer(p)}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left w-full"
              style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
            >
              <AvatarHead player={p} />
              <span
                className="flex-1 text-xs font-mono truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {p.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {p.opLevel > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded border border-yellow-400/30 text-yellow-400/70 font-mono">
                    OP{p.opLevel}
                  </span>
                )}
                {p.banned && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded border border-red-400/30 text-red-400/70 font-mono">
                    BAN
                  </span>
                )}
                {p.whitelisted && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded border border-blue-400/30 text-blue-400/70 font-mono">
                    WL
                  </span>
                )}
                <div
                  className="w-1.5 h-1.5 rounded-full ml-1"
                  style={{ background: p.online ? '#4ade80' : 'var(--text-faint)' }}
                />
              </div>
            </button>
          ))
        )}
      </div>

      {/* footer */}
      <div
        className="px-3 py-1.5 shrink-0 text-[10px] font-mono"
        style={{ borderTop: '0.5px solid var(--border-subtle)', color: 'var(--text-faint)' }}
      >
        {players.length} online
      </div>
    </div>
  )
}
