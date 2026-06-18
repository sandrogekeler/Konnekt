import {
  useState, useCallback, useEffect, useRef, useMemo, type DragEvent,
} from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  useUpdateNodeInternals,
  type Connection, type Node as FlowNode, type Edge as FlowEdge,
} from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'
import { BlockNode } from './BlockNode'
import { BlockPalette } from './BlockPalette'
import { NodeConfigPanel } from './NodeConfigPanel'
import { NodeDataPanel } from './NodeDataPanel'
import { QuickAddMenu } from './QuickAddMenu'
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
  onPreviewNode: (graph: models.Graph, nodeId: string) => Promise<models.NodePreview>
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
  graphs, blockDefs, onSave, onDelete, onSetEnabled, onRun, onPreviewNode,
}: GraphEditorProps) {
  const { screenToFlowPosition } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

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
  const [panelTab, setPanelTab] = useState<'config' | 'data'>('config')

  // ── UI state ──────────────────────────────────────────────────────────────
  const [runStatus, setRunStatus]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const runStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [quickAdd, setQuickAdd] = useState<{
    screen: { x: number; y: number }
    flow:   { x: number; y: number }
  } | null>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Track cursor so Tab opens the quick-add menu at the pointer, not canvas center.
  useEffect(() => {
    const handler = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const showRunStatus = useCallback((msg: string) => {
    setRunStatus(msg)
    if (runStatusTimer.current) clearTimeout(runStatusTimer.current)
    runStatusTimer.current = setTimeout(() => setRunStatus(null), 4000)
  }, [])

  // ── Right-click on canvas → open quick-add ───────────────────────────────
  // Capture-phase native listener fires before WebView2 can show its native menu.
  useEffect(() => {
    const el = canvasWrapperRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      e.preventDefault()
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setQuickAdd({ screen: { x: e.clientX, y: e.clientY }, flow })
    }
    el.addEventListener('contextmenu', handler, true)
    return () => el.removeEventListener('contextmenu', handler, true)
  }, [screenToFlowPosition])

  // ── Tab key → open quick-add at cursor position ──────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      e.preventDefault()
      const { x: sx, y: sy } = mousePos.current
      const flow = screenToFlowPosition({ x: sx, y: sy })
      setQuickAdd({ screen: { x: sx, y: sy }, flow })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screenToFlowPosition])

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

  // Re-measure node handle positions after the maximize animation finishes.
  // The editor mounts while the panel is still animating (scale < 1), so React
  // Flow's initial handle measurements are taken on a transformed layout and
  // connection drop targets end up offset. Waiting past ANIM_MS (120ms) ensures
  // the panel has settled at scale(1) before we re-read the DOM.
  useEffect(() => {
    const t = setTimeout(() => {
      updateNodeInternals(nodes.map(n => n.id))
    }, 200)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally fires once on mount only

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

  // ── Alt+drag → duplicate node at its original position ───────────────────
  const onNodeDragStart = useCallback((e: MouseEvent | TouchEvent, node: FlowNode) => {
    if (!('altKey' in e) || !e.altKey) return
    const newId = randId()
    setNodes(ns => [
      ...ns,
      {
        ...(node as BlockFlowNode),
        id: newId,
        position: { ...node.position },
        selected: false,
        data: {
          ...(node.data as NodeData),
          config: { ...(node.data as NodeData).config },
        },
      },
    ])
    // Duplicate edges that target the original node so the copy is wired the same way.
    setEdges(es => {
      const duped = es
        .filter(e => e.target === node.id || e.source === node.id)
        .map(e => ({
          ...e,
          id: randId(),
          source: e.source === node.id ? newId : e.source,
          target: e.target === node.id ? newId : e.target,
        }))
      return [...es, ...duped]
    })
  }, [setNodes, setEdges])

  // ── Node selection ────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id)
    setQuickAdd(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setQuickAdd(null)
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
      showRunStatus('already running')
    } else if (rec.status === 'failed') {
      showRunStatus(`failed: ${rec.error || 'unknown error'}`)
    } else {
      showRunStatus(`done (${rec.nodes?.length ?? 0} nodes)`)
    }
  }, [handleSave, onRun, showRunStatus])

  // ── Delete selected nodes + their edges ───────────────────────────────────
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id))
    if (selectedIds.size === 0) return
    setNodes(ns => ns.filter(n => !n.selected))
    setEdges(es => es.filter(e =>
      !e.selected && !selectedIds.has(e.source) && !selectedIds.has(e.target),
    ))
    setSelectedNodeId(null)
  }, [nodes, setNodes, setEdges])

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

  // Derive collapsed set from node configs so BlockNode can read it.
  const collapsed = useMemo(() => {
    const s = new Set<string>()
    for (const n of nodes) {
      if ((n.data as NodeData).config?._collapsed !== false) s.add(n.id)
    }
    return s
  }, [nodes])

  const onToggleCollapse = useCallback((nodeId: string) => {
    setNodes(ns => ns.map(n => {
      if (n.id !== nodeId) return n
      const cur = (n.data as NodeData).config?._collapsed !== false
      return { ...n, data: { ...n.data, config: { ...(n.data as NodeData).config, _collapsed: !cur } } }
    }))
    updateNodeInternals(nodeId)
  }, [setNodes, updateNodeInternals])

  const ctxValue = useMemo(
    () => ({ blockDefs: defMap, edges, collapsed, onToggleCollapse }),
    [defMap, edges, collapsed, onToggleCollapse],
  )

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

          <button style={btn()} onClick={handleNew}>new</button>

          {graphId && (
            <button style={btn(graphEnabled)} onClick={handleToggleEnabled}>
              {graphEnabled ? '[on]' : '[off]'}
            </button>
          )}

          <div style={{ flex: 1 }} />

          {runStatus && (
            <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-faint)' }}>
              {runStatus}
            </span>
          )}

          {(() => {
            const selCount = nodes.filter(n => n.selected).length
            return selCount > 0 ? (
              <button style={btn(false, true)} onClick={handleDeleteSelected}>
                del {selCount}
              </button>
            ) : null
          })()}

          {graphId && (
            <button style={btn()} onClick={handleRun}>run</button>
          )}

          <button
            style={{ ...btn(), opacity: saving ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '...' : 'save'}
          </button>

          {graphId && (
            <button style={btn(false, true)} onClick={handleDelete}>
              del graph
            </button>
          )}
        </div>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Block palette */}
          <BlockPalette blockDefs={blockDefs} onAdd={def => addBlock(def)} />

          {/* ReactFlow canvas */}
          <div ref={canvasWrapperRef} className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDragStart={onNodeDragStart}
              onPaneClick={onPaneClick}
              isValidConnection={isValidConnection}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              deleteKeyCode="Delete"
              panOnDrag={[1, 2]}
              selectionOnDrag
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
                  if (bt.startsWith('data.'))    return '#0e7490'
                  return '#047857'
                }}
              />
            </ReactFlow>
          </div>

          {/* Node config / data panel */}
          {selectedNode && (
            <div
              className="shrink-0 overflow-y-auto flex flex-col"
              style={{
                width: 224,
                borderLeft: '0.5px solid var(--border-subtle)',
                background: 'var(--bg-base)',
              }}
            >
              {/* Tabs */}
              <div className="flex shrink-0" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
                {(['config', 'data'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPanelTab(tab)}
                    className="flex-1 py-1.5 text-xs font-mono"
                    style={{
                      background: panelTab === tab ? 'var(--bg-surface)' : 'transparent',
                      color: panelTab === tab ? 'var(--text-primary)' : 'var(--text-faint)',
                      borderBottom: panelTab === tab ? '1px solid var(--accent)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {panelTab === 'config' ? (
                <NodeConfigPanel
                  nodeId={selectedNode.id}
                  data={selectedNode.data as NodeData}
                  def={selectedDef}
                  edges={edges as FlowEdge[]}
                  onChange={updateNodeConfig}
                />
              ) : (
                <NodeDataPanel
                  graph={flowToGraph(
                    { id: graphId, name: graphName, enabled: graphEnabled, createdAt },
                    nodes,
                    edges,
                  )}
                  nodeId={selectedNode.id}
                  onPreview={onPreviewNode}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {quickAdd && (
        <QuickAddMenu
          blockDefs={blockDefs}
          screenPos={quickAdd.screen}
          onPick={def => { addBlock(def, quickAdd.flow); setQuickAdd(null) }}
          onClose={() => setQuickAdd(null)}
        />
      )}
    </SchedulerCtx.Provider>
  )
}
