import { describe, it, expect } from 'vitest'
import { emptyHistory, record, undo, redo, canUndo, canRedo, MAX_HISTORY } from './graphHistory'
import type { GraphSnapshot } from './graphHistory'

function snap(id: string): GraphSnapshot {
  return {
    nodes: [
      {
        id,
        type: 'block',
        position: { x: 0, y: 0 },
        data: { blockType: id, config: {}, label: id },
      },
    ],
    edges: [],
  }
}

describe('graphHistory', () => {
  it('starts empty', () => {
    const h = emptyHistory()
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('record pushes a past entry and clears future', () => {
    let h = emptyHistory()
    h = record(h, snap('a'))
    expect(canUndo(h)).toBe(true)
    expect(h.past).toEqual([snap('a')])
    expect(h.future).toEqual([])
  })

  it('coalesces consecutive records sharing the same tag', () => {
    let h = emptyHistory()
    h = record(h, snap('a'), 'cfg:n1:label')
    h = record(h, snap('b'), 'cfg:n1:label')
    h = record(h, snap('c'), 'cfg:n1:label')
    expect(h.past).toEqual([snap('a')])
  })

  it('does not coalesce across differing tags', () => {
    let h = emptyHistory()
    h = record(h, snap('a'), 'cfg:n1:label')
    h = record(h, snap('b'), 'cfg:n1:other')
    expect(h.past).toEqual([snap('a'), snap('b')])
  })

  it('an untagged record always pushes, resetting the coalescing tag', () => {
    let h = emptyHistory()
    h = record(h, snap('a'), 'cfg:n1:label')
    h = record(h, snap('b'))
    h = record(h, snap('c'), 'cfg:n1:label')
    expect(h.past).toEqual([snap('a'), snap('b'), snap('c')])
  })

  it('caps past at MAX_HISTORY, dropping the oldest', () => {
    let h = emptyHistory()
    for (let i = 0; i < MAX_HISTORY + 2; i++) {
      h = record(h, snap(String(i)))
    }
    expect(h.past.length).toBe(MAX_HISTORY)
    expect(h.past[0]).toEqual(snap('2'))
    expect(h.past[h.past.length - 1]).toEqual(snap(String(MAX_HISTORY + 1)))
  })

  it('undo moves the latest past entry to future and returns it', () => {
    let h = emptyHistory()
    h = record(h, snap('a'))
    h = record(h, snap('b'))
    const current = snap('present')
    const result = undo(h, current)
    expect(result).not.toBeNull()
    expect(result!.snapshot).toEqual(snap('b'))
    h = result!.state
    expect(h.past).toEqual([snap('a')])
    expect(h.future).toEqual([current])
  })

  it('undo returns null when past is empty', () => {
    const h = emptyHistory()
    expect(undo(h, snap('present'))).toBeNull()
  })

  it('redo moves the latest future entry back to past and returns it', () => {
    let h = emptyHistory()
    h = record(h, snap('a'))
    const beforeUndo = snap('present')
    const undone = undo(h, beforeUndo)!
    h = undone.state
    const result = redo(h, undone.snapshot)
    expect(result).not.toBeNull()
    expect(result!.snapshot).toEqual(beforeUndo)
    h = result!.state
    expect(h.future).toEqual([])
    expect(h.past).toEqual([snap('a')])
  })

  it('redo returns null when future is empty', () => {
    const h = emptyHistory()
    expect(redo(h, snap('present'))).toBeNull()
  })

  it('a new action after an undo clears future (no redo available)', () => {
    let h = emptyHistory()
    h = record(h, snap('a'))
    const undone = undo(h, snap('present'))!
    h = undone.state
    expect(canRedo(h)).toBe(true)
    h = record(h, snap('b'))
    expect(canRedo(h)).toBe(false)
  })
})
