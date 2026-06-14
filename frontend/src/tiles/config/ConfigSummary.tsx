import { useCallback, useEffect, useState } from 'react'
import { ReadConfigFile } from '../../../wailsjs/go/main/App'

interface Props {
  serverId: string
}

interface Summary {
  motd: string
  port: string
  gamemode: string
  difficulty: string
  maxPlayers: string
  onlineMode: boolean | null
  pvp: boolean | null
  whitelist: boolean | null
  viewDistance: string
}

function parseProps(raw: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    map[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return map
}

function stripMotd(raw: string): string {
  // Strip §-codes and literal \n separator; keep first line only
  const first = raw.split('\\n')[0]
  return first.replace(/§[0-9a-fklmnor]/gi, '').trim()
}

function parseBool(v: string | undefined): boolean | null {
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function BoolChip({ value }: { value: boolean | null }) {
  if (value === null) return <span style={{ color: 'var(--text-faint)' }}>—</span>
  return (
    <span style={{ color: value ? 'var(--accent)' : 'var(--text-muted)' }}>
      {value ? 'On' : 'Off'}
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-1.5"
      style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-mono font-medium text-right" style={{ color: 'var(--text-primary)' }}>
        {children}
      </span>
    </div>
  )
}

export function ConfigSummary({ serverId }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const raw = await ReadConfigFile(serverId, 'server.properties')
      const p = parseProps(raw)
      setSummary({
        motd: stripMotd(p['motd'] ?? ''),
        port: p['server-port'] ?? '25565',
        gamemode: titleCase(p['gamemode'] ?? 'survival'),
        difficulty: titleCase(p['difficulty'] ?? 'normal'),
        maxPlayers: p['max-players'] ?? '20',
        onlineMode: parseBool(p['online-mode']),
        pvp: parseBool(p['pvp']),
        whitelist: parseBool(p['white-list']),
        viewDistance: p['view-distance'] ?? '—',
      })
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [serverId])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 px-4">
        <span className="text-xs font-mono text-center" style={{ color: 'var(--text-faint)' }}>
          Could not read server.properties
        </span>
        <button
          onClick={load}
          className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
          style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>Loading…</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col px-3 py-2 overflow-hidden">
      {/* MOTD banner */}
      {summary.motd && (
        <div
          className="text-xs font-mono truncate mb-2 pb-2"
          style={{ color: 'var(--text-secondary)', borderBottom: '0.5px solid var(--border-subtle)' }}
          title={summary.motd}
        >
          {summary.motd}
        </div>
      )}

      {/* Settings rows */}
      <div className="flex-1 overflow-hidden">
        <Row label="Port">{summary.port}</Row>
        <Row label="Gamemode">{summary.gamemode}</Row>
        <Row label="Difficulty">{summary.difficulty}</Row>
        <Row label="Max Players">{summary.maxPlayers}</Row>
        <Row label="View Distance">{summary.viewDistance} chunks</Row>
        <Row label="Online Mode"><BoolChip value={summary.onlineMode} /></Row>
        <Row label="PvP"><BoolChip value={summary.pvp} /></Row>
        <Row label="Whitelist"><BoolChip value={summary.whitelist} /></Row>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between pt-1.5 mt-1 flex-shrink-0">
        <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Double-click title to edit
        </span>
        <button
          onClick={load}
          className="text-[10px] font-mono transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
          title="Refresh"
        >
          ↻
        </button>
      </div>
    </div>
  )
}
