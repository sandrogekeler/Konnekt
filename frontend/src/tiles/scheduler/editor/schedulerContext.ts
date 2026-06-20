import { createContext } from 'react'
import type { Edge } from '@xyflow/react'
import type { models } from '../../../../wailsjs/go/models'

// Live per-node run state, driven by schedule:* events while a graph executes.
export type NodeRunState = 'running' | 'success' | 'failed'

export interface SchedulerCtxValue {
  blockDefs: Map<string, models.BlockDef>
  edges: Edge[]
  collapsed: Set<string>
  onToggleCollapse: (nodeId: string) => void
  // Live run highlighting (empty when no run is active).
  nodeRunState: Map<string, NodeRunState>
  firedEdges: Set<string>
  // Static analysis: node/edge ids that participate in a control-flow cycle.
  cycleNodes: Set<string>
  cycleEdges: Set<string>
}

export const SchedulerCtx = createContext<SchedulerCtxValue>({
  blockDefs: new Map(),
  edges: [],
  collapsed: new Set(),
  onToggleCollapse: () => {},
  nodeRunState: new Map(),
  firedEdges: new Set(),
  cycleNodes: new Set(),
  cycleEdges: new Set(),
})
