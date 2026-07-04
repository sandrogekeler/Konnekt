import type { models } from '../../../../wailsjs/go/models'

export type ConcreteType = 'string' | 'number' | 'bool'
export type ResolvedType = ConcreteType | 'unresolved'

// Two config.type vocabularies exist across blocks (Read-Attribute uses lowercase
// data-port names, Constant uses capitalized display names) — both normalize here.
const TYPE_ALIASES: Record<string, ConcreteType> = {
  string: 'string',
  String: 'string',
  number: 'number',
  Float: 'number',
  Integer: 'number',
  bool: 'bool',
  Boolean: 'bool',
}

export function normalizeType(raw: string | undefined): ResolvedType {
  if (!raw) return 'unresolved'
  return TYPE_ALIASES[raw] ?? 'unresolved'
}

// Resolves a block's declared data-port type to a concrete type, following the
// port's "auto" indirection (Read-Attribute, Constant) through the node's own
// config.type field — the same field BlockNode.tsx reads for port coloring.
export function resolveDataPortType(
  def: models.BlockDef | undefined,
  portId: string,
  side: 'input' | 'output',
  config: Record<string, unknown> | undefined,
): ResolvedType {
  const port = (side === 'input' ? def?.dataInputs : def?.dataOutputs)?.find((p) => p.id === portId)
  if (!port) return 'unresolved'
  if (port.type === 'auto') {
    return normalizeType(config?.type as string | undefined)
  }
  return normalizeType(port.type)
}

// Compatibility matrix for wiring a data output into a data input.
// Unresolved on either side can't be proven incompatible, so it's allowed —
// this only blocks connections we can positively show would coerce/fail at
// runtime (string->number, string->bool, number->bool).
export function portTypesCompatible(src: ResolvedType, tgt: ResolvedType): boolean {
  if (src === 'unresolved' || tgt === 'unresolved') return true
  if (src === tgt) return true
  if (tgt === 'string') return true
  if (src === 'bool' && tgt === 'number') return true
  return false
}
