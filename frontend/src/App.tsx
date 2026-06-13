import { useEffect, useState } from 'react'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { Dashboard } from './components/Dashboard'
import { TileCrate } from './components/TileCrate'
import { LayoutPresets } from './components/LayoutPresets'
import { ServerSelector } from './components/ServerSelector'
import { EulaModal } from './components/EulaModal'
import { SettingsModal } from './components/SettingsModal'
import { useServerConfigStore } from './stores/useServerConfigStore'
import { useConsoleStore } from './stores/useConsoleStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { EVENTS } from './lib/constants'

function App() {
  const { activeId } = useServerConfigStore()
  const [eulaRequired, setEulaRequired] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    useSettingsStore.getState().load()
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.EULA_REQUIRED, () => setEulaRequired(true))
    } catch { /* non-Wails context */ }
    return () => { try { cleanup?.() } catch { } }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    try {
      cleanup = EventsOn(EVENTS.LOG_LINE, (data: { timestamp: string; line: string }) => {
        useConsoleStore.getState().appendLine(data.timestamp, data.line)
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
