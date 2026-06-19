import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { CameraControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { Galaxy } from './Galaxy'
import { WorldHud } from '../WorldHud'
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
const FOCUS_DIST         = Math.sqrt(FOCUS_ELEV * FOCUS_ELEV + FOCUS_BACK * FOCUS_BACK)  // ≈ 4.92
const CLOSE_DIST_MOON    = 1.2  // camera distance when a moon is the HUD focus
const CLOSE_DIST_PLANET  = 2.5  // camera distance when the main planet is the HUD focus
const ZOOM_LAMBDA  = 3.5

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
      const mat = points.material as THREE.ShaderMaterial
      if (fadeUniform.current) return  // already patched
      // Mutate in-place so R3F's reconciler keeps managing the same material object.
      // Cloning and replacing points.material causes R3F to reset it back to the
      // original on the next re-render of Stars (via <primitive attach="material">).
      const fade = { value: 1.0 }
      mat.uniforms.uFade = fade
      mat.fragmentShader = mat.fragmentShader
        .replace(
          'uniform float fade;',
          'uniform float fade;\nuniform float uFade;',
        )
        .replace(
          'gl_FragColor = vec4(vColor, opacity);',
          'gl_FragColor = vec4(vColor, opacity * uFade);',
        )
      mat.needsUpdate = true
      fadeUniform.current = fade
    })
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.001
    if (fadeUniform.current) {
      // Fade to 0 over the first 40% of the zoom-in transition, back to 1 at zero
      fadeUniform.current.value = Math.max(0, 1 - zoomRef.current / 0.4)
    }
  })

  return (
    <group ref={groupRef}>
      <Stars radius={60} depth={40} count={1400} factor={3} fade />
    </group>
  )
}

// Fires onReady after 2 rendered frames so the entrance reveal waits for actual
// WebGL content (shader compilation + first draw) rather than just canvas mount.
function FirstFrameSignal({ onReady }: { onReady: () => void }) {
  const frameCount = useRef(0)
  const fired      = useRef(false)
  useFrame(() => {
    if (fired.current) return
    frameCount.current += 1
    if (frameCount.current >= 2) {
      fired.current = true
      onReady()
    }
  })
  return null
}

interface ControllerProps {
  focusNameRef:          React.MutableRefObject<string | null>
  positionsRef:          React.MutableRefObject<Map<string, THREE.Vector3>>
  zoomRef:               React.MutableRefObject<number>
  camRef:                React.RefObject<CameraControls | null>
  hudOpenRef:            React.MutableRefObject<boolean>
  selectedDimensionRef:  React.MutableRefObject<string | null>
}

