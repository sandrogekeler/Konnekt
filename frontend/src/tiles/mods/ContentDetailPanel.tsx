import { useState, useEffect } from 'react'
import type { ModProject, ModVersion, ResolvedDependency } from './useMods'
import { isDepsRequiredError } from './useMods'
import { DependencyDialog } from './DependencyDialog'
import { ContentCard } from './ContentCard'
import { ModAboutBody } from './ModAboutBody'
import { fmtCount, fmtBytes, relativeTime } from '../../lib/format'

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
  installedProjectIds?: Set<string>
}

type DetailTab = 'about' | 'gallery' | 'versions'

export function ContentDetailPanel({
  project,
  projectLoading,
  versions,
  versionsLoading,
  installing,
  installError,
  moreByAuthorProjects,
  // onResolveDeps is unused here: dependency resolution now surfaces via the
  // isDepsRequiredError thrown from onInstall/onInstallLatest below. Left in
  // Props for caller compatibility.
  onGetVersions,
  onGetAllVersions,
  onResolveDeps: _onResolveDeps,
  onInstall,
  onInstallLatest,
  onClose,
  onSelectProject,
  installedProjectIds,
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
    } catch (e: unknown) {
      if (isDepsRequiredError(e)) {
        setDeps(e.deps)
        setPendingVersionId(e.versionId)
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
          className="flex shrink-0 items-start gap-2.5 px-4 pt-4 pb-3"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {project.iconUrl ? (
            <img
              src={project.iconUrl}
              alt=""
              className="shrink-0 rounded"
              style={{ width: 42, height: 42, objectFit: 'cover' }}
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center rounded font-mono text-xs"
              style={{
                width: 42,
                height: 42,
                background: 'var(--border-subtle)',
                color: 'var(--text-faint)',
              }}
            >
              &lt;&gt;
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {project.title}
            </div>
            {project.author && (
              <div className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                by {project.author}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {project.downloads > 0 && (
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-faint)', fontSize: 10 }}
                >
                  ↓ {fmtCount(project.downloads)}
                </span>
              )}
              {project.follows > 0 && (
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-faint)', fontSize: 10 }}
                >
                  ♥ {fmtCount(project.follows)}
                </span>
              )}
              {project.dateModified && (
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--text-faint)', fontSize: 10 }}
                >
                  {relativeTime(project.dateModified)}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Install button */}
        <div
          className="shrink-0 px-4 py-2.5"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full rounded py-1.5 text-xs font-semibold transition-opacity"
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-base)',
              opacity: isInstalling ? 0.6 : 1,
            }}
          >
            {isInstalling ? 'Installing…' : 'Install'}
          </button>
          {installError && (
            <div className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>
              {installError}
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        <div
          className="flex shrink-0 items-center gap-1 px-3 py-1.5"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {(['about', 'gallery', 'versions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded px-2.5 py-1 text-xs capitalize transition-colors"
              style={{
                background:
                  tab === t ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* About */}
          {tab === 'about' && (
            <div className="px-4 py-3">
              <ModAboutBody
                body={project.body}
                description={project.description}
                loading={projectLoading}
              />
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
                    className="mb-3 w-full rounded-lg"
                    style={{ objectFit: 'contain', maxHeight: 220 }}
                  />
                  {project.gallery.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.gallery.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIdx(i)}
                          className="overflow-hidden rounded"
                          style={{
                            width: 44,
                            height: 44,
                            outline: i === galleryIdx ? '2px solid var(--accent)' : 'none',
                            outlineOffset: 1,
                          }}
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="h-full w-full"
                            style={{ objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  No gallery images.
                </div>
              )}
            </div>
          )}

          {/* Versions */}
          {tab === 'versions' && (
            <div>
              {versionsLoading && (
                <div
                  className="animate-pulse px-4 py-3 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Loading versions…
                </div>
              )}
              {!versionsLoading && versions.length === 0 && (
                <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  No compatible versions found.
                </div>
              )}
              {versions.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  onInstall={() => onInstall([v.id])}
                  installing={isInstalling}
                />
              ))}
              {!showAllVersions && versions.length > 0 && (
                <button
                  onClick={() => {
                    setShowAllVersions(true)
                    onGetAllVersions(project.id)
                  }}
                  className="w-full py-2 text-center font-mono text-xs transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    borderTop: '0.5px solid var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                  }}
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
                className="mb-3 pt-3 text-xs font-semibold"
                style={{
                  color: 'var(--text-secondary)',
                  borderTop: '0.5px solid var(--border-subtle)',
                }}
              >
                More by {project.author}
              </div>
              <div className="flex flex-col gap-2">
                {moreByAuthorProjects.map((p) => (
                  <ContentCard
                    key={p.id}
                    project={p}
                    installing={isInstalling}
                    alreadyInstalled={installedProjectIds?.has(p.id)}
                    onClick={() => onSelectProject(p)}
                    onInstallLatest={onInstallLatest}
                    onInstall={onInstall}
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

function VersionRow({
  version,
  onInstall,
  installing,
}: {
  version: ModVersion
  onInstall: () => void
  installing: boolean
}) {
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
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {version.versionNumber}
          </span>
          <span
            className="rounded px-1.5 py-px font-mono text-xs"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: typeColor[version.versionType] ?? 'var(--text-muted)',
              fontSize: 10,
            }}
          >
            {version.versionType}
          </span>
        </div>
        <div
          className="mt-0.5 font-mono text-xs"
          style={{ color: 'var(--text-faint)', fontSize: 10 }}
        >
          {version.gameVersions?.slice(0, 3).join(', ')}
          {(version.gameVersions?.length ?? 0) > 3 ? '…' : ''}
          {version.fileSize ? ' · ' + fmtBytes(version.fileSize) : ''}
        </div>
        {version.datePublished && (
          <div
            className="mt-0.5 font-mono text-xs"
            style={{ color: 'var(--text-faint)', fontSize: 10 }}
          >
            {relativeTime(version.datePublished)}
          </div>
        )}
      </div>
      <button
        onClick={onInstall}
        disabled={installing}
        className="shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-opacity"
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
