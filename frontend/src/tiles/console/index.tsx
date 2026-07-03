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
  { value: 'all', label: 'All' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

function highlightQuery(text: string, query: string) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent text-canvas rounded-sm">
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
  const [filterOpen, setFilterOpen] = useState(false)
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
    <div className="flex h-full flex-col">
      {/* Search / filter toolbar — collapsed by default */}
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1">
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className={`flex shrink-0 items-center gap-1 text-xs transition-colors ${
            filterOpen ? 'text-text-secondary' : 'text-text-faint'
          }`}
          // eslint-disable-next-line no-restricted-syntax -- no --font-mono theme token registered yet; see agent_docs/HEALTH_CHECKLIST.md
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = filterOpen
              ? 'var(--text-secondary)'
              : 'var(--text-faint)'
          }}
        >
          <span>{filterOpen ? '▾' : '▸'}</span>
          <span>{filterOpen ? 'Filter' : levelFilter !== 'all' ? levelFilter : 'All'}</span>
        </button>
        {filterOpen && (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search…"
              className="bg-hover border-border-subtle text-text-primary flex-1 rounded border-[0.5px] px-2 py-0.5 font-mono text-xs outline-none"
              // eslint-disable-next-line no-restricted-syntax -- no --font-mono theme token registered yet; see agent_docs/HEALTH_CHECKLIST.md
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
              onFocus={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'
              }}
              onBlur={(e) => {
                ;(e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'
              }}
            />
            <Segmented
              options={LEVEL_FILTER_OPTIONS}
              value={levelFilter}
              onChange={setLevelFilter}
              compact
            />
            <span className="text-text-faint shrink-0 font-mono text-xs">
              {filtered.length}/{lines.length}
            </span>
          </>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 select-text"
        // eslint-disable-next-line no-restricted-syntax -- no --font-mono theme token registered yet; see agent_docs/HEALTH_CHECKLIST.md
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {filtered.length === 0 && lines.length > 0 ? (
          <div className="text-text-faint py-2 font-mono text-xs">No matching lines</div>
        ) : (
          filtered.map((line) => (
            <div key={line.id} className="flex gap-2">
              {showTimestamps && <span className="text-text-faint shrink-0">{line.timestamp}</span>}
              <span className={LEVEL_CLASS[line.level]}>{highlightQuery(line.text, query)}</span>
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
          className="text-text-muted mx-3 mb-1 text-center text-xs transition-colors"
        >
          ↓ scroll to bottom
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 px-3 pt-1 pb-3">
        <span className="text-accent self-center font-mono text-sm">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          className="bg-hover border-border-subtle text-text-primary flex-1 rounded border-[0.5px] px-2 py-1 font-mono text-sm transition-colors outline-none"
          // eslint-disable-next-line no-restricted-syntax -- no --font-mono theme token registered yet; see agent_docs/HEALTH_CHECKLIST.md
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          onFocus={(e) => {
            ;(e.target as HTMLInputElement).style.borderColor = 'var(--border-hover)'
          }}
          onBlur={(e) => {
            ;(e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'
          }}
        />
        <button
          type="submit"
          className="border-border-subtle text-text-secondary rounded border-[0.5px] px-3 py-1 text-xs transition-colors"
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
          className="border-border-subtle text-text-faint rounded border-[0.5px] px-3 py-1 text-xs transition-colors"
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
