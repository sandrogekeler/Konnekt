import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1000)
    return () => clearTimeout(t)
  }, [])
  if (done) return null
  return (
    <div className="splash-overlay" aria-hidden="true">
      <span className="splash-word">Konnekt</span>
    </div>
  )
}
