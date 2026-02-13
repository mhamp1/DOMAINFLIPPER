/**
 * ErrorBoundary — catches React rendering errors.
 * Prevents white-screen crashes. Shows fallback UI with retry.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  level?: 'critical' | 'page'
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.level || 'page'}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const isCritical = this.props.level === 'critical'

    return (
      <div className={`${isCritical ? 'min-h-screen' : 'min-h-[200px]'} bg-black flex items-center justify-center p-8`}>
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-zinc-200 mb-2">
            {isCritical ? 'Application Error' : 'Something went wrong'}
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            {isCritical ? 'Please refresh the page.' : 'This section failed to load.'}
          </p>
          {this.props.showDetails && this.state.error && (
            <pre className="text-xs text-red-400 bg-zinc-900 rounded p-3 text-left overflow-auto max-h-32 mb-4">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); if (isCritical) window.location.reload() }}
            className="px-4 py-2 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 text-sm"
          >
            {isCritical ? 'Reload Page' : 'Try Again'}
          </button>
        </div>
      </div>
    )
  }
}
