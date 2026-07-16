import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { Collapsible } from './Collapsible'

function outerOf(container: HTMLElement) {
  return container.querySelector('.ui-collapsible') as HTMLElement
}

function mockScrollHeight(container: HTMLElement, height: number) {
  const inner = outerOf(container).firstElementChild as HTMLElement
  Object.defineProperty(inner, 'scrollHeight', { configurable: true, value: height })
}

describe('Collapsible', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts fully collapsed when closed', () => {
    const { container } = render(
      <Collapsible open={false}>
        <div>content</div>
      </Collapsible>,
    )
    expect(outerOf(container).style.maxHeight).toBe('0px')
  })

  it('mounting already-open releases to uncapped after measuring', () => {
    const { container } = render(
      <Collapsible open={true}>
        <div>content</div>
      </Collapsible>,
    )
    // The mount effect re-measures immediately (clamped to the measured
    // height, 0 by default in jsdom) before releasing to `none`.
    expect(outerOf(container).style.maxHeight).toBe('0px')
    act(() => {
      vi.advanceTimersByTime(280)
    })
    expect(outerOf(container).style.maxHeight).toBe('none')
  })

  it('animates to the measured height then releases to none so growing children are not re-clipped', () => {
    const { container, rerender } = render(
      <Collapsible open={false}>
        <div>content</div>
      </Collapsible>,
    )
    mockScrollHeight(container, 240)

    act(() => {
      rerender(
        <Collapsible open={true}>
          <div>content</div>
        </Collapsible>,
      )
    })
    // Immediately after opening: clamped to the measured height (animatable),
    // not jumped straight to `none` (which wouldn't animate).
    expect(outerOf(container).style.maxHeight).toBe('240px')

    act(() => {
      vi.advanceTimersByTime(280)
    })
    expect(outerOf(container).style.maxHeight).toBe('none')
  })

  it('re-clamps to the measured height and animates back to 0 when closed', () => {
    const { container, rerender } = render(
      <Collapsible open={true}>
        <div>content</div>
      </Collapsible>,
    )
    mockScrollHeight(container, 180)

    act(() => {
      rerender(
        <Collapsible open={false}>
          <div>content</div>
        </Collapsible>,
      )
    })
    // Clamped to the measured height first (forces a reflow frame at a real
    // height instead of jumping straight from `none`, so the collapse animates).
    expect(outerOf(container).style.maxHeight).toBe('180px')

    act(() => {
      vi.runAllTimers()
    })
    expect(outerOf(container).style.maxHeight).toBe('0px')
  })

  it('merges a caller-provided className alongside the base classes', () => {
    const { container } = render(
      <Collapsible open={false} className="pl-2">
        <div>content</div>
      </Collapsible>,
    )
    expect(outerOf(container).className).toContain('pl-2')
    expect(outerOf(container).className).toContain('overflow-hidden')
  })
})
