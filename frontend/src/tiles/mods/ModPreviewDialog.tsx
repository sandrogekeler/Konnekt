import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { InstalledMod, ModProject, ModVersion, ModUpdateInfo, ResolvedDependency } from './useMods'
import { DependencyDialog } from './DependencyDialog'

interface Props {
  mod: InstalledMod
  updateInfo?: ModUpdateInfo
  // Modrinth data (null while loading / local mods)
  project: ModProject | null
  projectLoading: boolean
  versions: ModVersion[]
  versionsLoading: boolean
  installing: boolean
  installError: string | null
  onClose: () => void
  onGetVersions: (projectId: string) => void
  onGetAllVersions: (projectId: string) => void
  onResolveDeps: (versionId: string) => Promise<ResolvedDependency[]>
  onInstall: (versionIds: string[]) => Promise<void>
  onChangeVersion: (oldFileName: string, newVersionId: string) => Promise<void>
  onOpenInBrowser: () => void
}

type Tab = 'about' | 'versions'

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function fmtBytes(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

function relativeTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function ModPreviewDialog({
  mod, updateInfo, project, projectLoading, versions, versionsLoading,
  installing, installError,
  onClose, onGetVersions, onGetAllVersions, onResolveDeps, onInstall,
  onChangeVersion, onOpenInBrowser,
}: Props) {
  const [tab, setTab] = useState<Tab>('about')
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [deps, setDeps] = useState<ResolvedDependency[] | null>(null)
  const [pendingVersionId, setPendingVersionId] = useState('')
  const [changingVersion, setChangingVersion] = useState(false)

  const isModrinth = mod.source === 'modrinth' && !!mod.projectId

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (tab === 'versions' && isModrinth && versions.length === 0 && !versionsLoading) {
      onGetVersions(mod.projectId)
    }
  }, [tab]) // intentional: only re-run when tab changes

  const handleLoadAllVersions = useCallback(() => {
    setShowAllVersions(true)
    onGetAllVersions(mod.projectId)
  }, [mod.projectId, onGetAllVersions])

  const handleVersionInstall = useCallback(async (versionId: string) => {
    try {
      const resolved = await onResolveDeps(versionId)
      const nonTrivial = (resolved ?? []).filter(d => !d.alreadyInstalled)
      if (nonTrivial.length > 0) {
        setDeps(resolved)
        setPendingVersionId(versionId)
        return
      }
      setChangingVersion(true)
      await onChangeVersion(mod.fileName, versionId)
      onClose()
    } catch {
      // error surfaced via installError prop
    } finally {
      setChangingVersion(false)
    }
  }, [mod.fileName, onResolveDeps, onChangeVersion, onClose])

  const handleDepConfirm = useCallback(async (versionIds: string[]) => {
    setDeps(null)
    setChangingVersion(true)
    try {
      await onInstall(versionIds)
      onClose()
    } finally {
      setChangingVersion(false)
    }
  }, [onInstall, onClose])

  const icon = mod.iconUrl || project?.iconUrl
  const title = project?.title || mod.displayName
  const author = project?.author
  const description = project?.description || ''
  const body = project?.body || ''

  return (
    <>
      {deps && (
        <DependencyDialog
          primaryVersionId={pendingVersionId}
          dependencies={deps}
          onConfirm={handleDepConfirm}
          onCancel={() => setDeps(null)}
        />
      )}

      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.65)' }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 401,
          width: 600,
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-base)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {icon ? (
            <img src={icon} alt="" className="rounded shrink-0" style={{ width: 44, height: 44, objectFit: 'cover' }} />
          ) : (
            <div
              className="rounded shrink-0 flex items-center justify-center text-xs font-mono"
              style={{ width: 44, height: 44, background: 'var(--border-subtle)', color: 'var(--text-faint)' }}
            >
              &lt;&gt;
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {title}
            </div>
            {author && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>by {author}</div>
            )}
            {project && (
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {project.downloads > 0 && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                    ↓ {fmtCount(project.downloads)}
                  </span>
                )}
                {project.follows > 0 && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                    ♥ {fmtCount(project.follows)}
                  </span>
                )}
                {mod.versionNumber && (
                  <span className="text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                    v{mod.versionNumber}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isModrinth && (
              <button
                onClick={() => { onOpenInBrowser(); onClose() }}
                className="px-2 py-1 rounded text-xs font-mono transition-colors"
                style={{
                  border: '0.5px solid var(--border-subtle)',
                  color: 'var(--accent)',
                  background: 'transparent',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                Open in Browser
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-6 h-6 rounded text-xs transition-colors"
              style={{ color: 'var(--text-muted)', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs (only for Modrinth mods) */}
        {isModrinth && (
          <div
            className="flex items-center gap-0 px-4 shrink-0"
            style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
          >
            {(['about', 'versions'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-2 text-xs font-mono capitalize transition-colors"
                style={{
                  color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: tab === t ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  background: 'transparent',
                  marginBottom: -1,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {!isModrinth ? (
            // Local mod — simple info card
            <div className="px-4 py-4 space-y-2">
              <div>
                <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>File</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{mod.fileName}</div>
              </div>
              {mod.modId && (
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Mod ID</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{mod.modId}</div>
                </div>
              )}
              {mod.versionNumber && (
                <div>
                  <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Version</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{mod.versionNumber}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Size</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{fmtBytes(mod.sizeBytes)}</div>
              </div>
            </div>
          ) : tab === 'about' ? (
            <div>
              {projectLoading && !body ? (
                <div className="px-4 py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
              ) : body ? (
                <div
                  className="mod-body px-4 py-4 text-xs prose-sm max-w-none"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {body}
                  </ReactMarkdown>
                </div>
              ) : description ? (
                <div className="px-4 py-4 text-xs" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {description}
                </div>
              ) : (
                <div className="px-4 py-6 text-xs" style={{ color: 'var(--text-muted)' }}>No description available.</div>
              )}
            </div>
          ) : (
            // Versions tab
            <div>
              {versionsLoading ? (
                <div className="px-4 py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Loading versions…</div>
              ) : versions.length === 0 ? (
                <div className="px-4 py-6 text-xs" style={{ color: 'var(--text-muted)' }}>No compatible versions found.</div>
              ) : (
                <>
                  {(installError) && (
                    <div className="px-4 py-2 text-xs" style={{ color: 'var(--danger)' }}>{installError}</div>
                  )}
                  {versions.map(v => {
                    const isCurrent = v.id === mod.versionId
                    const isLatestUpdate = updateInfo?.updateAvailable && v.id === updateInfo.latestVersionId
                    const typeColor = v.versionType === 'release'
                      ? 'var(--accent)'
                      : v.versionType === 'beta'
                      ? 'var(--warning)'
                      : 'var(--danger)'
                    return (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                        style={{
                          borderBottom: '0.5px solid var(--border-subtle)',
                          background: isCurrent ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'transparent',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {v.versionNumber}
                            </span>
                            <span className="text-xs font-mono shrink-0" style={{ color: typeColor, fontSize: 10 }}>
                              {v.versionType}
                            </span>
                            {isCurrent && (
                              <span
                                className="px-1 rounded text-xs shrink-0"
                                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', fontSize: 10 }}
                              >
                                installed
                              </span>
                            )}
                            {isLatestUpdate && !isCurrent && (
                              <span
                                className="px-1 rounded text-xs shrink-0"
                                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', fontSize: 10 }}
                              >
                                latest
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                            {v.gameVersions.slice(0, 3).join(', ')}
                            {v.gameVersions.length > 3 ? ` +${v.gameVersions.length - 3}` : ''}
                            {v.fileSize ? ` · ${fmtBytes(v.fileSize)}` : ''}
                            {v.datePublished ? ` · ${relativeTime(v.datePublished)}` : ''}
                          </div>
                        </div>
                        {!isCurrent && (
                          <button
                            onClick={() => handleVersionInstall(v.id)}
                            disabled={installing || changingVersion}
                            className="shrink-0 px-2 py-0.5 rounded text-xs transition-colors"
                            style={{
                              border: '0.5px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                              opacity: (installing || changingVersion) ? 0.5 : 1,
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                          >
                            {(installing || changingVersion) ? '…' : 'Switch'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {!showAllVersions && (
                    <button
                      onClick={handleLoadAllVersions}
                      className="w-full py-2 text-xs font-mono transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                    >
                      Show all versions
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
