import { useState, useEffect } from 'react'
import { GetBackupWorlds } from '../../../wailsjs/go/main/App'
import type { models } from '../../../wailsjs/go/models'

export type WorldSystem = models.WorldSystem

export function useBackupWorlds(serverId: string, filename: string | undefined): WorldSystem[] {
  const [worlds, setWorlds] = useState<WorldSystem[]>([])

  useEffect(() => {
    if (!filename) { setWorlds([]); return }
    let cancelled = false
    GetBackupWorlds(serverId, filename)
      .then(result => { if (!cancelled) setWorlds(result ?? []) })
      .catch(() => { if (!cancelled) setWorlds([]) })
    // Keep previous planets visible while the new ones load (no flash to empty).
    return () => { cancelled = true }
  }, [serverId, filename])

  return worlds
}
