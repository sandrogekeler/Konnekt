import { useEffect, useRef, useCallback } from 'react'
import { SendCommand } from '../../../wailsjs/go/main/App'
import { useConsoleStore } from '../../stores/useConsoleStore'
import type { TileProps } from '../../types'
import { useState } from 'react'

const LEVEL_CLASS = {
  success: 'text-green-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  dim: 'text-white/50',
} as const

export function ConsoleTile({ serverId }: TileProps) {
  const lines = useConsoleStore((s) => s.lines)
  const clear = useConsoleStore((s) => s.clear)
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
            <span className="text-white/25 shrink-0">{line.timestamp}</span>
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
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 text-xs rounded border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-colors"
          title="Clear console"
        >
          clr
        </button>
      </form>
    </div>
  )
}
