import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import * as runtime from '../../../wailsjs/runtime/runtime'
import { ModAboutBody } from './ModAboutBody'

vi.mock('../../../wailsjs/runtime/runtime')

describe('ModAboutBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens http(s) links in the system browser instead of navigating the webview', () => {
    const { getByText } = render(
      <ModAboutBody
        body="See the [Folia docs](https://docs.papermc.io/paper/folia) for details."
        description=""
        loading={false}
      />,
    )
    const link = getByText('Folia docs')
    const event = fireEvent.click(link)

    expect(runtime.BrowserOpenURL).toHaveBeenCalledWith('https://docs.papermc.io/paper/folia')
    // fireEvent.click returns false when preventDefault() was called.
    expect(event).toBe(false)
  })

  it('leaves in-page anchors and relative links to default browser behavior', () => {
    const { getByText } = render(
      <ModAboutBody
        body="Jump to [installation](#installation) or see [changelog](./CHANGELOG.md)."
        description=""
        loading={false}
      />,
    )

    const anchorLink = getByText('installation')
    const anchorEvent = fireEvent.click(anchorLink)
    expect(runtime.BrowserOpenURL).not.toHaveBeenCalled()
    expect(anchorEvent).toBe(true)

    const relativeLink = getByText('changelog')
    const relativeEvent = fireEvent.click(relativeLink)
    expect(runtime.BrowserOpenURL).not.toHaveBeenCalled()
    expect(relativeEvent).toBe(true)
  })

  it('swallows errors when BrowserOpenURL is unavailable (non-Wails context)', () => {
    vi.mocked(runtime.BrowserOpenURL).mockImplementation(() => {
      throw new TypeError('window.runtime is undefined')
    })
    const { getByText } = render(
      <ModAboutBody body="See [docs](https://example.com/docs)." description="" loading={false} />,
    )
    const link = getByText('docs')
    expect(() => fireEvent.click(link)).not.toThrow()
  })
})
