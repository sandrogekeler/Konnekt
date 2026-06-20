import { useEffect, useRef, useCallback, useMemo } from 'react'
import { SendCommand } from '../../../wailsjs/go/main/App'
import { useConsoleStore } from '../../stores/useConsoleStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { Segmented } from '../../components/ui/Segmented'
import type { TileProps } from '../../types'
import { useState } from 'react'

const LEVEL_CLASS = {
  success: 'text-accent',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  dim: 'text-[var(--text-secondary)]',
} as const

type LevelFilter = 'all' | 'warn' | 'error'

const LEVEL_FILTER_OPTIONS: { value: LevelFilter; label: string }[] = [
  { value: 'all',   label: 'All' },
  { value: 'warn',  label: 'Warn' },
  { value: 'error', label: 'Error' },
]

function highlightQuery(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent)', color: 'var(--bg-base)', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function ConsoleTile({ serverId }: TileProps) {
  const lines = useConsoleStore((s) => s.lines)
  const clear = useConsoleStore((s) => s.clear)
  const showTimestamps = useSettingsStore((s) => s.settings.consoleTimestamps)
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [query, setQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    let result = lines
    if (levelFilter !== 'all') result = result.filter((l) => l.level === levelFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter((l) => l.text.toLowerCase().includes(q))
    }
    return result
  }, [lines, levelFilter, query])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim()) return
      SendCommand(serverId, input.trim()).catch(console.error)
      setInput('')
    },
    [input, serverId],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search / filter toolbar */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1 shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter…"
          className="flex-1 rounded px-2 py-0.5 text-xs font-mono outline-none"
          style={{
            background: 'var(--hover-surface)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)' }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)' }}
        />
        <Segmented options={LEVEL_FILTER_OPTIONS} value={levelFilter} onChange={setLevelFilter} />
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-faint)' }}>
          {filtered.length}/{lines.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 select-text"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {filtered.length === 0 && lines.length > 0 ? (
          <div className="text-xs font-mono py-2" style={{ color: 'var(--text-faint)' }}>
            No matching lines
          </div>
        ) : (
          filtered.map((line) => (
            <div key={line.id} className="flex gap-2">
              {showTimestamps && (
                <span className="shrink-0" style={{ color: 'var(--text-faint)' }}>{line.timestamp}</span>
              )}
              <span className={LEVEL_CLASS[line.level]}>
                {highlightQuery(line.text, query)}
              </span>
            </div>
          ))
        )}
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }}
          className="mx-3 mb-1 text-xs transition-colors text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          ↓ scroll to bottom
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 px-3 pb-3 pt-1">
        <span className="text-accent font-mono text-sm self-center">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          className="flex-1 rounded px-2 py-1 text-sm font-mono outline-none transition-colors"
          style={{
            background: 'var(--hover-surface)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)' }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)' }}
        />
        <button
          type="submit"
          className="px-3 py-1 text-xs rounded transition-colors"
          style={{ border: '0.5px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
          }}
        >
          Send
        </button>
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-xs rounded transition-colors"
          style={{ border: '0.5px solid var(--border-subtle)', color: 'var(--text-faint)' }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
          }}
          title="Clear console"
        >
          clr
        </button>
      </form>
    </div>
  )
}
