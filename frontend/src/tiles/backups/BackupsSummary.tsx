import { useState } from 'react'
import { StopServer } from '../../../wailsjs/go/main/App'
import { useServerStore } from '../../stores/useServerStore'
import { BackupRunningDialog } from './BackupRunningDialog'
import { useBackups } from './useBackups'

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fmtRelTime(ms: number): string {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface Props {
  serverId: string
}

export function BackupsSummary({ serverId }: Props) {
  const { status } = useServerStore()
  const { backups, loading, listError, creating, create } = useBackups(serverId)
  const [showRunningDialog, setShowRunningDialog] = useState(false)
  const [stopping, setStopping] = useState(false)

  function handleCreateClick() {
    if (status.running) {
      setShowRunningDialog(true)
    } else {
      create()
    }
  }

  async function stopAndBackUp() {
    setShowRunningDialog(false)
    setStopping(true)
    try {
      await StopServer(serverId)
    } catch { /* server may already be stopped */ }
    setStopping(false)
    await create()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
        Loading…
      </div>
    )
  }

  if (listError) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono px-3 text-center" style={{ color: 'var(--danger)' }}>
        {listError}
      </div>
    )
  }

  const latest = backups[0]

  return (
    <div className="relative flex flex-col h-full px-3 py-2 gap-2">
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-1">
        {latest ? (
          <>
            <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>Last backup</div>
            <div className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
              {fmtRelTime(latest.createdAt)}
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
              {fmtBytes(latest.sizeBytes)} · {backups.length} total
            </div>
          </>
        ) : (
          <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>No backups yet</div>
        )}
      </div>
      <button
        onClick={handleCreateClick}
        disabled={creating || stopping}
        className="w-full py-1 text-xs font-mono rounded border transition-colors disabled:opacity-40"
        style={{
          borderColor: 'var(--accent)',
          color: 'var(--accent)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!creating && !stopping) {
            (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        {stopping ? 'Stopping server…' : creating ? 'Backing up…' : 'Back up now'}
      </button>
      {showRunningDialog && (
        <BackupRunningDialog
          onBackUpNow={() => { setShowRunningDialog(false); create() }}
          onStopAndBackUp={stopAndBackUp}
          onCancel={() => setShowRunningDialog(false)}
        />
      )}
    </div>
  )
}
