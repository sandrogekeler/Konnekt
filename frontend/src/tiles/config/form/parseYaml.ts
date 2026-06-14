import { parseDocument, isMap, isSeq, isScalar, isAlias } from 'yaml'
import type { ConfigField } from './inferType'
import { inferType, labelFromKey } from './inferType'

/** Returns true if the YAML uses features we can't safely round-trip in form view. */
export function yamlIsFormSafe(content: string): boolean {
  try {
    const doc = parseDocument(content, { keepSourceTokens: true })
    if (doc.errors.length > 0) return false
    // Anchors/aliases make partial edits unsafe
    if (hasAlias(doc.contents)) return false
    return true
  } catch {
    return false
  }
}

function hasAlias(node: unknown): boolean {
  if (isAlias(node)) return true
  if (isMap(node)) {
    for (const pair of node.items) {
      if (hasAlias(pair.key) || hasAlias(pair.value)) return true
    }
  }
  if (isSeq(node)) {
    for (const item of node.items) {
      if (hasAlias(item)) return true
    }
  }
  return false
}

function extractComment(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  const n = node as Record<string, unknown>
  const raw = (n.commentBefore as string | undefined) ?? (n.comment as string | undefined)
  if (!raw) return undefined
  return raw.replace(/^#\s*/gm, '').trim() || undefined
}

function yamlNodeToField(key: string, value: unknown, path: (string | number)[]): ConfigField {
  const description = extractComment(value)

  if (isMap(value)) {
    const children: ConfigField[] = []
    for (const pair of value.items) {
      if (!isScalar(pair.key)) continue
      const k = String(pair.key.value)
      children.push(yamlNodeToField(k, pair.value, [...path, k]))
    }
    return { path, label: labelFromKey(key), description, type: 'section', value: null, children }
  }

  if (isSeq(value)) {
    const items = value.items.map((item) => (isScalar(item) ? item.value : String(item)))
    return { path, label: labelFromKey(key), description, type: 'list', value: items }
  }

  if (isScalar(value)) {
    const raw = value.value
    const type = inferType(raw)
    return { path, label: labelFromKey(key), description, type, value: raw }
  }

  return { path, label: labelFromKey(key), description, type: 'string', value: String(value) }
}

export function parseYamlFields(content: string): ConfigField[] {
  const doc = parseDocument(content)
  if (!isMap(doc.contents)) return []

  const fields: ConfigField[] = []
  for (const pair of doc.contents.items) {
    if (!isScalar(pair.key)) continue
    const key = String(pair.key.value)
    fields.push(yamlNodeToField(key, pair.value, [key]))
  }
  return fields
}

/** Apply a single field edit to YAML content using the AST, returning new content. */
export function applyYamlEdit(content: string, path: (string | number)[], value: unknown): string {
  const doc = parseDocument(content)
  doc.setIn(path, value)
  return doc.toString()
}
