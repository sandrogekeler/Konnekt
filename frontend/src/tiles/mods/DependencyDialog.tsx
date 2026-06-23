import { useEffect, useState } from 'react'
import type { ResolvedDependency } from './useMods'

interface Props {
  primaryVersionId: string
  dependencies: ResolvedDependency[]
  onConfirm: (versionIds: string[]) => void
  onCancel: () => void
}

export function DependencyDialog({ primaryVersionId, dependencies, onConfirm, onCancel }: Props) {
  // required deps are auto-selected and locked; optional are toggleable
  const [optionalSelected, setOptionalSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const toggleOptional = (versionId: string) => {
    setOptionalSelected(prev => {
      const next = new Set(prev)
      if (next.has(versionId)) next.delete(versionId)
      else next.add(versionId)
      return next
    })
  }

  const handleConfirm = () => {
    const ids = [primaryVersionId]
    for (const dep of dependencies) {
      if (dep.alreadyInstalled) continue
      if (dep.required || optionalSelected.has(dep.version.id)) {
        ids.push(dep.version.id)
      }
    }
    onConfirm(ids)
  }

  const required = dependencies.filter(d => d.required)
  const optional = dependencies.filter(d => !d.required)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
      <div
        className="rounded-xl p-5 w-full max-w-md"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-subtle)' }}
      >
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Dependencies
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          This mod requires the following. Required dependencies will be installed automatically.
        </p>

        {required.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Required</div>
            <div className="flex flex-col gap-1">
              {required.map(dep => (
                <DepRow key={dep.projectId} dep={dep} checked locked={!dep.alreadyInstalled} />
              ))}
            </div>
          </div>
        )}

        {optional.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Optional</div>
            <div className="flex flex-col gap-1">
              {optional.map(dep => (
                <DepRow
                  key={dep.projectId}
                  dep={dep}
                  checked={optionalSelected.has(dep.version.id)}
                  locked={false}
                  onChange={() => toggleOptional(dep.version.id)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 rounded text-xs font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

function DepRow({
  dep, checked, locked, onChange,
}: {
  dep: ResolvedDependency
  checked: boolean
  locked: boolean
  onChange?: () => void
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded"
      style={{
        background: 'var(--bg-surface)',
        opacity: dep.alreadyInstalled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={dep.alreadyInstalled ? true : checked}
        disabled={locked || dep.alreadyInstalled}
        onChange={onChange}
        className="shrink-0"
        style={{ accentColor: 'var(--accent)' }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
          {dep.projectTitle}
        </span>
        {dep.version.versionNumber && (
          <span className="ml-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {dep.version.versionNumber}
          </span>
        )}
      </div>
      {dep.alreadyInstalled && (
        <span className="shrink-0 text-xs px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: 10 }}>
          installed
        </span>
      )}
    </div>
  )
}
