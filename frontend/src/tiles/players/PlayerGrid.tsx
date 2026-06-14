import { useEffect, useState } from 'react'
import { GetPlayers } from '../../../wailsjs/go/main/App'
import type { Player } from '../../types'
import { PlayerCard } from './PlayerCard'

interface Props {
  serverId: string
  onSelectPlayer: (player: Player) => void
}

export function PlayerGrid({ serverId, onSelectPlayer }: Props) {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    const poll = async () => {
      const list = await GetPlayers(serverId).catch(() => null)
      if (list) setPlayers(list)
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [serverId])

  if (players.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-xs font-mono"
        style={{ color: 'var(--text-faint)' }}
      >
        No players online
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}
      >
        {players.map((p) => (
          <PlayerCard key={p.name} player={p} onClick={() => onSelectPlayer(p)} />
        ))}
      </div>
    </div>
  )
}
