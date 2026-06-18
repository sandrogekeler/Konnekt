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

export function defaultConfig(def: models.BlockDef): Record<string, unknown> {
  const cfg: Record<string, unknown> = {}
  for (const f of def.configSchema ?? []) {
    if (f.default !== undefined) cfg[f.key] = f.default
  }
  return cfg
}
