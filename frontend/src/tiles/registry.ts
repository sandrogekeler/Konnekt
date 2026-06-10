import type { TileDefinition } from '../types'
import { ConsoleTile } from './console'
import { StatsTile } from './stats'
import { PlayersTile } from './players'
import { QuickCommandsTile } from './quick-commands'
import { PerformanceTile } from './performance'
import { SchedulerTile } from './scheduler'
import { WorldsTile } from './worlds'
import { BackupsTile } from './backups'
import { ServerConfigTile } from './server-config'
import { NotificationsTile } from './notifications'

export const TILE_REGISTRY: TileDefinition[] = [
  {
    id: 'console',
    label: 'Console',
    icon: '>_',
    defaultW: 8,
    defaultH: 12,
    minW: 4,
    minH: 6,
    component: ConsoleTile,
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: '📊',
    defaultW: 4,
    defaultH: 4,
    minW: 3,
    minH: 3,
    component: StatsTile,
  },
  {
    id: 'players',
    label: 'Players',
    icon: '👥',
    defaultW: 4,
    defaultH: 6,
    minW: 3,
    minH: 4,
    component: PlayersTile,
  },
  {
    id: 'quick-commands',
    label: 'Quick Commands',
    icon: '⚡',
    defaultW: 4,
    defaultH: 6,
    minW: 3,
    minH: 4,
    component: QuickCommandsTile,
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '📈',
    defaultW: 6,
    defaultH: 6,
    minW: 4,
    minH: 4,
    component: PerformanceTile,
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    icon: '🕐',
    defaultW: 4,
    defaultH: 6,
    minW: 3,
    minH: 4,
    component: SchedulerTile,
  },
  {
    id: 'worlds',
    label: 'Worlds',
    icon: '🌍',
    defaultW: 4,
    defaultH: 6,
    minW: 3,
    minH: 4,
    component: WorldsTile,
  },
  {
    id: 'backups',
    label: 'Backups',
    icon: '💾',
    defaultW: 4,
    defaultH: 6,
    minW: 3,
    minH: 4,
    component: BackupsTile,
  },
  {
    id: 'server-config',
    label: 'Server Config',
    icon: '⚙️',
    defaultW: 6,
    defaultH: 8,
    minW: 4,
    minH: 5,
    component: ServerConfigTile,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '🔔',
    defaultW: 4,
    defaultH: 4,
    minW: 3,
    minH: 3,
    component: NotificationsTile,
  },
]
