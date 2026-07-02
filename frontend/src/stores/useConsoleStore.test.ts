import { describe, it, expect, beforeEach } from 'vitest'
import { classifyLine, useConsoleStore } from './useConsoleStore'

describe('classifyLine', () => {
  it('reads level from the log4j-style prefix', () => {
    expect(classifyLine('[12:00:00] [Server thread/ERROR]: boom')).toBe('error')
    expect(classifyLine('[12:00:00] [Server thread/FATAL]: boom')).toBe('error')
    expect(classifyLine('[12:00:00] [Server thread/WARN]: careful')).toBe('warn')
    expect(classifyLine('[12:00:00] [Server thread/DEBUG]: noise')).toBe('dim')
  })

  it('flags success special-cases even under an INFO prefix', () => {
    expect(classifyLine('[12:00:00] [Server thread/INFO]: Done (1.2s)!')).toBe('success')
    expect(classifyLine('[12:00:00] [Server thread/INFO]: Steve joined the game')).toBe('success')
  })

  it('defaults an unremarkable INFO line to dim', () => {
    expect(classifyLine('[12:00:00] [Server thread/INFO]: Saving world')).toBe('dim')
  })

  it('falls back to substring heuristics for unstructured lines', () => {
    expect(classifyLine('Done (1.2s)!')).toBe('success')
    expect(classifyLine("Can't keep up! Is the server overloaded?")).toBe('warn')
    expect(classifyLine('java.lang.RuntimeException: ERROR at line 4')).toBe('error')
    expect(classifyLine('some unstructured plugin chatter')).toBe('dim')
  })
})

describe('useConsoleStore buffer capping', () => {
  beforeEach(() => {
    useConsoleStore.setState({ lines: [] })
  })

  it('appendLine never exceeds the default 1000-line cap', () => {
    for (let i = 0; i < 1005; i++) {
      useConsoleStore.getState().appendLine('12:00:00', `line ${i}`)
    }
    const lines = useConsoleStore.getState().lines
    expect(lines.length).toBe(1000)
    // the oldest 5 lines should have been evicted, keeping the tail
    expect(lines[0].text).toBe('line 5')
    expect(lines[lines.length - 1].text).toBe('line 1004')
  })

  it('batchAppend trims a single oversized batch down to the cap', () => {
    const incoming = Array.from({ length: 1200 }, (_, i) => ({
      timestamp: '12:00:00',
      line: `batch ${i}`,
    }))
    useConsoleStore.getState().batchAppend(incoming)
    const lines = useConsoleStore.getState().lines
    expect(lines.length).toBe(1000)
    expect(lines[0].text).toBe('batch 200')
    expect(lines[lines.length - 1].text).toBe('batch 1199')
  })

  it('batchAppend is a no-op for an empty batch', () => {
    useConsoleStore.getState().appendLine('12:00:00', 'existing')
    useConsoleStore.getState().batchAppend([])
    expect(useConsoleStore.getState().lines.length).toBe(1)
  })

  it('clear empties the buffer', () => {
    useConsoleStore.getState().appendLine('12:00:00', 'line')
    useConsoleStore.getState().clear()
    expect(useConsoleStore.getState().lines).toEqual([])
  })
})
