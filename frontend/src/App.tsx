import { Dashboard } from './components/Dashboard'
import { TileCrate } from './components/TileCrate'
import { LayoutPresets } from './components/LayoutPresets'

function App() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <aside
        className="w-48 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderRight: '0.5px solid var(--border-subtle)' }}
      >
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--accent)' }}>
            Konnekt
          </span>
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
    </div>
  )
}

export default App
