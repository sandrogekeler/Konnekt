interface Props {
  onBackUpNow: () => void
  onStopAndBackUp: () => void
  onCancel: () => void
}

export function BackupRunningDialog({ onBackUpNow, onStopAndBackUp, onCancel }: Props) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="mx-4 px-4 py-4 rounded-lg flex flex-col gap-3 max-w-xs w-full"
        style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
      >
        <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The server is running. Back up now and saves will be flushed first, or stop the server cleanly before backing up.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onBackUpNow}
            className="w-full px-3 py-1.5 text-xs font-mono rounded border transition-colors"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Back up now
          </button>
          <button
            onClick={onStopAndBackUp}
            className="w-full px-3 py-1.5 text-xs font-mono rounded border transition-colors"
            style={{ borderColor: 'var(--border-hover)', color: 'var(--text-secondary)', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-muted)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)' }}
          >
            Stop server &amp; back up
          </button>
          <button
            onClick={onCancel}
            className="w-full px-3 py-1.5 text-xs font-mono transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
