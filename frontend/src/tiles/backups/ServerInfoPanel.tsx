import { useState, useEffect } from 'react'
import type { Backup } from './useBackups'
import type { WorldSystem } from './useBackupWorlds'
import { fmtBytes, fmtDate, extractID } from './format'

const KIND_COLOR: Record<string, string> = {
  overworld: '#22c55e',
  nether: '#ef4444',
  the_end: '#a78bfa',
}

const KIND_LABEL: Record<string, string> = {
  overworld: 'Overworld',
  nether: 'Nether',
  the_end: 'The End',
}

interface ServerInfoPanelProps {
  backup: Backup
  worlds: WorldSystem[]
  onClose: () => void
}

export function ServerInfoPanel({ backup, worlds, onClose }: ServerInfoPanelProps) {
  const [visible, setVisible] = useState(false)
  const [worldsOpen, setWorldsOpen] = useState(true)
  const [expandedWorlds, setExpandedWorlds] = useState<Set<string>>(new Set())

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

  function toggleWorld(name: string) {
    setExpandedWorlds((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const displayLabel = backup.displayName || extractID(backup.filename)

  return (
    <div
      className="absolute top-0 right-0 bottom-0 flex flex-col overflow-y-auto"
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
        className="flex shrink-0 items-start justify-between gap-2 px-4 pt-5 pb-4"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            {displayLabel}
          </span>
          {backup.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {backup.tags.map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
          }}
        >
          ✕
        </button>
      </div>

      {/* Meta */}
      <div
        className="flex shrink-0 flex-col px-4 py-3"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <Row label="created" value={fmtDate(backup.createdAt)} />
        <Row label="size" value={fmtBytes(backup.sizeBytes)} />
        <Row label="file" value={backup.filename} mono />
      </div>

      {/* Worlds section */}
      <div className="flex flex-col">
        <button
          className="flex w-full shrink-0 items-center justify-between px-4 py-3 text-left"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
          onClick={() => setWorldsOpen((o) => !o)}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
          }}
        >
          <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
            worlds{worlds.length > 0 ? ` (${worlds.length})` : ''}
          </span>
          <span
            className="font-mono text-xs"
            style={{
              color: 'var(--text-faint)',
              display: 'inline-block',
              transform: worldsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            ▾
          </span>
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateRows: worldsOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
            overflow: 'hidden',
          }}
        >
          <div style={{ minHeight: 0, overflow: 'hidden' }} className="flex flex-col">
            {worlds.length === 0 ? (
              <div className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
                No world data found in this backup.
              </div>
            ) : (
              worlds.map((world) => (
                <WorldRow
                  key={world.name}
                  world={world}
                  expanded={expandedWorlds.has(world.name)}
                  onToggle={() => toggleWorld(world.name)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function WorldRow({
  world,
  expanded,
  onToggle,
}: {
  world: WorldSystem
  expanded: boolean
  onToggle: () => void
}) {
  const displayName = world.meta?.found && world.meta.levelName ? world.meta.levelName : world.name

  return (
    <div style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-left"
        onClick={onToggle}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.025)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
            {displayName}
          </span>
          {world.active && (
            <span className="font-mono text-xs" style={{ color: '#22c55e' }}>
              active
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
            {fmtBytes(world.totalSize)}
          </span>
          <span
            className="font-mono text-xs"
            style={{
              color: 'var(--text-faint)',
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            ▾
          </span>
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 200ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{ minHeight: 0, overflow: 'hidden' }}
          className="flex flex-col gap-1.5 px-5 pt-2 pb-3"
        >
          {world.dimensions && world.dimensions.length > 0 ? (
            world.dimensions.map((dim) => <DimRow key={dim.kind} kind={dim.kind} size={dim.size} />)
          ) : (
            <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
              No dimension data.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </span>
      <span
        className="truncate text-right text-xs"
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
      <div className="shrink-0 rounded-full" style={{ width: 6, height: 6, background: color }} />
      <span className="flex-1 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
        {KIND_LABEL[kind] ?? kind}
      </span>
      {size > 0 && (
        <span className="font-mono text-xs" style={{ color: 'var(--text-faint)' }}>
          {fmtBytes(size)}
        </span>
      )}
    </div>
  )
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-px font-mono text-xs"
      style={{
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--accent)',
        border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
      }}
    >
      #{tag}
    </span>
  )
}
