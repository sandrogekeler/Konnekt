import { useEffect, useRef, useState } from 'react'
import type { TileProps } from '../../types'
import { useMods } from './useMods'
import { InstalledPanel } from './InstalledPanel'
import { BrowsePanel } from './BrowsePanel'
import { useServerStore } from '../../stores/useServerStore'
import { useServerConfigStore } from '../../stores/useServerConfigStore'
import { DetectServerLoader, SaveServerConfig } from '../../../wailsjs/go/main/App'

const PLUGIN_LOADERS = ['paper', 'spigot', 'bukkit', 'purpur', 'velocity']

function useServerKind(serverId: string): { kind: 'mods' | 'plugins'; detecting: boolean } {
  const config = useServerConfigStore(s => s.configs.find(c => c.id === serverId))
  const saveConfig = useServerConfigStore(s => s.saveConfig)
  const [detecting, setDetecting] = useState(false)
  const detected = useRef(false)

  useEffect(() => {
    if (detected.current) return
    if (!config) return
    if (config.loader || !config.jarPath) return

    detected.current = true
    setDetecting(true)
    DetectServerLoader(serverId)
      .then(cfg => saveConfig(cfg))
      .catch(() => {})
      .finally(() => setDetecting(false))
  }, [serverId, config, saveConfig])

  const kind = PLUGIN_LOADERS.includes(config?.loader ?? '') ? 'plugins' : 'mods'
  return { kind, detecting }
}

export function ModsTile({ serverId, maximized }: TileProps) {
  const mods = useMods(serverId)
  const running = useServerStore(s => s.status.running)
  const { kind, detecting } = useServerKind(serverId)

  if (!maximized) {
    return <ModsSummary mods={mods} running={running} kind={kind} detecting={detecting} />
  }

  return <ModsExpanded mods={mods} running={running} kind={kind} />
}

// --- Compact (non-maximized) view ---

function ModsSummary({
  mods, running, kind, detecting,
}: {
  mods: ReturnType<typeof useMods>
  running: boolean
  kind: 'mods' | 'plugins'
  detecting: boolean
}) {
  const { installed, installedLoading, installProgress, setEnabled, uninstall } = mods
  const noun = kind === 'plugins' ? 'plugin' : 'mod'
  const nounPlural = kind === 'plugins' ? 'plugins' : 'mods'

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {detecting
            ? 'Detecting server type…'
            : `${installed.length} ${installed.length !== 1 ? nounPlural : noun}`}
        </span>
        {running && (
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            restart needed for changes
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <InstalledPanel
          mods={installed}
          loading={installedLoading}
          error={mods.installedError}
          installProgress={installProgress}
          installing={mods.installing}
          serverRunning={running}
          kind={kind}
          onSetEnabled={setEnabled}
          onUninstall={uninstall}
        />
      </div>
    </div>
  )
}

// --- Maximized (full) view ---

type ModsView = 'library' | 'browse'

function ModsExpanded({
  mods, running, kind,
}: {
  mods: ReturnType<typeof useMods>
  running: boolean
  kind: 'mods' | 'plugins'
}) {
  const [view, setView] = useState<ModsView>('library')
  const noun = kind === 'plugins' ? 'Plugin' : 'Mod'

  function openBrowse() {
    setView('browse')
    mods.clearProject()
  }

  function openLibrary() {
    setView('library')
    mods.clearProject()
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        {view === 'browse' ? (
          <>
            <button
              onClick={openLibrary}
              className="text-xs font-mono transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
            >
              ← Library
            </button>
            <span className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Add {noun}
            </span>
          </>
        ) : (
          <>
            <span className="flex-1 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {mods.installed.length} {mods.installed.length === 1 ? noun.toLowerCase() : (kind === 'plugins' ? 'plugins' : 'mods')}
            </span>
            {running && (
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                restart needed for changes
              </span>
            )}
            <button
              onClick={openBrowse}
              className="px-3 py-1 rounded text-xs font-semibold transition-colors shrink-0"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg-base)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            >
              Add Content
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'library' ? (
          <InstalledPanel
            mods={mods.installed}
            loading={mods.installedLoading}
            error={mods.installedError}
            installProgress={mods.installProgress}
            installing={mods.installing}
            serverRunning={running}
            kind={kind}
            onSetEnabled={mods.setEnabled}
            onUninstall={mods.uninstall}
          />
        ) : (
          <BrowsePanel
            results={mods.searchResults}
            total={mods.searchTotal}
            offset={mods.searchOffset}
            loading={mods.searchLoading}
            error={mods.searchError}
            categories={mods.categories}
            selectedProject={mods.selectedProject}
            projectLoading={mods.projectLoading}
            versions={mods.versions}
            versionsLoading={mods.versionsLoading}
            installing={mods.installing}
            installError={mods.installError}
            onSearch={mods.search}
            onSelectProject={mods.selectProject}
            onClearProject={mods.clearProject}
            onGetVersions={mods.getVersions}
            onGetAllVersions={mods.getAllVersions}
            onResolveDeps={mods.resolveDeps}
            onInstall={mods.install}
            onInstallLatest={mods.installLatest}
            moreByAuthor={mods.moreByAuthor}
          />
        )}
      </div>
    </div>
  )
}
