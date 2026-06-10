import type { FC } from 'react'
export type { LayoutItem } from 'react-grid-layout'

export interface TileProps {
  serverId: string
}

export interface TileDefinition {
  id: string
  label: string
  icon: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  component: FC<TileProps>
}

export interface LayoutPreset {
  name: string
  layout: string
}

export interface Player {
  name: string
  ping: number
}

export interface ServerStatus {
  running: boolean
  uptime: string
  players: number
  maxPlayers: number
  tps: number
  ramUsed: number
  ramTotal: number
}
