interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-40"
      style={{
        background: checked ? 'var(--accent)' : 'var(--border-hover)',
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
        style={{
          background: 'var(--bg-base)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  )
}
