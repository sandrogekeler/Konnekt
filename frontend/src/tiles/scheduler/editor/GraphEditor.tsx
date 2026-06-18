import {
  useState, useCallback, useEffect, useRef, useMemo, type DragEvent,
} from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  type Connection, type Node as FlowNode, type Edge as FlowEdge,
} from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'
import { BlockNode } from './BlockNode'
import { BlockPalette } from './BlockPalette'
import { NodeConfigPanel } from './NodeConfigPanel'
import {
  graphToFlow, flowToGraph, isValidConnection, randId, defaultConfig,
  type NodeData, type BlockFlowNode,
} from './graphMapping'
import type { models } from '../../../../wailsjs/go/models'

const nodeTypes = { block: BlockNode }

interface GraphEditorProps {
  graphs: models.Graph[]
  blockDefs: models.BlockDef[]
  onSave: (g: models.Graph) => Promise<models.Graph>
  onDelete: (id: string) => Promise<void>
  onSetEnabled: (id: string, enabled: boolean) => Promise<void>
  onRun: (id: string) => Promise<models.RunRecord>
}

// Outer wrapper provides ReactFlowProvider so useReactFlow() works inside.
export function GraphEditor(props: GraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner {...props} />
    </ReactFlowProvider>
  )
}

function GraphEditorInner({
  graphs, blockDefs, onSave, onDelete, onSetEnabled, onRun,
}: GraphEditorProps) {
  const { screenToFlowPosition } = useReactFlow()

  const defMap = useMemo(
    () => new Map(blockDefs.map(d => [d.id, d])),
    [blockDefs],
  )

  // ── Graph metadata ────────────────────────────────────────────────────────
  const [graphId,      setGraphId]      = useState('')
  const [graphName,    setGraphName]    = useState('')
  const [graphEnabled, setGraphEnabled] = useState(false)
  const [createdAt,    setCreatedAt]    = useState(0)
  const [nameEditing,  setNameEditing]  = useState(false)

  // ── Canvas state ──────────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [runStatus, setRunStatus]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const runStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showRunStatus = useCallback((msg: string) => {
    setRunStatus(msg)
    if (runStatusTimer.current) clearTimeout(runStatusTimer.current)
    runStatusTimer.current = setTimeout(() => setRunStatus(null), 4000)
  }, [])

  // ── Load graph into canvas ────────────────────────────────────────────────
  const loadGraph = useCallback((g: models.Graph) => {
    const { nodes: ns, edges: es } = graphToFlow(g, defMap)
    setNodes(ns)
    setEdges(es)
    setGraphId(g.id)
    setGraphName(g.name)
    setGraphEnabled(g.enabled)
    setCreatedAt(g.createdAt)
    setSelectedNodeId(null)
  }, [defMap, setNodes, setEdges])

  // Auto-load first graph when graphs list arrives
  useEffect(() => {
    if (graphs.length > 0 && !graphId) {
      loadGraph(graphs[0])
    }
  }, [graphs, graphId, loadGraph])

  // ── Connect handler ───────────────────────────────────────────────────────
  const onConnect = useCallback((connection: Connection) => {
    const srcH = connection.sourceHandle ?? ''
    const isData = srcH.startsWith('data:')
    setEdges(es => addEdge({
      ...connection,
      id: randId(),
      type: 'smoothstep',
      style: isData ? { strokeDasharray: '4 2', stroke: '#60a5fa' } : undefined,
      data: { kind: isData ? 'data' : 'control' } as Record<string, unknown>,
    }, es))
  }, [setEdges])

  // ── Node selection ────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // ── Config editing ────────────────────────────────────────────────────────
  const updateNodeConfig = useCallback((key: string, value: unknown) => {
    if (!selectedNodeId) return
    setNodes(ns => ns.map(n =>
      n.id === selectedNodeId
        ? { ...n, data: { ...n.data, config: { ...(n.data as NodeData).config, [key]: value } } }
        : n,
    ))
  }, [selectedNodeId, setNodes])

  // ── Add block ─────────────────────────────────────────────────────────────
  const addBlock = useCallback((def: models.BlockDef, position?: { x: number; y: number }) => {
    const id = randId()
    const pos = position ?? { x: 80 + nodes.length * 30, y: 80 + nodes.length * 20 }
    setNodes(ns => [...ns, {
      id,
      type: 'block' as const,
      position: pos,
      data: {
        blockType: def.id,
        config: defaultConfig(def),
        label: def.label,
      },
    }])
    setSelectedNodeId(id)
  }, [nodes.length, setNodes])

  // Drag-drop from palette onto canvas
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const blockType = e.dataTransfer.getData('blockType')
    const def = defMap.get(blockType)
    if (!def) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addBlock(def, position)
  }, [defMap, screenToFlowPosition, addBlock])

  // ── New graph ─────────────────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    setNodes([])
    setEdges([])
    setGraphId('')
    setGraphName('New graph')
    setGraphEnabled(false)
    setCreatedAt(0)
    setSelectedNodeId(null)
  }, [setNodes, setEdges])

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (): Promise<string> => {
    setSaving(true)
    try {
      const graph = flowToGraph(
        { id: graphId, name: graphName || 'Untitled', enabled: graphEnabled, createdAt },
        nodes,
        edges,
      )
      const saved = await onSave(graph)
      setGraphId(saved.id)
      setCreatedAt(saved.createdAt)
      return saved.id
    } finally {
      setSaving(false)
    }
  }, [graphId, graphName, graphEnabled, createdAt, nodes, edges, onSave])

  // ── Run now ───────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    const id = await handleSave()
    const rec = await onRun(id)
    if (rec.status === 'skipped') {
      showRunStatus('⚠ Graph is already running')
    } else if (rec.status === 'failed') {
      showRunStatus(`✕ Run failed: ${rec.error || 'unknown error'}`)
    } else {
      showRunStatus(`✓ Run completed (${rec.nodes?.length ?? 0} nodes)`)
    }
  }, [handleSave, onRun, showRunStatus])

  // ── Toggle enabled ────────────────────────────────────────────────────────
  const handleToggleEnabled = useCallback(async () => {
    if (!graphId) return
    const next = !graphEnabled
    setGraphEnabled(next)
    await onSetEnabled(graphId, next)
  }, [graphId, graphEnabled, onSetEnabled])

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!graphId) return
    await onDelete(graphId)
    handleNew()
  }, [graphId, onDelete, handleNew])

  // ── Derived state for config panel ────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const selectedDef  = selectedNode ? defMap.get((selectedNode.data as NodeData).blockType) : undefined

  const ctxValue = useMemo(() => ({ blockDefs: defMap, edges }), [defMap, edges])

  // ── Toolbar button style helper ───────────────────────────────────────────
  const btn = (active = false, danger = false): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontFamily: 'monospace',
    cursor: 'pointer',
    background: active ? 'var(--accent)' : danger ? 'transparent' : 'var(--bg-surface)',
    color: active ? '#000' : danger ? '#ef4444' : 'var(--text-muted)',
    border: `0.5px solid ${danger ? '#ef4444' : 'var(--border-subtle)'}`,
  })

  return (
    <SchedulerCtx.Provider value={ctxValue}>
      <div className="flex flex-col" style={{ height: '100%' }}>

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 flex-wrap"
          style={{ borderBottom: '0.5px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          {/* Graph selector */}
          <select
            value={graphId}
            onChange={e => {
              const g = graphs.find(x => x.id === e.target.value)
              if (g) loadGraph(g)
            }}
            style={{
              background: 'var(--bg-base)',
              border: '0.5px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              fontFamily: 'monospace',
              maxWidth: 160,
            }}
          >
            {graphs.length === 0 && <option value="">— no graphs —</option>}
            {graphs.map(g => (
              <option key={g.id} value={g.id}>{g.name || g.id}</option>
            ))}
            {graphId === '' && <option value="">— new graph —</option>}
          </select>

          {/* Graph name */}
          {nameEditing ? (
            <input
              autoFocus
              value={graphName}
              onChange={e => setGraphName(e.target.value)}
              onBlur={() => setNameEditing(false)}
              onKeyDown={e => e.key === 'Enter' && setNameEditing(false)}
              style={{
                background: 'var(--bg-base)',
                border: '0.5px solid var(--accent)',
                color: 'var(--text-primary)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 11,
                fontFamily: 'monospace',
                width: 140,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onClick={() => setNameEditing(true)}
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                cursor: 'text',
                borderBottom: '0.5px dashed var(--border-subtle)',
                minWidth: 60,
              }}
              title="Click to rename"
            >
              {graphName || 'Untitled'}
            </span>
          )}

          <div style={{ height: 16, width: 0.5, background: 'var(--border-subtle)' }} />

          <button style={btn()} onClick={handleNew}>+ New</button>

          {graphId && (
            <button
              style={btn(graphEnabled)}
              onClick={handleToggleEnabled}
            >
              {graphEnabled ? '● Active' : '○ Inactive'}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {runStatus && (
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {runStatus}
            </span>
          )}

          {graphId && (
            <button style={btn()} onClick={handleRun}>▶ Run now</button>
          )}

          <button
            style={{ ...btn(), opacity: saving ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '…' : '💾 Save'}
          </button>

          {graphId && (
            <button style={btn(false, true)} onClick={handleDelete}>
              ✕ Delete
            </button>
          )}
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Block palette */}
          <BlockPalette blockDefs={blockDefs} onAdd={def => addBlock(def)} />

          {/* ReactFlow canvas */}
          <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              isValidConnection={isValidConnection}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              deleteKeyCode="Delete"
              style={{ background: 'var(--bg-base)' }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                style={{ bottom: 8, right: 8 }}
                nodeColor={n => {
                  const bt = (n.data as NodeData | undefined)?.blockType ?? ''
                  if (bt.startsWith('trigger.')) return '#7c3aed'
                  if (bt.startsWith('action.'))  return '#0369a1'
                  if (bt.startsWith('control.')) return '#b45309'
                  return '#047857'
                }}
              />
            </ReactFlow>
          </div>

          {/* Node config panel */}
          {selectedNode && (
            <div
              className="shrink-0 overflow-y-auto"
              style={{
                width: 224,
                borderLeft: '0.5px solid var(--border-subtle)',
                background: 'var(--bg-base)',
              }}
            >
              <NodeConfigPanel
                nodeId={selectedNode.id}
                data={selectedNode.data as NodeData}
                def={selectedDef}
                edges={edges as FlowEdge[]}
                onChange={updateNodeConfig}
              />
            </div>
          )}
        </div>
      </div>
    </SchedulerCtx.Provider>
  )
}
