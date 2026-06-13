export const ACCENT_PRESETS = [
  { label: 'Green',  hex: '#4ade80' },
  { label: 'Blue',   hex: '#3b82f6' },
  { label: 'Violet', hex: '#8b5cf6' },
  { label: 'Amber',  hex: '#f59e0b' },
  { label: 'Rose',   hex: '#f43f5e' },
  { label: 'Cyan',   hex: '#22d3ee' },
]

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

let systemThemeCleanup: (() => void) | null = null

export function applyTheme(theme: string, accentHex: string): void {
  systemThemeCleanup?.()
  systemThemeCleanup = null

  const root = document.documentElement
  root.style.setProperty('--accent-rgb', hexToRgbChannels(accentHex))

  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { root.dataset.theme = mq.matches ? 'dark' : 'light' }
    apply()
    mq.addEventListener('change', apply)
    systemThemeCleanup = () => mq.removeEventListener('change', apply)
  } else {
    root.dataset.theme = theme
  }
}
