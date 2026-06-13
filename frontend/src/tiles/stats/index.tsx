import { useEffect, useCallback } from 'react'
import { GetServerStatus } from '../../../wailsjs/go/main/App'
import { useServerStore } from '../../stores/useServerStore'
import type { TileProps } from '../../types'

function tpsColor(tps: number): string {
  if (tps >= 18) return 'text-accent'
  if (tps >= 14) return 'text-yellow-400'
  return 'text-red-400'
}

function StatRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-center py-1 last:border-0" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`text-sm font-mono font-medium ${className}`}>{value}</span>
    </div>
  )
}

export function StatsTile({ serverId }: TileProps) {
  const { status, setStatus } = useServerStore()

  const poll = useCallback(async () => {
    const s = await GetServerStatus(serverId).catch(() => null)
    if (s) setStatus(s)
  }, [serverId, setStatus])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [poll])

  const ramPct = status.ramTotal > 0 ? (status.ramUsed / status.ramTotal) * 100 : 0

  return (
    <div className="flex flex-col justify-between h-full px-3 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2 h-2 rounded-full ${status.running ? 'bg-accent' : 'bg-red-500'}`}
          style={status.running ? { boxShadow: '0 0 6px var(--accent)' } : {}}
        />
        <span className={`text-sm font-semibold ${status.running ? 'text-accent' : 'text-red-400'}`}>
          {status.running ? 'Online' : 'Offline'}
        </span>
        {status.running && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-faint)' }}>{status.uptime}</span>
        )}
      </div>

      <div className="flex-1">
        <StatRow label="Players" value={`${status.players} / ${status.maxPlayers}`} />
        <StatRow
          label="TPS"
          value={status.running && status.tps >= 0 ? status.tps.toFixed(1) : '—'}
          className={status.running && status.tps >= 0 ? tpsColor(status.tps) : ''}
        />
        <StatRow
          label="RAM"
          value={status.running ? `${Math.round(status.ramUsed)} / ${Math.round(status.ramTotal)} MB` : '—'}
        />
      </div>

      {status.running && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-faint)' }}>
            <span>Memory</span>
            <span>{ramPct.toFixed(0)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--hover-surface)' }}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ramPct > 80 ? 'bg-red-500' : ramPct > 60 ? 'bg-yellow-500' : 'bg-accent'
              }`}
              style={{ width: `${ramPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
