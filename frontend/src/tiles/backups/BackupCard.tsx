import type { Backup } from './useBackups'
import { fmtBytes, fmtDate, extractID } from './format'

function TagPillReadOnly({ tag }: { tag: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-px text-xs font-mono rounded"
      style={{
        background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--accent)',
        border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
      }}
    >
      #{tag}
    </span>
  )
}

interface BackupCardProps {
  backup: Backup
  focused: boolean
  inProgress: boolean
  serverRunning: boolean
  onRequestRestore: () => void
  onRequestDelete: () => void
}

export function BackupCard({ backup, focused, inProgress, serverRunning, onRequestRestore, onRequestDelete }: BackupCardProps) {
  const displayLabel = backup.displayName || extractID(backup.filename)

  return (
    <div
      className="flex flex-col gap-2 px-5 py-3 rounded-[10px]"
      style={{
        width: focused ? 360 : 260,
        minHeight: focused ? 140 : 96,
        border: focused
          ? '0.5px solid color-mix(in srgb, var(--accent) 45%, transparent)'
          : '0.5px solid var(--border-subtle)',
        background: focused
          ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-surface))'
          : 'var(--bg-surface)',
        transition: 'width 260ms cubic-bezier(0.34,1.15,0.64,1), min-height 260ms cubic-bezier(0.34,1.15,0.64,1), padding 200ms ease, border-color 200ms ease, background 200ms ease',
        userSelect: 'none',
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div
          className="font-mono truncate"
          style={{
            color: 'var(--text-primary)',
            fontSize: focused ? '0.9rem' : '0.75rem',
            transition: 'font-size 200ms ease',
          }}
        >
          {displayLabel}
        </div>
        {backup.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {backup.tags.map((tag) => (
              <TagPillReadOnly key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {inProgress ? (
        <div className="flex flex-col gap-0.5 text-xs font-mono animate-pulse" style={{ color: 'var(--accent)' }}>
          <div>backing up…</div>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          <div>{fmtDate(backup.createdAt)}</div>
          <div>{fmtBytes(backup.sizeBytes)}</div>
        </div>
      )}

      {focused && !inProgress && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onRequestRestore() }}
            disabled={serverRunning}
            className="flex-1 text-xs font-mono rounded-md py-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              border: '0.5px solid color-mix(in srgb, var(--accent) 35%, transparent)',
              color: 'var(--accent)',
            }}
            title={serverRunning ? 'Stop the server before restoring' : 'Restore this backup'}
            onMouseEnter={(e) => { if (!serverRunning) (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            restore
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRequestDelete() }}
            className="flex-1 text-xs font-mono rounded-md py-1.5 cursor-pointer"
            style={{
              background: 'color-mix(in srgb, #f87171 8%, transparent)',
              border: '0.5px solid color-mix(in srgb, #f87171 28%, transparent)',
              color: '#f87171',
              opacity: 0.75,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
          >
            delete
          </button>
        </div>
      )}
    </div>
  )
}
