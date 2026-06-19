import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { OrbitRing } from './OrbitRing'
import { OrbitPath } from './OrbitPath'
import { WorldHud } from '../WorldHud'
import type { WorldSystem as WorldSystemData } from '../useWorlds'

const KIND_COLOR: Record<string, string> = {
  overworld: '#22c55e',
  nether:    '#ef4444',
  the_end:   '#a78bfa',
}

const KIND_LABEL: Record<string, string> = {
  nether:  'Nether',
  the_end: 'The End',
}

// Moon orbit params (local to the focused planet's group)
const MOON_ORBIT: Record<string, { orbitRX: number; orbitRZ: number; speed: number; offset: number }> = {
  nether:  { orbitRX: 2.0, orbitRZ: 1.1, speed: 0.06, offset: 0 },
  the_end: { orbitRX: 3.2, orbitRZ: 1.8, speed: 0.04, offset: Math.PI * 0.6 },
}

function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ----- MoonBody: orbits the parent group (the planet), scales with zoomProgress -----

interface MoonBodyProps {
  kind:    string
  radius:  number
  orbitRX: number
  orbitRZ: number
  speed:   number
  offset:  number
  selected: boolean
  onSelect: () => void
  world:        WorldSystemData
  onCloseHud:   () => void
  onSetActive:  (name: string) => Promise<void>
  onDelete:     (name: string) => Promise<void>
  onRename:     (old: string, next: string) => Promise<void>
  onDuplicate:  (name: string, next: string) => Promise<void>
  onOpenFolder: (name: string) => Promise<void>
  onBackup:     (name: string) => Promise<void>
  onRefresh:    () => void
}

