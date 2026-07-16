import { QuickCommandsPanel } from '../../components/QuickCommandsPanel'
import type { TileProps } from '../../types'

export function QuickCommandsTile({ serverId }: TileProps) {
  return <QuickCommandsPanel serverId={serverId} />
}
