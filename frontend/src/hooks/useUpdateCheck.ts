import { useEffect, useRef } from 'react'
import { CheckForUpdates, GetAppVersion } from '../../wailsjs/go/main/App'
import { emitNotification } from '../lib/notify'

// A dev build (wails dev, no ldflags override baking in a real tag) has no
// installable artifact to update to — skip the check entirely rather than
// notify about an "update" the user can't act on.
export function isDevBuild(version: string): boolean {
  return version.includes('-dev')
}

// One-shot startup check, gated by the "check for updates on startup"
// setting. Fires an info notification through the existing notifications
// pipeline (lib/notify.ts's emitNotification) if a newer GitHub release
// exists. Not a poll — runs once per mount, same shape as App.tsx's other
// one-shot startup effects (e.g. auto-start-active-server).
export function useUpdateCheck(enabled: boolean): void {
  const checked = useRef(false)

  useEffect(() => {
    if (!enabled || checked.current) return
    checked.current = true

    void (async () => {
      try {
        const version = await GetAppVersion()
        if (isDevBuild(version)) return
        const info = await CheckForUpdates()
        if (info.updateAvailable) {
          emitNotification('info', `Update available: ${info.latestVersion}`)
        }
      } catch {
        /* non-Wails context, offline, or no releases yet — silent background check */
      }
    })()
  }, [enabled])
}
