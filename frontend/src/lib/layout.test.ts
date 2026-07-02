import { describe, it, expect } from 'vitest'
import type { LayoutItem } from 'react-grid-layout'
import { collapseEmptyRows } from './layout'

function item(i: string, x: number, y: number, w: number, h: number): LayoutItem {
  return { i, x, y, w, h }
}

describe('collapseEmptyRows', () => {
  it('returns an empty array unchanged', () => {
    expect(collapseEmptyRows([])).toEqual([])
  })

  it('leaves a gap-free layout untouched', () => {
    const layout = [item('a', 0, 0, 2, 2), item('b', 2, 2, 2, 2)]
    expect(collapseEmptyRows(layout)).toEqual(layout)
  })

  it('shifts items up past a single empty row', () => {
    // row 0-1: item a. row 2: empty. row 3-4: item b.
    const layout = [item('a', 0, 0, 2, 2), item('b', 0, 3, 2, 2)]
    const result = collapseEmptyRows(layout)
    expect(result.find((l) => l.i === 'a')?.y).toBe(0)
    expect(result.find((l) => l.i === 'b')?.y).toBe(2)
  })

  it('collapses multiple empty rows', () => {
    // rows 0-1: item a. rows 2-4: empty. rows 5-6: item b.
    const layout = [item('a', 0, 0, 2, 2), item('b', 0, 5, 2, 2)]
    const result = collapseEmptyRows(layout)
    expect(result.find((l) => l.i === 'a')?.y).toBe(0)
    expect(result.find((l) => l.i === 'b')?.y).toBe(2)
  })

  it('leaves partially-filled rows intact', () => {
    // row 0: item a (x0-1) and item b (x2-3) both occupy row 0 only.
    const layout = [item('a', 0, 0, 2, 1), item('b', 2, 0, 2, 1)]
    expect(collapseEmptyRows(layout)).toEqual(layout)
  })

  it('preserves x and w, only mutates y', () => {
    const layout = [item('a', 3, 0, 2, 2), item('b', 1, 4, 4, 1)]
    const result = collapseEmptyRows(layout)
    const a = result.find((l) => l.i === 'a')!
    const b = result.find((l) => l.i === 'b')!
    expect(a.x).toBe(3)
    expect(a.w).toBe(2)
    expect(b.x).toBe(1)
    expect(b.w).toBe(4)
  })

  it('passes through items with non-finite y unchanged', () => {
    const bad = { i: 'bad', x: 0, y: NaN, w: 1, h: 1 } as unknown as LayoutItem
    const layout = [item('a', 0, 0, 2, 2), bad]
    const result = collapseEmptyRows(layout)
    expect(result.find((l) => l.i === 'bad')).toEqual(bad)
  })
})
