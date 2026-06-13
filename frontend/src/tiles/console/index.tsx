import { useEffect, useRef, useCallback } from 'react'
import { SendCommand } from '../../../wailsjs/go/main/App'
import { useConsoleStore } from '../../stores/useConsoleStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { TileProps } from '../../types'
import { useState } from 'react'

const LEVEL_CLASS = {
  success: 'text-accent',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  dim: 'text-[var(--text-secondary)]',
} as const

export function ConsoleTile({ serverId }: TileProps) {
  const lines = useConsoleStore((s) => s.lines)
  const clear = useConsoleStore((s) => s.clear)
  const showTimestamps = useSettingsStore((s) => s.settings.consoleTimestamps)
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, autoScroll])

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
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 select-text"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2">
            {showTimestamps && (
              <span className="shrink-0" style={{ color: 'var(--text-faint)' }}>{line.timestamp}</span>
            )}
            <span className={LEVEL_CLASS[line.level]}>{line.text}</span>
          </div>
        ))}
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
