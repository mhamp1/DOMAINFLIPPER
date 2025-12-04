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
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#ffffff',
          },
        }}
      />
    </>
  )
}

export default App
