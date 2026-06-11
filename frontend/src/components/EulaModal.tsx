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
    try { BrowserOpenURL(MINECRAFT_EULA_URL) } catch { /* non-Wails context */ }
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
        className="w-80 rounded-xl p-5 flex flex-col gap-4 font-mono"
        style={{ background: '#0d0e14', border: '0.5px solid rgba(251,191,36,0.25)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-yellow-400 text-sm font-bold">[!]</span>
          <span className="text-sm font-semibold text-white">EULA Required</span>
        </div>

        <p className="text-xs text-white/60 leading-relaxed">
          The Minecraft server requires you to accept the End User License Agreement before it can run.
        </p>

        <button
          onClick={openEula}
          className="text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors text-left"
        >
          Read the Minecraft EULA →
        </button>

        <div className="flex gap-2 pt-1" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 py-1.5 text-xs rounded border border-green-400/30 text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
          >
            {loading ? 'Starting…' : 'Accept & Restart'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
