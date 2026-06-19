import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type * as THREE from 'three'

interface Props {
  radius?: number
  label?: string
}

export function Sun({ radius = 0.55, label = 'Server' }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.05
    }
  })

  return (
    <group>
      {/* Corona glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.25, 32, 32]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.07} />
      </mesh>
      {/* Sun sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          roughness={0.8}
        />
      </mesh>
      <Html
        position={[0, radius + 0.4, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={10}
      >
        <span style={{
          fontFamily: 'monospace', fontSize: 11, color: '#fbbf24',
          textShadow: '0 0 6px #fbbf24',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </Html>
    </group>
  )
}