function MoonBody({
  kind, radius, orbitRX, orbitRZ, speed, offset,
  selected, onSelect,
  world, onCloseHud, onSetActive, onDelete, onRename, onDuplicate, onOpenFolder, onBackup, onRefresh,
}: MoonBodyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef  = useRef<THREE.Mesh>(null)
  const angleRef = useRef(offset)
  const [hovered, setHovered] = useState(false)

  const color = KIND_COLOR[kind] ?? '#60a5fa'
  const label = KIND_LABEL[kind] ?? kind

  useFrame((_, delta) => {
    angleRef.current += speed * delta
    const x = Math.cos(angleRef.current) * orbitRX
    const z = Math.sin(angleRef.current) * orbitRZ
    if (groupRef.current) groupRef.current.position.set(x, 0, z)
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.3
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={e => { e.stopPropagation(); onSelect() }}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.15 : 1}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 0.45 : 0.2}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {hovered && (
        <Html
          position={[0, radius + 0.3, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={10}
        >
          <div style={{
            fontFamily: 'monospace', fontSize: 10, color: '#fff',
            background: 'rgba(0,0,0,0.75)',
            border: `0.5px solid ${color}`,
            borderRadius: 4, padding: '3px 7px',
            whiteSpace: 'nowrap', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 700, color }}>{label}</div>
            <div style={{ color: '#94a3b8' }}>
              {fmtBytes(world.dimensions.find(d => d.kind === kind)?.size ?? 0)}
            </div>
          </div>
        </Html>
      )}

      {selected && (
        <WorldHud
          world={world}
          dimension={kind}
          onClose={onCloseHud}
          onSetActive={onSetActive}
          onDelete={onDelete}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onOpenFolder={onOpenFolder}
          onBackup={onBackup}
          onRefresh={onRefresh}
        />
      )}
    </group>
  )
}

// ----- Planet: the main orbiting world body -----

interface Props {
  kind:        string
  radius:      number
  orbitRX:     number
  orbitRZ:     number
  orbitSpeed:  number
  orbitOffset?: number
  active?:     boolean
  label:       string
  sizeBytes:   number
  onClickWithPos?: (pos: THREE.Vector3) => void
  // unified-scene props (only set for galaxy planets, not for internal moon use)
  focused?:         boolean
  worldName?:       string
  positionsRef?:    React.MutableRefObject<Map<string, THREE.Vector3>>
  world?:           WorldSystemData
  selectedDimension?: string | null
  onSelectDimension?: (kind: string) => void
  onCloseHud?:      () => void
  onSetActive?:     (name: string) => Promise<void>
  onDelete?:        (name: string) => Promise<void>
  onRename?:        (old: string, next: string) => Promise<void>
  onDuplicate?:     (name: string, next: string) => Promise<void>
  onOpenFolder?:    (name: string) => Promise<void>
  onBackup?:        (name: string) => Promise<void>
  onRefresh?:       () => void
}

export function Planet({
  kind, radius, orbitRX, orbitRZ, orbitSpeed, orbitOffset = 0,
  active = false, label, sizeBytes, onClickWithPos,
  focused = false, worldName, positionsRef,
  world, selectedDimension, onSelectDimension, onCloseHud,
  onSetActive, onDelete, onRename, onDuplicate, onOpenFolder, onBackup, onRefresh,
}: Props) {
  const groupRef      = useRef<THREE.Group>(null)
  const meshRef       = useRef<THREE.Mesh>(null)
  const moonSystemRef = useRef<THREE.Group>(null)
  const angleRef      = useRef(orbitOffset)
  const pushRef       = useRef({ x: 0, z: 0 })
  const worldPosRef   = useRef(new THREE.Vector3())
  // Per-planet zoom progress — damps independently so moons scale in/out smoothly
  // whether we're zooming in, zooming out, or switching to another planet.
  const localZoomRef  = useRef(0)
  const [hovered, setHovered] = useState(false)

  const color = KIND_COLOR[kind] ?? '#60a5fa'
  const moons = world ? world.dimensions.filter(d => d.kind !== 'overworld') : []

  useFrame((state, delta) => {
    angleRef.current += orbitSpeed * delta

    const ox = Math.cos(angleRef.current) * orbitRX
    const oz = Math.sin(angleRef.current) * orbitRZ

    // Cursor attraction push — disabled when focused (avoids jitter during follow)
    if (!focused) {
      const ray = state.raycaster.ray
      const t   = Math.abs(ray.direction.y) < 0.0001 ? 0 : -ray.origin.y / ray.direction.y
      const cx  = ray.origin.x + ray.direction.x * t
      const cz  = ray.origin.z + ray.direction.z * t
      const dx  = ox - cx
      const dz  = oz - cz
      const dist = Math.sqrt(dx * dx + dz * dz)
      const threshold = 2.8
      const strength  = dist < threshold ? (1 - dist / threshold) * 0.10 : 0
      const safeD = Math.max(dist, 0.01)
      pushRef.current.x += ((-dx / safeD) * strength - pushRef.current.x) * 0.04
      pushRef.current.z += ((-dz / safeD) * strength - pushRef.current.z) * 0.04
    } else {
      // Damp push back to zero when focused
      pushRef.current.x += (0 - pushRef.current.x) * 0.08
      pushRef.current.z += (0 - pushRef.current.z) * 0.08
    }

    const g = groupRef.current
    if (g) g.position.set(ox + pushRef.current.x, 0, oz + pushRef.current.z)

    // Write live world-space position for the camera controller to track
    if (positionsRef && worldName && g) {
      g.getWorldPosition(worldPosRef.current)
      positionsRef.current.set(worldName, worldPosRef.current)
    }

    if (meshRef.current) meshRef.current.rotation.y += delta * 0.25

    // Damp the local zoom progress toward 1 when focused, 0 when not.
    // Using a per-planet ref (not the shared camera zoomRef) ensures moons
    // scale back smoothly on deselect instead of hard-cutting to zero.
    localZoomRef.current = THREE.MathUtils.damp(localZoomRef.current, focused ? 1 : 0, 3.5, delta)
    if (moonSystemRef.current) {
      moonSystemRef.current.scale.setScalar(localZoomRef.current)
    }
  })

  function handleClick(e: { stopPropagation: () => void }) {
    e.stopPropagation()
    if (focused && onSelectDimension) {
      // When already zoomed in, clicking the planet opens the overworld HUD
      onSelectDimension('overworld')
      return
    }
    if (!onClickWithPos || !groupRef.current) return
    const pos = new THREE.Vector3()
    groupRef.current.getWorldPosition(pos)
    onClickWithPos(pos)
  }

  const showZoomedGlow = focused || localZoomRef.current > 0.1

  return (
    <group ref={groupRef}>
      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={e => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.12 : 1}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : (showZoomedGlow ? 0.25 : 0.15)}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {active && <OrbitRing radius={radius} />}

      {/* Overworld label — shown when not focused */}
      {!focused && hovered && (
        <Html
          position={[0, radius + 0.35, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={10}
        >
          <div style={{
            fontFamily: 'monospace', fontSize: 10, color: '#fff',
            background: 'rgba(0,0,0,0.75)',
            border: `0.5px solid ${color}`,
            borderRadius: 4, padding: '3px 7px',
            whiteSpace: 'nowrap', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 700, color }}>{label}</div>
            <div style={{ color: '#94a3b8' }}>{fmtBytes(sizeBytes)}</div>
          </div>
        </Html>
      )}

      {/* Overworld name label when zoomed in */}
      {focused && (
        <Html
          position={[0, radius + 0.5, 0]}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={10}
        >
          <span style={{
            fontFamily: 'monospace', fontSize: 11, color: '#22c55e',
            textShadow: '0 0 6px #22c55e', whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        </Html>
      )}

      {/* Overworld HUD */}
      {world && selectedDimension === 'overworld' && onCloseHud && onSetActive && (
        <WorldHud
          world={world}
          dimension="overworld"
          onClose={onCloseHud}
          onSetActive={onSetActive}
          onDelete={onDelete!}
          onRename={onRename!}
          onDuplicate={onDuplicate!}
          onOpenFolder={onOpenFolder!}
          onBackup={onBackup!}
          onRefresh={onRefresh!}
        />
      )}

      {/* Moon system — scaled 0→1 by zoom progress, orbiting around this planet */}
      <group ref={moonSystemRef}>
        {moons.map(moon => {
          const orbit = MOON_ORBIT[moon.kind] ?? { orbitRX: 2.0, orbitRZ: 1.1, speed: 0.05, offset: 0 }
          return (
            <group key={moon.kind}>
              <OrbitPath radiusX={orbit.orbitRX} radiusZ={orbit.orbitRZ} opacity={0.1} />
              {world && onCloseHud && onSetActive && (
                <MoonBody
                  kind={moon.kind}
                  radius={0.18}
                  orbitRX={orbit.orbitRX}
                  orbitRZ={orbit.orbitRZ}
                  speed={orbit.speed}
                  offset={orbit.offset}
                  selected={selectedDimension === moon.kind}
                  onSelect={() => onSelectDimension?.(moon.kind)}
                  world={world}
                  onCloseHud={onCloseHud}
                  onSetActive={onSetActive}
                  onDelete={onDelete!}
                  onRename={onRename!}
                  onDuplicate={onDuplicate!}
                  onOpenFolder={onOpenFolder!}
                  onBackup={onBackup!}
                  onRefresh={onRefresh!}
                />
              )}
            </group>
          )
        })}

        {moons.length === 0 && focused && (
          <Html position={[0, -1.5, 0]} center distanceFactor={12}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569' }}>
              no other dimensions
            </span>
          </Html>
        )}
      </group>
    </group>
  )
}
