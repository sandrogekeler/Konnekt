import React, { memo, useContext } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'
import { CATEGORY_COLOR, CATEGORY_ICON, CTRL_PORT_COLOR, PORT_TYPE_COLOR } from './blockMeta'
import type { BlockFlowNode, NodeData } from './graphMapping'
import { resolveDataPortType } from './portTypes'
import type { models } from '../../../../wailsjs/go/models'

const HEADER_H = 30
const INFO_H = 20
const ROW_H = 22
const PAD = 6
// The Handle's own box is xyflow's actual grab/drop hit area, not just its visual
// dot — sized well past the visible dot (below) so connections are easy to grab.
const HANDLE_HIT_SIZE = 18

export const BlockNode = memo(function BlockNode({ data, selected }: NodeProps<BlockFlowNode>) {
  const nd = data as NodeData
  const { blockDefs, collapsed, onToggleCollapse, nodeRunState, cycleNodes } =
    useContext(SchedulerCtx)
  const def = blockDefs.get(nd.blockType)

  const runState = nodeRunState.get(nd.id as string)
  const inCycle = cycleNodes.has(nd.id as string)

  const color = CATEGORY_COLOR[def?.category ?? ''] ?? '#6b7280'
  const icon = CATEGORY_ICON[def?.category ?? ''] ?? '?'

  const ctrlIns: string[] = def?.controlInputs ?? []
  const ctrlOuts: string[] = def?.controlOutputs ?? []
  const dataIns: models.DataPort[] = def?.dataInputs ?? []
  const dataOuts: models.DataPort[] = def?.dataOutputs ?? []

  const isCollapsed = collapsed.has(nd.id as string)

  // Required data-input port ids (always shown even when collapsed)
  const requiredKeys = new Set(
    (def?.configSchema ?? []).filter((f) => f.required).map((f) => f.key),
  )

  const visibleDataIns = isCollapsed ? dataIns.filter((p) => requiredKeys.has(p.id)) : dataIns

  type PortEntry = { id: string; label: string; color: string; isData: boolean }
  const leftPorts: PortEntry[] = [
    ...ctrlIns.map((p) => ({
      id: `ctrl:${p}`,
      label: p,
      color: CTRL_PORT_COLOR[p] ?? '#94a3b8',
      isData: false,
    })),
    ...visibleDataIns.map((p) => ({
      id: `data:${p.id}`,
      label: p.label,
      color: PORT_TYPE_COLOR[p.type] ?? '#60a5fa',
      isData: true,
    })),
  ]
  const rightPorts: PortEntry[] = [
    ...ctrlOuts.map((p) => ({
      id: `ctrl:${p}`,
      label: p,
      color: CTRL_PORT_COLOR[p] ?? '#22c55e',
      isData: false,
    })),
    ...dataOuts.map((p) => {
      const resolved = resolveDataPortType(def, p.id, 'output', nd.config)
      const portColor =
        resolved === 'unresolved' ? '#6b7280' : (PORT_TYPE_COLOR[resolved] ?? '#60a5fa')
      return { id: `data:${p.id}`, label: p.label, color: portColor, isData: true }
    }),
  ]

  // Show first non-empty required config value as a hint
  const hint = def?.configSchema
    ?.filter((f) => f.required && f.key !== '_collapsed')
    .map((f) => nd.config?.[f.key])
    .find((v) => v !== undefined && v !== '')

  // All data-input ports (used for rendering hidden handles so edges don't break)
  const allDataInPorts: PortEntry[] = dataIns.map((p) => ({
    id: `data:${p.id}`,
    label: p.label,
    color: PORT_TYPE_COLOR[p.type] ?? '#60a5fa',
    isData: true,
  }))
  const hiddenDataIns = isCollapsed
    ? allDataInPorts.filter((p) => !visibleDataIns.some((v) => `data:${v.id}` === p.id))
    : []

  const bodyH = Math.max(1, leftPorts.length, rightPorts.length) * ROW_H + PAD * 2
  const totalH = HEADER_H + (hint !== undefined ? INFO_H : 0) + bodyH
  const portTop = HEADER_H + (hint !== undefined ? INFO_H : 0) + PAD

  let borderColor = selected ? 'var(--accent)' : color
  let borderWidth = selected ? 1.5 : 1
  let boxShadow: string | undefined
  let stateClass = ''
  if (runState === 'running') {
    borderColor = 'var(--accent)'
    borderWidth = 2
    stateClass = 'node-running'
  } else if (runState === 'success') {
    borderColor = '#22c55e'
    borderWidth = 2
    boxShadow = '0 0 0 1px #22c55e55, 0 0 12px #22c55e44'
  } else if (runState === 'failed') {
    borderColor = '#ef4444'
    borderWidth = 2
    boxShadow = '0 0 0 1px #ef444466, 0 0 12px #ef444455'
  } else if (inCycle) {
    borderColor = '#f59e0b'
    borderWidth = 1.5
    boxShadow = '0 0 0 1px #f59e0b55'
  }

  const hasExpandablePorts = dataIns.length > visibleDataIns.length || dataIns.length > 0

  return (
    <div
      className={`node-entrance ${stateClass}`}
      style={
        {
          '--node-anim-delay': `${data._animDelay ?? 0}ms`,
          background: 'var(--bg-elevated)',
          border: `${borderWidth}px solid ${borderColor}`,
          borderRadius: 4,
          minWidth: 180,
          height: totalH,
          position: 'relative',
          overflow: 'hidden',
          boxShadow,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div
        style={{
          height: HEADER_H,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 10,
          paddingRight: 10,
          borderBottom: `0.5px solid ${color}20`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'monospace',
            fontWeight: 700,
            color,
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            flex: 1,
          }}
        >
          {nd.label}
        </span>
        {hasExpandablePorts && (
          <span
            onClick={() => onToggleCollapse(nd.id as string)}
            className="nodrag"
            style={{
              fontSize: 9,
              fontFamily: 'monospace',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              flexShrink: 0,
              userSelect: 'none',
              paddingLeft: 4,
            }}
            title={isCollapsed ? 'Expand ports' : 'Collapse ports'}
          >
            {isCollapsed ? '▸' : '▾'}
          </span>
        )}
      </div>

      {/* Config hint */}
      {hint !== undefined && (
        <div
          style={{
            height: INFO_H,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 10,
            paddingRight: 10,
            fontSize: 9,
            fontFamily: 'monospace',
            color: 'var(--text-faint)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            borderBottom: '0.5px solid var(--border-subtle)',
          }}
        >
          {String(hint)}
        </div>
      )}

      {/* Left port labels */}
      {leftPorts.map((p, i) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: 14,
            top: portTop + i * ROW_H,
            height: ROW_H,
            display: 'flex',
            alignItems: 'center',
            fontSize: 9,
            fontFamily: 'monospace',
            color: p.color,
          }}
        >
          {p.label}
        </div>
      ))}

      {/* Right port labels */}
      {rightPorts.map((p, i) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            right: 14,
            top: portTop + i * ROW_H,
            height: ROW_H,
            display: 'flex',
            alignItems: 'center',
            fontSize: 9,
            fontFamily: 'monospace',
            color: p.color,
            textAlign: 'right',
          }}
        >
          {p.label}
        </div>
      ))}

      {/* Left handles (visible) — the Handle box itself is the grab area,
          oversized vs. the small decorative dot rendered inside it. */}
      {leftPorts.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={Position.Left}
          style={{
            top: portTop + i * ROW_H + ROW_H / 2,
            width: HANDLE_HIT_SIZE,
            height: HANDLE_HIT_SIZE,
            background: 'var(--hover-surface)',
            // Border comes from scheduler.css's `.react-flow__handle` rule
            // (needs `!important` to beat xyflow's own inline-styled default).
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              pointerEvents: 'none',
              display: 'block',
              width: p.isData ? 6 : 8,
              height: p.isData ? 6 : 8,
              background: p.color,
              borderRadius: p.isData ? 2 : '50%',
            }}
          />
        </Handle>
      ))}

      {/* Hidden handles for collapsed data-in ports — keeps existing edges valid */}
      {hiddenDataIns.map((p) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={Position.Left}
          style={{
            top: portTop + ROW_H / 2,
            opacity: 0,
            pointerEvents: 'none',
            width: 0,
            height: 0,
          }}
        />
      ))}

      {/* Right handles — same oversized-hit-area / small-dot split as the left side. */}
      {rightPorts.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="source"
          position={Position.Right}
          style={{
            top: portTop + i * ROW_H + ROW_H / 2,
            width: HANDLE_HIT_SIZE,
            height: HANDLE_HIT_SIZE,
            background: 'var(--hover-surface)',
            // Border comes from scheduler.css's `.react-flow__handle` rule
            // (needs `!important` to beat xyflow's own inline-styled default).
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              pointerEvents: 'none',
              display: 'block',
              width: p.isData ? 6 : 8,
              height: p.isData ? 6 : 8,
              background: p.color,
              borderRadius: p.isData ? 2 : '50%',
            }}
          />
        </Handle>
      ))}
    </div>
  )
})
