import type { ReactNode } from 'react'

interface SettingRowProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
        {description && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
