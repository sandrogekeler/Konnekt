export const DEFAULT_SERVER_ID = 'default'

export const EVENTS = {
  LOG_LINE:       'log:line',
  SERVER_STOPPED: 'server:stopped',
  EULA_REQUIRED:  'server:eula-required',
  STATS_SNAPSHOT: 'stats:snapshot',
} as const

export const DEFAULT_LAYOUT_PRESETS = [
  {
    name: 'Default',
    layout: JSON.stringify([
      { i: 'console',        x: 0, y: 0, w: 4, h: 12 },
      { i: 'stats',          x: 4, y: 0, w: 2, h: 4 },
      { i: 'players',        x: 4, y: 4, w: 2, h: 4 },
      { i: 'quick-commands', x: 4, y: 8, w: 2, h: 4 },
    ]),
  },
  {
    name: 'Console Focus',
    layout: JSON.stringify([
      { i: 'console', x: 0, y: 0,  w: 6, h: 14 },
      { i: 'stats',   x: 0, y: 14, w: 3, h: 4 },
      { i: 'players', x: 3, y: 14, w: 3, h: 4 },
    ]),
  },
  {
    name: 'Compact',
    layout: JSON.stringify([
      { i: 'console',        x: 0, y: 0,  w: 3, h: 10 },
      { i: 'stats',          x: 3, y: 0,  w: 3, h: 5 },
      { i: 'players',        x: 3, y: 5,  w: 3, h: 5 },
      { i: 'quick-commands', x: 0, y: 10, w: 3, h: 4 },
      { i: 'performance',    x: 3, y: 10, w: 3, h: 4 },
    ]),
  },
]

export const COLS = 6
export const ROW_HEIGHT = 40
