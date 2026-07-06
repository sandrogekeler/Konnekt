import { useState } from 'react'
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'
import { AcceptEula, StartServer } from '../../wailsjs/go/main/App'

const MINECRAFT_EULA_URL = 'https://aka.ms/MinecraftEULA'

interface Props {
  serverId: string
  onClose: () => void
}

export function EulaModal({ serverId, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const openEula = () => {
    try {
      BrowserOpenURL(MINECRAFT_EULA_URL)
    } catch {
      /* non-Wails context */
    }
  }

  const handleAccept = async () => {
    setLoading(true)
    try {
      await AcceptEula(serverId)
      await StartServer(serverId)
    } catch (err) {
      console.error('Failed to accept EULA or restart server:', err)
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="flex w-80 flex-col gap-4 rounded-xl p-5 font-mono"
        style={{
          background: 'var(--bg-base)',
          border: '0.5px solid rgba(251,191,36,0.25)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-yellow-400">[!]</span>
          <span
            className="font-title text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            EULA Required
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The Minecraft server requires you to accept the End User License Agreement before it can
          run.
        </p>

        <button
          onClick={openEula}
          className="text-left text-xs text-yellow-400/70 transition-colors hover:text-yellow-400"
        >
          Read the Minecraft EULA →
        </button>

        <div className="flex gap-2 pt-1" style={{ borderTop: '0.5px solid var(--border-subtle)' }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded py-1.5 text-xs transition-colors disabled:opacity-40"
            style={{
              border: '0.5px solid rgb(var(--accent-rgb) / 0.3)',
              color: 'var(--accent)',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'rgb(var(--accent-rgb) / 0.1)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {loading ? 'Starting…' : 'Accept & Restart'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs transition-colors disabled:opacity-40"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-faint)'
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
