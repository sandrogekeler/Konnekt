import { useState, useEffect, useCallback, useRef } from 'react'
import { EventsOn } from '../../../wailsjs/runtime/runtime'
import {
  GetScheduleGraphs,
  DeleteScheduleGraph,
  SetScheduleGraphEnabled,
  GetScheduleBlockDefs,
  RunScheduleGraphNow,
  GetScheduleRunHistory,
  ImportScheduleGraphJSON,
} from '../../../wailsjs/go/main/App'
import type { models } from '../../../wailsjs/go/models'
import type { TileProps } from '../../types'
import { EVENTS } from '../../lib/constants'

// ─── Dev Panel ───────────────────────────────────────────────────────────────
// Throwaway scaffolding for testing the scheduler engine without a visual
// editor. Will be replaced by the React Flow editor in the next phase.

export function SchedulerTile({ maximized }: TileProps) {
  if (!maximized) return <SchedulerSummary />
  return <SchedulerDevPanel />
}

function SchedulerSummary() {
  const [graphs, setGraphs] = useState<models.Graph[]>([])

  useEffect(() => {
    GetScheduleGraphs().then((g: models.Graph[] | null) => setGraphs(g ?? []))
  }, [])

  const enabled = graphs.filter(g => g.enabled).length

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-2xl font-mono" style={{ color: 'var(--accent)' }}>
        {graphs.length}
      </span>
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        {enabled} active graph{enabled !== 1 ? 's' : ''}
      </span>
      <span className="text-xs font-mono mt-1" style={{ color: 'var(--text-faint)' }}>
        maximize to manage
      </span>
    </div>
  )
}

