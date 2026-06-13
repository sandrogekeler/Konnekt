import { create } from 'zustand'
import { useSettingsStore } from './useSettingsStore'

export interface LogLine {
  id: number
  timestamp: string
  text: string
  level: 'success' | 'warn' | 'error' | 'dim'
}

let lineId = 0

export function classifyLine(text: string): LogLine['level'] {
  if (/Done|joined the game/.test(text)) return 'success'
  if (/warn|Can't keep up/i.test(text)) return 'warn'
  if (/error|ERROR/.test(text)) return 'error'
  return 'dim'
}

interface ConsoleStore {
  lines: LogLine[]
  appendLine: (timestamp: string, text: string) => void
  clear: () => void
}

export const useConsoleStore = create<ConsoleStore>((set) => ({
  lines: [],
  appendLine: (timestamp, text) =>
    set((s) => {
      const max = useSettingsStore.getState().settings.consoleBufferLines || 1000
      return {
        lines: [
          ...s.lines.slice(-(max - 1)),
          { id: ++lineId, timestamp, text, level: classifyLine(text) },
        ],
      }
    }),
  clear: () => set({ lines: [] }),
}))
