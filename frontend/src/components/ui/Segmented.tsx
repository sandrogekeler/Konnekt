interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  compact?: boolean
}

export function Segmented<T extends string>({ options, value, onChange, compact }: SegmentedProps<T>) {
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
