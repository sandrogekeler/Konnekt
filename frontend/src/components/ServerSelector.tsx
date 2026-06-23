import { useEffect, useState } from 'react'
import { useServerConfigStore } from '../stores/useServerConfigStore'
import { BrowseJarFile, BrowseDirectory } from '../../wailsjs/go/main/App'
import type { ServerConfig } from '../types'

interface FormState {
  name: string
  jarPath: string
  workingDir: string
  jvmArgs: string  // canonical full expression, always kept in sync
  minRam: string
  maxRam: string
}

const emptyForm: FormState = {
  name: '', jarPath: '', workingDir: '',
  jvmArgs: '-Xms512M -Xmx2G', minRam: '512M', maxRam: '2G',
}

function parseRamFromArgs(args: string): { minRam: string; maxRam: string } {
  return {
    minRam: args.match(/-Xms(\S+)/)?.[1] ?? '',
    maxRam: args.match(/-Xmx(\S+)/)?.[1] ?? '',
  }
}

function mergeRamIntoArgs(args: string, minRam: string, maxRam: string): string {
  let result = args
  if (minRam) {
    result = /-Xms\S+/.test(result)
      ? result.replace(/-Xms\S+/, `-Xms${minRam}`)
      : `${result} -Xms${minRam}`.trim()
  }
  if (maxRam) {
    result = /-Xmx\S+/.test(result)
      ? result.replace(/-Xmx\S+/, `-Xmx${maxRam}`)
      : `${result} -Xmx${maxRam}`.trim()
  }
  return result
}

function configToForm(cfg: ServerConfig): FormState {
  const jvmArgs = cfg.jvmArgs.join(' ')
  const { minRam, maxRam } = parseRamFromArgs(jvmArgs)
  return { name: cfg.name, jarPath: cfg.jarPath, workingDir: cfg.workingDir, jvmArgs, minRam, maxRam }
}

