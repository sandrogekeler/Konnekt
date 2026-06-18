import { useState, useCallback, useEffect } from 'react'
import {
  GetScheduleGraphs,
  SaveScheduleGraph,
  DeleteScheduleGraph,
  SetScheduleGraphEnabled,
  GetScheduleBlockDefs,
  RunScheduleGraphNow,
  GetScheduleRunHistory,
  PreviewScheduleNode,
} from '../../../wailsjs/go/main/App'
import type { models } from '../../../wailsjs/go/models'

export function useScheduler() {
  const [graphs,    setGraphs]    = useState<models.Graph[]>([])
  const [blockDefs, setBlockDefs] = useState<models.BlockDef[]>([])
  const [history,   setHistory]   = useState<models.RunRecord[]>([])
  const [loading,   setLoading]   = useState(false)

  const refreshGraphs = useCallback(async () => {
    const g = await GetScheduleGraphs()
    setGraphs(g ?? [])
  }, [])

  const refreshHistory = useCallback(async () => {
    const h = await GetScheduleRunHistory()
    setHistory(h ?? [])
  }, [])

  useEffect(() => {
    Promise.all([
      GetScheduleGraphs().then(g => setGraphs(g ?? [])),
      GetScheduleBlockDefs().then(d => setBlockDefs(d ?? [])),
      GetScheduleRunHistory().then(h => setHistory(h ?? [])),
    ])
  }, [])

  const saveGraph = useCallback(async (g: models.Graph): Promise<models.Graph> => {
    setLoading(true)
    try {
      const saved = await SaveScheduleGraph(g)
      await refreshGraphs()
      return saved
    } finally {
      setLoading(false)
    }
  }, [refreshGraphs])

  const deleteGraph = useCallback(async (id: string) => {
    await DeleteScheduleGraph(id)
    await refreshGraphs()
  }, [refreshGraphs])

  const setEnabled = useCallback(async (id: string, enabled: boolean) => {
    await SetScheduleGraphEnabled(id, enabled)
    await refreshGraphs()
  }, [refreshGraphs])

  const runGraph = useCallback(async (id: string): Promise<models.RunRecord> => {
    setLoading(true)
    try {
      const rec = await RunScheduleGraphNow(id)
      await refreshHistory()
      return rec
    } finally {
      setLoading(false)
    }
  }, [refreshHistory])

  const previewNode = useCallback(
    (graph: models.Graph, nodeId: string): Promise<models.NodePreview> =>
      PreviewScheduleNode(graph, nodeId),
    [],
  )

  return {
    graphs, blockDefs, history, loading,
    saveGraph, deleteGraph, setEnabled, runGraph, previewNode,
    refreshGraphs, refreshHistory,
  }
}
