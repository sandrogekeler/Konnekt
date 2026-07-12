import type { Edge as FlowEdge } from '@xyflow/react'
import type { BlockFlowNode } from './graphMapping'

export interface GraphSnapshot {
  nodes: BlockFlowNode[]
  edges: FlowEdge[]
}

export interface HistoryState {
  past: GraphSnapshot[]
  future: GraphSnapshot[]
  lastTag: string | null
}

export const MAX_HISTORY = 10

export function emptyHistory(): HistoryState {
  return { past: [], future: [], lastTag: null }
}

// Records the pre-mutation snapshot. Consecutive calls carrying the same
// (non-null) tag coalesce into the single entry pushed by the first call in
// the burst, so e.g. a field's keystrokes collapse into one undo step. Any
// untagged (structural) call always pushes a fresh entry and clears the tag,
// so the next tagged burst starts over. Taking a new action always clears
// `future` (redo is only valid immediately after an undo).
export function record(
  state: HistoryState,
  snapshot: GraphSnapshot,
  tag: string | null = null,
): HistoryState {
  if (tag !== null && tag === state.lastTag) return state
  const past = [...state.past, snapshot]
  while (past.length > MAX_HISTORY) past.shift()
  return { past, future: [], lastTag: tag }
}

export function undo(
  state: HistoryState,
  current: GraphSnapshot,
): { state: HistoryState; snapshot: GraphSnapshot } | null {
  if (state.past.length === 0) return null
  const snapshot = state.past[state.past.length - 1]
  const past = state.past.slice(0, -1)
  const future = [...state.future, current]
  return { state: { past, future, lastTag: null }, snapshot }
}

export function redo(
  state: HistoryState,
  current: GraphSnapshot,
): { state: HistoryState; snapshot: GraphSnapshot } | null {
  if (state.future.length === 0) return null
  const snapshot = state.future[state.future.length - 1]
  const future = state.future.slice(0, -1)
  const past = [...state.past, current]
  while (past.length > MAX_HISTORY) past.shift()
  return { state: { past, future, lastTag: null }, snapshot }
}

export function canUndo(state: HistoryState): boolean {
  return state.past.length > 0
}

export function canRedo(state: HistoryState): boolean {
  return state.future.length > 0
}