function SchedulerDevPanel() {
  const [graphs, setGraphs] = useState<models.Graph[]>([])
  const [blockDefs, setBlockDefs] = useState<models.BlockDef[]>([])
  const [history, setHistory] = useState<models.RunRecord[]>([])
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [runningID, setRunningID] = useState<string | null>(null)
  const [tab, setTab] = useState<'graphs' | 'blocks' | 'history' | 'import'>('graphs')
  const liveRef = useRef<string[]>([])
  const [liveLog, setLiveLog] = useState<string[]>([])

  const refresh = useCallback(async () => {
    const [g, h] = await Promise.all([GetScheduleGraphs(), GetScheduleRunHistory()])
    setGraphs(g ?? [])
    setHistory(h ?? [])
  }, [])

  useEffect(() => {
    refresh()
    GetScheduleBlockDefs().then(d => setBlockDefs(d ?? []))

    const append = (msg: string) => {
      liveRef.current = [...liveRef.current.slice(-49), msg]
      setLiveLog([...liveRef.current])
    }

    let c1: (() => void) | undefined
    let c2: (() => void) | undefined
    let c3: (() => void) | undefined
    let c4: (() => void) | undefined
    try {
      c1 = EventsOn(EVENTS.SCHEDULE_RUN_STARTED, (d: unknown) => {
        const e = d as Record<string, unknown>
        append(`▶ Run started  graph=${e.graphName} run=${e.runId}`)
      })
      c2 = EventsOn(EVENTS.SCHEDULE_NODE_FINISHED, (d: unknown) => {
        const e = d as Record<string, unknown>
        append(`  node=${e.nodeId} type=${e.type ?? ''} → ${e.firedPort ?? ''} (${e.status})`)
      })
      c3 = EventsOn(EVENTS.SCHEDULE_RUN_FINISHED, (d: unknown) => {
        const e = d as Record<string, unknown>
        append(`■ Run finished graph=${e.graphId} status=${e.status}`)
        refresh()
      })
      c4 = EventsOn(EVENTS.SCHEDULE_NOTIFY, (d: unknown) => {
        const e = d as Record<string, unknown>
        append(`[${e.kind}] ${e.message}`)
      })
    } catch { /* Wails unavailable outside desktop */ }

    return () => { c1?.(); c2?.(); c3?.(); c4?.() }
  }, [refresh])

  const handleImport = async () => {
    setImportError(null)
    try {
      await ImportScheduleGraphJSON(importText)
      setImportText('')
      await refresh()
      setTab('graphs')
    } catch (e) {
      setImportError(String(e))
    }
  }

  const handleRun = async (id: string) => {
    setRunningID(id)
    try {
      await RunScheduleGraphNow(id)
    } catch (e) {
      console.error('RunGraphNow failed:', e)
    } finally {
      setRunningID(null)
      await refresh()
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await SetScheduleGraphEnabled(id, !enabled)
    await refresh()
  }

  const handleDelete = async (id: string) => {
    await DeleteScheduleGraph(id)
    await refresh()
  }

  const TABS = ['graphs', 'blocks', 'history', 'import'] as const

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      {/* Tab bar */}
      <div className="shrink-0 flex gap-1 px-3 pt-2 pb-1" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-2 py-0.5 text-xs font-mono rounded"
            style={{
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#000' : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          dev panel · editor coming soon
        </span>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === 'graphs' && (
            <div className="flex flex-col gap-2">
              {graphs.length === 0 && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                  No graphs yet — use the Import tab to add one.
                </span>
              )}
              {graphs.map(g => (
                <div
                  key={g.id}
                  className="rounded p-2 flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(g.id, g.enabled)}
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: g.enabled ? 'var(--accent)' : 'var(--border-subtle)',
                        color: g.enabled ? '#000' : 'var(--text-muted)',
                      }}
                    >
                      {g.enabled ? 'ON' : 'OFF'}
                    </button>
                    <span className="text-sm font-mono flex-1">{g.name || g.id}</span>
                    <button
                      onClick={() => handleRun(g.id)}
                      disabled={runningID === g.id}
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                    >
                      {runningID === g.id ? '…' : '▶ Run now'}
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ color: '#f87171' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                    {g.nodes?.length ?? 0} nodes · {g.edges?.length ?? 0} edges · id: {g.id}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'blocks' && (
            <div className="flex flex-col gap-1">
              {(['trigger', 'action', 'control', 'notify'] as const).map(cat => {
                const defs = blockDefs.filter(d => d.category === cat)
                if (defs.length === 0) return null
                return (
                  <div key={cat} className="mb-2">
                    <div className="text-xs font-mono uppercase mb-1" style={{ color: 'var(--text-faint)' }}>
                      {cat}
                    </div>
                    {defs.map(d => (
                      <div key={d.id} className="flex flex-col gap-0.5 mb-1 px-2 py-1 rounded"
                        style={{ background: 'var(--bg-surface)' }}>
                        <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{d.id}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.description}</span>
                        {d.configSchema?.length > 0 && (
                          <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                            config: {d.configSchema.map((f: models.ConfigField) => f.key).join(', ')}
                          </span>
                        )}
                        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                          outputs: {d.controlOutputs?.join(', ')} {d.source === 'manifest' ? '· manifest' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'history' && (
            <div className="flex flex-col gap-1">
              {history.length === 0 && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                  No runs yet.
                </span>
              )}
              {history.map(r => (
                <div key={r.id} className="rounded p-2 flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === 'success' ? '#166534' : r.status === 'running' ? '#78350f' : '#7f1d1d',
                        color: '#fff',
                      }}
                    >
                      {r.status}
                    </span>
                    <span className="text-xs font-mono flex-1">{r.graphName}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{r.trigger}</span>
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                    {new Date(r.startedAt).toLocaleTimeString()} · {r.nodes?.length ?? 0} nodes
                    {r.error ? ` · ${r.error}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'import' && (
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                Paste a Graph JSON object to import it:
              </div>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={16}
                className="font-mono text-xs rounded p-2 w-full resize-none"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  border: '0.5px solid var(--border-subtle)',
                  outline: 'none',
                }}
                placeholder={SAMPLE_GRAPH_JSON}
              />
              {importError && (
                <span className="text-xs font-mono" style={{ color: '#f87171' }}>{importError}</span>
              )}
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="text-xs font-mono px-3 py-1 rounded self-start"
                style={{ background: 'var(--accent)', color: '#000' }}
              >
                Import graph
              </button>
            </div>
          )}
        </div>

        {/* Live event log */}
        <div
          className="w-56 shrink-0 overflow-y-auto p-2 flex flex-col gap-0.5"
          style={{ borderLeft: '0.5px solid var(--border-subtle)' }}
        >
          <div className="text-xs font-mono mb-1 sticky top-0" style={{ color: 'var(--text-faint)' }}>
            live events
          </div>
          {liveLog.length === 0 && (
            <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>waiting…</span>
          )}
          {[...liveLog].reverse().map((line, i) => (
            <span key={i} className="text-xs font-mono break-all" style={{ color: 'var(--text-muted)' }}>
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Sample graph JSON shown as placeholder in the import textarea.
const SAMPLE_GRAPH_JSON = `{
  "name": "Welcome message",
  "enabled": true,
  "nodes": [
    {
      "id": "t1",
      "type": "trigger.playerJoined",
      "config": { "cooldownSeconds": 0 },
      "position": { "x": 0, "y": 0 }
    },
    {
      "id": "a1",
      "type": "action.consoleCommand",
      "config": { "command": "say Welcome {{trigger.player}}!" },
      "position": { "x": 250, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "kind": "control",
      "source": "t1",
      "sourcePort": "onComplete",
      "target": "a1",
      "targetPort": "in"
    }
  ]
}`
