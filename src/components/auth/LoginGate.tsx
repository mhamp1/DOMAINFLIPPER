/**
 * LoginGate.tsx — OWNER-ONLY ACCESS GATE
 * Protects the empire from unauthorized access
 * December 2025
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Key, Eye, EyeSlash, Shield, Lock } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ownerAuth } from '@/lib/auth/OwnerAuth'

interface LoginGateProps {
  onAuthenticated: () => void
}

export default function LoginGate({ onAuthenticated }: LoginGateProps) {
  const [username, setUsername] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const success = await ownerAuth.login(username, masterKey)
      
      if (success) {
        onAuthenticated()
      } else {
        setError('Invalid credentials. Access denied.')
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-yellow-950/10 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1),transparent_50%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <Card className="bg-black/80 border border-yellow-600/30 p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-700 flex items-center justify-center shadow-lg shadow-yellow-600/30">
              <Crown size={40} weight="fill" className="text-black" />
            </div>
            <h1 
              className="text-2xl font-bold gold-gradient-text mb-2"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              DOMAIN EMPIRE
            </h1>
            <p className="text-yellow-600/60 text-sm">Owner Access Only</p>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-600/10 border border-yellow-600/20 mb-6">
            <Shield size={18} className="text-yellow-500 flex-shrink-0" />
            <p className="text-xs text-yellow-600/70">
              This system is protected. Unauthorized access attempts are logged.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-yellow-600/80 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-600/80 mb-2">
                Master Key
              </label>
              <div className="relative">
                <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600/50" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="w-full pl-10 pr-12 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-600/50 hover:text-yellow-600"
                >
                  {showKey ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30"
              >
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <Lock size={16} />
                  {error}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !username || !masterKey}
              className="w-full py-4 btn-gold-premium text-lg font-bold"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </div>
              ) : (
                <>
                  <Crown size={20} className="mr-2" />
                  Access Empire
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-yellow-600/20 text-center">
            <p className="text-xs text-yellow-600/40">
              DomainFlipper Empire • Secured Access
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

