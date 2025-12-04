import { Toaster } from 'sonner'
import { VaultDashboard } from './pages/VaultDashboard'

function App() {
  return (
    <>
      <VaultDashboard />
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
    </>
  )
}

export default App
