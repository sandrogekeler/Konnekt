import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { json } from '@codemirror/lang-json'
import { yaml } from '@codemirror/lang-yaml'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { ConfigFile } from '../../types'
import { ConfigForm } from './form/ConfigForm'
import { yamlIsFormSafe } from './form/parseYaml'
import { tomlIsFormSafe } from './form/parseToml'

function langExtension(format: ConfigFile['format']): Extension[] {
  switch (format) {
    case 'json':
    case 'json5':
      return [json()]
    case 'yaml':
      return [yaml()]
    default:
      return []
  }
}

const appTheme = EditorView.theme({
  '&': { background: 'transparent', height: '100%' },
  '.cm-scroller': { fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', overflow: 'auto' },
  '.cm-content': { padding: '8px 0' },
  '.cm-gutters': { background: 'transparent', border: 'none', color: 'var(--text-faint)' },
  '.cm-activeLineGutter': { background: 'transparent' },
  '.cm-activeLine': { background: 'rgba(255,255,255,0.03)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground': { background: 'rgba(74,222,128,0.15) !important' },
})

const FORMAT_LABELS: Record<string, string> = {
  properties: '.properties',
  yaml: 'YAML',
  json: 'JSON',
  json5: 'JSON5',
  toml: 'TOML',
  text: 'text',
}

const FORMAT_COLORS: Record<string, string> = {
  properties: 'text-yellow-400',
  yaml: 'text-blue-400',
  json: 'text-orange-400',
  json5: 'text-orange-400',
  toml: 'text-purple-400',
  text: 'text-zinc-400',
}

function formSupported(format: string, content: string): boolean {
  if (format === 'properties') return true
  if (format === 'yaml') return yamlIsFormSafe(content)
  if (format === 'json') {
    try { const v = JSON.parse(content); return v !== null && typeof v === 'object' && !Array.isArray(v) }
    catch { return false }
  }
  if (format === 'toml') return tomlIsFormSafe(content)
  return false
}

interface ViewToggleProps {
  mode: 'form' | 'raw'
  supported: boolean
  onChange: (m: 'form' | 'raw') => void
}

function ViewToggle({ mode, supported, onChange }: ViewToggleProps) {
  if (!supported) {
    return (
      <span
        className="text-[10px] font-mono flex-shrink-0"
        style={{ color: 'var(--text-faint)' }}
        title="Form view unavailable — file format not supported or contains constructs that can't be safely round-tripped"
      >
        Raw only
      </span>
    )
  }
  return (
    <div
      className="flex items-center rounded overflow-hidden flex-shrink-0"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      {(['form', 'raw'] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className="text-[10px] font-mono px-2 py-0.5 transition-colors capitalize"
          style={{
            background: mode === m ? 'var(--accent)' : 'transparent',
            color: mode === m ? '#000' : 'var(--text-faint)',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

interface Props {
  file: ConfigFile | null
  content: string
  onChange: (val: string) => void
  isDirty: boolean
  loading: boolean
  saving: boolean
  saveError: string | null
  isRunning: boolean
  onSave: () => void
  onRevert: () => void
  onRestart: () => void
}

export function EditorPanel({
  file,
  content,
  onChange,
  isDirty,
  loading,
  saving,
  saveError,
  isRunning,
  onSave,
  onRevert,
  onRestart,
}: Props) {
  const canForm = file ? formSupported(file.format, content) : false
  const [viewMode, setViewMode] = useState<'form' | 'raw'>('form')

  // When switching to a file that doesn't support form, force raw
  useEffect(() => {
    if (!canForm) setViewMode('raw')
    else setViewMode('form')
  }, [file?.relPath, canForm])

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          Select a file to edit
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span
          className="text-xs font-mono truncate flex-1 min-w-0"
          style={{ color: 'var(--text-muted)' }}
          title={file.relPath}
        >
          {file.relPath}
        </span>

        <span className={`text-[10px] font-mono flex-shrink-0 ${FORMAT_COLORS[file.format] ?? 'text-zinc-400'}`}>
          {FORMAT_LABELS[file.format] ?? file.format}
        </span>

        <ViewToggle mode={viewMode} supported={canForm} onChange={setViewMode} />

        {isDirty && (
          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}>
            ●
          </span>
        )}

        {isRunning && isDirty && (
          <span className="text-[10px] text-yellow-500 flex-shrink-0">applies after restart</span>
        )}

        {isDirty && (
          <button
            onClick={onRevert}
            className="text-[10px] font-mono flex-shrink-0 transition-colors hover:text-red-400"
            style={{ color: 'var(--text-faint)' }}
          >
            Revert
          </button>
        )}

        <button
          onClick={onSave}
          disabled={!isDirty || saving}
          className="text-[10px] font-mono flex-shrink-0 px-2 py-0.5 rounded transition-colors disabled:opacity-30"
          style={{
            background: isDirty && !saving ? 'var(--accent)' : undefined,
            color: isDirty && !saving ? '#000' : 'var(--text-faint)',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {isRunning && isDirty && (
          <button
            onClick={onRestart}
            className="text-[10px] font-mono flex-shrink-0 px-2 py-0.5 rounded transition-colors"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            Restart
          </button>
        )}
      </div>

      {/* Error bar */}
      {saveError && (
        <div
          className="px-3 py-1.5 text-xs text-red-400 font-mono flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(239,68,68,0.08)' }}
        >
          {saveError}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>Loading…</span>
          </div>
        )}

        {!loading && viewMode === 'form' && (
          <ConfigForm format={file.format} content={content} onChange={onChange} />
        )}

        {!loading && viewMode === 'raw' && (
          <CodeMirror
            value={content}
            onChange={onChange}
            extensions={[...langExtension(file.format), appTheme]}
            theme="dark"
            height="100%"
            style={{ height: '100%' }}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: false,
              foldGutter: false,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: false,
              rectangularSelection: false,
              crosshairCursor: false,
              searchKeymap: true,
            }}
          />
        )}
      </div>
    </div>
  )
}
