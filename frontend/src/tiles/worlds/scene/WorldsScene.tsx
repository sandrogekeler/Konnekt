import { useState, useRef, useEffect, Suspense } from 'react'
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
const MAX_BOKEH = 8.0
// CoC shader: smoothstep(0, focusRange, |dist − focusDist|) × bokehScale = blur px.
// Need CoC×bokehScale < 0.3px for orbit lines (max ±3.2 world units from focal plane)
// AND > 2px for the sun (~10 world units behind the planet).
// focusRange=30, bokehScale=8 satisfies both: orbit lines → 3.2%×8=0.25px (invisible);
// sun → 25.9%×8=2.07px (visible blur). Larger focusRange / smaller bokehScale fails
// to blur the sun; smaller focusRange causes visible artifacts on thin line geometry.
const FOCUS_RANGE_WORLD = 30

function SlowStars({ zoomRef }: { zoomRef: React.MutableRefObject<number> }) {
  const groupRef    = useRef<THREE.Group>(null)
  const fadeUniform = useRef<{ value: number } | null>(null)

  // Patch the Stars ShaderMaterial once it mounts so we can drive a uFade uniform.
  // drei's Stars uses AdditiveBlending + custom GLSL — material.opacity alone has no
  // effect; we must multiply alpha inside the fragment shader.
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse(obj => {
      const points = obj as THREE.Points
      if (!points.isPoints) return
      const old = points.material as THREE.ShaderMaterial
      const fade = { value: 1 }
      const patched = old.clone()
      patched.uniforms = { ...old.uniforms, uFade: fade }
      patched.fragmentShader = old.fragmentShader.replace(
        'gl_FragColor = vec4(vColor, opacity);',
        'gl_FragColor = vec4(vColor, opacity * uFade);',
      )
      points.material = patched
      fadeUniform.current = fade
    })
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.001
    if (fadeUniform.current) {
      // Fade to 0 over the first 40% of the zoom-in transition
      fadeUniform.current.value = Math.max(0, 1 - zoomRef.current / 0.4)
    }
  })

  return (
    <group ref={groupRef}>
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
      // CoC shader uses actual world-space distance — pass raw units, not normalised
      const camDist = blendedEye.current.distanceTo(focusPos)
      const coc = (dofRef.current as any).cocMaterial?.uniforms
      if (coc) {
        coc.focusDistance.value = camDist
        coc.focusRange.value    = FOCUS_RANGE_WORLD
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
