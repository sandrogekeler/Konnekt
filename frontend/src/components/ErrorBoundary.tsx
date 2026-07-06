import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-canvas flex h-screen items-center justify-center">
          <div className="p-8 text-center font-mono">
            <div className="mb-3 text-sm text-red-400">render error</div>
            <div className="max-w-md text-xs break-all text-white/40">
              {this.state.error.message}
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
