import { useState } from 'react'
import type { TileProps, Player } from '../../types'
import { PlayerGrid } from './PlayerGrid'
import { PlayerRoster } from './PlayerRoster'
import { PlayerDetailPopup } from './PlayerDetailPopup'

export function PlayersTile({ serverId, maximized }: TileProps) {
  const [selected, setSelected] = useState<Player | null>(null)

  return (
    <div className="flex flex-col h-full">
      {maximized ? (
        <PlayerRoster serverId={serverId} onSelectPlayer={setSelected} />
      ) : (
        <PlayerGrid serverId={serverId} onSelectPlayer={setSelected} />
      )}

      {selected && (
        <PlayerDetailPopup
          player={selected}
          serverId={serverId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
