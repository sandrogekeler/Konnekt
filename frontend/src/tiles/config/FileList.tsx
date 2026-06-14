import { useEffect, useState } from 'react'
import type { ConfigFile } from '../../types'

const FORMAT_COLORS: Record<string, string> = {
  properties: 'text-yellow-400',
  yaml: 'text-blue-400',
  json: 'text-orange-400',
  json5: 'text-orange-400',
  toml: 'text-purple-400',
  text: 'text-zinc-500',
}

const FORMAT_LABELS: Record<string, string> = {
  properties: 'props',
  yaml: 'yml',
  json: 'json',
  json5: 'json5',
  toml: 'toml',
  text: 'txt',
}

function FormatChip({ format }: { format: ConfigFile['format'] }) {
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wide flex-shrink-0 ${FORMAT_COLORS[format] ?? 'text-zinc-500'}`}>
      {FORMAT_LABELS[format] ?? format}
    </span>
  )
}

function FileRow({
  file,
  selected,
  dirty,
  onClick,
}: {
  file: ConfigFile
  selected: boolean
  dirty: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-md transition-colors ${
        selected ? 'bg-accent/15' : 'hover:bg-white/5'
      }`}
    >
      <span
        className={`flex-1 truncate text-xs font-mono ${selected ? 'text-accent' : ''}`}
        style={selected ? undefined : { color: 'var(--text-primary)' }}
      >
        {file.name}
      </span>
      {dirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
      )}
      <FormatChip format={file.format} />
    </button>
  )
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-mono"
        style={{ color: 'var(--text-faint)' }}
      >
        {count}
      </span>
    </div>
  )
}

function PluginGroup({
  source,
  files,
  selectedRelPath,
  dirtyPath,
  onSelect,
}: {
  source: string
  files: ConfigFile[]
  selectedRelPath: string | null
  dirtyPath: string | null
  onSelect: (p: string) => void
}) {
  const hasSelected = files.some((f) => f.relPath === selectedRelPath)
  const [open, setOpen] = useState(hasSelected)

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left transition-colors hover:bg-white/3 rounded"
      >
        <span
          className="text-[9px] transition-transform"
          style={{ color: 'var(--text-faint)', transform: open ? 'rotate(90deg)' : undefined }}
        >
          ▶
        </span>
        <span className="text-xs font-medium flex-1 truncate" style={{ color: 'var(--text-muted)' }}>
          {source}
        </span>
        <span className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>
          {files.length}
        </span>
      </button>

      {open && (
        <div className="pl-3">
          {files.map((f) => (
            <FileRow
              key={f.relPath}
              file={f}
              selected={f.relPath === selectedRelPath}
              dirty={f.relPath === dirtyPath}
              onClick={() => onSelect(f.relPath)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  files: ConfigFile[]
  selectedRelPath: string | null
  dirtyPath: string | null
  loading: boolean
  error: string | null
  search: string
  onSearch: (q: string) => void
  onSelect: (relPath: string) => void
  onRefresh: () => void
}

export function FileList({
  files,
  selectedRelPath,
  dirtyPath,
  loading,
  error,
  search,
  onSearch,
  onSelect,
  onRefresh,
}: Props) {
  const q = search.toLowerCase()
  const filtered = q
    ? files.filter((f) => f.name.toLowerCase().includes(q) || f.relPath.toLowerCase().includes(q))
    : files

  const serverFiles = filtered.filter((f) => f.category === 'server')
  const pluginFiles = filtered.filter((f) => f.category === 'plugins')
  const modFiles = filtered.filter((f) => f.category === 'mods')

  function groupBySource(list: ConfigFile[]): Map<string, ConfigFile[]> {
    const map = new Map<string, ConfigFile[]>()
    for (const f of list) {
      const key = f.source || ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(f)
    }
    return map
  }

  const pluginGroups = groupBySource(pluginFiles)
  const modGroups = groupBySource(modFiles)

  useEffect(() => {
    onRefresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ borderRight: '1px solid var(--border-subtle)' }}>
      {/* Search */}
      <div
        className="px-3 py-2.5 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>⌕</span>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 bg-transparent text-xs font-mono outline-none placeholder:text-zinc-700"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading && (
          <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>Scanning…</p>
        )}
        {error && (
          <p className="px-4 py-3 text-xs text-red-400 break-all">{error}</p>
        )}
        {!loading && !error && files.length === 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>No config files found.</p>
        )}

        {/* Server */}
        {serverFiles.length > 0 && (
          <div>
            <GroupHeader label="Server" count={serverFiles.length} />
            {serverFiles.map((f) => (
              <FileRow
                key={f.relPath}
                file={f}
                selected={f.relPath === selectedRelPath}
                dirty={f.relPath === dirtyPath}
                onClick={() => onSelect(f.relPath)}
              />
            ))}
          </div>
        )}

        {/* Plugins */}
        {pluginFiles.length > 0 && (
          <div>
            <GroupHeader label="Plugins" count={pluginFiles.length} />
            {/* Root-level plugin files (no source) */}
            {(pluginGroups.get('') ?? []).map((f) => (
              <FileRow
                key={f.relPath}
                file={f}
                selected={f.relPath === selectedRelPath}
                dirty={f.relPath === dirtyPath}
                onClick={() => onSelect(f.relPath)}
              />
            ))}
            {/* Plugin sub-groups */}
            {Array.from(pluginGroups.entries())
              .filter(([src]) => src !== '')
              .map(([source, group]) => (
                <PluginGroup
                  key={source}
                  source={source}
                  files={group}
                  selectedRelPath={selectedRelPath}
                  dirtyPath={dirtyPath}
                  onSelect={onSelect}
                />
              ))}
          </div>
        )}

        {/* Mods */}
        {modFiles.length > 0 && (
          <div>
            <GroupHeader label="Mods" count={modFiles.length} />
            {(modGroups.get('') ?? []).map((f) => (
              <FileRow
                key={f.relPath}
                file={f}
                selected={f.relPath === selectedRelPath}
                dirty={f.relPath === dirtyPath}
                onClick={() => onSelect(f.relPath)}
              />
            ))}
            {Array.from(modGroups.entries())
              .filter(([src]) => src !== '')
              .map(([source, group]) => (
                <PluginGroup
                  key={source}
                  source={source}
                  files={group}
                  selectedRelPath={selectedRelPath}
                  dirtyPath={dirtyPath}
                  onSelect={onSelect}
                />
              ))}
          </div>
        )}
      </div>

      {/* Refresh */}
      <div className="flex-shrink-0 px-3 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onRefresh}
          className="text-[10px] font-mono transition-colors hover:text-accent"
          style={{ color: 'var(--text-faint)' }}
        >
          ↻ Refresh
        </button>
      </div>
    </div>
  )
}
