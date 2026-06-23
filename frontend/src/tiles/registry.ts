import type { TileDefinition } from '../types'
import { ConsoleTile } from './console'
import { ModsTile } from './mods'
import { StatsTile } from './stats'
import { PlayersTile } from './players'
import { QuickCommandsTile } from './quick-commands'
import { PerformanceTile } from './performance'
import { SchedulerTile } from './scheduler'
import { WorldsTile } from './worlds'
import { BackupsTile } from './backups'
import { ConfigTile } from './config'
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
    maximizable: true,
    component: ConsoleTile,
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: '##',
    defaultW: 1,
    defaultH: 4,
    minW: 1,
    minH: 3,
    component: StatsTile,
  },
  {
    id: 'players',
    label: 'Players',
    icon: '[]',
    defaultW: 2,
    defaultH: 4,
    minW: 2,
    minH: 2,
    maximizable: true,
    component: PlayersTile,
  },
  {
    id: 'quick-commands',
    label: 'Commands',
    icon: '>>',
    defaultW: 1,
    defaultH: 6,
    minW: 1,
    minH: 3,
    component: QuickCommandsTile,
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '/\\',
    defaultW: 3,
    defaultH: 6,
    minW: 2,
    minH: 2,
    maximizable: true,
    component: PerformanceTile,
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    icon: '()',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 3,
    maximizable: true,
    component: SchedulerTile,
  },
  {
    id: 'worlds',
    label: 'Worlds',
    icon: '{}',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 3,
    maximizable: true,
    component: WorldsTile,
  },
  {
    id: 'backups',
    label: 'Backups',
    icon: '[+]',
    defaultW: 2,
    defaultH: 6,
    minW: 2,
    minH: 3,
    maximizable: true,
    component: BackupsTile,
  },
  {
    id: 'server-config',
    label: 'Config',
    icon: '==',
    defaultW: 3,
    defaultH: 8,
    minW: 1,
    minH: 3,
    maximizable: true,
    component: ConfigTile,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '[!]',
    defaultW: 2,
    defaultH: 4,
    minW: 2,
    minH: 2,
    maximizable: true,
    component: NotificationsTile,
  },
  {
    id: 'mods',
    label: 'Plugins & Mods',
    icon: '<>',
    defaultW: 4,
    defaultH: 8,
    minW: 2,
    minH: 4,
    maximizable: true,
    component: ModsTile,
  },
]
