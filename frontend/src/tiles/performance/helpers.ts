export function tpsColor(tps: number): string {
  if (tps < 0) return 'text-[var(--text-faint)]'
  if (tps >= 18) return 'text-accent'
  if (tps >= 14) return 'text-[var(--warning)]'
  return 'text-[var(--danger)]'
}

export function tpsStrokeColor(tps: number): string {
  if (tps < 0) return 'var(--border-hover)'
  if (tps >= 18) return 'var(--accent)'
  if (tps >= 14) return 'var(--warning)'
  return 'var(--danger)'
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function fmtTps(tps: number): string {
  return tps < 0 ? '—' : tps.toFixed(1)
}
