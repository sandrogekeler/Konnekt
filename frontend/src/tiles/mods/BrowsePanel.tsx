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

const DEFAULT_PANEL_WIDTH = 440
const MIN_PANEL_WIDTH = 300   // narrowest the detail panel can get
const MIN_GRID_WIDTH = 232    // narrowest the grid can get: 1 card (200px) + padding (24px) + gap (8px)
const PANEL_DURATION = 280    // ms — detail panel slide
const CARD_ANIM = 130         // ms — tile fade+scale for panel open/close & initial load

// Page-turn animation timing
const EXIT_MS = 180    // per-tile exit duration
const ENTER_MS = 160   // per-tile enter duration
const COL_DELAY = 45   // stagger step per column (ms)

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Relevance' },
  { value: 'downloads',  label: 'Downloads' },
  { value: 'follows',    label: 'Popularity' },
  { value: 'newest',     label: 'Date published' },
  { value: 'updated',    label: 'Updated' },
]

// Stable per-card random-ish delay for initial-load / panel-toggle animation.
function stableDelay(id: string): number {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return (h % 8) * 20
}

// Per-tile CSS driven by the current animation phase.
//   idle  — panel open/close & initial load (scale from centre, stable random delay)
//   exit  — page turn out: scale+translate left, left column first
//   enter — page turn in:  scale+translate from right, right column first (inverse)
function getTileStyle(
  projectId: string,
  col: number,
  numCols: number,
  phase: 'idle' | 'exit' | 'enter',
  gridVisible: boolean,
): React.CSSProperties {
  if (phase === 'exit') {
    const delay = col * COL_DELAY
    return {
      opacity: 0,
      transform: 'scale(0.88) translateX(-22px)',
      transition: `opacity ${EXIT_MS}ms ease ${delay}ms, transform ${EXIT_MS}ms ease ${delay}ms`,
    }
  }

  if (phase === 'enter') {
    const delay = (numCols - 1 - col) * COL_DELAY
    return {
      opacity: gridVisible ? 1 : 0,
      transform: gridVisible ? 'none' : 'scale(0.88) translateX(22px)',
      transition: gridVisible
        ? `opacity ${ENTER_MS}ms ease ${delay}ms, transform ${ENTER_MS}ms ease ${delay}ms`
        : 'none',
    }
  }

  // idle — covers panel open/close, initial load, and grid reflow (all unified)
  return {
    opacity: gridVisible ? 1 : 0,
    transform: gridVisible ? 'none' : 'scale(0.94)',
    transition: `opacity ${CARD_ANIM}ms ease, transform ${CARD_ANIM}ms ease`,
    transitionDelay: gridVisible ? `${stableDelay(projectId)}ms` : '0ms',
  }
}

// ─── Shared popover dismiss hook ──────────────────────────────────────────────

