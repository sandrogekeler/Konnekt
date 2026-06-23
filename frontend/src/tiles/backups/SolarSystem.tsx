import { useEffect, useState } from 'react'
import { WireframeSphere } from './WireframeSphere'
import type { WorldSystem } from './useBackupWorlds'
import { FOCUS, FOCUS_TRANSITION, FOCUS_FADED_OPACITY } from './focusLayout'
import type { FocusTarget } from './focusLayout'

const RENDER_SCALE = 2.5

const SUN_SIZE  = 96
const WORLD_MIN = 40
const WORLD_MAX = 56

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

// ─── Dimension dots ────────────────────────────────────────────────────────

interface DimDot {
  key:   string
  color: string
  dx:    number
  dy:    number
  size:  number
}

function buildDimDots(world: WorldSystem, renderSize: number): DimDot[] {
  return (world.dimensions ?? [])
    .filter(d => d.kind !== 'overworld')
    .map((dim, di) => {
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
}

// ─── Per-world config ──────────────────────────────────────────────────────

interface WorldConfig {
  world:        WorldSystem
  renderSize:   number
  displaySize:  number
  x:            number   // % left — scattered around sun
  y:            number   // % top  — scattered around sun
  floatIdx:     number   // which float animation (0-2)
  floatDelay:   number   // seconds offset so worlds bob out of phase
  dimDots:      DimDot[]
  enterDelay:   number
  spinDuration: number
}

function buildConfigs(worlds: WorldSystem[]): WorldConfig[] {
  return worlds.map((world, idx) => {
    const h  = djb2(world.name)
    const h2 = djb2(world.name + '_x')

    const displaySize = WORLD_MIN + (h % (WORLD_MAX - WORLD_MIN + 1))
    const renderSize  = Math.round(FOCUS.size * RENDER_SCALE)

    // Scatter around the sun (50%, 36%) using polar coords.
    // rx/ry are % of container so layout stays responsive.
    const angle = (h % 628) / 100                          // 0..2π
    const rx    = 16 + (h2 % 10)                           // 16-25% of width
    const ry    = rx * 0.52                                // flattened vertically
    const x     = Math.max(12, Math.min(88, 50 + Math.cos(angle) * rx))
    const y     = Math.max(8,  Math.min(56, 36 + Math.sin(angle) * ry))

    return {
      world, renderSize, displaySize, x, y,
      floatIdx:    h % 3,
      floatDelay:  -((h >> 4) % 5),
      dimDots:     buildDimDots(world, renderSize),
      enterDelay:  idx * 60,
      spinDuration: 14 + (h % 10),
    }
  })
}

// ─── World node ────────────────────────────────────────────────────────────

function WorldNode({ cfg, isFocused, isFaded, risen, onClick }: {
  cfg:      WorldConfig
  isFocused: boolean
  isFaded:   boolean
  risen:     boolean
  onClick:   () => void
}) {
  const [hovered, setHovered] = useState(false)

  const scaleBase    = cfg.displaySize / cfg.renderSize
  const scaleFocused = FOCUS.size / cfg.renderSize
  const currentScale = isFocused
    ? scaleFocused
    : hovered && !isFaded ? scaleBase * 1.06 : scaleBase

  return (
    <div
      className="absolute"
      style={{
        left:      isFocused ? FOCUS.left : `${cfg.x}%`,
        top:       isFocused ? FOCUS.top  : `${cfg.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: FOCUS_TRANSITION,
        opacity:   isFaded ? FOCUS_FADED_OPACITY : 1,
        zIndex:    isFocused ? 5 : 1,
        pointerEvents: 'none',
      }}
    >
      {/* Entrance rise */}
      <div style={{
        transform: risen ? 'translateY(0)' : 'translateY(28px)',
        opacity:   risen ? 1 : 0,
        transition: risen
          ? `transform 420ms ${cfg.enterDelay}ms cubic-bezier(0.34,1.56,0.64,1), opacity 320ms ${cfg.enterDelay}ms ease`
          : 'none',
      }}>
        {/* Soft float — paused while focused */}
        <div
          className="backup-planet"
          style={{
            animation: isFocused
              ? 'none'
              : `planet-float-${cfg.floatIdx} ${3 + cfg.floatIdx}s ${cfg.floatDelay}s ease-in-out infinite alternate`,
          }}
        >
          <div
            style={{
              position:        'relative',
              width:           cfg.renderSize,
              height:          cfg.renderSize,
              transform:       `scale(${currentScale})`,
              transformOrigin: 'center center',
              transition:      'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
              willChange:      'transform',
              cursor:          'pointer',
              pointerEvents:   'auto',
            }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={cfg.world.name}
          >
            <WireframeSphere size={cfg.renderSize} color={KIND_COLOR.overworld} spinDuration={cfg.spinDuration} />
            {cfg.dimDots.map(dot => (
              <div
                key={dot.key}
                className="absolute rounded-full"
                style={{
                  width:      dot.size,
                  height:     dot.size,
                  left:       cfg.renderSize / 2 + dot.dx - dot.size / 2,
                  top:        cfg.renderSize / 2 + dot.dy - dot.size / 2,
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

// ─── Sun node ──────────────────────────────────────────────────────────────

function SunNode({ isFocused, isAnyFocused, risen, onClick }: {
  isFocused:    boolean
  isAnyFocused: boolean
  risen:        boolean
  onClick:      () => void
}) {
  const [hovered, setHovered] = useState(false)
  const renderSize = Math.round(FOCUS.size * RENDER_SCALE)
  const scaleBase  = SUN_SIZE / renderSize
  const scaleFocus = FOCUS.size / renderSize
  const currentScale = isFocused
    ? scaleFocus
    : hovered && !isAnyFocused ? scaleBase * 1.06 : scaleBase

  return (
    <div
      className="absolute"
      style={{
        left:      isFocused ? FOCUS.left : '50%',
        top:       isFocused ? FOCUS.top  : '36%',
        transform: 'translate(-50%, -50%)',
        transition: FOCUS_TRANSITION,
        opacity:   isAnyFocused && !isFocused ? FOCUS_FADED_OPACITY : 1,
        zIndex:    isFocused ? 6 : 2,
        pointerEvents: 'none',
      }}
    >
      {/* Entrance rise */}
      <div style={{
        transform: risen ? 'translateY(0)' : 'translateY(28px)',
        opacity:   risen ? 1 : 0,
        transition: risen
          ? 'transform 420ms cubic-bezier(0.34,1.56,0.64,1), opacity 320ms ease'
          : 'none',
      }}>
        <div
          style={{
            width:           renderSize,
            height:          renderSize,
            transform:       `scale(${currentScale})`,
            transformOrigin: 'center center',
            transition:      'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
            willChange:      'transform',
            cursor:          'pointer',
            pointerEvents:   'auto',
          }}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title="Server"
        >
          <WireframeSphere size={renderSize} />
        </div>
      </div>
    </div>
  )
}

// ─── Solar system ──────────────────────────────────────────────────────────

export interface SolarSystemProps {
  worlds:        WorldSystem[]
  focus:         FocusTarget
  onWorldClick:  (world: WorldSystem) => void
  onServerClick: () => void
}

export function SolarSystem({ worlds, focus, onWorldClick, onServerClick }: SolarSystemProps) {
  const configs = buildConfigs(worlds)

  const [risen, setRisen] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRisen(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const isServerFocused = focus?.kind === 'server'
  const isAnyFocused    = focus !== null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <SunNode
        isFocused={isServerFocused}
        isAnyFocused={isAnyFocused}
        risen={risen}
        onClick={onServerClick}
      />
      {configs.map((cfg) => {
        const isFocused = focus?.kind === 'world' && focus.world.name === cfg.world.name
        const isFaded   = isAnyFocused && !isFocused
        return (
          <WorldNode
            key={cfg.world.name}
            cfg={cfg}
            isFocused={isFocused}
            isFaded={isFaded}
            risen={risen}
            onClick={() => onWorldClick(cfg.world)}
          />
        )
      })}
    </div>
  )
}
