import { describe, it, expect } from 'vitest'
import { CHANGELOG, CHANGELOG_URL, groupByDate } from './changelog'
import type { ChangelogEntry } from './changelog'

describe('CHANGELOG', () => {
  it('is non-empty', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0)
  })

  it('every entry has at least one highlight', () => {
    for (const entry of CHANGELOG) {
      expect(entry.highlights.length).toBeGreaterThan(0)
    }
  })

  it('is ordered newest-first by date (ties allowed, groupByDate covers those)', () => {
    for (let i = 0; i < CHANGELOG.length - 1; i++) {
      const current = new Date(CHANGELOG[i].date).getTime()
      const next = new Date(CHANGELOG[i + 1].date).getTime()
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })

  it('no label carries a hardcoded stage prefix like "Alpha —"', () => {
    for (const entry of CHANGELOG) {
      expect(entry.label).not.toMatch(/^(alpha|beta)\s*[—-]/i)
    }
  })
})

describe('CHANGELOG_URL', () => {
  it('is an absolute github.com URL', () => {
    expect(CHANGELOG_URL).toMatch(/^https:\/\/github\.com\//)
  })
})

describe('groupByDate', () => {
  const entry = (over: Partial<ChangelogEntry>): ChangelogEntry => ({
    label: 'Untitled',
    date: '2026-01-01',
    highlights: ['did a thing'],
    ...over,
  })

  it('passes through entries with distinct dates unchanged', () => {
    const input = [
      entry({ label: 'Newer', date: '2026-01-02', highlights: ['a'] }),
      entry({ label: 'Older', date: '2026-01-01', highlights: ['b'] }),
    ]
    expect(groupByDate(input)).toEqual(input)
  })

  it('merges same-date entries into one, keeping the first-seen label', () => {
    const input = [
      entry({ label: 'Shipped today', date: '2026-07-16', highlights: ['feature A'] }),
      entry({ label: 'Also today', date: '2026-07-16', highlights: ['feature B'] }),
    ]
    const result = groupByDate(input)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Shipped today')
    expect(result[0].date).toBe('2026-07-16')
    expect(result[0].highlights).toEqual(['feature A', 'feature B'])
  })

  it('concatenates minor changes across merged entries, tolerating missing minor', () => {
    const input = [
      entry({ date: '2026-07-16', highlights: ['a'], minor: ['tweak 1'] }),
      entry({ date: '2026-07-16', highlights: ['b'] }),
      entry({ date: '2026-07-16', highlights: ['c'], minor: ['tweak 2', 'tweak 3'] }),
    ]
    const result = groupByDate(input)
    expect(result).toHaveLength(1)
    expect(result[0].minor).toEqual(['tweak 1', 'tweak 2', 'tweak 3'])
  })

  it('preserves newest-first order across a mix of unique and duplicate dates', () => {
    const input = [
      entry({ label: 'Day 3', date: '2026-07-16', highlights: ['x'] }),
      entry({ label: 'Day 2 first', date: '2026-07-15', highlights: ['y'] }),
      entry({ label: 'Day 2 second', date: '2026-07-15', highlights: ['z'] }),
      entry({ label: 'Day 1', date: '2026-07-14', highlights: ['w'] }),
    ]
    const result = groupByDate(input)
    expect(result.map((e) => e.date)).toEqual(['2026-07-16', '2026-07-15', '2026-07-14'])
    expect(result[1].label).toBe('Day 2 first')
    expect(result[1].highlights).toEqual(['y', 'z'])
  })

  it('does not mutate the input entries', () => {
    const original = entry({ date: '2026-07-16', highlights: ['a'], minor: ['m'] })
    const input = [original, entry({ date: '2026-07-16', highlights: ['b'], minor: ['n'] })]
    groupByDate(input)
    expect(original.highlights).toEqual(['a'])
    expect(original.minor).toEqual(['m'])
  })

  it('running CHANGELOG itself through groupByDate never grows the entry count', () => {
    expect(groupByDate(CHANGELOG).length).toBeLessThanOrEqual(CHANGELOG.length)
  })
})
