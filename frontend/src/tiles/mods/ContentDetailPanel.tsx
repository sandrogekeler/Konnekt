import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import type { ModProject, ModVersion, ResolvedDependency } from './useMods'
import { DependencyDialog } from './DependencyDialog'
import { ContentCard } from './ContentCard'

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
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

function fmtBytes(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

interface Props {
  project: ModProject
  projectLoading: boolean
  versions: ModVersion[]
  versionsLoading: boolean
  installing: boolean
  installError: string | null
  moreByAuthorProjects: ModProject[]
  onGetVersions: (projectId: string) => void
  onGetAllVersions: (projectId: string) => void
  onResolveDeps: (versionId: string) => Promise<ResolvedDependency[]>
  onInstall: (versionIds: string[]) => Promise<void>
  onInstallLatest: (projectId: string) => Promise<void>
  onClose: () => void
  onSelectProject: (project: ModProject) => void
}

type DetailTab = 'about' | 'gallery' | 'versions'

export function ContentDetailPanel({
  project, projectLoading,
  versions, versionsLoading,
  installing, installError,
  moreByAuthorProjects,
  onGetVersions, onGetAllVersions, onResolveDeps, onInstall, onInstallLatest,
  onClose, onSelectProject,
}: Props) {
  const [tab, setTab] = useState<DetailTab>('about')
  const [galleryIdx, setGalleryIdx] = useState(0)
  const [showAllVersions, setShowAllVersions] = useState(false)
  const [deps, setDeps] = useState<ResolvedDependency[] | null>(null)
  const [pendingVersionId, setPendingVersionId] = useState('')
  const [installing2, setInstalling2] = useState(false)

  useEffect(() => {
    setTab('about')
    setGalleryIdx(0)
    setShowAllVersions(false)
    setDeps(null)
  }, [project.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load compatible versions when tab switches to versions
  useEffect(() => {
    if (tab === 'versions' && versions.length === 0 && !versionsLoading) {
      onGetVersions(project.id)
    }
  }, [tab]) // intentionally omit stable refs

  const handleInstallClick = async () => {
    setInstalling2(true)
    try {
      await onInstallLatest(project.id)
    } catch (e: any) {
      if (e?.__deps) {
        setDeps(e.__deps)
        setPendingVersionId(e.__versionId)
      }
    } finally {
      setInstalling2(false)
    }
  }

  const handleDepConfirm = async (versionIds: string[]) => {
    setDeps(null)
    await onInstall(versionIds)
  }

  const isInstalling = installing || installing2

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

      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          background: 'color-mix(in srgb, var(--bg-base) 97%, white)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-2.5 px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {project.iconUrl ? (
            <img
              src={project.iconUrl}
              alt=""
              className="rounded shrink-0"
              style={{ width: 42, height: 42, objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded shrink-0 flex items-center justify-center text-xs font-mono"
              style={{ width: 42, height: 42, background: 'var(--border-subtle)', color: 'var(--text-faint)' }}
            >
              &lt;&gt;
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {project.title}
            </div>
            {project.author && (
              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                by {project.author}
              </div>
            )}
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
              {project.dateModified && (
                <span className="text-xs font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                  {relativeTime(project.dateModified)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
          >
            ✕
          </button>
        </div>

        {/* Install button */}
        <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full py-1.5 rounded text-xs font-semibold transition-opacity"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-base)',
              opacity: isInstalling ? 0.6 : 1,
            }}
          >
            {isInstalling ? 'Installing…' : 'Install'}
          </button>
          {installError && (
            <div className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{installError}</div>
          )}
        </div>

        {/* Sub-tabs */}
        <div
          className="flex items-center gap-1 px-3 py-1.5 shrink-0"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {(['about', 'gallery', 'versions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-2.5 py-1 rounded text-xs capitalize transition-colors"
              style={{
                background: tab === t ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* About */}
          {tab === 'about' && (
            <div className="px-4 py-3">
              {projectLoading && !project.body ? (
                <div className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading details…</div>
              ) : project.body ? (
                <div className="mod-body">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {project.body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {project.description}
                </p>
              )}
            </div>
          )}

          {/* Gallery */}
          {tab === 'gallery' && (
            <div className="px-4 py-3">
              {project.gallery && project.gallery.length > 0 ? (
                <>
                  <img
                    src={project.gallery[galleryIdx]?.url}
                    alt={project.gallery[galleryIdx]?.title ?? ''}
                    className="rounded-lg w-full mb-3"
                    style={{ objectFit: 'contain', maxHeight: 220 }}
                  />
                  {project.gallery.length > 1 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {project.gallery.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIdx(i)}
                          className="rounded overflow-hidden"
                          style={{
                            width: 44, height: 44,
                            outline: i === galleryIdx ? '2px solid var(--accent)' : 'none',
                            outlineOffset: 1,
                          }}
                        >
                          <img src={img.url} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No gallery images.</div>
              )}
            </div>
          )}

          {/* Versions */}
          {tab === 'versions' && (
            <div>
              {versionsLoading && (
                <div className="px-4 py-3 text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading versions…</div>
              )}
              {!versionsLoading && versions.length === 0 && (
                <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No compatible versions found.</div>
              )}
              {versions.map(v => (
                <VersionRow key={v.id} version={v} onInstall={() => onInstall([v.id])} installing={isInstalling} />
              ))}
              {!showAllVersions && versions.length > 0 && (
                <button
                  onClick={() => { setShowAllVersions(true); onGetAllVersions(project.id) }}
                  className="w-full py-2 text-xs font-mono text-center transition-colors"
                  style={{ color: 'var(--text-muted)', borderTop: '0.5px solid var(--border-subtle)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                >
                  Show all versions
                </button>
              )}
            </div>
          )}

          {/* More by author */}
          {tab === 'about' && moreByAuthorProjects.length > 0 && (
            <div className="px-4 pb-4">
              <div
                className="text-xs font-semibold mb-3 pt-3"
                style={{ color: 'var(--text-secondary)', borderTop: '0.5px solid var(--border-subtle)' }}
              >
                More by {project.author}
              </div>
              <div className="flex flex-col gap-2">
                {moreByAuthorProjects.map(p => (
                  <ContentCard
                    key={p.id}
                    project={p}
                    onClick={() => onSelectProject(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function VersionRow({ version, onInstall, installing }: { version: ModVersion; onInstall: () => void; installing: boolean }) {
  const typeColor: Record<string, string> = {
    release: 'var(--accent)',
    beta: 'var(--warning)',
    alpha: 'var(--danger)',
  }

  return (
    <div
      className="flex items-start gap-2 px-4 py-2.5"
      style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {version.versionNumber}
          </span>
          <span
            className="px-1.5 py-px rounded text-xs font-mono"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: typeColor[version.versionType] ?? 'var(--text-muted)',
              fontSize: 10,
            }}
          >
            {version.versionType}
          </span>
        </div>
        <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
          {version.gameVersions?.slice(0, 3).join(', ')}
          {(version.gameVersions?.length ?? 0) > 3 ? '…' : ''}
          {version.fileSize ? ' · ' + fmtBytes(version.fileSize) : ''}
        </div>
        {version.datePublished && (
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
            {relativeTime(version.datePublished)}
          </div>
        )}
      </div>
      <button
        onClick={onInstall}
        disabled={installing}
        className="shrink-0 px-2.5 py-1 rounded text-xs font-medium transition-opacity"
        style={{
          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
          color: 'var(--accent)',
          border: '0.5px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          opacity: installing ? 0.5 : 1,
        }}
      >
        Install
      </button>
    </div>
  )
}
