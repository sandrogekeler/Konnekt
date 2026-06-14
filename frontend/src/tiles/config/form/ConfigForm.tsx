import { useState } from 'react'
import type { ConfigField } from './inferType'
import { parsePropertiesFields, applyPropertyEdit } from './parseProperties'
import { parseYamlFields, applyYamlEdit } from './parseYaml'
import { Toggle, NumberInput, TextInput, TextArea, Select, ChipList, MotdWidget } from './widgets'

interface Props {
  format: string
  content: string
  onChange: (newContent: string) => void
}

function Field({
  field,
  onEdit,
}: {
  field: ConfigField
  onEdit: (path: (string | number)[], value: unknown) => void
}) {
  const [open, setOpen] = useState(true)

  if (field.type === 'section') {
    return (
      <div className="mb-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 py-2 text-left"
        >
          <span
            className="text-[10px] transition-transform"
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : undefined }}
          >
            ▶
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            {field.label}
          </span>
        </button>

        {open && (
          <div className="pl-2">
            {field.children?.map((child, i) => (
              <Field key={i} field={child} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    )
  }

  function edit(value: unknown) {
    onEdit(field.path, value)
  }

  if (field.type === 'boolean') return <Toggle field={field} onChange={edit} />
  if (field.type === 'number') return <NumberInput field={field} onChange={(v) => edit(v)} />
  if (field.type === 'enum') return <Select field={field} onChange={edit} />
  if (field.type === 'list') return <ChipList field={field} onChange={edit} />
  if (field.type === 'text') return <TextArea field={field} onChange={edit} />
  if (field.type === 'motd') return <MotdWidget field={field} onChange={(v) => edit(v)} />
  return <TextInput field={field} onChange={edit} />
}

export function ConfigForm({ format, content, onChange }: Props) {
  const isProperties = format === 'properties'

  let fields: ConfigField[] = []
  try {
    if (isProperties) fields = parsePropertiesFields(content)
    else if (format === 'yaml') fields = parseYamlFields(content)
  } catch {
    // leave fields empty; form shows "No fields detected"
  }

  function handleEdit(path: (string | number)[], value: unknown) {
    try {
      let newContent: string
      if (isProperties) {
        // path[0] is the key for properties
        newContent = applyPropertyEdit(content, String(path[0]), value)
      } else {
        newContent = applyYamlEdit(content, path, value)
      }
      onChange(newContent)
    } catch (e) {
      console.error('Config edit failed', e)
    }
  }

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
          No fields detected
        </span>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      {fields.map((f, i) => (
        <Field key={i} field={f} onEdit={handleEdit} />
      ))}
    </div>
  )
}
