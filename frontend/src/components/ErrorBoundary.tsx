import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-base)' }}>
          <div className="text-center font-mono p-8">
            <div className="text-red-400 text-sm mb-3">render error</div>
            <div className="text-white/40 text-xs max-w-md break-all">{this.state.error.message}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
