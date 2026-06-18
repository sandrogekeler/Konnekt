import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { TileProps } from '../../types'
import { usePerformanceHistory } from './usePerformanceHistory'
import type { StatsSnapshot } from './usePerformanceHistory'

// ─── helpers ────────────────────────────────────────────────────────────────

function tpsColor(tps: number): string {
  if (tps < 0) return 'text-[var(--text-faint)]'
  if (tps >= 18) return 'text-accent'
  if (tps >= 14) return 'text-yellow-400'
  return 'text-red-400'
}

function tpsStrokeColor(tps: number): string {
  if (tps < 0) return 'var(--border-hover)'
  if (tps >= 18) return 'var(--accent)'
  if (tps >= 14) return '#facc15'
  return '#f87171'
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function fmtTps(tps: number): string {
  return tps < 0 ? '—' : tps.toFixed(1)
}

type SortKey = 'timestamp' | 'tps' | 'ramUsedMB' | 'ramPct' | 'cpuPercent' | 'players'
type SortDir = 'asc' | 'desc'

// ─── compact view ────────────────────────────────────────────────────────────

function CompactView({ history }: { history: StatsSnapshot[] }) {
  const latest = history[history.length - 1]
  const tps = latest?.tps ?? -1
  const ramUsed = latest?.ramUsedMB ?? 0
  const ramTotal = latest?.ramTotalMB ?? 0
  const ramPct = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0
  const cpu = latest?.cpuPercent ?? 0
  const players = latest?.players ?? 0

  const sparkData = history.slice(-60).map((s) => ({
    ts: s.timestamp,
    tps: s.tps < 0 ? null : s.tps,
    ramPct: s.ramTotalMB > 0 ? (s.ramUsedMB / s.ramTotalMB) * 100 : null,
    cpu: s.cpuPercent,
  }))

  return (
    <div className="flex flex-col h-full px-3 py-2 gap-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <StatCell label="TPS" value={fmtTps(tps)} valueClass={tpsColor(tps)} />
        <StatCell label="CPU" value={`${cpu.toFixed(1)}%`} />
        <StatCell
          label="RAM"
          value={ramTotal > 0 ? `${Math.round(ramUsed)} / ${Math.round(ramTotal)} MB` : '—'}
        />
        <StatCell label="Players" value={String(players)} />
      </div>

      {ramTotal > 0 && (
        <div className="h-1 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--hover-surface)' }}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ramPct > 80 ? 'bg-red-500' : ramPct > 60 ? 'bg-yellow-500' : 'bg-accent'
            }`}
            style={{ width: `${Math.min(ramPct, 100)}%` }}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 rounded overflow-hidden" style={{ border: '0.5px solid var(--border-subtle)' }}>
        {sparkData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0e1117',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  fontSize: 10,
                  color: '#fff',
                  padding: '4px 8px',
                }}
                itemStyle={{ padding: '1px 0' }}
                formatter={(value, name) => {
                  if (value === null) return ['—', name]
                  const labels: Record<string, string> = { tps: 'TPS', ramPct: 'RAM%', cpu: 'CPU%' }
                  const units: Record<string, string> = { tps: '', ramPct: '%', cpu: '%' }
                  const num = value as number
                  return [`${num.toFixed(1)}${units[name as string] ?? ''}`, labels[name as string] ?? name]
                }}
                labelFormatter={(_, payload) => {
                  const ts = payload?.[0]?.payload?.ts as number | undefined
                  return ts ? fmtTime(ts) : ''
                }}
                separator=": "
              />
              <Line
                type="monotone"
                dataKey="tps"
                stroke="#4ade80"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ramPct"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#f87171"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-faint)' }}>
            waiting for data…
          </div>
        )}
      </div>
    </div>
  )
}

function StatCell({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-white/40 text-[10px]">{label}</span>
      <span className={`text-xs font-mono font-medium ${valueClass}`}>{value}</span>
    </div>
  )
}

// ─── expanded view ────────────────────────────────────────────────────────────

const TIME_RANGES = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '1h', minutes: 60 },
] as const

type TimeRange = (typeof TIME_RANGES)[number]['minutes']

function ExpandedView({ history }: { history: StatsSnapshot[] }) {
  const [range, setRange] = useState<TimeRange>(15)
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const anchor = history.length > 0 ? history[history.length - 1].timestamp : Date.now()
  const cutoff = anchor - range * 60 * 1000

  // Animated cutoff — drives the XAxis domain and chart data filter.
  // Tweens smoothly when the range changes; tracks anchor silently otherwise.
  const [animCutoff, setAnimCutoffRaw] = useState(cutoff)
  const animCutoffRef = useRef(animCutoff)
  const rafRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)

  // Keep animCutoff current when new data arrives and no animation is running.
  useEffect(() => {
    if (!isAnimatingRef.current) {
      animCutoffRef.current = cutoff
      setAnimCutoffRaw(cutoff)
    }
  }, [cutoff])

  // Cleanup on unmount.
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }, [])

  const changeRange = useCallback((newRange: TimeRange) => {
    if (newRange === range) return
    setRange(newRange)
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    const from = animCutoffRef.current
    const to = anchor - newRange * 60 * 1000
    const start = performance.now()
    isAnimatingRef.current = true
    const tick = (now: number) => {
      const t = Math.min((now - start) / 380, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (to - from) * eased
      animCutoffRef.current = v
      setAnimCutoffRaw(v)
      if (t < 1) { rafRef.current = requestAnimationFrame(tick) }
      else { rafRef.current = null; isAnimatingRef.current = false }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [range, anchor])

  // filtered is non-animated — used for the table and summary stats.
  const filtered = useMemo(
    () => history.filter((s) => s.timestamp >= cutoff),
    [history, cutoff],
  )

  // chartData is animated — filtered by the tweening animCutoff.
  const chartData = useMemo(
    () =>
      history
        .filter((s) => s.timestamp >= animCutoff)
        .map((s) => ({
          ts: s.timestamp,
          tps: hidden.has('tps') ? null : (s.tps < 0 ? null : s.tps),
          ramPct: hidden.has('ramPct') ? null : (s.ramTotalMB > 0 ? Math.round((s.ramUsedMB / s.ramTotalMB) * 100) : null),
          cpu: hidden.has('cpu') ? null : Math.round(s.cpuPercent),
          players: hidden.has('players') ? null : s.players,
        })),
    [history, animCutoff, hidden],
  )

  const tableRows = useMemo(() => {
    const rows = filtered.map((s) => ({
      ...s,
      ramPct: s.ramTotalMB > 0 ? (s.ramUsedMB / s.ramTotalMB) * 100 : 0,
    }))
    return [...rows].sort((a, b) => {
      const v = (x: typeof a) => {
        if (sortKey === 'ramPct') return x.ramPct
        return x[sortKey] as number
      }
      return sortDir === 'asc' ? v(a) - v(b) : v(b) - v(a)
    })
  }, [filtered, sortKey, sortDir])

  const summary = useMemo(() => {
    if (filtered.length === 0) return null
    const valid = filtered.filter((s) => s.tps >= 0)
    const tpsList = valid.map((s) => s.tps)
    const ramList = filtered.map((s) => s.ramUsedMB)
    const pctList = filtered.filter((s) => s.ramTotalMB > 0).map((s) => (s.ramUsedMB / s.ramTotalMB) * 100)
    const cpuList = filtered.map((s) => s.cpuPercent)
    const plList = filtered.map((s) => s.players)
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    return {
      tps: { min: Math.min(...tpsList), max: Math.max(...tpsList), avg: avg(tpsList) },
      ram: { min: Math.min(...ramList), max: Math.max(...ramList), avg: avg(ramList) },
      pct: { min: Math.min(...pctList), max: Math.max(...pctList), avg: avg(pctList) },
      cpu: { min: Math.min(...cpuList), max: Math.max(...cpuList), avg: avg(cpuList) },
      players: { min: Math.min(...plList), max: Math.max(...plList), avg: avg(plList) },
    }
  }, [filtered])

  const toggleHide = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const latest = history[history.length - 1]
  const latestTps = latest?.tps ?? -1

  // Dynamic TPS stroke color based on latest value
  const tpsStroke = tpsStrokeColor(latestTps)

  return (
    <div className="flex flex-col h-full px-4 py-3 gap-3 overflow-hidden">
      {/* time range selector */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-white/40 text-xs">Window:</span>
        {TIME_RANGES.map(({ label, minutes }) => (
          <button
            key={label}
            onClick={() => changeRange(minutes)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              range === minutes
                ? 'border-accent/60 text-accent bg-accent/10'
                : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-faint)' }}>{filtered.length} samples</span>
      </div>

      {/* chart */}
      <div className="flex-[3] min-h-0">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={[animCutoff, anchor]}
                tickFormatter={(v) => fmtTime(v)}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={60}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 20]}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0e1117',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#fff',
                }}
                labelFormatter={(v) => fmtTime(v as number)}
                formatter={(value, name) => {
                  const labels: Record<string, string> = { tps: 'TPS', ramPct: 'RAM%', cpu: 'CPU%', players: 'Players' }
                  return [value === null ? '—' : value, labels[name as string] ?? name]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                formatter={(value) => {
                  const labels: Record<string, string> = { tps: 'TPS', ramPct: 'RAM%', cpu: 'CPU%', players: 'Players' }
                  return <span style={{ color: hidden.has(value) ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)' }}>{labels[value] ?? value}</span>
                }}
                onClick={(e) => toggleHide(e.dataKey as string)}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tps"
                stroke={tpsStroke}
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ramPct"
                stroke="#fbbf24"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cpu"
                stroke="#f87171"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="players"
                stroke="#60a5fa"
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm">
            <span style={{ color: 'var(--text-faint)' }}>{history.length === 0 ? 'No data yet — start the server to begin recording' : 'No data in this time window'}</span>
          </div>
        )}
      </div>

      {/* sortable history table */}
      <div className="flex-[2] min-h-0 overflow-auto rounded border border-white/5">
        <table className="w-full text-xs font-mono border-collapse">
          <thead className="sticky top-0" style={{ backgroundColor: '#0a0c12' }}>
            <tr>
              {(
                [
                  { key: 'timestamp', label: 'Time' },
                  { key: 'tps', label: 'TPS' },
                  { key: 'ramUsedMB', label: 'RAM (MB)' },
                  { key: 'ramPct', label: 'RAM%' },
                  { key: 'cpuPercent', label: 'CPU%' },
                  { key: 'players', label: 'Players' },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="text-left px-2 py-1 text-white/40 font-medium cursor-pointer hover:text-white/70 select-none border-b border-white/5 whitespace-nowrap"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary && (
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <td className="px-2 py-1 text-white/30 italic">min·avg·max</td>
                <td className={`px-2 py-1 ${tpsColor(summary.tps.avg)}`}>
                  {summary.tps.min.toFixed(1)} · {summary.tps.avg.toFixed(1)} · {summary.tps.max.toFixed(1)}
                </td>
                <td className="px-2 py-1 text-white/50">
                  {Math.round(summary.ram.min)} · {Math.round(summary.ram.avg)} · {Math.round(summary.ram.max)}
                </td>
                <td className="px-2 py-1 text-white/50">
                  {summary.pct.min.toFixed(0)}% · {summary.pct.avg.toFixed(0)}% · {summary.pct.max.toFixed(0)}%
                </td>
                <td className="px-2 py-1 text-white/50">
                  {summary.cpu.min.toFixed(0)}% · {summary.cpu.avg.toFixed(0)}% · {summary.cpu.max.toFixed(0)}%
                </td>
                <td className="px-2 py-1 text-white/50">
                  {summary.players.min} · {summary.players.avg.toFixed(1)} · {summary.players.max}
                </td>
              </tr>
            )}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-white/20">
                  No data in this window
                </td>
              </tr>
            )}
            {tableRows.map((row) => (
              <tr key={row.timestamp} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                <td className="px-2 py-1 text-white/40">{fmtTime(row.timestamp)}</td>
                <td className={`px-2 py-1 font-medium ${tpsColor(row.tps)}`}>{fmtTps(row.tps)}</td>
                <td className="px-2 py-1 text-white/60">
                  {Math.round(row.ramUsedMB)} / {Math.round(row.ramTotalMB)}
                </td>
                <td className="px-2 py-1 text-white/60">{row.ramPct.toFixed(0)}%</td>
                <td className="px-2 py-1 text-white/60">{row.cpuPercent.toFixed(1)}%</td>
                <td className="px-2 py-1 text-white/60">{row.players}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── tile root ────────────────────────────────────────────────────────────────

export function PerformanceTile({ serverId, maximized }: TileProps) {
  const history = usePerformanceHistory(serverId)
  return maximized ? <ExpandedView history={history} /> : <CompactView history={history} />
}
