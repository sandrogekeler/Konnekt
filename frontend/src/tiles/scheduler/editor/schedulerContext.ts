import { createContext } from 'react'
import type { Edge } from '@xyflow/react'
import type { models } from '../../../../wailsjs/go/models'

export interface SchedulerCtxValue {
  blockDefs: Map<string, models.BlockDef>
  edges: Edge[]
  collapsed: Set<string>
  onToggleCollapse: (nodeId: string) => void
}

export const SchedulerCtx = createContext<SchedulerCtxValue>({
  blockDefs: new Map(),
  edges: [],
  collapsed: new Set(),
  onToggleCollapse: () => {},
})
