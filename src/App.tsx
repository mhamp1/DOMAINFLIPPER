import { Toaster } from 'sonner'
import PersonalVault from './pages/PersonalVault'

function App() {
  return (
    <>
      <PersonalVault />
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
