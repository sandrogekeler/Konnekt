import type { LayoutItem } from 'react-grid-layout'

/**
 * Collapse fully-empty horizontal rows out of a grid layout.
 *
 * A row `r` is "occupied" if any item spans it (`item.y <= r < item.y + item.h`).
 * Each item is shifted up by the number of *unoccupied* rows strictly above its top,
 * so tiles rise only when an entire row above them is empty. Partially-filled rows are
 * left intact, columns are never repacked, and horizontal positions (x, w) are untouched —
 * so relative vertical order is preserved and no overlaps can be introduced.
 */
export function collapseEmptyRows(layout: readonly LayoutItem[]): LayoutItem[] {
  const valid = layout.filter((l) => isFinite(l.y))
  if (valid.length === 0) return layout.map((l) => ({ ...l }))

  const maxY = valid.reduce((m, l) => Math.max(m, l.y + l.h), 0)

  // occupied[r] === true when some item covers grid row r
  const occupied = new Array<boolean>(maxY).fill(false)
  for (const l of valid) {
    for (let r = l.y; r < l.y + l.h; r++) occupied[r] = true
  }

  // emptyAbove[y] = number of unoccupied rows in [0, y)
  const emptyAbove = new Array<number>(maxY + 1).fill(0)
  for (let r = 0; r < maxY; r++) {
    emptyAbove[r + 1] = emptyAbove[r] + (occupied[r] ? 0 : 1)
  }

  return layout.map((l) =>
    isFinite(l.y) ? { ...l, y: l.y - emptyAbove[l.y] } : { ...l },
  )
}
