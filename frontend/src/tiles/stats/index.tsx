import { useEffect, useCallback } from 'react'
import { GetServerStatus } from '../../../wailsjs/go/main/App'
import { useServerStore } from '../../stores/useServerStore'
import type { TileProps } from '../../types'

function tpsColor(tps: number): string {
  if (tps >= 18) return 'text-green-400'
  if (tps >= 14) return 'text-yellow-400'
  return 'text-red-400'
}

function StatRow({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
      <span className="text-white/50 text-xs">{label}</span>
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
          className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-400' : 'bg-red-500'}`}
          style={status.running ? { boxShadow: '0 0 6px #4ade80' } : {}}
        />
        <span className={`text-sm font-semibold ${status.running ? 'text-green-400' : 'text-red-400'}`}>
          {status.running ? 'Online' : 'Offline'}
        </span>
        {status.running && (
          <span className="text-white/30 text-xs ml-auto">{status.uptime}</span>
        )}
      </div>

      <div className="flex-1">
        <StatRow label="Players" value={`${status.players} / ${status.maxPlayers}`} />
        <StatRow
          label="TPS"
          value={status.running ? status.tps.toFixed(1) : '—'}
          className={status.running ? tpsColor(status.tps) : 'text-white/30'}
        />
        <StatRow
          label="RAM"
          value={status.running ? `${Math.round(status.ramUsed)} / ${Math.round(status.ramTotal)} MB` : '—'}
        />
      </div>

      {status.running && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>Memory</span>
            <span>{ramPct.toFixed(0)}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ramPct > 80 ? 'bg-red-500' : ramPct > 60 ? 'bg-yellow-500' : 'bg-green-400'
              }`}
              style={{ width: `${ramPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
