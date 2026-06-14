import { useState, useRef, useEffect, useCallback } from 'react'
import type { ConfigField } from './inferType'

/* ── Shared row wrapper ───────────────────────────────────── */
function FieldRow({ field, children }: { field: ConfigField; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
          {field.label}
        </span>
        <div className="flex-shrink-0">{children}</div>
      </div>
      {field.description && (
        <p className="text-xs leading-relaxed pr-1" style={{ color: 'var(--text-faint)' }}>
          {field.description}
        </p>
      )}
    </div>
  )
}

/* ── Toggle ───────────────────────────────────────────────── */
export function Toggle({ field, onChange }: { field: ConfigField; onChange: (v: boolean) => void }) {
  const on = field.value === true || field.value === 'true'
  return (
    <FieldRow field={field}>
      <button
        onClick={() => onChange(!on)}
        role="switch"
        aria-checked={on}
        className="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none"
        style={{ background: on ? 'var(--accent)' : 'var(--hover-surface)' }}
      >
        {/* Pin dot to left-0.5 (2px) so translateX is relative to that anchor */}
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200"
          style={{
            background: on ? '#000' : 'var(--text-muted)',
            transform: on ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    </FieldRow>
  )
}

/* ── NumberInput ──────────────────────────────────────────── */
export function NumberInput({ field, onChange }: { field: ConfigField; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(String(field.value ?? ''))

  function commit(raw: string) {
    const n = Number(raw)
    if (!Number.isNaN(n)) {
      const clamped = field.min !== undefined && n < field.min ? field.min
        : field.max !== undefined && n > field.max ? field.max
        : n
      onChange(clamped)
      setDraft(String(clamped))
    } else {
      setDraft(String(field.value ?? ''))
    }
  }

  function step(delta: number) {
    const base = Number(draft)
    const next = (Number.isNaN(base) ? 0 : base) + delta
    commit(String(next))
  }

  const btnStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    background: 'transparent',
    lineHeight: 1,
  }

  return (
    <FieldRow field={field}>
      <div
        className="flex items-center rounded overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--hover-surface)' }}
      >
        {/* Suppress native spinners via inline style — Tailwind can't target ::-webkit-inner-spin-button */}
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
          className="w-20 px-2 py-1 text-sm font-mono text-right outline-none bg-transparent"
          style={{
            color: 'var(--text-primary)',
            MozAppearance: 'textfield',
            WebkitAppearance: 'none',
          }}
        />
        <div
          className="flex flex-col flex-shrink-0 ml-1"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => step(1)}
            className="px-1.5 py-0.5 text-[10px] leading-none transition-colors hover:text-accent"
            style={btnStyle}
            tabIndex={-1}
          >
            ▲
          </button>
          <button
            onClick={() => step(-1)}
            className="px-1.5 py-0.5 text-[10px] leading-none transition-colors hover:text-accent"
            style={{ ...btnStyle, borderTop: '1px solid var(--border-subtle)' }}
            tabIndex={-1}
          >
            ▼
          </button>
        </div>
      </div>
    </FieldRow>
  )
}

/* ── TextInput ────────────────────────────────────────────── */
export function TextInput({ field, onChange }: { field: ConfigField; onChange: (v: string) => void }) {
  return (
    <FieldRow field={field}>
      <input
        type="text"
        defaultValue={String(field.value ?? '')}
        onBlur={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onChange((e.target as HTMLInputElement).value)}
        className="w-48 px-2 py-1 text-sm font-mono rounded outline-none"
        style={{
          background: 'var(--hover-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      />
    </FieldRow>
  )
}

/* ── TextArea ─────────────────────────────────────────────── */
export function TextArea({ field, onChange }: { field: ConfigField; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{field.label}</span>
      {field.description && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{field.description}</p>
      )}
      <textarea
        defaultValue={String(field.value ?? '')}
        onBlur={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-2 py-1.5 text-sm font-mono rounded outline-none resize-y"
        style={{
          background: 'var(--hover-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      />
    </div>
  )
}

/* ── Select ───────────────────────────────────────────────── */
export function Select({ field, onChange }: { field: ConfigField; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = String(field.value ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <FieldRow field={field}>
      <div
        ref={ref}
        className="relative"
        style={{ minWidth: '8rem' }}
      >
        {/* Trigger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-2 py-1 text-sm font-mono rounded"
          style={{
            background: 'var(--hover-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span>{current}</span>
          <span className="text-[10px] opacity-50">{open ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className="absolute right-0 z-50 rounded overflow-hidden"
            style={{
              top: 'calc(100% + 4px)',
              background: 'var(--panel-bg, #0e1117)',
              border: '1px solid var(--border-subtle)',
              minWidth: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {field.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className="w-full px-3 py-1.5 text-left text-sm font-mono transition-colors"
                style={{
                  background: opt === current ? 'var(--accent)' : 'transparent',
                  color: opt === current ? '#000' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (opt !== current) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={(e) => {
                  if (opt !== current) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </FieldRow>
  )
}

/* ── ChipList ─────────────────────────────────────────────── */
export function ChipList({ field, onChange }: { field: ConfigField; onChange: (v: string[]) => void }) {
  const items = Array.isArray(field.value) ? (field.value as string[]) : []
  const [draft, setDraft] = useState('')

  function add() {
    const val = draft.trim()
    if (!val || items.includes(val)) return
    onChange([...items, val])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{field.label}</span>
      {field.description && (
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{field.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => (
          <span
            key={idx}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono"
            style={{ background: 'var(--hover-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            {String(item)}
            <button
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add…"
          className="px-2 py-0.5 rounded text-xs font-mono outline-none"
          style={{
            background: 'var(--hover-surface)',
            color: 'var(--text-primary)',
            border: '1px dashed var(--border-subtle)',
            minWidth: '4rem',
          }}
        />
      </div>
    </div>
  )
}

/* ── MOTD Builder ─────────────────────────────────────────── */

const MC_COLORS: { code: string; hex: string; label: string }[] = [
  { code: '0', hex: '#000000', label: 'Black' },
  { code: '1', hex: '#0000AA', label: 'Dark Blue' },
  { code: '2', hex: '#00AA00', label: 'Dark Green' },
  { code: '3', hex: '#00AAAA', label: 'Dark Aqua' },
  { code: '4', hex: '#AA0000', label: 'Dark Red' },
  { code: '5', hex: '#AA00AA', label: 'Dark Purple' },
  { code: '6', hex: '#FFAA00', label: 'Gold' },
  { code: '7', hex: '#AAAAAA', label: 'Gray' },
  { code: '8', hex: '#555555', label: 'Dark Gray' },
  { code: '9', hex: '#5555FF', label: 'Blue' },
  { code: 'a', hex: '#55FF55', label: 'Green' },
  { code: 'b', hex: '#55FFFF', label: 'Aqua' },
  { code: 'c', hex: '#FF5555', label: 'Red' },
  { code: 'd', hex: '#FF55FF', label: 'Light Purple' },
  { code: 'e', hex: '#FFFF55', label: 'Yellow' },
  { code: 'f', hex: '#FFFFFF', label: 'White' },
]

const COLOR_MAP: Record<string, string> = Object.fromEntries(
  MC_COLORS.map(({ code, hex }) => [code, hex]),
)

const FORMAT_BUTTONS: Array<{ code: string; label: string; title: string; style?: React.CSSProperties }> = [
  { code: '§l', label: 'B', title: 'Bold',          style: { fontWeight: 'bold' } },
  { code: '§o', label: 'I', title: 'Italic',         style: { fontStyle: 'italic' } },
  { code: '§n', label: 'U', title: 'Underline',      style: { textDecoration: 'underline' } },
  { code: '§m', label: 'S', title: 'Strikethrough',  style: { textDecoration: 'line-through' } },
  { code: '§k', label: '✦', title: 'Obfuscated' },
]

interface MotdSegment {
  text: string
  color: string | null
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  obfuscated: boolean
}

function parseMotdLine(raw: string): MotdSegment[] {
  // Normalise § unicode escapes to § before parsing
  const input = raw.replace(/\\u00a7/gi, '§')
  const segments: MotdSegment[] = []
  let cur: MotdSegment = { text: '', color: null, bold: false, italic: false, underline: false, strike: false, obfuscated: false }

  let i = 0
  while (i < input.length) {
    if (input[i] === '§' && i + 1 < input.length) {
      if (cur.text) { segments.push({ ...cur }); cur = { ...cur, text: '' } }
      const c = input[i + 1].toLowerCase()
      if (COLOR_MAP[c] !== undefined) {
        cur = { text: '', color: COLOR_MAP[c], bold: false, italic: false, underline: false, strike: false, obfuscated: false }
      } else if (c === 'l') cur = { ...cur, bold: true,        text: '' }
      else if   (c === 'o') cur = { ...cur, italic: true,      text: '' }
      else if   (c === 'n') cur = { ...cur, underline: true,   text: '' }
      else if   (c === 'm') cur = { ...cur, strike: true,      text: '' }
      else if   (c === 'k') cur = { ...cur, obfuscated: true,  text: '' }
      else if   (c === 'r') cur = { text: '', color: null, bold: false, italic: false, underline: false, strike: false, obfuscated: false }
      i += 2
    } else {
      cur.text += input[i]
      i++
    }
  }
  if (cur.text) segments.push(cur)
  return segments
}

function MotdPreviewLine({ raw, placeholder }: { raw: string; placeholder?: string }) {
  const segments = parseMotdLine(raw)
  if (!segments.length) {
    return <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>{placeholder ?? ' '}</span>
  }
  return (
    <>
      {segments.map((seg, i) => {
        const decoration = [seg.underline && 'underline', seg.strike && 'line-through'].filter(Boolean).join(' ')
        return (
          <span
            key={i}
            style={{
              color: seg.color ?? 'var(--text-primary)',
              fontWeight:     seg.bold      ? 'bold'   : undefined,
              fontStyle:      seg.italic    ? 'italic' : undefined,
              textDecoration: decoration    || undefined,
              opacity:        seg.obfuscated ? 0.6      : undefined,
              letterSpacing:  seg.obfuscated ? '0.05em' : undefined,
            }}
          >
            {seg.obfuscated ? seg.text.replace(/\S/g, '?') : seg.text}
          </span>
        )
      })}
    </>
  )
}

function splitMotd(raw: string): [string, string] {
  const idx = raw.indexOf('\\n')
  if (idx === -1) return [raw, '']
  return [raw.slice(0, idx), raw.slice(idx + 2)]
}

export function MotdWidget({ field, onChange }: { field: ConfigField; onChange: (v: string) => void }) {
  const rawValue = String(field.value ?? '')
  const [expanded, setExpanded] = useState(false)

  const [l1, setL1] = useState(() => splitMotd(rawValue)[0])
  const [l2, setL2] = useState(() => splitMotd(rawValue)[1])
  const l1Ref = useRef<HTMLInputElement>(null)
  const l2Ref = useRef<HTMLInputElement>(null)
  const focusedLine = useRef<1 | 2>(1)

  // Sync when field.value changes externally (revert / file reload)
  useEffect(() => {
    const [a, b] = splitMotd(String(field.value ?? ''))
    setL1(a)
    setL2(b)
  }, [field.value])

  const emit = useCallback((a: string, b: string) => {
    onChange(b ? a + '\\n' + b : a)
  }, [onChange])

  function insertCode(code: string) {
    const isL1 = focusedLine.current === 1
    const ref  = isL1 ? l1Ref : l2Ref
    const val  = isL1 ? l1    : l2
    const set  = isL1 ? setL1 : setL2

    const input = ref.current
    const start = input?.selectionStart ?? val.length
    const end   = input?.selectionEnd   ?? start
    const next  = val.slice(0, start) + code + val.slice(end)
    set(next)
    emit(isL1 ? next : l1, isL1 ? l2 : next)

    if (input) {
      requestAnimationFrame(() => {
        input.focus()
        const pos = start + code.length
        input.setSelectionRange(pos, pos)
      })
    }
  }

  const inputClass = 'flex-1 px-2 py-1 text-sm font-mono rounded outline-none'
  const inputStyle: React.CSSProperties = {
    background: 'var(--hover-surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Always-visible collapsed row */}
      <div className="flex items-center gap-3 py-3">
        <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          {field.label}
        </span>
        <div
          className="flex-1 min-w-0 font-mono text-sm px-2 py-1 rounded truncate cursor-pointer"
          style={{ background: 'var(--hover-surface)' }}
          onClick={() => setExpanded(true)}
        >
          <MotdPreviewLine raw={l1} placeholder="A Minecraft Server" />
        </div>
        <button
          onClick={() => setExpanded(o => !o)}
          className="text-[10px] font-mono px-2 py-1 rounded flex-shrink-0 transition-colors"
          style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          {expanded ? '▲ Done' : '▼ Edit'}
        </button>
      </div>

      {field.description && !expanded && (
        <p className="text-xs pb-2" style={{ color: 'var(--text-faint)' }}>{field.description}</p>
      )}

      {/* Expanded editor */}
      {expanded && (
        <div className="pb-4 flex flex-col gap-3">

          {/* Preview */}
          <div
            className="rounded px-3 py-2 font-mono text-sm flex flex-col gap-0.5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <div><MotdPreviewLine raw={l1} placeholder="Line 1…" /></div>
            <div><MotdPreviewLine raw={l2} placeholder={l2 ? undefined : ' '} /></div>
          </div>

          {/* Color palette */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Color
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MC_COLORS.map(({ code, hex, label }) => (
                <button
                  key={code}
                  title={`${label}  §${code}`}
                  onClick={() => insertCode(`§${code}`)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0 focus:outline-none"
                  style={{
                    background: hex,
                    boxShadow: hex === '#000000' ? 'inset 0 0 0 1px rgba(255,255,255,0.2)' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Style buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
              Style
            </span>
            <div className="flex items-center gap-1.5">
              {FORMAT_BUTTONS.map(({ code, label, title, style }) => (
                <button
                  key={code}
                  title={`${title}  ${code}`}
                  onClick={() => insertCode(code)}
                  className="w-8 h-7 rounded text-xs font-mono transition-colors hover:text-accent focus:outline-none"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    background: 'transparent',
                    ...style,
                  }}
                >
                  {label}
                </button>
              ))}
              <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-subtle)' }} />
              <button
                title="Reset  §r"
                onClick={() => insertCode('§r')}
                className="px-2 h-7 rounded text-xs font-mono transition-colors hover:text-accent focus:outline-none"
                style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-faint)', background: 'transparent' }}
              >
                ↺ Reset
              </button>
            </div>
          </div>

          {/* Line inputs */}
          <div className="flex flex-col gap-2">
            {([
              { label: 'Line 1', val: l1, ref: l1Ref, set: setL1, line: 1 as const, placeholder: 'A Minecraft Server' },
              { label: 'Line 2', val: l2, ref: l2Ref, set: setL2, line: 2 as const, placeholder: 'Optional second line…' },
            ] as const).map(({ label, val, ref, set, line, placeholder }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs font-mono w-12 flex-shrink-0 text-right" style={{ color: 'var(--text-faint)' }}>
                  {label}
                </span>
                <input
                  ref={ref}
                  type="text"
                  value={val}
                  placeholder={placeholder}
                  onChange={(e) => {
                    set(e.target.value)
                    emit(line === 1 ? e.target.value : l1, line === 2 ? e.target.value : l2)
                  }}
                  onFocus={() => { focusedLine.current = line }}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  )
}