function SceneController({ focusNameRef, positionsRef, zoomRef, camRef, hudOpenRef, selectedDimensionRef }: ControllerProps) {
  const lastFocusNameRef      = useRef<string | null>(null)
  const lastSelectedDimRef    = useRef<string | null>(null)
  const hudOffsetRef          = useRef(0)

  // Reuse vectors across frames to avoid GC pressure
  const overviewEye      = useRef(new THREE.Vector3(0, 14, 5))
  const overviewTarget   = useRef(new THREE.Vector3(0, 0, 0))
  const blendedEye       = useRef(new THREE.Vector3())
  const blendedTarget    = useRef(new THREE.Vector3())
  const focusEye         = useRef(new THREE.Vector3())
  const blendedFocusPos  = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const targetP = focusNameRef.current ? 1 : 0
    zoomRef.current = THREE.MathUtils.damp(zoomRef.current, targetP, ZOOM_LAMBDA, delta)
    const p = zoomRef.current

    // Damp HUD offset first so t is available for the eye-distance calc below.
    const hudTarget = hudOpenRef.current ? 1 : 0
    hudOffsetRef.current = THREE.MathUtils.damp(hudOffsetRef.current, hudTarget, 5, delta)
    const t = hudOffsetRef.current

    if (focusNameRef.current) lastFocusNameRef.current = focusNameRef.current
    const nameForPos = focusNameRef.current ?? lastFocusNameRef.current

    // Retain last non-null dim during animation so we know which moon to blend from.
    if (selectedDimensionRef.current) lastSelectedDimRef.current = selectedDimensionRef.current

    const planetPos = nameForPos ? positionsRef.current.get(nameForPos) : undefined
    const moonKey   = (() => {
      const d = lastSelectedDimRef.current
      return nameForPos && d && d !== 'overworld' ? `${nameForPos}/${d}` : null
    })()
    const moonPos = moonKey ? positionsRef.current.get(moonKey) : undefined

    // Interpolate focusPos between planet (t=0) and moon (t=1).
    // This means closing the HUD smoothly glides the camera target from the moon
    // back toward the planet instead of snapping when lastSelectedDimRef is cleared.
    let focusPos: THREE.Vector3 | undefined
    if (moonPos && planetPos && t > 0.001) {
      blendedFocusPos.current.lerpVectors(planetPos, moonPos, t)
      focusPos = blendedFocusPos.current
    } else {
      focusPos = planetPos
      lastSelectedDimRef.current = null  // safe to clear once t has fully settled
    }

    const cam = camRef.current
    if (cam) {
      if (!focusPos || p < 0.001) {
        cam.setLookAt(
          overviewEye.current.x, overviewEye.current.y, overviewEye.current.z,
          0, 0, 0, false,
        )
      } else {
        // Eye distance lerps from FOCUS_DIST (planetary view) toward the close-up
        // distance as the HUD panel opens. Moons are small so zoom in tighter;
        // the main planet is larger so stay further back.
        const isMoonFocus = lastSelectedDimRef.current !== null && lastSelectedDimRef.current !== 'overworld'
        const closeDist   = isMoonFocus ? CLOSE_DIST_MOON : CLOSE_DIST_PLANET
        const eyeScale    = THREE.MathUtils.lerp(1, closeDist / FOCUS_DIST, t)
        focusEye.current.set(
          focusPos.x,
          focusPos.y + FOCUS_ELEV * eyeScale,
          focusPos.z + FOCUS_BACK * eyeScale,
        )

        const ease = p * p * (3 - 2 * p) // smoothstep
        blendedEye.current.lerpVectors(overviewEye.current, focusEye.current, ease)
        blendedTarget.current.lerpVectors(overviewTarget.current, focusPos, ease)

        cam.setLookAt(
          blendedEye.current.x, blendedEye.current.y, blendedEye.current.z,
          blendedTarget.current.x, blendedTarget.current.y, blendedTarget.current.z,
          false,
        )
      }
    }

    // Smoothly shift planet to right quarter (75% from left) when the HUD panel opens.
    // Panel is on the left half; planet should be centred in the right half.
    // setViewOffset with xOff=0 and a wider virtual frustum pushes the lookAt point
    // further right in the rendered output without changing the view direction.
    // Formula (t = 0→1): xOff = 0, fullW = W*(1+0.5*t)
    //   → planet position = (fullW/2) / W = 0.5 + 0.25*t → 0.75 at t=1.
    const perspCam = state.camera as unknown as THREE.PerspectiveCamera
    if (t > 0.001) {
      const W = state.gl.domElement.width
      const H = state.gl.domElement.height
      perspCam.setViewOffset(W * (1 + 0.5 * t), H, 0, 0, W, H)
    } else {
      perspCam.clearViewOffset()
    }
  })

  return null
}

