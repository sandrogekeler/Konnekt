import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime'

interface Props {
  body: string
  description: string
  loading: boolean
}

type AnchorProps = ComponentPropsWithoutRef<'a'>

function MarkdownLink({ href, children, ...rest }: AnchorProps) {
  const external = !!href && /^https?:\/\//i.test(href)
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        if (!external) return
        e.preventDefault()
        try {
          BrowserOpenURL(href!)
        } catch {
          /* non-Wails context (e.g. pnpm dev preview) */
        }
      }}
    >
      {children}
    </a>
  )
}

export function ModAboutBody({ body, description, loading }: Props) {
  if (loading && !body) {
    return <div className="text-text-muted animate-pulse text-xs">Loading details…</div>
  }
  if (body) {
    return (
      <div className="mod-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{ a: MarkdownLink }}
        >
          {body}
        </ReactMarkdown>
      </div>
    )
  }
  if (description) {
    return <p className="text-text-muted text-xs leading-relaxed">{description}</p>
  }
  return <div className="text-text-muted text-xs">No description available.</div>
}
