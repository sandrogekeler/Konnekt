import { describe, it, expect } from 'vitest'
import { CHANGELOG, CHANGELOG_URL } from './changelog'

describe('CHANGELOG', () => {
  it('is non-empty', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
  })

  it('every entry has at least one highlight', () => {
    for (const entry of CHANGELOG) {
      expect(entry.highlights.length).toBeGreaterThan(0)
    }
  })

  it('is ordered strictly newest-first by date', () => {
    for (let i = 0; i < CHANGELOG.length - 1; i++) {
      const current = new Date(CHANGELOG[i].date).getTime()
      const next = new Date(CHANGELOG[i + 1].date).getTime()
      expect(current).toBeGreaterThan(next)
    }
  })
})

describe('CHANGELOG_URL', () => {
  it('is an absolute github.com URL', () => {
    expect(CHANGELOG_URL).toMatch(/^https:\/\/github\.com\//)
  })
})
