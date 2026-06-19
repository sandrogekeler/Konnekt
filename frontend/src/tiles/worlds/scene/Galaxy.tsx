import * as THREE from 'three'
import { Sun } from './Sun'
import { Planet } from './Planet'
import { OrbitPath } from './OrbitPath'
import type { WorldSystem } from '../useWorlds'

interface Props {
  worlds: WorldSystem[]
  focusName: string | null
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>
  selectedDimension: string | null
  onSelectWorld: (name: string) => void
  onSelectDimension: (kind: string) => void
}

function planetRadius(totalSize: number): number {
  const mb = totalSize / (1024 * 1024)
  return Math.max(0.26, Math.min(0.58, 0.26 + Math.log10(mb + 1) * 0.13))
}

// Fixed world-space spread for orbit radii. Must NOT depend on useThree().viewport
// because viewport.width changes when the camera zooms in — any re-render during
// the transition would recalculate smaller orbit radii and snap all planets.
const GALAXY_SPREAD = 11

export function Galaxy({
  worlds, focusName, positionsRef, selectedDimension,
  onSelectWorld, onSelectDimension,
}: Props) {
  const spread = GALAXY_SPREAD
  const step   = worlds.length > 1 ? spread / worlds.length : spread
  const speedBase  = 0.035
  const speedDecay = 0.88

  return (
    <group>
      {/* Increased distance so far planets stay lit when zoomed in */}
      <pointLight position={[0, 0, 0]} intensity={3} color="#fde68a" distance={60} />
      <ambientLight intensity={0.25} />

      <Sun radius={0.55} />

      {worlds.map((w, i) => {
        const orbitRX  = 1.8 + (i + 0.5) * step
        const orbitRZ  = orbitRX * 0.55
        const speed    = speedBase * Math.pow(speedDecay, i)
        const offset   = (i / Math.max(worlds.length, 1)) * Math.PI * 2
        const r        = planetRadius(w.totalSize)
        const overworld = w.dimensions.find(d => d.kind === 'overworld')
        const focused  = focusName === w.name

        return (
          <group key={w.name}>
            <OrbitPath radiusX={orbitRX} radiusZ={orbitRZ} />
            <Planet
              kind="overworld"
              radius={r}
              orbitRX={orbitRX}
              orbitRZ={orbitRZ}
              orbitSpeed={speed}
              orbitOffset={offset}
              active={w.active}
              label={w.name}

              onClickWithPos={() => !focused && onSelectWorld(w.name)}
              // unified-scene props
              focused={focused}
              worldName={w.name}
              positionsRef={positionsRef}
              world={w}
              selectedDimension={focused ? selectedDimension : null}
              onSelectDimension={onSelectDimension}
            />
          </group>
        )
      })}
    </group>
  )
}
