import { useState, useEffect, useRef, useCallback } from 'react'
import type { ModProject, ModVersion, ResolvedDependency } from './useMods'
import { ContentCard } from './ContentCard'
import { ContentDetailPanel } from './ContentDetailPanel'
import { Pagination } from './Pagination'

interface Props {
  results: ModProject[]
  total: number
  offset: number
  loading: boolean
  error: string | null
  categories: string[]
  selectedProject: ModProject | null
  projectLoading: boolean
  versions: ModVersion[]
  versionsLoading: boolean
  installing: boolean
  installError: string | null
  onSearch: (query: string, categories: string[], offset?: number) => void
  onSelectProject: (project: ModProject) => void
  onClearProject: () => void
  onGetVersions: (projectId: string) => void
  onGetAllVersions: (projectId: string) => void
  onResolveDeps: (versionId: string) => Promise<ResolvedDependency[]>
  onInstall: (versionIds: string[]) => Promise<void>
  onInstallLatest: (projectId: string) => Promise<void>
  moreByAuthor: (username: string, excludeProjectId: string) => Promise<ModProject[]>
}

const PANEL_WIDTH = 440
const PANEL_DURATION = 280 // ms — panel slide
const CARD_ANIM = 130    // ms — tile fade+scale each way

// Stable per-card enter delay: looks random but doesn't change on re-render.
function stableDelay(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 8) * 20 // 8 buckets: 0, 20, 40 … 140 ms
}

