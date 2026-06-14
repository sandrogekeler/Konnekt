import { useState } from 'react'
import type { Player } from '../../types'

interface Props {
  player: Player
  onClick: () => void
}

export function PlayerCard({ player, onClick }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const avatarKey = player.uuid || player.name

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors text-center w-full cursor-pointer"
      style={{ border: '0.5px solid var(--border-subtle)' }}
    >
      <div className="relative">
        {imgFailed ? (
          <div
            className="w-8 h-8 rounded-sm flex items-center justify-center text-xs font-mono"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            {player.name[0]?.toUpperCase()}
          </div>
        ) : (
          <img
            src={`https://mc-heads.net/avatar/${avatarKey}/32`}
            alt={player.name}
            width={32}
            height={32}
            className="rounded-sm"
            onError={() => setImgFailed(true)}
          />
        )}
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{
            background: player.online ? '#4ade80' : 'var(--text-faint)',
            border: '1.5px solid var(--bg-base)',
          }}
        />
      </div>
      <span
        className="text-xs font-mono truncate w-full"
        style={{ color: 'var(--text-secondary)' }}
      >
        {player.name}
      </span>
    </button>
  )
}
