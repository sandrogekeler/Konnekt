import { useEffect, useState, useCallback } from 'react'
import { EventsOn } from '../../../wailsjs/runtime/runtime'
import {
  ListBackups, CreateBackup, RestoreBackup, DeleteBackup,
  UpdateBackupMeta, OpenBackupDir,
} from '../../../wailsjs/go/main/App'
import type { models } from '../../../wailsjs/go/models'
import { EVENTS } from '../../lib/constants'

export type Backup = models.Backup

interface BackupsState {
  backups: Backup[]
  loading: boolean
  listError: string | null
  creating: boolean
  actionError: string | null
  refresh: () => Promise<void>
  create: () => Promise<void>
  restore: (filename: string) => Promise<void>
  remove: (filename: string) => Promise<void>
  updateMeta: (filename: string, displayName: string, tags: string[]) => Promise<void>
  openDir: () => Promise<void>
}

export function useBackups(serverId: string): BackupsState {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const result = await ListBackups(serverId)
      setBackups((result as Backup[]) ?? [])
    } catch (e) {
      setListError(String(e))
    } finally {
      setLoading(false)
    }
  }, [serverId])

  const create = useCallback(async () => {
    setCreating(true)
    setActionError(null)
    try {
      await CreateBackup(serverId)
      await refresh()
    } catch (e) {
      setActionError(String(e))
    } finally {
      setCreating(false)
    }
  }, [serverId, refresh])

  const restore = useCallback(async (filename: string) => {
    setActionError(null)
    try {
      await RestoreBackup(serverId, filename)
    } catch (e) {
      setActionError(String(e))
    }
  }, [serverId])

  const remove = useCallback(async (filename: string) => {
    setActionError(null)
    try {
      await DeleteBackup(serverId, filename)
      await refresh()
    } catch (e) {
      setActionError(String(e))
    }
  }, [serverId, refresh])

  const updateMeta = useCallback(async (filename: string, displayName: string, tags: string[]) => {
    setActionError(null)
    try {
      const updated = await UpdateBackupMeta(serverId, filename, displayName, tags) as Backup
      setBackups((prev) => prev.map((b) => b.filename === filename ? updated : b))
    } catch (e) {
      setActionError(String(e))
    }
  }, [serverId])

  const openDir = useCallback(async () => {
    try {
      await OpenBackupDir(serverId)
    } catch (e) {
      setActionError(String(e))
    }
  }, [serverId])

  useEffect(() => {
    refresh()

    // Poll every 10 s so the list stays fresh across mount/unmount cycles
    // (compact ↔ maximized transitions create a new hook instance each time).
    const pollTimer = setInterval(refresh, 10_000)

    let c1: (() => void) | undefined
    let c2: (() => void) | undefined
    let c3: (() => void) | undefined
    try {
      // Refresh list on backup/restore events. Notifications live in App.tsx
      // to avoid duplicates from React 18 Strict Mode double-effect runs.
      c1 = EventsOn(EVENTS.BACKUP_COMPLETED,  () => { refresh() })
      c2 = EventsOn(EVENTS.RESTORE_COMPLETED, () => { refresh() })
      c3 = EventsOn(EVENTS.BACKUP_FAILED,     () => { refresh() })
    } catch { /* Wails runtime unavailable in dev without backend */ }

    return () => {
      clearInterval(pollTimer)
      c1?.()
      c2?.()
      c3?.()
    }
  }, [serverId])

  return { backups, loading, listError, creating, actionError, refresh, create, restore, remove, updateMeta, openDir }
}
