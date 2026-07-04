import { useContext, useState, type CSSProperties } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { SchedulerCtx } from './schedulerContext'

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const { firedEdges, cycleEdges } = useContext(SchedulerCtx)
  const [animDone, setAnimDone] = useState(false)
  const [hovered, setHovered] = useState(false)

  const [d] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const delay = ((data as Record<string, unknown> | undefined)?._animDelay as number) ?? 0
  const isData = (data as Record<string, unknown> | undefined)?.kind === 'data'
  const baseDash = isData ? '4 2' : undefined

  const fired = firedEdges.has(id)
  const inCycle = cycleEdges.has(id)

  // Live/static highlight overrides the resting stroke. Fired (a control branch
  // that actually executed) wins over user selection, which wins over hover,
  // which wins over a static cycle warning. Applied after `...style` so it
  // wins even on data edges, whose inline `style.stroke` (the port's data-type
  // color) would otherwise beat a CSS-only `.selected`/`:hover` rule — this is
  // driven entirely from JS rather than CSS so both edge kinds behave the same.
  let highlight: CSSProperties = {}
  if (fired) {
    highlight = {
      stroke: 'var(--accent)',
      strokeWidth: 2.5,
      filter: 'drop-shadow(0 0 3px var(--accent))',
    }
  } else if (selected) {
    highlight = { stroke: 'var(--accent)', strokeWidth: 2.5 }
  } else if (hovered) {
    highlight = { stroke: 'color-mix(in srgb, var(--accent) 60%, black)', strokeWidth: 2 }
  } else if (inCycle) {
    highlight = { stroke: 'var(--warning)', strokeWidth: 2 }
  }

  // Wide, transparent hit target. xyflow's own `.react-flow__edge-path` rule
  // (@xyflow/react/dist/style.css) does NOT set `pointer-events: none` — only
  // the parent `.react-flow__edge` group gets `pointer-events: visibleStroke`,
  // which the visible path inherits. So the visible path below explicitly sets
  // `pointerEvents: 'none'` in its own style — without it, the visible path
  // (painted on top, in DOM order after this one) would intercept the pointer
  // wherever it's actually painted (a solid control edge's whole length, or a
  // data edge's dash marks), stealing hover from this path underneath and
  // firing a spurious mouseleave, since the visible path has no enter/leave
  // handler of its own. That produced exactly this flicker: hover dropping
  // mid-line or between dash gaps.
  const interaction = (
    <path
      className="react-flow__edge-interaction"
      d={d}
      fill="none"
      stroke="transparent"
      strokeWidth={20}
      // eslint-disable-next-line no-restricted-syntax -- xyflow SVG hit-test override, not expressible as a Tailwind utility on this element
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
          // eslint-disable-next-line no-restricted-syntax -- xyflow-provided style spread + per-instance animation delay + computed run-state highlight
          style={{
            ...style,
            strokeDasharray: 1,
            animationDelay: `${delay}ms`,
            ...highlight,
            pointerEvents: 'none',
          }}
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
        // eslint-disable-next-line no-restricted-syntax -- xyflow-provided style spread + computed run-state highlight
        style={{ ...style, strokeDasharray: baseDash, ...highlight, pointerEvents: 'none' }}
        markerEnd={markerEnd}
      />
    </>
  )
}
