import type { ReactNode } from 'react'

interface TileWrapperProps {
  id: string
  label: string
  icon: string
  onRemove: (id: string) => void
  children: ReactNode
  maximizable?: boolean
  maximized?: boolean
  flash?: boolean
  onToggleMaximize?: (id: string) => void
}

export function TileWrapper({
  id,
  label,
  icon,
  onRemove,
  children,
  maximizable,
  maximized,
  flash,
  onToggleMaximize,
}: TileWrapperProps) {
  return (
    <div className={`relative h-full${maximized ? '' : ' tile-outer'}`}>
      {flash && <div className="tile-flash-ring" />}
    <div
      className="tile-wrapper flex flex-col h-full rounded-[10px] overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-base)',
        backgroundImage: 'linear-gradient(var(--bg-surface), var(--bg-surface))',
        border: '0.5px solid var(--border-subtle)',
        transition: 'border-color 150ms',
      }}
      onMouseEnter={maximized ? undefined : (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={maximized ? undefined : (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
      }}
    >
      <div
        className="drag-handle flex items-center justify-between px-3 py-2 shrink-0 select-none"
        style={{
          borderBottom: '0.5px solid var(--border-subtle)',
          cursor: maximized ? 'default' : 'grab',
        }}
        onDoubleClick={maximizable ? () => onToggleMaximize?.(id) : undefined}
        title={maximizable && !maximized ? 'Double-click to maximize' : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {maximizable && (
            <button
              onClick={() => onToggleMaximize?.(id)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-5 h-5 flex items-center justify-center text-xs transition-colors leading-none"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
              title={maximized ? 'Restore tile' : 'Maximize tile'}
            >
              {maximized ? '⤡' : '⤢'}
            </button>
          )}
          {!maximized && (
            <button
              onClick={() => onRemove(id)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-5 h-5 flex items-center justify-center text-sm transition-colors leading-none"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
              title="Remove tile"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
    </div>
  )
}
