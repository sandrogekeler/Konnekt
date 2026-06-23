import { useState, useEffect, useRef, useCallback } from 'react'
import type { ModProject, ModVersion, ResolvedDependency } from './useMods'
import { ContentCard } from './ContentCard'
import { ContentDetailPanel } from './ContentDetailPanel'
import { Pagination } from './Pagination'
import { Popover } from '../../components/ui/Popover'
import { usePopover } from '../../hooks/usePopover'
import { useGridPageAnimation, getTileStyle } from './useGridPageAnimation'

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
  installedProjectIds?: Set<string>
}

const DEFAULT_PANEL_WIDTH = 440
const MIN_PANEL_WIDTH = 300   // narrowest the detail panel can get
const MIN_GRID_WIDTH = 232    // narrowest the grid can get: 1 card (200px) + padding (24px) + gap (8px)
const PANEL_SLIDE_MS = 280    // ms — detail panel slide-in/out

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Relevance' },
  { value: 'downloads',  label: 'Downloads' },
  { value: 'follows',    label: 'Popularity' },
  { value: 'newest',     label: 'Date published' },
  { value: 'updated',    label: 'Updated' },
]

// ─── Sort dropdown ─────────────────────────────────────────────────────────────

interface SortMenuProps {
  sort: string
  onSort: (v: string) => void
}

function SortMenu({ sort, onSort }: SortMenuProps) {
  const { open, toggle, close } = usePopover()
  const activeLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Relevance'

  return (
    <div className="relative shrink-0">
      <button
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

      <Popover open={open} onClose={close}>
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
      </Popover>
    </div>
  )
}

// ─── Categories dropdown ───────────────────────────────────────────────────────

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

      <Popover open={open} onClose={close} width={200} maxHeight={300}>
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
      </Popover>
    </div>
  )
}

// ─── BrowsePanel ───────────────────────────────────────────────────────────────

export function BrowsePanel({
  results, total, offset, loading, error, categories,
  selectedProject, projectLoading, versions, versionsLoading,
  installing, installError,
  onSearch, onSelectProject, onClearProject,
  onGetVersions, onGetAllVersions, onResolveDeps, onInstall, onInstallLatest,
  moreByAuthor, installedProjectIds,
}: Props) {
  const [query, setQuery] = useState('')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('')
  const [moreProjects, setMoreProjects] = useState<ModProject[]>([])

  // ── Detail panel width (resizable) ──────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [resizeActive, setResizeActive] = useState(false)
  const [resizeHover, setResizeHover] = useState(false)
  const mainRowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidth
    setResizeActive(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX // drag left → panel grows
      const totalWidth = mainRowRef.current?.offsetWidth ?? 800
      const maxWidth = totalWidth - MIN_GRID_WIDTH
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(startWidth + delta, maxWidth)))
    }
    const onMouseUp = () => {
      setResizeActive(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [panelWidth])

  // ── Animation ──────────────────────────────────────────────────────────────
  const panelOpen = !!selectedProject
  const { displayResults, displayTotal, numCols, gridVisible, layoutOpen, pagePhase, getTileDelay, handlePage } =
    useGridPageAnimation({
      results, total, loading, panelOpen, containerRef,
      onSearch: (offset) => onSearch(query, selectedCats, offset, sortBy),
    })

  // Keep last project so the detail panel content doesn't blank during close animation
  const lastProjectRef = useRef<ModProject | null>(null)
  if (selectedProject) lastProjectRef.current = selectedProject
  const displayProject = selectedProject ?? lastProjectRef.current

  const gridCols = `repeat(${numCols}, 1fr)`

  // ── Debounced search — query / categories / sort changes ─────────────────────
  useEffect(() => {
    const t = setTimeout(() => onSearch(query, selectedCats, 0, sortBy), 300)
    return () => clearTimeout(t)
  }, [query, selectedCats, sortBy]) // intentionally omit onSearch

  // ── More by author ────────────────────────────────────────────────────────────
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

      {/* Main area: grid (left) + detail panel (right) */}
      <div ref={mainRowRef} className="flex flex-1 min-h-0 overflow-hidden">
        <div ref={containerRef} className="flex flex-col min-h-0 overflow-hidden" style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {loading && displayResults.length === 0 && (
              <div className="text-xs py-4 text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
                Searching…
              </div>
            )}
            {!loading && !error && displayResults.length === 0 && (
              <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                {query || selectedCats.length > 0
                  ? 'No results. Try different keywords or categories.'
                  : 'Search Modrinth for mods and plugins.'}
              </div>
            )}

            {displayResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8 }}>
                {displayResults.map((project, index) => (
                  <div
                    key={project.id}
                    style={{
                      minWidth: 0,
                      ...getTileStyle(getTileDelay(project.id), index % numCols, numCols, pagePhase, gridVisible),
                    }}
                  >
                    <ContentCard
                      project={project}
                      selected={selectedProject?.id === project.id}
                      installing={installing}
                      alreadyInstalled={installedProjectIds?.has(project.id)}
                      onClick={() => onSelectProject(project)}
                      onInstallLatest={onInstallLatest}
                      onInstall={onInstall}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <Pagination
            total={displayTotal}
            offset={offset}
            onPage={handlePage}
          />
        </div>

        {/* Detail panel wrapper — width is user-resizable */}
        <div
          style={{
            width: layoutOpen ? panelWidth : 0,
            minWidth: 0,
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
            borderLeft: layoutOpen ? '0.5px solid var(--border-subtle)' : 'none',
          }}
        >
          {/* Drag handle — sits on top of the left border */}
          {layoutOpen && (
            <div
              onMouseDown={handleResizeMouseDown}
              onMouseEnter={() => setResizeHover(true)}
              onMouseLeave={() => setResizeHover(false)}
              style={{
                position: 'absolute',
                left: -3,
                top: 0,
                bottom: 0,
                width: 6,
                cursor: 'col-resize',
                zIndex: 10,
                borderLeft: `2px solid ${resizeHover || resizeActive ? 'var(--accent)' : 'transparent'}`,
                transition: 'border-color 150ms ease',
              }}
            />
          )}

          <div
            style={{
              width: panelWidth,
              height: '100%',
              transform: panelOpen ? 'translateX(0)' : `translateX(${panelWidth}px)`,
              transition: `transform ${PANEL_SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
                installedProjectIds={installedProjectIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
