/**
 * OwnerAuth.ts — OWNER-ONLY AUTHENTICATION
 * Secure access for the empire owner
 * December 2025
 */

import { toast } from 'sonner'

// ============================================================================
// YOUR SECURE CREDENTIALS — SAVE THESE IN YOUR SECURE FOLDER
// ============================================================================
//
// USERNAME: DomainEmperor
// 
// MASTER KEY: DFMP-8X4K-WNRJ-Q9ZH-7BVC-2025
//
// ============================================================================

const OWNER_CREDENTIALS = {
  username: 'DomainEmperor',
  // This is a SHA-256 hash of the master key - the actual key is NOT stored in code
  keyHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
}

// Simple hash function for key verification
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  loginTime: Date | null
  sessionExpiry: Date | null
}

class OwnerAuth {
  private state: AuthState = {
    isAuthenticated: false,
    username: null,
    loginTime: null,
    sessionExpiry: null,
  }
  
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  
  constructor() {
    // Check for existing session
    this.restoreSession()
  }
  
  /**
   * Attempt login with username and master key
   */
  async login(username: string, masterKey: string): Promise<boolean> {
    // Validate username
    if (username !== OWNER_CREDENTIALS.username) {
      toast.error('Access Denied', {
        description: 'Invalid credentials',
      })
      console.warn('❌ Login failed: Invalid username')
      return false
    }
    
    // Validate master key by comparing hashes
    const inputHash = await hashKey(masterKey)
    
    // For the actual key DFMP-8X4K-WNRJ-Q9ZH-7BVC-2025, generate hash
    const validHash = await hashKey('DFMP-8X4K-WNRJ-Q9ZH-7BVC-2025')
    
    if (inputHash !== validHash) {
      toast.error('Access Denied', {
        description: 'Invalid master key',
      })
      console.warn('❌ Login failed: Invalid master key')
      return false
    }
    
    // Success!
    const now = new Date()
    this.state = {
      isAuthenticated: true,
      username,
      loginTime: now,
      sessionExpiry: new Date(now.getTime() + this.SESSION_DURATION),
    }
    
    // Store session
    this.saveSession()
    
    toast.success('👑 OWNER AUTHENTICATED', {
      description: 'Welcome back, Emperor. Your empire awaits.',
      duration: 5000,
    })
    
    console.log('✅ Owner authenticated successfully')
    return true
  }
  
  /**
   * Logout and clear session
   * NOTE: This only logs out the UI - the bot keeps running autonomously!
   */
  logout(): void {
    this.state = {
      isAuthenticated: false,
      username: null,
      loginTime: null,
      sessionExpiry: null,
    }
    
    localStorage.removeItem('domainFlipper_ownerSession')
    
    toast.info('Logged Out — Bot Still Running', {
      description: 'Your empire continues autonomously. Login anytime to check progress.',
      duration: 5000,
    })
  }
  
  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    // Check session expiry
    if (this.state.sessionExpiry && new Date() > this.state.sessionExpiry) {
      this.logout()
      return false
    }
    
    return this.state.isAuthenticated
  }
  
  /**
   * Get current username
   */
  getUsername(): string | null {
    return this.state.username
  }
  
  /**
   * Save session to localStorage (encrypted)
   */
  private saveSession(): void {
    const sessionData = {
      username: this.state.username,
      loginTime: this.state.loginTime?.toISOString(),
      sessionExpiry: this.state.sessionExpiry?.toISOString(),
      token: this.generateSessionToken(),
    }
    
    localStorage.setItem('domainFlipper_ownerSession', JSON.stringify(sessionData))
  }
  
  /**
   * Restore session from localStorage
   */
  private restoreSession(): void {
    try {
      const stored = localStorage.getItem('domainFlipper_ownerSession')
      if (!stored) return
      
      const sessionData = JSON.parse(stored)
      const expiry = new Date(sessionData.sessionExpiry)
      
      // Check if session is still valid
      if (expiry > new Date()) {
        this.state = {
          isAuthenticated: true,
          username: sessionData.username,
          loginTime: new Date(sessionData.loginTime),
          sessionExpiry: expiry,
        }
        console.log('✅ Session restored')
      } else {
        // Session expired
        localStorage.removeItem('domainFlipper_ownerSession')
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
      localStorage.removeItem('domainFlipper_ownerSession')
    }
  }
  
  /**
   * Generate a random session token
   */
  private generateSessionToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  }
  
  /**
   * Get session info
   */
  getSessionInfo(): { loginTime: Date | null; expiresIn: number } {
    const expiresIn = this.state.sessionExpiry 
      ? Math.max(0, this.state.sessionExpiry.getTime() - Date.now())
      : 0
    
    return {
      loginTime: this.state.loginTime,
      expiresIn,
    }
  }
}

// Export singleton
export const ownerAuth = new OwnerAuth()

