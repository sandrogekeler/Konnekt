import { create } from 'zustand'

interface Process {
  id: string
  label: string
  filename?: string
  percent: number
  status: 'running' | 'done' | 'failed'
}

interface ProcessesStore {
  processes: Record<string, Process>
  start: (id: string, label: string, filename?: string) => void
  updateProgress: (id: string, percent: number) => void
  finish: (id: string, status: 'done' | 'failed') => void
}

export const useProcessesStore = create<ProcessesStore>((set) => ({
  processes: {},
  start: (id, label, filename) =>
    set((s) => ({
      processes: { ...s.processes, [id]: { id, label, filename, percent: 0, status: 'running' } },
    })),
  updateProgress: (id, percent) =>
    set((s) => {
      const p = s.processes[id]
      if (!p || p.status !== 'running') return s
      return { processes: { ...s.processes, [id]: { ...p, percent } } }
    }),
  finish: (id, status) => {
    set((s) => {
      const p = s.processes[id]
      if (!p) return s
      return { processes: { ...s.processes, [id]: { ...p, status, percent: 100 } } }
    })
    setTimeout(() => {
      set((s) => {
        const { [id]: _removed, ...rest } = s.processes
        return { processes: rest }
      })
    }, 3000)
  },
}))
