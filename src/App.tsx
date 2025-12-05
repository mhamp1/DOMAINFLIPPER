import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EmpireDashboard from './pages/EmpireDashboard'
import SetupWizard from './components/setup/SetupWizard'
import LoginGate from './components/auth/LoginGate'
import { ownerAuth } from './lib/auth/OwnerAuth'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication first
    const authenticated = ownerAuth.isAuthenticated()
    setIsAuthenticated(authenticated)
    
    if (authenticated) {
      // Check if setup has been completed
      const setupComplete = localStorage.getItem('domainFlipper_setupComplete')
      const hasCredentials = localStorage.getItem('domainFlipper_credentials')
      
      // Show wizard if setup not complete and no credentials
      if (!setupComplete && !hasCredentials) {
        setShowSetupWizard(true)
      }
    }
    
    setIsLoading(false)
  }, [])

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
    
    // Check setup status after authentication
    const setupComplete = localStorage.getItem('domainFlipper_setupComplete')
    const hasCredentials = localStorage.getItem('domainFlipper_credentials')
    
    if (!setupComplete && !hasCredentials) {
      setShowSetupWizard(true)
    }
  }

  const handleSetupComplete = () => {
    setShowSetupWizard(false)
  }

  const handleSkipSetup = () => {
    localStorage.setItem('domainFlipper_setupComplete', 'skipped')
    setShowSetupWizard(false)
  }

  // Show loading state briefly
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      {!isAuthenticated ? (
        <LoginGate onAuthenticated={handleAuthenticated} />
      ) : showSetupWizard ? (
        <SetupWizard 
          onComplete={handleSetupComplete} 
          onSkip={handleSkipSetup}
        />
      ) : (
        <EmpireDashboard />
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
    </QueryClientProvider>
  )
}

export default App
