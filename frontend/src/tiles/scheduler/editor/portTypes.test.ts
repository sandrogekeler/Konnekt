import { describe, it, expect } from 'vitest'
import type { models } from '../../../../wailsjs/go/models'
import { normalizeType, resolveDataPortType, portTypesCompatible } from './portTypes'

// Wails model classes carry a `convertValues` method we don't need for these
// pure-logic tests, so cast via `unknown` — same pattern as graphMapping.ts's
// flowToGraph, which serializes plain objects across the (mocked-out) IPC boundary.
function def(
  dataOutputs: models.DataPort[] = [],
  dataInputs: models.DataPort[] = [],
): models.BlockDef {
  return {
    id: 'test.block',
    category: 'data',
    label: 'Test',
    description: '',
    isTrigger: false,
    controlInputs: [],
    controlOutputs: [],
    dataInputs,
    dataOutputs,
    configSchema: [],
    source: 'native',
  } as unknown as models.BlockDef
}

function port(id: string, type: string): models.DataPort {
  return { id, label: id, type } as unknown as models.DataPort
}

describe('normalizeType', () => {
  it('normalizes both the lowercase and capitalized vocabularies', () => {
    expect(normalizeType('string')).toBe('string')
    expect(normalizeType('String')).toBe('string')
    expect(normalizeType('number')).toBe('number')
    expect(normalizeType('Float')).toBe('number')
    expect(normalizeType('Integer')).toBe('number')
    expect(normalizeType('bool')).toBe('bool')
    expect(normalizeType('Boolean')).toBe('bool')
  })

  it('treats missing or unrecognized values as unresolved', () => {
    expect(normalizeType(undefined)).toBe('unresolved')
    expect(normalizeType('auto')).toBe('unresolved')
    expect(normalizeType('something-else')).toBe('unresolved')
  })
})

describe('resolveDataPortType', () => {
  it('resolves a concretely-typed port directly', () => {
    const d = def([port('value', 'number')])
    expect(resolveDataPortType(d, 'value', 'output', undefined)).toBe('number')
  })

  it('resolves an "auto" output port from config.type (Read-Attribute vocabulary)', () => {
    const d = def([port('value', 'auto')])
    expect(resolveDataPortType(d, 'value', 'output', { type: 'number' })).toBe('number')
    expect(resolveDataPortType(d, 'value', 'output', { type: 'bool' })).toBe('bool')
  })

  it('resolves an "auto" output port from config.type (Constant vocabulary)', () => {
    const d = def([port('value', 'auto')])
    expect(resolveDataPortType(d, 'value', 'output', { type: 'Integer' })).toBe('number')
    expect(resolveDataPortType(d, 'value', 'output', { type: 'Boolean' })).toBe('bool')
  })

  it('is unresolved when config.type is missing or "auto"', () => {
    const d = def([port('value', 'auto')])
    expect(resolveDataPortType(d, 'value', 'output', undefined)).toBe('unresolved')
    expect(resolveDataPortType(d, 'value', 'output', { type: 'auto' })).toBe('unresolved')
  })

  it('is unresolved when the def or port cannot be found', () => {
    expect(resolveDataPortType(undefined, 'value', 'output', undefined)).toBe('unresolved')
    expect(resolveDataPortType(def(), 'missing', 'output', undefined)).toBe('unresolved')
  })

  it('reads dataInputs for the input side', () => {
    const d = def([], [port('value', 'string')])
    expect(resolveDataPortType(d, 'value', 'input', undefined)).toBe('string')
  })
})

describe('portTypesCompatible', () => {
  it('allows an exact match', () => {
    expect(portTypesCompatible('string', 'string')).toBe(true)
    expect(portTypesCompatible('number', 'number')).toBe(true)
  })

  it('allows anything into a string input', () => {
    expect(portTypesCompatible('number', 'string')).toBe(true)
    expect(portTypesCompatible('bool', 'string')).toBe(true)
  })

  it('allows bool into number (0/1)', () => {
    expect(portTypesCompatible('bool', 'number')).toBe(true)
  })

  it('blocks the silent-coercion cases', () => {
    expect(portTypesCompatible('string', 'number')).toBe(false)
    expect(portTypesCompatible('string', 'bool')).toBe(false)
    expect(portTypesCompatible('number', 'bool')).toBe(false)
  })

  it('allows anything when either side is unresolved', () => {
    expect(portTypesCompatible('unresolved', 'number')).toBe(true)
    expect(portTypesCompatible('string', 'unresolved')).toBe(true)
  })
})
