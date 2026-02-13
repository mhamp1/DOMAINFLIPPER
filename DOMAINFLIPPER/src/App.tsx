import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import RealDashboard from './pages/RealDashboard'
import LoginGate from './components/auth/LoginGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ownerAuth } from './lib/auth/OwnerAuth'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authenticated = ownerAuth.isAuthenticated()
    setIsAuthenticated(authenticated)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary level="critical" showDetails={import.meta.env.DEV}>
      {!isAuthenticated ? (
        <LoginGate onAuthenticated={() => setIsAuthenticated(true)} />
      ) : (
        <ErrorBoundary level="page">
          <RealDashboard onLogout={() => { ownerAuth.logout(); setIsAuthenticated(false) }} />
        </ErrorBoundary>
      )}
      <Toaster 
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#000000',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#D4AF37',
          },
        }}
      />
    </ErrorBoundary>
  )
}

export default App
