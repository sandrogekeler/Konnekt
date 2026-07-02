import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationsStore } from './useNotificationsStore'

describe('useNotificationsStore', () => {
  beforeEach(() => {
    useNotificationsStore.setState({ items: [] })
  })

  it('push appends an item with the given kind and text', () => {
    useNotificationsStore.getState().push('info', 'hello')
    const items = useNotificationsStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'info', text: 'hello' })
  })

  it('caps the buffer at 200 items, keeping the newest', () => {
    for (let i = 0; i < 205; i++) {
      useNotificationsStore.getState().push('info', `msg ${i}`)
    }
    const items = useNotificationsStore.getState().items
    expect(items.length).toBe(200)
    expect(items[0].text).toBe('msg 5')
    expect(items[items.length - 1].text).toBe('msg 204')
  })

  it('clear empties the buffer', () => {
    useNotificationsStore.getState().push('warn', 'careful')
    useNotificationsStore.getState().clear()
    expect(useNotificationsStore.getState().items).toEqual([])
  })
})
