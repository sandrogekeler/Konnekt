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
    defaultW: 4,
    defaultH: 12,
    minW: 2,
    minH: 6,
    component: ConsoleTile,
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: '##',
    defaultW: 2,
    defaultH: 4,
    minW: 2,
    minH: 4,
    component: StatsTile,
  },
  {
    id: 'players',
    label: 'Players',
    icon: '[]',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 6,
    component: PlayersTile,
  },
  {
    id: 'quick-commands',
    label: 'Quick Commands',
    icon: '>>',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 6,
    component: QuickCommandsTile,
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '/\\',
    defaultW: 3,
    defaultH: 6,
    minW: 3,
    minH: 6,
    component: PerformanceTile,
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    icon: '()',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 6,
    component: SchedulerTile,
  },
  {
    id: 'worlds',
    label: 'Worlds',
    icon: '{}',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 6,
    component: WorldsTile,
  },
  {
    id: 'backups',
    label: 'Backups',
    icon: '[+]',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 6,
    component: BackupsTile,
  },
  {
    id: 'server-config',
    label: 'Server Config',
    icon: '==',
    defaultW: 3,
    defaultH: 8,
    minW: 3,
    minH: 8,
    component: ServerConfigTile,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '[!]',
    defaultW: 2,
    defaultH: 4,
    minW: 2,
    minH: 4,
    component: NotificationsTile,
  },
]
