import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as App from '../../../wailsjs/go/main/App'
import type { models } from '../../../wailsjs/go/models'
import { useScheduler } from './useScheduler'

vi.mock('../../../wailsjs/go/main/App')

function graph(id: string): models.Graph {
  return {
    id,
    name: id,
    enabled: true,
    nodes: [],
    edges: [],
    createdAt: 0,
    updatedAt: 0,
  } as unknown as models.Graph
}

describe('useScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(App.GetScheduleGraphs).mockResolvedValue([graph('g1')])
    vi.mocked(App.GetScheduleBlockDefs).mockResolvedValue([])
    vi.mocked(App.GetScheduleRunHistory).mockResolvedValue([])
    vi.mocked(App.GetScheduleNextRuns).mockResolvedValue({ g1: 1000 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('populates graphs/blockDefs/history/nextRuns on mount', async () => {
    const { result } = renderHook(() => useScheduler())
    await waitFor(() => expect(result.current.graphs).toEqual([graph('g1')]))
    expect(result.current.nextRuns).toEqual({ g1: 1000 })
    expect(App.GetScheduleGraphs).toHaveBeenCalledTimes(1)
  })

  it('saveGraph toggles loading and refreshes graphs', async () => {
    const saved = graph('g1')
    vi.mocked(App.SaveScheduleGraph).mockResolvedValue(saved)
    const { result } = renderHook(() => useScheduler())
    await waitFor(() => expect(result.current.graphs).toEqual([graph('g1')]))

    vi.mocked(App.GetScheduleGraphs).mockClear()
    await act(async () => {
      await result.current.saveGraph(saved)
    })
    expect(App.SaveScheduleGraph).toHaveBeenCalledWith(saved)
    expect(App.GetScheduleGraphs).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(false)
  })

  it('runGraph toggles loading and refreshes history', async () => {
    const record = { id: 'r1', graphId: 'g1', status: 'success' } as unknown as models.RunRecord
    vi.mocked(App.RunScheduleGraphNow).mockResolvedValue(record)
    const { result } = renderHook(() => useScheduler())
    await waitFor(() => expect(result.current.graphs).toEqual([graph('g1')]))

    vi.mocked(App.GetScheduleRunHistory).mockClear()
    await act(async () => {
      await result.current.runGraph('g1')
    })
    expect(App.RunScheduleGraphNow).toHaveBeenCalledWith('g1')
    expect(App.GetScheduleRunHistory).toHaveBeenCalledTimes(1)
    expect(result.current.loading).toBe(false)
  })

  it('re-polls next-runs every 30s and stops after unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useScheduler())

    // waitFor polls via real setTimeout, which never fires once fake timers
    // are active — flush the mount effect's already-resolved Promise.all via
    // the microtask queue instead.
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.nextRuns).toEqual({ g1: 1000 })

    vi.mocked(App.GetScheduleNextRuns).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(App.GetScheduleNextRuns).toHaveBeenCalledTimes(1)

    unmount()
    vi.mocked(App.GetScheduleNextRuns).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(App.GetScheduleNextRuns).not.toHaveBeenCalled()
  })
})
