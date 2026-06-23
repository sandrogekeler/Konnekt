import { useState } from 'react'
import type { ModProject, ResolvedDependency } from './useMods'
import { isDepsRequiredError } from './useMods'
import { DependencyDialog } from './DependencyDialog'
import { fmtCount, relativeTime } from '../../lib/format'

interface ContentCardProps {
  project: ModProject
  selected?: boolean
  installing?: boolean
  alreadyInstalled?: boolean
  onClick: () => void
  onInstallLatest: (projectId: string) => Promise<void>
  onInstall: (versionIds: string[]) => Promise<void>
}

export function ContentCard({ project, selected, installing, alreadyInstalled, onClick, onInstallLatest, onInstall }: ContentCardProps) {
  const visibleCategories = (project.categories ?? []).slice(0, 3)
  const [quickInstalling, setQuickInstalling] = useState(false)
  const [done, setDone] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [deps, setDeps] = useState<ResolvedDependency[] | null>(null)
  const [pendingVersionId, setPendingVersionId] = useState('')

  const busy = quickInstalling || installing
  // done = just installed → treat same as installed (grey dim +, no checkmark)
  const showGrey = alreadyInstalled || done

  const handleQuickInstall = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (busy || alreadyInstalled) return
    setQuickInstalling(true)
    try {
      await onInstallLatest(project.id)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } catch (err: unknown) {
      if (isDepsRequiredError(err)) {
        setDeps(err.deps)
        setPendingVersionId(err.versionId)
      }
    } finally {
      setQuickInstalling(false)
    }
  }

  const handleDepConfirm = async (versionIds: string[]) => {
    setDeps(null)
    setQuickInstalling(true)
    try {
      await onInstall(versionIds)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    } finally {
      setQuickInstalling(false)
    }
  }

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
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex flex-col text-left w-full h-full transition-all relative"
        style={{
          background: selected
            ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-surface))'
            : hovered ? 'var(--hover-surface)' : 'var(--bg-surface)',
          border: selected
            ? '0.5px solid color-mix(in srgb, var(--accent) 40%, transparent)'
            : `0.5px solid ${hovered ? 'var(--border-hover)' : 'var(--border-subtle)'}`,
          borderRadius: 10,
          padding: '10px',
          cursor: 'pointer',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        {/* Icon + title row */}
        <div className="flex items-start gap-2 mb-1.5">
          {project.iconUrl ? (
            <img
              src={project.iconUrl}
              alt=""
              className="rounded shrink-0"
              style={{ width: 36, height: 36, objectFit: 'cover' }}
            />
          ) : (
            <div
              className="rounded shrink-0 flex items-center justify-center text-xs font-mono"
              style={{ width: 36, height: 36, background: 'var(--border-subtle)', color: 'var(--text-faint)' }}
            >
              &lt;&gt;
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-semibold leading-tight truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {project.title}
            </div>
            {project.author && (
              <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
                by {project.author}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          className="text-xs leading-relaxed flex-1 mb-2"
          style={{
            color: 'var(--text-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.description}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-2 mb-1.5">
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
            <span className="text-xs font-mono ml-auto" style={{ color: 'var(--text-faint)', fontSize: 10 }}>
              {relativeTime(project.dateModified)}
            </span>
          )}
        </div>

        {/* Category tags — gradient mask fades them out on the left where the button sits */}
        {visibleCategories.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            style={{
              maskImage: 'linear-gradient(to left, transparent 32px, black 46px)',
              WebkitMaskImage: 'linear-gradient(to left, transparent 32px, black 46px)',
            }}
          >
            {visibleCategories.map(cat => (
              <span
                key={cat}
                className="px-1.5 py-px rounded text-xs font-mono"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent)',
                  border: '0.5px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                  fontSize: 10,
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Quick-install button — bottom-left, green border, fades when card not hovered */}
        <button
          onClick={handleQuickInstall}
          disabled={busy || alreadyInstalled}
          title={showGrey ? 'Already installed' : done ? 'Installed!' : 'Install latest version'}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: 6,
            border: showGrey
              ? '0.5px solid var(--border-subtle)'
              : '1px solid var(--accent)',
            background: 'transparent',
            color: showGrey ? 'var(--text-faint)' : 'var(--accent)',
            fontSize: 13,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 1,
            cursor: (busy || alreadyInstalled) ? 'default' : 'pointer',
            opacity: hovered ? 1 : 0.2,
            transition: 'opacity 200ms ease',
            zIndex: 1,
          }}
        onMouseEnter={e => {
          if (!showGrey && !busy) {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--accent)'
            el.style.color = 'var(--bg-base)'
          }
        }}
        onMouseLeave={e => {
          if (!showGrey) {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--accent)'
          }
        }}
        >
          {quickInstalling ? '…' : '+'}
        </button>
      </div>
    </>
  )
}
