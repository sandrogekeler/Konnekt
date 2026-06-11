import type { ReactNode } from 'react'

interface TileWrapperProps {
  id: string
  label: string
  icon: string
  onRemove: (id: string) => void
  children: ReactNode
}

export function TileWrapper({ id, label, icon, onRemove, children }: TileWrapperProps) {
  return (
    <div
      className="tile-wrapper flex flex-col h-full rounded-[10px] overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-base)',
        backgroundImage: 'linear-gradient(var(--bg-surface), var(--bg-surface))',
        border: '0.5px solid var(--border-subtle)',
        transition: 'border-color 150ms, transform 150ms',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'rgba(255,255,255,0.12)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border-subtle)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div
        className="drag-handle flex items-center justify-between px-3 py-2 shrink-0 select-none"
        style={{
          borderBottom: '0.5px solid var(--border-subtle)',
          cursor: 'grab',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-xs font-medium text-white/70">{label}</span>
        </div>
        <button
          onClick={() => onRemove(id)}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-5 h-5 flex items-center justify-center text-white/25 hover:text-white/70 text-sm transition-colors leading-none"
          title="Remove tile"
        >
          ×
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
