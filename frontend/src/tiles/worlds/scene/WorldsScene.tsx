import { useState, useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls, Stars } from '@react-three/drei'
import { EffectComposer, DepthOfField } from '@react-three/postprocessing'
import type { DepthOfFieldEffect } from 'postprocessing'
import * as THREE from 'three'
import { Galaxy } from './Galaxy'
import type { WorldSystem as WorldSystemData } from '../useWorlds'

interface Props {
  worlds: WorldSystemData[]
  onSetActive: (name: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
  onRename: (old: string, next: string) => Promise<void>
  onDuplicate: (name: string, next: string) => Promise<void>
  onOpenFolder: (name: string) => Promise<void>
  onBackup: (name: string) => Promise<void>
  onRefresh: () => void
}

// Fixed scene-space offset from the focused planet (not sun-axis-relative)
const FOCUS_ELEV   = 4.5  // units above the orbital plane
const FOCUS_BACK   = 2.0  // units in +Z (gives slight frontal tilt; sun visible when planet is at +Z)
const ZOOM_LAMBDA  = 3.5
const MAX_BOKEH    = 4.0
// Camera is ~4.9 world units from the focused planet (sqrt(FOCUS_ELEV²+FOCUS_BACK²)).
// The default r3f Canvas far plane is 1000.
const CAMERA_FAR   = 1000
// In-focus band: ±4 world units around the focal plane keeps the planet AND all moon
// orbits (max 3.2 units from planet) sharp. The sun, 10+ units behind the planet, falls
// well outside this range and gets blurred.
const FOCUS_RANGE_WORLD = 8

function SlowStars({ zoomRef }: { zoomRef: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.001
    // Hide stars when zoomed into a planet — they don't belong in system view
    ref.current.visible = zoomRef.current < 0.35
  })
  return (
    <group ref={ref}>
      <Stars radius={60} depth={40} count={1400} factor={3} fade />
    </group>
  )
}

interface ControllerProps {
  focusNameRef: React.MutableRefObject<string | null>
  positionsRef: React.MutableRefObject<Map<string, THREE.Vector3>>
  zoomRef:      React.MutableRefObject<number>
  camRef:       React.RefObject<CameraControls | null>
}

function SceneController({ focusNameRef, positionsRef, zoomRef, camRef }: ControllerProps) {
  const lastFocusNameRef = useRef<string | null>(null)
  const dofRef           = useRef<DepthOfFieldEffect>(null)

  // Reuse vectors across frames to avoid GC pressure
  const overviewEye    = useRef(new THREE.Vector3(0, 14, 5))
  const overviewTarget = useRef(new THREE.Vector3(0, 0, 0))
  const blendedEye     = useRef(new THREE.Vector3())
  const blendedTarget  = useRef(new THREE.Vector3())
  const focusEye       = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const targetP = focusNameRef.current ? 1 : 0
    zoomRef.current = THREE.MathUtils.damp(zoomRef.current, targetP, ZOOM_LAMBDA, delta)
    const p = zoomRef.current

    if (focusNameRef.current) lastFocusNameRef.current = focusNameRef.current
    const nameForPos = focusNameRef.current ?? lastFocusNameRef.current
    const focusPos   = nameForPos ? positionsRef.current.get(nameForPos) : undefined

    const cam = camRef.current
    if (!cam) return

    if (!focusPos || p < 0.001) {
      cam.setLookAt(
        overviewEye.current.x, overviewEye.current.y, overviewEye.current.z,
        0, 0, 0, false,
      )
      if (dofRef.current) dofRef.current.bokehScale = 0
      return
    }

    // Fixed scene-space offset: mostly above + slight +Z tilt.
    // Not tied to the sun direction so the camera doesn't rotate with the orbit.
    focusEye.current.set(focusPos.x, focusPos.y + FOCUS_ELEV, focusPos.z + FOCUS_BACK)

    const ease = p * p * (3 - 2 * p) // smoothstep
    blendedEye.current.lerpVectors(overviewEye.current, focusEye.current, ease)
    blendedTarget.current.lerpVectors(overviewTarget.current, focusPos, ease)

    cam.setLookAt(
      blendedEye.current.x, blendedEye.current.y, blendedEye.current.z,
      blendedTarget.current.x, blendedTarget.current.y, blendedTarget.current.z,
      false,
    )

    if (dofRef.current) {
      dofRef.current.bokehScale = ease * MAX_BOKEH
      // Drive focus distance from the actual blended camera-to-planet distance so
      // the focal plane always sits exactly on the planet regardless of zoom progress.
      // The target setter and .copy() both fail to update cocMaterial uniforms in
      // postprocessing v6 — direct uniform mutation is the only reliable path.
      const camDist = blendedEye.current.distanceTo(focusPos)
      const coc = (dofRef.current as any).cocMaterial?.uniforms
      if (coc) {
        coc.focusDistance.value = camDist / CAMERA_FAR
        coc.focusRange.value    = FOCUS_RANGE_WORLD / CAMERA_FAR
      }
    }
  })

  return (
    <EffectComposer>
      <DepthOfField
        ref={dofRef}
        focusDistance={0}
        focusRange={0}
        focalLength={0.05}
        bokehScale={0}
      />
    </EffectComposer>
  )
}

export function WorldsScene({
  worlds, onSetActive, onDelete, onRename, onDuplicate, onOpenFolder, onBackup, onRefresh,
}: Props) {
  const [focusName, setFocusName]               = useState<string | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)

  const focusNameRef = useRef<string | null>(null)
  const positionsRef = useRef(new Map<string, THREE.Vector3>())
  const zoomRef      = useRef(0)
  const camRef       = useRef<CameraControls>(null)

  function selectWorld(name: string) {
    focusNameRef.current = name
    setFocusName(name)
    setSelectedDimension(null)
  }

  function goBack() {
    focusNameRef.current = null
    setFocusName(null)
    setSelectedDimension(null)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {focusName && (
        <button
          onClick={goBack}
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 10,
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            borderRadius: 4, padding: '3px 10px',
            fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
          }}
        >
          ← galaxy
        </button>
      )}

      <Canvas
        camera={{ position: [0, 14, 5], fov: 50 }}
        style={{ position: 'absolute', inset: 0, background: '#050608' }}
      >
        <Suspense fallback={null}>
          <SlowStars zoomRef={zoomRef} />

          <Galaxy
            worlds={worlds}
            focusName={focusName}
            positionsRef={positionsRef}
            zoomRef={zoomRef}
            selectedDimension={selectedDimension}
            onSelectWorld={selectWorld}
            onSelectDimension={kind => setSelectedDimension(k => k === kind ? null : kind)}
            onCloseHud={() => setSelectedDimension(null)}
            onSetActive={onSetActive}
            onDelete={onDelete}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onOpenFolder={onOpenFolder}
            onBackup={onBackup}
            onRefresh={onRefresh}
          />

          {/* SceneController last so all planet positions are written before it reads them */}
          <SceneController
            focusNameRef={focusNameRef}
            positionsRef={positionsRef}
            zoomRef={zoomRef}
            camRef={camRef}
          />
        </Suspense>

        <CameraControls ref={camRef} enabled={false} />
      </Canvas>
    </div>
  )
}
