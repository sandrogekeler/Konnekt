import { useEffect, useState } from 'react'
import { useServerConfigStore } from '../stores/useServerConfigStore'
import { BrowseJarFile, BrowseDirectory } from '../../wailsjs/go/main/App'
import type { ServerConfig } from '../types'

interface FormState {
  name: string
  jarPath: string
  workingDir: string
  jvmArgs: string
}

const emptyForm: FormState = { name: '', jarPath: '', workingDir: '', jvmArgs: '-Xmx2G -Xms512M' }

function configToForm(cfg: ServerConfig): FormState {
  return {
    name: cfg.name,
    jarPath: cfg.jarPath,
    workingDir: cfg.workingDir,
    jvmArgs: cfg.jvmArgs.join(' '),
  }
}

export function ServerSelector() {
  const { configs, activeId, loadConfigs, saveConfig, deleteConfig, setActiveId } = useServerConfigStore()
  const [editing, setEditing] = useState<string | null>(null) // null | 'new' | config id
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    loadConfigs().catch(console.error)
  }, [loadConfigs])

  const openNew = () => {
    setForm(emptyForm)
    setEditing('new')
  }

  const openEdit = (cfg: ServerConfig) => {
    setForm(configToForm(cfg))
    setEditing(cfg.id)
  }

  const cancel = () => setEditing(null)

  const submit = async () => {
    const name = form.name.trim()
    const jarPath = form.jarPath.trim()
    const workingDir = form.workingDir.trim()
    if (!name || !jarPath || !workingDir) return

    const id = editing === 'new' ? crypto.randomUUID() : editing!
    const jvmArgs = form.jvmArgs.trim() ? form.jvmArgs.trim().split(/\s+/) : []

    await saveConfig({ id, name, jarPath, jvmArgs, workingDir })
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    await deleteConfig(id)
  }

  const browseJar = async () => {
    const path = await BrowseJarFile().catch(() => '')
    if (path) setForm((f) => ({ ...f, jarPath: path }))
  }

  const browseDir = async () => {
    const path = await BrowseDirectory().catch(() => '')
    if (path) setForm((f) => ({ ...f, workingDir: path }))
  }

  const inputClass = 'flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors font-mono'
  const plainInputClass = 'w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors font-mono'

  const field = (key: keyof FormState, placeholder: string) => (
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
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
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

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-xs text-white/40 px-1 font-medium uppercase tracking-wider mb-1">Servers</div>

      {configs.map((cfg) => (
        <div key={cfg.id} className="flex items-center gap-1">
          <button
            onClick={() => setActiveId(cfg.id)}
            className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-all ${
              cfg.id === activeId
                ? 'text-green-400 bg-green-400/10'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
            title={cfg.jarPath}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.id === activeId ? 'bg-green-400' : 'bg-white/20'}`} />
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
            onClick={() => handleDelete(cfg.id)}
            className="text-xs text-white/20 hover:text-red-400 transition-colors px-1"
            title="Delete"
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
          {field('jvmArgs', 'JVM args')}
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
    </div>
  )
}
