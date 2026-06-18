import { memo, useContext } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'
import { CATEGORY_COLOR, CATEGORY_ICON, CTRL_PORT_COLOR, PORT_TYPE_COLOR } from './blockMeta'
import type { BlockFlowNode, NodeData } from './graphMapping'
import type { models } from '../../../../wailsjs/go/models'

const HEADER_H = 30
const INFO_H   = 20
const ROW_H    = 22
const PAD      = 6

export const BlockNode = memo(function BlockNode({ data, selected }: NodeProps<BlockFlowNode>) {
  const nd = data as NodeData
  const { blockDefs } = useContext(SchedulerCtx)
  const def = blockDefs.get(nd.blockType)

  const color = CATEGORY_COLOR[def?.category ?? ''] ?? '#6b7280'
  const icon  = CATEGORY_ICON[def?.category ?? ''] ?? '?'

  const ctrlIns:  string[]              = def?.controlInputs  ?? []
  const ctrlOuts: string[]              = def?.controlOutputs ?? []
  const dataIns:  models.DataPort[]     = def?.dataInputs     ?? []
  const dataOuts: models.DataPort[]     = def?.dataOutputs    ?? []

  type PortEntry = { id: string; label: string; color: string; isData: boolean }
  const leftPorts: PortEntry[] = [
    ...ctrlIns.map(p => ({ id: `ctrl:${p}`,    label: p,       color: CTRL_PORT_COLOR[p] ?? '#94a3b8', isData: false })),
    ...dataIns.map(p => ({ id: `data:${p.id}`, label: p.label, color: PORT_TYPE_COLOR[p.type] ?? '#60a5fa', isData: true })),
  ]
  const rightPorts: PortEntry[] = [
    ...ctrlOuts.map(p => ({ id: `ctrl:${p}`,    label: p,       color: CTRL_PORT_COLOR[p] ?? '#22c55e', isData: false })),
    ...dataOuts.map(p => ({ id: `data:${p.id}`, label: p.label, color: PORT_TYPE_COLOR[p.type] ?? '#60a5fa', isData: true })),
  ]

  // Show first non-empty required config value as a hint
  const hint = def?.configSchema
    ?.filter(f => f.required)
    .map(f => nd.config?.[f.key])
    .find(v => v !== undefined && v !== '')

  const bodyH  = Math.max(1, leftPorts.length, rightPorts.length) * ROW_H + PAD * 2
  const totalH = HEADER_H + (hint !== undefined ? INFO_H : 0) + bodyH
  const portTop = HEADER_H + (hint !== undefined ? INFO_H : 0) + PAD

  // Outline-only: border is category color (accent when selected), no fill on header
  const borderColor = selected ? 'var(--accent)' : color
  const borderWidth = selected ? 1.5 : 1

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 4,
        minWidth: 180,
        height: totalH,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header — no fill, text only */}
      <div style={{
        height: HEADER_H,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 10,
        paddingRight: 10,
        borderBottom: `0.5px solid ${color}20`,
      }}>
        <span style={{
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 700,
          color,
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}>
          {icon}
        </span>
        <span style={{
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {nd.label}
        </span>
      </div>

      {/* Config hint */}
      {hint !== undefined && (
        <div style={{
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
        }}>
          {String(hint)}
        </div>
      )}

      {/* Left port labels */}
      {leftPorts.map((p, i) => (
        <div key={p.id} style={{
          position: 'absolute',
          left: 14,
          top: portTop + i * ROW_H,
          height: ROW_H,
          display: 'flex',
          alignItems: 'center',
          fontSize: 9,
          fontFamily: 'monospace',
          color: p.color,
        }}>
          {p.label}
        </div>
      ))}

      {/* Right port labels */}
      {rightPorts.map((p, i) => (
        <div key={p.id} style={{
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
        }}>
          {p.label}
        </div>
      ))}

      {/* Left handles */}
      {leftPorts.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={Position.Left}
          style={{
            top: portTop + i * ROW_H + ROW_H / 2,
            background: p.color,
            border: '2px solid var(--bg-base)',
            width: p.isData ? 8 : 10,
            height: p.isData ? 8 : 10,
            borderRadius: p.isData ? 2 : '50%',
          }}
        />
      ))}

      {/* Right handles */}
      {rightPorts.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="source"
          position={Position.Right}
          style={{
            top: portTop + i * ROW_H + ROW_H / 2,
            background: p.color,
            border: '2px solid var(--bg-base)',
            width: p.isData ? 8 : 10,
            height: p.isData ? 8 : 10,
            borderRadius: p.isData ? 2 : '50%',
          }}
        />
      ))}
    </div>
  )
})
