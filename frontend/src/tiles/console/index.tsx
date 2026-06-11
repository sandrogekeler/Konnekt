import { useEffect, useRef, useState, useCallback } from 'react'
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime'
import { SendCommand } from '../../../wailsjs/go/main/App'
import type { TileProps } from '../../types'

interface LogLine {
  id: number
  timestamp: string
  text: string
  level: 'success' | 'warn' | 'error' | 'dim'
}

let lineId = 0

function classifyLine(text: string): LogLine['level'] {
  if (/Done|joined the game/.test(text)) return 'success'
  if (/warn|Can't keep up/i.test(text)) return 'warn'
  if (/error|ERROR/.test(text)) return 'error'
  return 'dim'
}

const LEVEL_CLASS: Record<LogLine['level'], string> = {
  success: 'text-green-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  dim: 'text-white/50',
}

export function ConsoleTile({ serverId }: TileProps) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [input, setInput] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (data: { timestamp: string; line: string }) => {
      setLines((prev) => [
        ...prev.slice(-2000),
        {
          id: ++lineId,
          timestamp: data.timestamp,
          text: data.line,
          level: classifyLine(data.line),
        },
      ])
    }
    try { EventsOn('log:line', handler) } catch { /* Wails runtime unavailable */ }
    return () => {
      try { EventsOff('log:line') } catch { /* */ }
    }
  }, [])

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5 select-text"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2">
            <span className="text-white/25 shrink-0">{line.timestamp}</span>
            <span className={LEVEL_CLASS[line.level]}>{line.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true)
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="mx-3 mb-1 text-xs text-white/40 hover:text-white/70 transition-colors text-center"
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
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm font-mono text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
        <button
          type="submit"
          className="px-3 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
