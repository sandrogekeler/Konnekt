import { create } from 'zustand'
import type { ServerStatus, Player } from '../types'

interface ServerStore {
  status: ServerStatus
  players: Player[]
  setStatus: (status: ServerStatus) => void
  setPlayers: (players: Player[]) => void
}

const defaultStatus: ServerStatus = {
  running: false,
  uptime: '0s',
  players: 0,
  maxPlayers: 20,
  tps: 20,
  ramUsed: 0,
  ramTotal: 2048,
}

export const useServerStore = create<ServerStore>((set) => ({
  status: defaultStatus,
  players: [],
  setStatus: (status) => set({ status }),
  setPlayers: (players) => set({ players }),
}))
