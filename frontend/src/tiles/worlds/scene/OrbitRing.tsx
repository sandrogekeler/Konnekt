import { useMemo } from 'react'
import * as THREE from 'three'

interface Props {
  radius: number
  color?: string
}

// A flat torus ring rendered around the active world body (like Saturn's rings).
export function OrbitRing({ radius, color = 'var(--accent)' }: Props) {
  const resolvedColor = useMemo(() => {
    // CSS variables don't resolve inside WebGL — use a fixed accent green.
    return color.startsWith('var(') ? '#4ade80' : color
  }, [color])

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius * 1.45, radius * 0.06, 8, 64]} />
      <meshBasicMaterial color={resolvedColor} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  )
}
