import { useState, useEffect } from 'react'
import { WireframeSphere } from './WireframeSphere'
import type { WorldSystem } from './useBackupWorlds'

// SVG is rendered at RENDER_SCALE × the focused display size.
// CSS scale is always ≤ 1/RENDER_SCALE so we only ever scale DOWN — no upscaling, no blur.
const RENDER_SCALE     = 2.5
// All planets focus to at least this size; large planets get size+20 if bigger.
const MIN_FOCUSED_SIZE = 160

const KIND_COLOR: Record<string, string> = {
  overworld: '#22c55e',
  nether:    '#ef4444',
  the_end:   '#a78bfa',
}

function djb2(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface DimDot {
  key: string
  color: string
  dx: number
  dy: number
  size: number
}

interface PlanetData {
  key: string
  color: string
  size: number        // visual size when unfocused
  focusedSize: number // visual size when focused (consistent, capped)
  renderSize: number  // actual SVG render size = focusedSize × RENDER_SCALE
  x: number
  y: number
  spinDuration: number
  floatIdx: number
  floatDelay: number
  enterDelay: number
  dimDots: DimDot[]   // dx/dy/size in renderSize coordinate space
}

function buildPlanets(worlds: WorldSystem[]): PlanetData[] {
  const n = worlds.length
  // One large planet when alone; shrink as worlds share the sky.
  const baseSize = Math.max(48, Math.round(200 / Math.sqrt(n)))

  return worlds.map((world, idx) => {
    const h  = djb2(world.name)
    const hx = djb2(world.name + '_x')

    // Single world: centered in sky. Multiple: hash-spread across the sky band.
    const x = n === 1
      ? 50
      : Math.round(50 + ((hx % 201) - 100) / 100 * 40 * (1 - (h % 100) / 100))
    const y = n === 1 ? 28 : Math.round(8 + (h % 100) / 100 * 34)

    const size = n === 1 ? baseSize : Math.max(40, baseSize + (h % 16) - 8)

    // Focused size: always at least MIN_FOCUSED_SIZE, and always larger than unfocused.
    const focusedSize = Math.max(size + 20, MIN_FOCUSED_SIZE)
    // SVG rendered at RENDER_SCALE × focusedSize so focused CSS scale = 1/RENDER_SCALE ≤ 1.
    const renderSize  = Math.round(focusedSize * RENDER_SCALE)
    const color       = KIND_COLOR['overworld']

    const dims = (world.dimensions ?? []).filter(d => d.kind !== 'overworld')
    const dimDots: DimDot[] = dims.map((dim, di) => {
      const dh    = djb2(`${world.name}/${dim.kind}`)
      const angle = (dh % 360) * (Math.PI / 180)
      const dist  = renderSize * 0.60 + ((dh >> 4) % 8) * RENDER_SCALE
      return {
        key:   `${world.name}/${dim.kind}`,
        color: KIND_COLOR[dim.kind] ?? '#60a5fa',
        dx:    Math.cos(angle) * dist,
        dy:    Math.sin(angle) * dist,
        size:  (3 + (di % 2)) * RENDER_SCALE,
      }
    })

    return {
      key: world.name, color, size, focusedSize, renderSize, x, y,
      spinDuration: 14 + (h % 10),
      floatIdx:     h % 3,
      floatDelay:   -((h >> 4) % 5),
      enterDelay:   idx * 60,
      dimDots,
    }
  })
}

function Planet({ p, world, isFocused, isFaded, onClick }: {
  p: PlanetData
  world: WorldSystem
  isFocused: boolean
  isFaded: boolean
  onClick: () => void
}) {
  const [risen,   setRisen]   = useState(false)
  const [hovered, setHovered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRisen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // CSS scale derived from the two display sizes — never exceeds 1.0.
  const scaleUnfocused = p.size / p.renderSize
  const scaleFocused   = p.focusedSize / p.renderSize
  const scaleHovered   = scaleUnfocused * 1.1

  const currentScale = isFocused ? scaleFocused : hovered ? scaleHovered : scaleUnfocused

  return (
    <div
      className="absolute"
      style={{
        left:      isFocused ? '30%' : `${p.x}%`,
        top:       isFocused ? '40%' : `${p.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'left 380ms cubic-bezier(0.34,1.15,0.64,1), top 380ms cubic-bezier(0.34,1.15,0.64,1), opacity 250ms ease',
        opacity:   isFaded ? 0.1 : 1,
        zIndex:    isFocused ? 5 : 1,
        pointerEvents: isFaded ? 'none' : 'auto',
      }}
      title={world.name}
    >
      {/* Entrance rise — 28px in screen coordinates, outside the scale wrapper */}
      <div
        style={{
          transform: risen ? 'translateY(0)' : 'translateY(28px)',
          opacity:   risen ? 1 : 0,
          transition: risen
            ? `transform 420ms ${p.enterDelay}ms cubic-bezier(0.34,1.56,0.64,1), opacity 320ms ${p.enterDelay}ms ease`
            : 'none',
        }}
      >
        {/* Float loop — runs in screen coords, unaffected by inner scale */}
        <div
          className="backup-planet"
          style={{
            animation: isFocused
              ? 'none'
              : `planet-float-${p.floatIdx} ${3 + p.floatIdx}s ${p.floatDelay}s ease-in-out infinite alternate`,
          }}
        >
          {/* Always rendered at renderSize; scaled down to display size.
              Hover + click handlers live here so pointer-events match the visual size,
              not the large layout box of the outer positioning div. */}
          <div
            style={{
              position:        'relative',
              width:           p.renderSize,
              height:          p.renderSize,
              transform:       `scale(${currentScale})`,
              transformOrigin: 'center center',
              transition:      'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
              willChange:      'transform',
              cursor:          'pointer',
            }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <WireframeSphere size={p.renderSize} color={p.color} spinDuration={p.spinDuration} />
            {p.dimDots.map(dot => (
              <div
                key={dot.key}
                className="absolute rounded-full"
                style={{
                  width:      dot.size,
                  height:     dot.size,
                  left:       p.renderSize / 2 + dot.dx - dot.size / 2,
                  top:        p.renderSize / 2 + dot.dy - dot.size / 2,
                  background: dot.color,
                  boxShadow:  `0 0 ${dot.size * 2}px ${dot.color}99`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PlanetPreviewProps {
  worlds: WorldSystem[]
  focusedWorldName: string | null
  onPlanetClick: (world: WorldSystem) => void
}

export function PlanetPreview({ worlds, focusedWorldName, onPlanetClick }: PlanetPreviewProps) {
  const planets = buildPlanets(worlds)
  if (planets.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {planets.map((p, i) => (
        <Planet
          key={p.key}
          p={p}
          world={worlds[i]}
          isFocused={focusedWorldName === worlds[i].name}
          isFaded={focusedWorldName !== null && focusedWorldName !== worlds[i].name}
          onClick={() => onPlanetClick(worlds[i])}
        />
      ))}
    </div>
  )
}
