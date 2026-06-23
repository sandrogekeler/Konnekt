import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Props {
  body: string
  description: string
  loading: boolean
}

export function ModAboutBody({ body, description, loading }: Props) {
  if (loading && !body) {
    return <div className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading details…</div>
  }
  if (body) {
    return (
      <div className="mod-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {body}
        </ReactMarkdown>
      </div>
    )
  }
  if (description) {
    return <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
  }
  return <div className="text-xs" style={{ color: 'var(--text-muted)' }}>No description available.</div>
}
