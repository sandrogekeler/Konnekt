import { useRef, useEffect } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'

export function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, data,
}: EdgeProps) {
  const pathRef = useRef<SVGPathElement>(null)
  const [d] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })
  const delay  = (data as Record<string, unknown> | undefined)?._animDelay as number ?? 0
  const isData = (data as Record<string, unknown> | undefined)?.kind === 'data'

  useEffect(() => {
    const el = pathRef.current
    if (!el) return
    const onEnd = () => {
      el.removeAttribute('pathLength')
      el.style.strokeDasharray = isData ? '4 2' : ''
      el.style.strokeDashoffset = ''
      el.classList.remove('edge-draw-in')
    }
    el.addEventListener('animationend', onEnd, { once: true })
    return () => el.removeEventListener('animationend', onEnd)
  }, [isData])

  return (
    <path
      ref={pathRef}
      id={id}
      className="react-flow__edge-path edge-draw-in"
      d={d}
      pathLength="1"
      style={{
        ...style,
        strokeDasharray: 1,
        animationDelay: `${delay}ms`,
      }}
      markerEnd={markerEnd}
    />
  )
}
