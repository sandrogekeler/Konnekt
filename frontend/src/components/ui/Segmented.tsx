interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  compact?: boolean
  slide?: boolean
}

export function Segmented<T extends string>({ options, value, onChange, compact, slide }: SegmentedProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value)

  if (slide) {
    return (
      <div
        className="relative flex shrink-0"
        style={{
          border: '0.5px solid var(--border-subtle)',
          background: 'var(--hover-surface)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          className="absolute top-0 bottom-0"
          style={{
            width: `${100 / options.length}%`,
            background: 'var(--accent)',
            borderRadius: 7,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {options.map((opt) => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`relative z-10 flex-1 ${compact ? 'px-2 py-px' : 'px-3 py-1'} text-xs`}
              style={{
                color: active ? 'var(--bg-base)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 400,
                background: 'transparent',
                transition: 'color 200ms',
                whiteSpace: 'nowrap',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex rounded-lg overflow-hidden shrink-0"
      style={{ border: '0.5px solid var(--border-subtle)', background: 'var(--hover-surface)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`${compact ? 'px-2 py-px' : 'px-3 py-1'} text-xs transition-colors`}
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--bg-base)' : 'var(--text-muted)',
              fontWeight: active ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
