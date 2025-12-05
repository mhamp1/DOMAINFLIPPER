/**
 * ErrorBoundary.tsx - Production-Grade Error Handling
 * Catches React errors, displays recovery UI, logs to system
 * December 2025
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { WarningOctagon, ArrowClockwise, Bug, House, Warning } from '@phosphor-icons/react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// ==================== TYPES ====================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  level?: 'page' | 'component' | 'critical'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

// ==================== ERROR BOUNDARY COMPONENT ====================

/**
 * Production-grade Error Boundary
 * - Catches React rendering errors
 * - Logs to system logger
 * - Provides recovery options
 * - Shows appropriate UI based on severity
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to our system
    logger.critical('ERROR_BOUNDARY', error.message, error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    })

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you might send to an error tracking service
    // sendToErrorTracking(error, errorInfo, this.state.errorId)
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  handleRefresh = (): void => {
    window.location.reload()
  }

  handleCopyError = (): void => {
    const { error, errorInfo, errorId } = this.state
    const errorText = `
Error ID: ${errorId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim()

    navigator.clipboard.writeText(errorText)
    logger.info('ERROR_BOUNDARY', 'Error details copied to clipboard')
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, errorId } = this.state
    const { children, fallback, showDetails = false, level = 'component' } = this.props

    if (!hasError) {
      return children
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback
    }

    // Critical level - full page error
    if (level === 'critical' || level === 'page') {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 bg-black/80 border border-red-500/30 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-red-500/20">
                <WarningOctagon size={32} weight="fill" className="text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-500">Something Went Wrong</h1>
                <p className="text-yellow-600/70 text-sm">Error ID: {errorId}</p>
              </div>
            </div>

            <p className="text-yellow-600/80">
              The empire encountered an unexpected error. Your data is safe, and our system has logged this issue.
            </p>

            {showDetails && error && (
              <div className="bg-black/50 border border-red-500/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
                  <Bug size={16} />
                  {error.message}
                </div>
                {errorInfo?.componentStack && (
                  <pre className="text-xs text-yellow-600/50 overflow-auto max-h-32 font-mono">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-semibold"
              >
                <ArrowClockwise size={20} className="mr-2" />
                Try Again
              </Button>
              <Button
                onClick={this.handleRefresh}
                variant="outline"
                className="flex-1 border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10"
              >
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10"
              >
                <House size={20} className="mr-2" />
                Go Home
              </Button>
            </div>

            <button
              onClick={this.handleCopyError}
              className="text-sm text-yellow-600/50 hover:text-yellow-600 underline w-full text-center"
            >
              Copy error details for support
            </button>
          </Card>
        </div>
      )
    }

    // Component level - inline error
    return (
      <div className="p-4 border border-red-500/30 rounded-lg bg-red-500/5">
        <div className="flex items-center gap-3">
          <Warning size={24} className="text-red-500" />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Component Error</p>
            <p className="text-yellow-600/60 text-sm">{error?.message || 'An unexpected error occurred'}</p>
          </div>
          <Button
            onClick={this.handleRetry}
            size="sm"
            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-600"
          >
            <ArrowClockwise size={16} className="mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }
}

// ==================== HOC FOR EASY WRAPPING ====================

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

  return ComponentWithErrorBoundary
}

// ==================== HOOK FOR FUNCTIONAL COMPONENTS ====================

/**
 * Hook to manually trigger error boundary
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null)

  return React.useCallback((error: Error) => {
    logger.error('USE_ERROR_HANDLER', error.message, error)
    setError(() => {
      throw error
    })
  }, [])
}

// ==================== ERROR RECOVERY COMPONENT ====================

interface ErrorRecoveryProps {
  error: Error
  resetError: () => void
  context?: string
}

/**
 * Reusable error recovery UI component
 */
export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({ error, resetError, context }) => (
  <div className="p-6 border border-red-500/30 rounded-lg bg-black/50 space-y-4">
    <div className="flex items-center gap-3">
      <WarningOctagon size={28} weight="fill" className="text-red-500" />
      <div>
        <h3 className="text-lg font-semibold text-red-400">
          {context ? `Error in ${context}` : 'Something went wrong'}
        </h3>
        <p className="text-yellow-600/60 text-sm">{error.message}</p>
      </div>
    </div>

    <div className="flex gap-3">
      <Button
        onClick={resetError}
        className="bg-yellow-600 hover:bg-yellow-500 text-black"
      >
        <ArrowClockwise size={18} className="mr-2" />
        Try Again
      </Button>
      <Button
        onClick={() => window.location.reload()}
        variant="outline"
        className="border-yellow-600/30 text-yellow-600"
      >
        Refresh Page
      </Button>
    </div>
  </div>
)

export default ErrorBoundary

