// Warms the heavy lazy-loaded tile chunks (three.js worlds scene, recharts)
// during browser idle time so the first tile open doesn't pay a cold
// fetch+eval cost. Mirrors the dynamic import specifiers used by the
// `lazy()` declarations in tiles/worlds and tiles/performance so Vite
// resolves them to the same chunks.

let started = false

function warm(): void {
  import('../tiles/worlds/scene/WorldsScene').catch(() => {})
  import('../tiles/performance/charts').catch(() => {})
}

export function prefetchHeavyChunks(): void {
  if (started) return
  started = true

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(warm, { timeout: 3000 })
  } else {
    setTimeout(warm, 2000)
  }
}
