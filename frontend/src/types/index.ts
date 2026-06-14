import type { FC } from 'react'
export type { LayoutItem } from 'react-grid-layout'

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  accentColor: string
  autoStartActiveServer: boolean
  confirmBeforeStop: boolean
  consoleBufferLines: number
  consoleTimestamps: boolean
  notifyOnCrash: boolean
  notifyOnJoin: boolean
}

export interface TileProps {
  serverId: string
  maximized?: boolean
}

export interface TileDefinition {
  id: string
  label: string
  icon: string
  defaultW: number
  defaultH: number
  minW: number
  minH: number
  maximizable?: boolean
  component: FC<TileProps>
}

export interface LayoutPreset {
  name: string
  layout: string
}

export interface ServerConfig {
  id: string
  name: string
  jarPath: string
  jvmArgs: string[]
  workingDir: string
}

export interface Player {
  name: string
  uuid: string
  online: boolean
  ip: string
  lastOnline: number
  opLevel: number
  whitelisted: boolean
  banned: boolean
  banReason: string
  primaryGroup: string
  groups: string[]
}

export interface ConfigFile {
  relPath: string
  name: string
  category: 'server' | 'plugins' | 'mods'
  source: string
  format: 'properties' | 'yaml' | 'json' | 'json5' | 'toml' | 'text'
  sizeBytes: number
  modified: number
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
