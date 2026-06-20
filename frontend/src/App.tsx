import { useEffect, useRef, useState } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { StartServer } from '../wailsjs/go/main/App'
import { Dashboard } from './components/Dashboard'
import { TileCrate } from './components/TileCrate'
import { LayoutPresets } from './components/LayoutPresets'
import { ActiveProcesses } from './components/ActiveProcesses'
import { ServerSelector } from './components/ServerSelector'
import { EulaModal } from './components/EulaModal'
import { SettingsModal } from './components/SettingsModal'
import { useServerConfigStore } from './stores/useServerConfigStore'
import { useConsoleStore } from './stores/useConsoleStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useProcessesStore } from './stores/useProcessesStore'
import { emitNotification } from './lib/notify'
import { EVENTS } from './lib/constants'

function App() {
  const { activeId } = useServerConfigStore()
  const settingsLoaded = useSettingsStore((s) => s.loaded)
  const [eulaRequired, setEulaRequired] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const autoStarted = useRef(false)
  const lowTpsWarned = useRef(false)

  useEffect(() => {
    useSettingsStore.getState().load()
  }, [])

  // Auto-start active server on launch
  useEffect(() => {
    if (!settingsLoaded || !activeId || autoStarted.current) return
    if (useSettingsStore.getState().settings.autoStartActiveServer) {
      autoStarted.current = true
      StartServer(activeId).catch(() => { /* already running or no server */ })
    }
  }, [settingsLoaded, activeId])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.EULA_REQUIRED, () => setEulaRequired(true))
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Batch log lines so the console re-renders at most ~7×/sec instead of once
  // per line — prevents render storms on busy servers.
  const pendingLines = useRef<Array<{ timestamp: string; line: string }>>([])
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.LOG_LINE, (data: { timestamp: string; line: string }) => {
        pendingLines.current.push(data)
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])
  useEffect(() => {
    const id = setInterval(() => {
      const batch = pendingLines.current
      if (batch.length === 0) return
      pendingLines.current = []
      useConsoleStore.getState().batchAppend(batch)
    }, 150)
    return () => clearInterval(id)
  }, [])

  // Server stopped — detect crash vs. deliberate stop
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.SERVER_STOPPED, (payload?: { expected?: boolean }) => {
        const { settings } = useSettingsStore.getState()
        if (!payload?.expected && settings.notifyOnCrash) {
          emitNotification('crash', 'Server stopped unexpectedly')
        }
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Player join notifications
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.PLAYER_JOINED, (name: string) => {
        const { settings } = useSettingsStore.getState()
        if (settings.notifyOnJoin) {
          emitNotification('join', `${name} joined the game`)
        }
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Backup / restore notifications + sidebar progress tracking
  useEffect(() => {
    let c1: (() => void) | undefined
    let c2: (() => void) | undefined
    let c3: (() => void) | undefined
    let c4: (() => void) | undefined
    let c5: (() => void) | undefined
    try {
      c1 = EventsOn(EVENTS.BACKUP_STARTED, (data?: { serverID?: string }) => {
        useProcessesStore.getState().start(data?.serverID ?? 'backup', 'Backing up world…')
      })
      c2 = EventsOn(EVENTS.BACKUP_PROGRESS, (data?: { serverID?: string; percent?: number }) => {
        useProcessesStore.getState().updateProgress(data?.serverID ?? 'backup', data?.percent ?? 0)
      })
      c3 = EventsOn(EVENTS.BACKUP_COMPLETED, (data?: { serverID?: string }) => {
        useProcessesStore.getState().finish(data?.serverID ?? 'backup', 'done')
        emitNotification('info', 'Backup completed')
      })
      c4 = EventsOn(EVENTS.RESTORE_COMPLETED, () => { emitNotification('info', 'Restore completed') })
      c5 = EventsOn(EVENTS.BACKUP_FAILED, (data?: { serverID?: string; error?: string }) => {
        useProcessesStore.getState().finish(data?.serverID ?? 'backup', 'failed')
        emitNotification('crash', `Backup failed${data?.error ? ': ' + data.error : ''}`)
      })
    } catch { /* non-Wails context */ }
    return () => {
      try { c1?.() } catch { }
      try { c2?.() } catch { }
      try { c3?.() } catch { }
      try { c4?.() } catch { }
      try { c5?.() } catch { }
    }
  }, [])

  // Scheduler notify block → in-app notification
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.SCHEDULE_NOTIFY, (data: { kind: string; message: string }) => {
        const kind = (['info', 'warn', 'error'].includes(data.kind) ? data.kind : 'info') as 'info' | 'warn' | 'error'
        emitNotification(kind, data.message)
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Server started notification
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.SERVER_STARTED, () => {
        emitNotification('info', 'Server started')
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Player left notifications — shares the join toggle (player-activity alerts)
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.PLAYER_LEFT, (name: string) => {
        const { settings } = useSettingsStore.getState()
        if (settings.notifyOnJoin) {
          emitNotification('join', `${name} left the game`)
        }
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  // Low-TPS warning — edge-triggered with 14/15 hysteresis so a sustained dip
  // warns once, not every 10s snapshot; re-arms only after TPS recovers.
  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.STATS_SNAPSHOT, (snap: { tps: number }) => {
        if (snap.tps > 0 && snap.tps < 14 && !lowTpsWarned.current) {
          lowTpsWarned.current = true
          emitNotification('warn', `TPS dropped to ${snap.tps.toFixed(1)} (below 14)`)
        } else if (snap.tps >= 15) {
          lowTpsWarned.current = false
        }
      })
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <aside
        className="w-48 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderRight: '0.5px solid var(--border-subtle)' }}
      >
        <div
          className="px-3 py-3 shrink-0 flex items-center justify-between"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--accent)' }}>
            Konnekt
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors text-sm"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            title="Settings"
          >
            ⚙
          </button>
        </div>
        <div style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
          <ServerSelector />
        </div>
        <div className="flex-1 overflow-y-auto">
          <TileCrate />
        </div>
        <ActiveProcesses />
        <div style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          <LayoutPresets />
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">
        <Dashboard />
      </main>

      {eulaRequired && (
        <EulaModal
          serverId={activeId}
          onClose={() => setEulaRequired(false)}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

export default App