function usePopover() {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen(v => !v), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, toggle, close }
}

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

      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={close} />}

      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 201,
          minWidth: 160,
          background: 'var(--bg-elevated)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transformOrigin: 'top right',
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
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

      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={close} />}

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
          backdropFilter: 'blur(12px)',
          border: '0.5px solid var(--border-subtle)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          transformOrigin: 'top right',
          transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.85) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 160ms cubic-bezier(0.4,0,0.2,1), opacity 160ms ease',
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
  moreByAuthor,
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

  const reflowTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Buffered results: hold old page during exit, swap in on commit ──────────
  const [displayResults, setDisplayResults] = useState<ModProject[]>(results)
  const [displayTotal, setDisplayTotal] = useState(total)

  // ── Page-turn phase ─────────────────────────────────────────────────────────
  // Stable wrappers keep refs in sync at call-time. ResizeObserver callbacks can
  // fire between React commit and useEffect, so refs must be updated eagerly.
  const [pagePhase, _setPagePhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const pagePhaseRef = useRef<'idle' | 'exit' | 'enter'>('idle')
  const setPagePhase = useCallback((p: 'idle' | 'exit' | 'enter') => {
    pagePhaseRef.current = p; _setPagePhase(p)
  }, [])

  // ── Column count (measured from container width for accurate stagger) ───────
  const [numCols, setNumCols] = useState(4)
  const numColsRef = useRef(4)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Page-turn coordination refs ─────────────────────────────────────────────
  // Both the exit-animation timer AND the network response must complete before
  // we swap in new results and start the enter animation.
  const exitDoneRef = useRef(false)
  const resultsDoneRef = useRef(false)
  const inPageTransRef = useRef(false)
  const pendingRef = useRef<{ results: ModProject[]; total: number } | null>(null)
  const transTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const prevLoadingRef = useRef(loading)

  // ── Detail panel ─────────────────────────────────────────────────────────────
  const panelOpen = !!selectedProject
  const lastProjectRef = useRef<ModProject | null>(null)
  if (selectedProject) lastProjectRef.current = selectedProject
  const displayProject = selectedProject ?? lastProjectRef.current

  const [layoutOpen, setLayoutOpen] = useState(false)
  const [gridVisible, _setGridVisible] = useState(false)
  const gridVisibleRef = useRef(false)
  const setGridVisible = useCallback((v: boolean) => {
    gridVisibleRef.current = v; _setGridVisible(v)
  }, [])
  const hasOpenedRef = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cardAnimTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Measure column count; animate reflow when tiles are visible ──────────────
  // Mount-only: panel open/close handlers update numCols themselves (in a double-rAF
  // while tiles are hidden) so the observer never sees a stale mismatch after panel
  // transitions — preventing the double-animation from Issue 1.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => Math.max(1, Math.floor((el.getBoundingClientRect().width - 16) / 208))

    // Seed initial value — tiles are hidden at mount so no animation needed.
    const init = measure()
    setNumCols(init)
    numColsRef.current = init

    const obs = new ResizeObserver(() => {
      const cols = measure()
      if (cols === numColsRef.current) return

      if (!gridVisibleRef.current || pagePhaseRef.current !== 'idle') {
        // Tiles hidden or page-turning: update numCols silently (reflow is invisible).
        setNumCols(cols)
        numColsRef.current = cols
        return
      }

      // Tiles visible and stable: animate — hide first so the CSS reflow is invisible.
      clearTimeout(reflowTimerRef.current)
      setGridVisible(false)
      const target = cols
      reflowTimerRef.current = setTimeout(() => {
        setNumCols(target)
        numColsRef.current = target
        setGridVisible(true)
      }, CARD_ANIM)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, []) // mount-only — see comment above

  // ── commitEnter: swap in new results and start enter animation ───────────────
  // Called after BOTH the exit timer fires AND the network results arrive.
  const commitEnter = useCallback(() => {
    if (!exitDoneRef.current || !resultsDoneRef.current || !pendingRef.current) return
    const { results: r, total: t } = pendingRef.current
    exitDoneRef.current = false
    resultsDoneRef.current = false
    inPageTransRef.current = false
    pendingRef.current = null
    // Batch: update display data + phase. Tiles render at enter-start state (invisible, shifted right).
    setDisplayResults(r)
    setDisplayTotal(t)
    setPagePhase('enter')
    setGridVisible(false)
    // Two frames later: trigger the enter transition (start → end state).
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setGridVisible(true)
      clearTimeout(transTimerRef.current)
      transTimerRef.current = setTimeout(
        () => setPagePhase('idle'),
        ENTER_MS + numColsRef.current * COL_DELAY + 60,
      )
    }))
  }, []) // stable: only uses refs and stable state setters

  // ── handlePage: kick off exit animation and fire the search ─────────────────
  const handlePage = useCallback((o: number) => {
    clearTimeout(transTimerRef.current)
    exitDoneRef.current = false
    resultsDoneRef.current = false
    inPageTransRef.current = true
    pendingRef.current = null
    setPagePhase('exit')
    onSearch(query, selectedCats, o, sortBy)
    // Exit timer: after all tiles have animated out, try to commit
    transTimerRef.current = setTimeout(() => {
      exitDoneRef.current = true
      commitEnter()
    }, EXIT_MS + numColsRef.current * COL_DELAY + 30)
  }, [onSearch, query, selectedCats, sortBy, commitEnter])

  // ── Sync incoming results: buffer during page turn, apply directly otherwise ─
  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = loading
    if (inPageTransRef.current && wasLoading && !loading) {
      // Network results just arrived during a page transition — store and try commit
      pendingRef.current = { results, total }
      resultsDoneRef.current = true
      commitEnter()
    } else if (!inPageTransRef.current) {
      // Normal update: query change, category filter, sort, initial load
      setDisplayResults(results)
      setDisplayTotal(total)
    }
  }, [loading, results, total, commitEnter])

  // ── Initial-load animation: Case A (remount with cached results) ─────────────
  useEffect(() => {
    if (results.length > 0) {
      const t = setTimeout(() => setGridVisible(true), 16)
      return () => clearTimeout(t)
    }
  }, []) // mount only

  // ── Initial-load animation: Case B (first results arrive after mount) ────────
  const prevDisplayLenRef = useRef(0)
  useEffect(() => {
    const prevLen = prevDisplayLenRef.current
    prevDisplayLenRef.current = displayResults.length
    if (prevLen === 0 && displayResults.length > 0 && !panelOpen && pagePhase === 'idle') {
      const t = setTimeout(() => setGridVisible(true), 16)
      return () => clearTimeout(t)
    }
  }, [displayResults.length]) // intentionally omit panelOpen, pagePhase

  // ── Detail panel open/close ──────────────────────────────────────────────────
  useEffect(() => {
    if (panelOpen) {
      hasOpenedRef.current = true
      clearTimeout(closeTimerRef.current)
      clearTimeout(cardAnimTimerRef.current)
      setGridVisible(false)
      cardAnimTimerRef.current = setTimeout(() => {
        setLayoutOpen(true)
        // Double-rAF: first frame React commits layoutOpen=true and browser lays out;
        // second frame the new container width is stable. Update numCols while tiles
        // are still hidden so the ResizeObserver finds no mismatch when it fires.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (containerRef.current) {
            const cols = Math.max(1, Math.floor((containerRef.current.getBoundingClientRect().width - 16) / 208))
            setNumCols(cols)
            numColsRef.current = cols
          }
          setGridVisible(true)
        }))
      }, CARD_ANIM)
    } else {
      if (!hasOpenedRef.current) return
      clearTimeout(cardAnimTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        setGridVisible(false)
        cardAnimTimerRef.current = setTimeout(() => {
          setLayoutOpen(false)
          requestAnimationFrame(() => requestAnimationFrame(() => {
            if (containerRef.current) {
              const cols = Math.max(1, Math.floor((containerRef.current.getBoundingClientRect().width - 16) / 208))
              setNumCols(cols)
              numColsRef.current = cols
            }
            setGridVisible(true)
          }))
        }, CARD_ANIM)
      }, PANEL_DURATION - CARD_ANIM)
    }
    return () => {
      clearTimeout(closeTimerRef.current)
      clearTimeout(cardAnimTimerRef.current)
    }
  }, [panelOpen])

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
                      ...getTileStyle(project.id, index % numCols, numCols, pagePhase, gridVisible),
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
