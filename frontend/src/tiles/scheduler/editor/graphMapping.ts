import type { Node as FlowNode, Edge as FlowEdge, Connection } from '@xyflow/react'
import type { models } from '../../../../wailsjs/go/models'

export interface NodeData extends Record<string, unknown> {
  blockType: string
  config: Record<string, unknown>
  label: string
  _animDelay?: number
}

export type BlockFlowNode = FlowNode<NodeData, 'block'>

export function graphToFlow(
  graph: models.Graph,
  defMap: Map<string, models.BlockDef>,
): { nodes: BlockFlowNode[]; edges: FlowEdge[] } {
  const nodes: BlockFlowNode[] = (graph.nodes ?? []).map(n => ({
    id: n.id,
    type: 'block' as const,
    position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
    data: {
      blockType: n.type,
      config: { ...(n.config ?? {}) },
      label: defMap.get(n.type)?.label ?? n.type,
    },
  }))

  const edges: FlowEdge[] = (graph.edges ?? []).map(e => {
    const isData = e.kind === 'data'
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: `${isData ? 'data' : 'ctrl'}:${e.sourcePort}`,
      targetHandle: `${isData ? 'data' : 'ctrl'}:${e.targetPort}`,
      type: 'smoothstep',
      style: isData ? { strokeDasharray: '4 2', stroke: '#60a5fa' } : undefined,
      data: { kind: e.kind } as Record<string, unknown>,
    }
  })

  return { nodes, edges }
}

export function flowToGraph(
  meta: Pick<models.Graph, 'id' | 'name' | 'enabled' | 'createdAt'>,
  nodes: FlowNode[],
  edges: FlowEdge[],
): models.Graph {
  // Cast via unknown: Wails class types have a convertValues method we don't need
  // to provide since outgoing IPC calls are serialized as plain JSON.
  return {
    id: meta.id,
    name: meta.name,
    enabled: meta.enabled,
    createdAt: meta.createdAt,
    updatedAt: Date.now(),
    nodes: nodes.map(n => ({
      id: n.id,
      type: (n.data as NodeData).blockType,
      config: (n.data as NodeData).config,
      position: { x: n.position.x, y: n.position.y },
    })) as unknown as models.Node[],
    edges: edges.map(e => {
      const srcH = e.sourceHandle ?? ''
      const tgtH = e.targetHandle ?? ''
      const kind = srcH.startsWith('data:') ? 'data' : 'control'
      return {
        id: e.id,
        kind,
        source: e.source,
        sourcePort: srcH.replace(/^(ctrl|data):/, ''),
        target: e.target,
        targetPort: tgtH.replace(/^(ctrl|data):/, ''),
      }
    }) as unknown as models.Edge[],
  } as unknown as models.Graph
}

// Reject cross-kind wiring and self-loops.
// ReactFlow v12 passes Edge | Connection to isValidConnection.
export function isValidConnection(edge: FlowEdge | Connection): boolean {
  if (edge.source === edge.target) return false
  const srcKind = (edge.sourceHandle ?? '').startsWith('data:') ? 'data' : 'ctrl'
  const tgtKind = (edge.targetHandle ?? '').startsWith('data:') ? 'data' : 'ctrl'
  return srcKind === tgtKind
}

export function randId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// detectControlCycles finds nodes and edges that participate in a control-flow
// cycle. The engine aborts any run that loops (maxNodesPerRun guard), so the
// editor flags cycles statically to warn the author before they run.
export function detectControlCycles(
  nodes: { id: string }[],
  edges: FlowEdge[],
): { cycleNodes: Set<string>; cycleEdges: Set<string> } {
  const cycleNodes = new Set<string>()
  const cycleEdges = new Set<string>()

  const controlEdges = edges.filter(
    e => (e.data as { kind?: string } | undefined)?.kind !== 'data'
      && !(e.sourceHandle ?? '').startsWith('data:'),
  )
  if (controlEdges.length === 0) return { cycleNodes, cycleEdges }

  const adj = new Map<string, string[]>()
  for (const e of controlEdges) {
    const list = adj.get(e.source) ?? []
    list.push(e.target)
    adj.set(e.source, list)
  }

  // Memoised forward reachability over control edges.
  const reachCache = new Map<string, Set<string>>()
  const reachableFrom = (start: string): Set<string> => {
    const cached = reachCache.get(start)
    if (cached) return cached
    const seen = new Set<string>()
    const stack = [...(adj.get(start) ?? [])]
    while (stack.length) {
      const cur = stack.pop()!
      if (seen.has(cur)) continue
      seen.add(cur)
      for (const next of adj.get(cur) ?? []) stack.push(next)
    }
    reachCache.set(start, seen)
    return seen
  }

  // An edge u→v closes a cycle when v can reach u again.
  for (const e of controlEdges) {
    if (e.source === e.target || reachableFrom(e.target).has(e.source)) {
      cycleEdges.add(e.id)
      cycleNodes.add(e.source)
      cycleNodes.add(e.target)
    }
  }

  return { cycleNodes, cycleEdges }
}

export function defaultConfig(def: models.BlockDef): Record<string, unknown> {
  const cfg: Record<string, unknown> = {}
  for (const f of def.configSchema ?? []) {
    if (f.default !== undefined) cfg[f.key] = f.default
  }
  return cfg
}
