import { useContext, useState, type CSSProperties } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'

export function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, data, selected,
}: EdgeProps) {
  const { firedEdges, cycleEdges } = useContext(SchedulerCtx)
  const [animDone, setAnimDone] = useState(false)
  const [hovered, setHovered] = useState(false)

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
  // that actually executed) wins over user selection, which wins over hover,
  // which wins over a static cycle warning. Applied after `...style` so it
  // wins even on data edges, whose inline `style.stroke` (the port's data-type
  // color) would otherwise beat a CSS-only `.selected`/`:hover` rule — this is
  // driven entirely from JS rather than CSS so both edge kinds behave the same.
  let highlight: CSSProperties = {}
  if (fired) {
    highlight = { stroke: 'var(--accent)', strokeWidth: 2.5, filter: 'drop-shadow(0 0 3px var(--accent))' }
  } else if (selected) {
    highlight = { stroke: 'var(--accent)', strokeWidth: 2.5 }
  } else if (hovered) {
    highlight = { stroke: 'color-mix(in srgb, var(--accent) 60%, black)', strokeWidth: 2 }
  } else if (inCycle) {
    highlight = { stroke: '#f59e0b', strokeWidth: 2 }
  }

  // Wide, transparent hit target. The visible `.react-flow__edge-path` is
  // `pointer-events: none` in xyflow; a bare hand-rolled <path> (unlike
  // <BaseEdge>) never gets the wide `.react-flow__edge-interaction` path that
  // normally provides the clickable area, so clicks only land on the thin
  // visible stroke, making the edge nearly unselectable.
  const interaction = (
    <path
      className="react-flow__edge-interaction"
      d={d}
      fill="none"
      stroke="transparent"
      strokeWidth={20}
      style={{ pointerEvents: 'stroke' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  )

  // Entrance phase: normalize pathLength to 1 and animate stroke-dashoffset.
  if (!animDone) {
    return (
      <>
        {interaction}
        <path
          id={id}
          className="react-flow__edge-path edge-draw-in"
          d={d}
          pathLength={1}
          onAnimationEnd={() => setAnimDone(true)}
          style={{ ...style, strokeDasharray: 1, animationDelay: `${delay}ms`, ...highlight }}
          markerEnd={markerEnd}
        />
      </>
    )
  }

  return (
    <>
      {interaction}
      <path
        id={id}
        className="react-flow__edge-path"
        d={d}
        style={{ ...style, strokeDasharray: baseDash, ...highlight }}
        markerEnd={markerEnd}
      />
    </>
  )
}