export function BrowsePanel({
  results, total, offset, loading, error, categories,
  selectedProject, projectLoading, versions, versionsLoading,
  installing, installError,
  onSearch, onSelectProject, onClearProject,
  onGetVersions, onGetAllVersions, onResolveDeps, onInstall, onInstallLatest,
  moreByAuthor,
}: Props) {
  const [query, setQuery] = useState('')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [moreProjects, setMoreProjects] = useState<ModProject[]>([])

  const panelOpen = !!selectedProject

  // Keep last selected project alive so the panel has content to slide out with.
  const lastProjectRef = useRef<ModProject | null>(null)
  if (selectedProject) lastProjectRef.current = selectedProject
  const displayProject = selectedProject ?? lastProjectRef.current

  // `layoutOpen` controls wrapper width + grid columns.
  // `gridVisible` drives the tile fade+scale animation.
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)
  const hasOpenedRef = useRef(false) // prevents spurious close sequence on initial mount
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cardAnimTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Case A — remount with cached results (navigate away + back):
  // results.length > 0 on mount, gridVisible starts false → animate in.
  // The `results` value is captured at mount time; intentionally no dep.
  useEffect(() => {
    if (results.length > 0) {
      const t = setTimeout(() => setGridVisible(true), 16)
      return () => clearTimeout(t)
    }
  }, []) // mount only

  // Case B — first load: results arrive after mount (empty → non-empty).
  // prevLen starts at 0 so the 0→N transition always triggers entrance.
  const prevResultsLenRef = useRef(0)
  useEffect(() => {
    const prevLen = prevResultsLenRef.current
    prevResultsLenRef.current = results.length
    if (prevLen === 0 && results.length > 0 && !panelOpen) {
      const t = setTimeout(() => setGridVisible(true), 16)
      return () => clearTimeout(t)
    }
  }, [results.length]) // intentionally omit panelOpen

  useEffect(() => {
    if (panelOpen) {
      hasOpenedRef.current = true
      // Cancel any pending close sequence
      clearTimeout(closeTimerRef.current)
      clearTimeout(cardAnimTimerRef.current)
      // Tiles fade+scale out → layout switches to 2-col → tiles fade+scale in
      setGridVisible(false)
      cardAnimTimerRef.current = setTimeout(() => {
        setLayoutOpen(true)
        setGridVisible(true)
      }, CARD_ANIM)
    } else {
      if (!hasOpenedRef.current) return // skip spurious close sequence on mount
      clearTimeout(cardAnimTimerRef.current)
      // Start tile fade-out CARD_ANIM ms before panel finishes sliding,
      // so both animations land at the same moment.
      closeTimerRef.current = setTimeout(() => {
        setGridVisible(false)
        cardAnimTimerRef.current = setTimeout(() => {
          setLayoutOpen(false)
          setGridVisible(true)
        }, CARD_ANIM)
      }, PANEL_DURATION - CARD_ANIM)
    }
    return () => {
      clearTimeout(closeTimerRef.current)
      clearTimeout(cardAnimTimerRef.current)
    }
  }, [panelOpen])

  // 2 columns while panel is open, auto-fill otherwise.
  const gridCols = layoutOpen
    ? 'repeat(2, 1fr)'
    : 'repeat(auto-fill, minmax(200px, 1fr))'

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => onSearch(query, selectedCats, 0), 300)
    return () => clearTimeout(t)
  }, [query, selectedCats]) // intentionally omit onSearch

  // Load "more by author"
  useEffect(() => {
    if (!selectedProject?.author) { setMoreProjects([]); return }
    let cancelled = false
    moreByAuthor(selectedProject.author, selectedProject.id)
      .then(ps => { if (!cancelled) setMoreProjects(ps) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedProject?.id, selectedProject?.author]) // intentionally omit moreByAuthor

  const toggleCat = useCallback((cat: string) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center gap-2 flex-1 px-2 py-1 rounded"
          style={{ border: '0.5px solid var(--border-subtle)', background: 'var(--bg-base)' }}
          onFocusCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)' }}
          onBlurCapture={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)' }}
        >
          <span className="text-xs select-none shrink-0" style={{ color: 'var(--text-faint)' }}>⌕</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Modrinth…"
            className="flex-1 min-w-0 bg-transparent text-xs font-mono outline-none"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 text-xs transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)' }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 shrink-0 flex-wrap"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => setSelectedCats([])}
            className="px-2 py-0.5 rounded text-xs font-mono transition-colors shrink-0"
            style={{
              background: selectedCats.length === 0 ? 'var(--accent)' : 'transparent',
              color: selectedCats.length === 0 ? 'var(--bg-base)' : 'var(--text-muted)',
              border: '0.5px solid var(--border-subtle)',
              fontWeight: selectedCats.length === 0 ? 600 : 400,
            }}
          >
            All
          </button>
          {categories.map(cat => {
            const active = selectedCats.includes(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className="px-2 py-0.5 rounded text-xs font-mono transition-colors shrink-0"
                style={{
                  background: active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  border: active
                    ? '0.5px solid color-mix(in srgb, var(--accent) 35%, transparent)'
                    : '0.5px solid var(--border-subtle)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <div className="px-3 py-1.5 text-xs shrink-0" style={{ color: 'var(--danger)' }}>{error}</div>
      )}

      {/* Main area: grid (left) + detail panel (right, flex sibling) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Results list — stable column count during panel animation */}
        <div className="flex flex-col min-h-0 overflow-hidden" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {loading && results.length === 0 && (
              <div className="text-xs py-4 text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
                Searching…
              </div>
            )}
            {!loading && !error && results.length === 0 && (
              <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                {query || selectedCats.length > 0
                  ? 'No results. Try different keywords or categories.'
                  : 'Search Modrinth for mods and plugins.'}
              </div>
            )}

            {results.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8 }}>
                {results.map(project => (
                  <div
                    key={project.id}
                    style={{
                      minWidth: 0,
                      opacity: gridVisible ? 1 : 0,
                      transform: gridVisible ? 'none' : 'scale(0.94)',
                      transition: `opacity ${CARD_ANIM}ms ease, transform ${CARD_ANIM}ms ease`,
                      // Stagger only on enter; exit is instant (0ms) so all tiles fade together
                      transitionDelay: gridVisible ? `${stableDelay(project.id)}ms` : '0ms',
                    }}
                  >
                    <ContentCard
                      project={project}
                      selected={selectedProject?.id === project.id}
                      onClick={() => onSelectProject(project)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Pagination
            total={total}
            offset={offset}
            onPage={o => onSearch(query, selectedCats, o)}
          />
        </div>

        {/* Detail panel wrapper — fixed width while layoutOpen, collapses after animation */}
        <div
          style={{
            width: layoutOpen ? PANEL_WIDTH : 0,
            minWidth: 0,
            flexShrink: 0,
            overflow: 'hidden',
            borderLeft: layoutOpen ? '0.5px solid var(--border-subtle)' : 'none',
          }}
        >
          {/* GPU-composited slide: panel translates in/out without touching layout */}
          <div
            style={{
              width: PANEL_WIDTH,
              height: '100%',
              transform: panelOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
              transition: `transform ${PANEL_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              willChange: 'transform',
            }}
          >
            {layoutOpen && displayProject && (
              <ContentDetailPanel
                project={displayProject}
                projectLoading={projectLoading}
                versions={versions}
                versionsLoading={versionsLoading}
                installing={installing}
                installError={installError}
                moreByAuthorProjects={moreProjects}
                onGetVersions={onGetVersions}
                onGetAllVersions={onGetAllVersions}
                onResolveDeps={onResolveDeps}
                onInstall={onInstall}
                onInstallLatest={onInstallLatest}
                onClose={onClearProject}
                onSelectProject={onSelectProject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
