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
  onSearch: (query: string, categories: string[], offset?: number, sort?: string) => void
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

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Relevance' },
  { value: 'downloads',  label: 'Downloads' },
  { value: 'follows',    label: 'Popularity' },
  { value: 'newest',     label: 'Date published' },
  { value: 'updated',    label: 'Updated' },
]

// Stable per-card enter delay: looks random but doesn't change on re-render.
function stableDelay(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 8) * 20 // 8 buckets: 0, 20, 40 … 140 ms
}

// ─── Shared popover dismiss hook ─────────────────────────────────────────────

function usePopover() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

interface SortMenuProps {
  sort: string
  onSort: (v: string) => void
}

function SortMenu({ sort, onSort }: SortMenuProps) {
  const { open, toggle, close } = usePopover()
  const btnRef = useRef<HTMLButtonElement>(null)
  const activeLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Relevance'

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors shrink-0"
        style={{
          border: '0.5px solid var(--border-subtle)',
          background: open ? 'var(--hover-surface)' : 'transparent',
          color: sort ? 'var(--accent)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>↕</span>
        {activeLabel}
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            onClick={close}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 201,
              minWidth: 160,
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-subtle)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {SORT_OPTIONS.map(opt => {
              const active = opt.value === sort
              return (
                <button
                  key={opt.value}
                  onClick={() => { onSort(opt.value); close() }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ width: 12, color: 'var(--accent)', opacity: active ? 1 : 0 }}>✓</span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Categories dropdown ──────────────────────────────────────────────────────

interface CategoriesMenuProps {
  categories: string[]
  selectedCats: string[]
  onToggle: (cat: string) => void
  onClear: () => void
}

function CategoriesMenu({ categories, selectedCats, onToggle, onClear }: CategoriesMenuProps) {
  const { open, toggle, close } = usePopover()
  const count = selectedCats.length
  const disabled = categories.length === 0

  return (
    <div className="relative shrink-0">
      <button
        onClick={disabled ? undefined : toggle}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors shrink-0"
        style={{
          border: '0.5px solid var(--border-subtle)',
          background: open ? 'var(--hover-surface)' : 'transparent',
          color: disabled ? 'var(--text-faint)' : count > 0 ? 'var(--accent)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>☰</span>
        Categories{count > 0 ? ` · ${count}` : ''}
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200 }}
            onClick={close}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 201,
              width: 200,
              maxHeight: 300,
              overflowY: 'auto',
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-subtle)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <button
              onClick={onClear}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
              style={{
                color: count === 0 ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: '0.5px solid var(--border-subtle)',
                background: 'transparent',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ width: 12, color: 'var(--accent)', opacity: count === 0 ? 1 : 0 }}>✓</span>
              All
            </button>
            {categories.map(cat => {
              const active = selectedCats.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => onToggle(cat)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-left transition-colors"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--text-primary)',
                    background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-surface)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ width: 12, color: 'var(--accent)', opacity: active ? 1 : 0 }}>✓</span>
                  {cat}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── BrowsePanel ──────────────────────────────────────────────────────────────

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
  const [sortBy, setSortBy] = useState('')
  const [moreProjects, setMoreProjects] = useState<ModProject[]>([])

  const panelOpen = !!selectedProject

  // Keep last selected project alive so the panel has content to slide out with.
  const lastProjectRef = useRef<ModProject | null>(null)
  if (selectedProject) lastProjectRef.current = selectedProject
  const displayProject = selectedProject ?? lastProjectRef.current

  const [layoutOpen, setLayoutOpen] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)
  const hasOpenedRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cardAnimTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Case A — remount with cached results
  useEffect(() => {
    if (results.length > 0) {
      const t = setTimeout(() => setGridVisible(true), 16)
      return () => clearTimeout(t)
    }
  }, []) // mount only

  // Case B — first load
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
      clearTimeout(closeTimerRef.current)
      clearTimeout(cardAnimTimerRef.current)
      setGridVisible(false)
      cardAnimTimerRef.current = setTimeout(() => {
        setLayoutOpen(true)
        setGridVisible(true)
      }, CARD_ANIM)
    } else {
      if (!hasOpenedRef.current) return
      clearTimeout(cardAnimTimerRef.current)
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

  const gridCols = layoutOpen
    ? 'repeat(2, 1fr)'
    : 'repeat(auto-fill, minmax(200px, 1fr))'

  // Debounced search — fires on query, categories, or sort changes
  useEffect(() => {
    const t = setTimeout(() => onSearch(query, selectedCats, 0, sortBy), 300)
    return () => clearTimeout(t)
  }, [query, selectedCats, sortBy]) // intentionally omit onSearch

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

  const clearCats = useCallback(() => setSelectedCats([]), [])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar + Sort + Categories controls */}
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

        <SortMenu sort={sortBy} onSort={setSortBy} />
        <CategoriesMenu
          categories={categories}
          selectedCats={selectedCats}
          onToggle={toggleCat}
          onClear={clearCats}
        />
      </div>

      {/* Active category chips — only shown when filters are active */}
      {selectedCats.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 shrink-0 flex-wrap"
          style={{ borderBottom: '0.5px solid var(--border-subtle)' }}
        >
          {selectedCats.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono transition-colors shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                color: 'var(--accent)',
                border: '0.5px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                fontWeight: 600,
              }}
            >
              {cat}
              <span style={{ opacity: 0.7, fontSize: 10 }}>×</span>
            </button>
          ))}
          <button
            onClick={clearCats}
            className="px-2 py-0.5 rounded text-xs font-mono transition-colors shrink-0"
            style={{ color: 'var(--text-faint)', border: '0.5px solid transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)' }}
          >
            Clear all
          </button>
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
            onPage={o => onSearch(query, selectedCats, o, sortBy)}
          />
        </div>

        {/* Detail panel wrapper */}
        <div
          style={{
            width: layoutOpen ? PANEL_WIDTH : 0,
            minWidth: 0,
            flexShrink: 0,
            overflow: 'hidden',
            borderLeft: layoutOpen ? '0.5px solid var(--border-subtle)' : 'none',
          }}
        >
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
