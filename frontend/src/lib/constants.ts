export const DEFAULT_SERVER_ID = 'default'

export const DEFAULT_LAYOUT_PRESETS = [
  {
    name: 'Default',
    layout: JSON.stringify([
      { i: 'console', x: 0, y: 0, w: 8, h: 12 },
      { i: 'stats', x: 8, y: 0, w: 4, h: 4 },
      { i: 'players', x: 8, y: 4, w: 4, h: 4 },
      { i: 'quick-commands', x: 8, y: 8, w: 4, h: 4 },
    ]),
  },
  {
    name: 'Console Focus',
    layout: JSON.stringify([
      { i: 'console', x: 0, y: 0, w: 12, h: 14 },
      { i: 'stats', x: 0, y: 14, w: 6, h: 4 },
      { i: 'players', x: 6, y: 14, w: 6, h: 4 },
    ]),
  },
  {
    name: 'Compact',
    layout: JSON.stringify([
      { i: 'console', x: 0, y: 0, w: 6, h: 10 },
      { i: 'stats', x: 6, y: 0, w: 6, h: 5 },
      { i: 'players', x: 6, y: 5, w: 6, h: 5 },
      { i: 'quick-commands', x: 0, y: 10, w: 6, h: 4 },
      { i: 'performance', x: 6, y: 10, w: 6, h: 4 },
    ]),
  },
]

export const COLS = 12
export const ROW_HEIGHT = 40
