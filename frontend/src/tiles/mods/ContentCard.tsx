import type { ModProject } from './useMods'

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function relativeTime(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

interface ContentCardProps {
  project: ModProject
  selected?: boolean
  onClick: () => void
}

export function ContentCard({ project, selected, onClick }: ContentCardProps) {
  const visibleCategories = (project.categories ?? []).slice(0, 3)

  return (
    <button
      onClick={onClick}
      className="flex flex-col text-left w-full h-full transition-all"
      style={{
        background: selected
          ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-surface))'
          : 'var(--bg-surface)',
        border: selected
          ? '0.5px solid color-mix(in srgb, var(--accent) 40%, transparent)'
          : '0.5px solid var(--border-subtle)',
        borderRadius: 10,
        padding: '10px',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (!selected) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--hover-surface)'
          el.style.borderColor = 'var(--border-hover)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = 'var(--bg-surface)'
          el.style.borderColor = 'var(--border-subtle)'
        }
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

      {/* Category tags */}
      {visibleCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    </button>
  )
}
