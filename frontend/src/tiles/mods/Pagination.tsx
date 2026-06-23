const PAGE_SIZE = 20

interface PaginationProps {
  total: number
  offset: number
  onPage: (offset: number) => void
}

export function Pagination({ total, offset, onPage }: PaginationProps) {
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (totalPages <= 1) return null

  // Build page number sequence with ellipsis
  function getPages(): (number | '...')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()

  return (
    <div
      className="flex items-center justify-center gap-1 px-3 py-3 shrink-0 flex-wrap"
      style={{ borderTop: '0.5px solid var(--border-subtle)' }}
    >
      {/* Prev */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPage((currentPage - 2) * PAGE_SIZE)}
        className="px-2 py-1 rounded text-xs font-mono transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-muted)', background: 'transparent' }}
        onMouseEnter={e => { if (currentPage !== 1) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(((p as number) - 1) * PAGE_SIZE)}
            className="min-w-[28px] px-2 py-1 rounded text-xs font-mono transition-colors"
            style={{
              background: p === currentPage ? 'var(--accent)' : 'transparent',
              color: p === currentPage ? 'var(--bg-base)' : 'var(--text-muted)',
              fontWeight: p === currentPage ? 600 : 400,
            }}
            onMouseEnter={e => {
              if (p !== currentPage) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={e => {
              if (p !== currentPage) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            }}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPage(currentPage * PAGE_SIZE)}
        className="px-2 py-1 rounded text-xs font-mono transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-muted)', background: 'transparent' }}
        onMouseEnter={e => { if (currentPage !== totalPages) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
      >
        ›
      </button>
    </div>
  )
}
