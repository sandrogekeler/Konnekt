import { useState, useEffect } from 'react'
import type { WorldSystem } from './useBackupWorlds'
import { fmtBytes, fmtDate } from './format'

const KIND_COLOR: Record<string, string> = {
  overworld: '#22c55e',
  nether:    '#ef4444',
  the_end:   '#a78bfa',
}

const KIND_LABEL: Record<string, string> = {
  overworld: 'Overworld',
  nether:    'Nether',
  the_end:   'The End',
}

interface WorldInfoPanelProps {
  world: WorldSystem
  onClose: () => void
}

export function WorldInfoPanel({ world, onClose }: WorldInfoPanelProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meta    = world.meta
  const hasMeta = meta?.found

  const overworld = (world.dimensions ?? []).find(d => d.kind === 'overworld')
  const otherDims = (world.dimensions ?? []).filter(d => d.kind !== 'overworld')

  const displayName = (hasMeta && meta.levelName) ? meta.levelName : world.name
  const showFolder  = hasMeta && meta.levelName && meta.levelName !== world.name

  return (
    <div
      className="absolute right-0 top-0 bottom-0 overflow-y-auto flex flex-col"
      style={{
        width: '42%',
        minWidth: 230,
        zIndex: 20,
        background: 'color-mix(in srgb, var(--bg-base) 97%, white)',
        borderLeft: '0.5px solid var(--border-subtle)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 320ms cubic-bezier(0.34,1.15,0.64,1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-2 px-4 pt-5 pb-4 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="font-mono text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {displayName}
          </span>
          {showFolder && (
            <span className="font-mono text-xs truncate" style={{ color: 'var(--text-faint)' }}>
              /{world.name}
            </span>
          )}
          {(world.active || (hasMeta && meta.hardcore)) && (
            <div className="flex items-center gap-1.5">
              {world.active && <Badge label="active" color="#22c55e" />}
              {hasMeta && meta.hardcore && <Badge label="hardcore" color="#ef4444" />}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-mono mt-0.5"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
        >
          ✕
        </button>
      </div>

      {/* Meta rows */}
      {hasMeta && (
        <div
          className="flex flex-col px-4 py-3 shrink-0"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {meta.gameMode   && <Row label="mode"        value={capitalize(meta.gameMode)} />}
          {meta.difficulty && <Row label="difficulty"  value={capitalize(meta.difficulty)} />}
          {meta.version    && <Row label="version"     value={meta.version} />}
          {meta.seed       && <Row label="seed"        value={meta.seed} mono />}
          <Row label="spawn" value={`${meta.spawnX}, ${meta.spawnY}, ${meta.spawnZ}`} mono />
          {meta.lastPlayed > 0 && <Row label="last played" value={fmtDate(meta.lastPlayed)} />}
        </div>
      )}

      {/* Size */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <Row label="total size" value={fmtBytes(world.totalSize)} />
      </div>

      {/* Dimensions */}
      <div className="flex flex-col gap-2 px-4 py-3">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>dimensions</span>
        {overworld && <DimRow kind="overworld" size={overworld.size} />}
        {otherDims.map(dim => (
          <DimRow key={dim.kind} kind={dim.kind} size={dim.size} />
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>{label}</span>
      <span
        className="text-xs text-right truncate"
        style={{ color: 'var(--text-secondary)', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </span>
    </div>
  )
}

function DimRow({ kind, size }: { kind: string; size: number }) {
  const color = KIND_COLOR[kind] ?? '#60a5fa'
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: color }} />
      <span className="text-xs font-mono flex-1" style={{ color: 'var(--text-secondary)' }}>
        {KIND_LABEL[kind] ?? kind}
      </span>
      {size > 0 && (
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          {fmtBytes(size)}
        </span>
      )}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="text-xs font-mono px-1.5 py-px rounded"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        border: `0.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