export function ServerSelector() {
  const { configs, activeId, loadConfigs, saveConfig, deleteConfig, setActiveId } = useServerConfigStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null)

  useEffect(() => {
    loadConfigs().catch(console.error)
  }, [loadConfigs])

  const openNew = () => {
    setForm(emptyForm)
    setAdvancedMode(false)
    setEditing('new')
  }

  const openEdit = (cfg: ServerConfig) => {
    setForm(configToForm(cfg))
    setAdvancedMode(cfg.jvmArgs.some(a => !a.startsWith('-Xms') && !a.startsWith('-Xmx')))
    setEditing(cfg.id)
  }

  const cancel = () => setEditing(null)

  const toggleAdvanced = () => {
    if (!advancedMode) {
      // simple → advanced: merge current min/max into the expression first
      setForm(f => ({ ...f, jvmArgs: mergeRamIntoArgs(f.jvmArgs, f.minRam, f.maxRam) }))
    } else {
      // advanced → simple: parse min/max out of the raw expression
      setForm(f => ({ ...f, ...parseRamFromArgs(f.jvmArgs) }))
    }
    setAdvancedMode(v => !v)
  }

  const submit = async () => {
    const name = form.name.trim()
    const jarPath = form.jarPath.trim()
    const workingDir = form.workingDir.trim()
    if (!name || !jarPath || !workingDir) return

    const id = editing === 'new' ? crypto.randomUUID() : editing!
    const finalArgs = advancedMode
      ? form.jvmArgs
      : mergeRamIntoArgs(form.jvmArgs, form.minRam, form.maxRam)
    const jvmArgs = finalArgs.trim() ? finalArgs.trim().split(/\s+/) : []

    const existing = configs.find(c => c.id === id)
    await saveConfig({
      id, name, jarPath, jvmArgs, workingDir,
      mcVersion: existing?.mcVersion ?? '',
      loader: existing?.loader ?? '',
    })
    setEditing(null)
  }

  const handleDisconnect = async (id: string) => {
    await deleteConfig(id)
    setPendingDisconnect(null)
  }

  const dirOf = (filePath: string) => {
    const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    return idx >= 0 ? filePath.substring(0, idx) : ''
  }

  const browseJar = async () => {
    const path = await BrowseJarFile().catch(() => '')
    if (path) setForm((f) => ({ ...f, jarPath: path, workingDir: dirOf(path) }))
  }

  const browseDir = async () => {
    const path = await BrowseDirectory().catch(() => '')
    if (path) setForm((f) => ({ ...f, workingDir: path }))
  }

  const inputClass = 'flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors font-mono'
  const plainInputClass = 'w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors font-mono'

  const field = (key: 'name', placeholder: string) => (
    <input
      type="text"
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      placeholder={placeholder}
      className={plainInputClass}
    />
  )

  const browseField = (key: 'jarPath' | 'workingDir', placeholder: string, onBrowse: () => void) => (
    <div className="flex gap-1">
      <input
        type="text"
        value={form[key]}
        onChange={(e) => {
          const val = e.target.value
          if (key === 'jarPath') {
            setForm((f) => ({ ...f, jarPath: val, workingDir: f.workingDir || dirOf(val) }))
          } else {
            setForm((f) => ({ ...f, [key]: val }))
          }
        }}
        placeholder={placeholder}
        className={inputClass}
      />
      <button
        type="button"
        onClick={onBrowse}
        className="shrink-0 px-2 py-1 text-xs rounded border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-colors font-mono"
        title="Browse"
      >
        …
      </button>
    </div>
  )

  const ramFields = (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs text-white/30 px-0.5">Min RAM</span>
          <input
            type="text"
            value={form.minRam}
            onChange={(e) => setForm((f) => ({ ...f, minRam: e.target.value }))}
            placeholder="512M"
            className={plainInputClass}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-xs text-white/30 px-0.5">Max RAM</span>
          <input
            type="text"
            value={form.maxRam}
            onChange={(e) => setForm((f) => ({ ...f, maxRam: e.target.value }))}
            placeholder="2G"
            className={plainInputClass}
          />
        </div>
      </div>
    </div>
  )

  const advancedField = (
    <input
      type="text"
      value={form.jvmArgs}
      onChange={(e) => setForm((f) => ({ ...f, jvmArgs: e.target.value }))}
      placeholder="-Xms512M -Xmx2G -XX:+UseG1GC"
      className={plainInputClass}
    />
  )

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-xs text-white/40 px-1 font-medium uppercase tracking-wider mb-1">Servers</div>

      {configs.map((cfg) => (
        <div key={cfg.id} className="flex items-center gap-1">
          <button
            onClick={() => setActiveId(cfg.id)}
            className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
              cfg.id === activeId
                ? 'text-accent bg-accent/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title={cfg.jarPath}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.id === activeId ? 'bg-accent' : 'bg-white/20'}`} />
            <span className="truncate">{cfg.name}</span>
          </button>
          <button
            onClick={() => openEdit(cfg)}
            className="text-xs text-white/20 hover:text-white/60 transition-colors px-1"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={() => setPendingDisconnect(cfg.id)}
            className="text-xs text-white/20 hover:text-red-400 transition-colors px-1"
            title="Disconnect"
          >
            ×
          </button>
        </div>
      ))}

      {editing !== null ? (
        <div className="flex flex-col gap-1.5 mt-1 pt-2" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          {field('name', 'Name')}
          {browseField('jarPath', 'Jar path', browseJar)}
          {browseField('workingDir', 'Working dir', browseDir)}
          {advancedMode ? advancedField : ramFields}
          <button
            onClick={toggleAdvanced}
            className="self-start text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            {advancedMode ? '← Simple' : '⚙ Advanced'}
          </button>
          <div className="flex gap-1 mt-0.5">
            <button
              onClick={submit}
              className="flex-1 py-1 text-xs rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
            >
              Save
            </button>
            <button
              onClick={cancel}
              className="px-2 py-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openNew}
          className="mt-1 flex items-center gap-1.5 px-2 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors rounded hover:bg-white/5"
        >
          <span>+</span>
          <span>Add server</span>
        </button>
      )}

      {pendingDisconnect && (() => {
        const name = configs.find(c => c.id === pendingDisconnect)?.name ?? 'this server'
        return (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setPendingDisconnect(null)}
          >
            <div
              className="flex flex-col gap-4 p-5 rounded-xl w-72"
              style={{ backgroundColor: 'var(--bg-base)', border: '0.5px solid var(--border-subtle)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-white">Disconnect server?</span>
                <span className="text-xs text-white/50">
                  <span className="text-white/80">{name}</span> will be removed from Konnekt. Your server files and data will not be affected.
                </span>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setPendingDisconnect(null)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDisconnect(pendingDisconnect)}
                  className="px-3 py-1.5 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
