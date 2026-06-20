import { useContext, useState, type CSSProperties } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'

export function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, data,
}: EdgeProps) {
  const { firedEdges, cycleEdges } = useContext(SchedulerCtx)
  const [animDone, setAnimDone] = useState(false)

  const [d] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })
  const delay  = (data as Record<string, unknown> | undefined)?._animDelay as number ?? 0
  const isData = (data as Record<string, unknown> | undefined)?.kind === 'data'
  const baseDash = isData ? '4 2' : undefined

  const fired   = firedEdges.has(id)
  const inCycle = cycleEdges.has(id)

  // Live/static highlight overrides the resting stroke. Fired (a control branch
  // that actually executed) wins over a static cycle warning.
  let highlight: CSSProperties = {}
  if (fired) {
    highlight = { stroke: 'var(--accent)', strokeWidth: 2.5, filter: 'drop-shadow(0 0 3px var(--accent))' }
  } else if (inCycle) {
    highlight = { stroke: '#f59e0b', strokeWidth: 2 }
  }

  // Entrance phase: normalize pathLength to 1 and animate stroke-dashoffset.
  if (!animDone) {
    return (
      <path
        id={id}
        className="react-flow__edge-path edge-draw-in"
        d={d}
        pathLength={1}
        onAnimationEnd={() => setAnimDone(true)}
        style={{ ...style, strokeDasharray: 1, animationDelay: `${delay}ms`, ...highlight }}
        markerEnd={markerEnd}
      />
    )
  }

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={d}
      style={{ ...style, strokeDasharray: baseDash, ...highlight }}
      markerEnd={markerEnd}
    />
  )
}
