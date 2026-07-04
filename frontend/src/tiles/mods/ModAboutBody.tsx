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
    return <div className="text-text-muted animate-pulse text-xs">Loading details…</div>
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
    return <p className="text-text-muted text-xs leading-relaxed">{description}</p>
  }
  return <div className="text-text-muted text-xs">No description available.</div>
}