export function WorldsScene({
  worlds, onSetActive, onDelete, onRename, onDuplicate, onOpenFolder, onBackup, onRefresh,
}: Props) {
  const [focusName, setFocusName]               = useState<string | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)
  const [revealed, setRevealed]                 = useState(false)
  const handleReady = useCallback(() => setRevealed(true), [])

  const focusNameRef = useRef<string | null>(null)
  const positionsRef          = useRef(new Map<string, THREE.Vector3>())
  const zoomRef               = useRef(0)
  const camRef                = useRef<CameraControls>(null)
  const hudOpenRef            = useRef(false)
  const selectedDimensionRef  = useRef<string | null>(null)

  // Keep refs in sync each render so SceneController reads the latest value each frame
  hudOpenRef.current           = !!(focusName && selectedDimension)
  selectedDimensionRef.current = selectedDimension

  function selectWorld(name: string) {
    focusNameRef.current = name
    setFocusName(name)
    setSelectedDimension(null)  // zoom in only; HUD opens on explicit body click
  }

  function goBack() {
    focusNameRef.current = null
    setFocusName(null)
    setSelectedDimension(null)
  }

  const hudWorld = focusName ? worlds.find(w => w.name === focusName) ?? null : null
  const hudOpen  = !!(focusName && selectedDimension)

  const navBtn: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    borderRadius: 4, padding: '3px 10px',
    fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Entrance reveal — wrapper div so the WebGL drawing-buffer size (set by Canvas
          layout, already correct after the 220ms gate) is never affected by transform */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity:   revealed ? 1 : 0,
        transform: revealed ? 'scale(1)' : 'scale(0.97)',
        transition: revealed
          ? 'opacity 0.4s cubic-bezier(0.25,0,0.25,1), transform 0.4s cubic-bezier(0.25,0,0.25,1)'
          : 'none',
      }}>
      {/* ← galaxy button — only visible in planetary view when the HUD panel is closed */}
      {focusName && !hudOpen && (
        <button onClick={goBack} style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, ...navBtn }}>
          ← galaxy
        </button>
      )}

      <Canvas
        camera={{ position: [0, 14, 5], fov: 50 }}
        style={{ position: 'absolute', inset: 0, background: '#050608' }}
      >
        <Suspense fallback={null}>
          <SlowStars zoomRef={zoomRef} />
          <FirstFrameSignal onReady={handleReady} />

          <Galaxy
            worlds={worlds}
            focusName={focusName}
            positionsRef={positionsRef}
            selectedDimension={selectedDimension}
            onSelectWorld={selectWorld}
            onSelectDimension={kind => setSelectedDimension(k => k === kind ? null : kind)}
          />

          {/* SceneController last so all planet positions are written before it reads them */}
          <SceneController
            focusNameRef={focusNameRef}
            positionsRef={positionsRef}
            zoomRef={zoomRef}
            camRef={camRef}
            hudOpenRef={hudOpenRef}
            selectedDimensionRef={selectedDimensionRef}
          />
        </Suspense>

        <CameraControls ref={camRef} enabled={false} />
      </Canvas>

      {/* HUD panel — outside Canvas so it receives pointer events normally.
          Slides in from the LEFT; camera simultaneously shifts the planet to the right half
          via setViewOffset (planet at 75% from left = centre of right half). */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: '50%',
          background: 'var(--bg-surface)',
          borderRight: '0.5px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
          padding: '16px 20px 24px',
          overflowY: 'auto',
          transform: hudOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.25, 0, 0.25, 1)',
          pointerEvents: hudOpen ? 'auto' : 'none',
          zIndex: 10,
        }}
      >
        {/* Navigation */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexShrink: 0 }}>
          <button style={navBtn} onClick={goBack}>← galaxy</button>
          <button style={navBtn} onClick={() => setSelectedDimension(null)}>← system</button>
        </div>

        {hudWorld && selectedDimension && (
          <WorldHud
            world={hudWorld}
            dimension={selectedDimension}
            onClose={() => setSelectedDimension(null)}
            onSetActive={onSetActive}
            onDelete={onDelete}
            onRename={onRename}
            onDuplicate={onDuplicate}
            onOpenFolder={onOpenFolder}
            onBackup={onBackup}
            onRefresh={onRefresh}
          />
        )}
      </div>
      </div>
    </div>
  )
}
