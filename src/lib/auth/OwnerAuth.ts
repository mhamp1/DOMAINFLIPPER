/**
 * OwnerAuth.ts — OWNER-ONLY AUTHENTICATION
 *
 * Login:
 *   Username: DomainEmperor
 *   Password: Your VITE_ADMIN_API_KEY (set in Vercel env vars, not in code)
 *
 * No secrets stored in source code. The key is read from the environment
 * variable at build time via Vite's import.meta.env.
 */

import { toast } from 'sonner'

const OWNER_USERNAME = 'DomainEmperor'

// Read the admin key from Vite env var (set in Vercel, never committed)
const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || ''

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
    this.restoreSession()
  }

  /**
   * Attempt login with username and admin API key
   */
  async login(username: string, key: string): Promise<boolean> {
    if (username !== OWNER_USERNAME) {
      toast.error('Access Denied', { description: 'Invalid credentials' })
      return false
    }

    if (!ADMIN_KEY) {
      toast.error('Auth Not Configured', { description: 'VITE_ADMIN_API_KEY is not set' })
      return false
    }

    if (key !== ADMIN_KEY) {
      toast.error('Access Denied', { description: 'Invalid key' })
      return false
    }

    // Success
    const now = new Date()
    this.state = {
      isAuthenticated: true,
      username,
      loginTime: now,
      sessionExpiry: new Date(now.getTime() + this.SESSION_DURATION),
    }

    this.saveSession()

    toast.success('Authenticated', {
      description: 'Welcome back. Your empire awaits.',
      duration: 5000,
    })

    return true
  }

  /**
   * Logout and clear session
   * NOTE: This only logs out the UI — the bot keeps running autonomously!
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

  private saveSession(): void {
    const sessionData = {
      username: this.state.username,
      loginTime: this.state.loginTime?.toISOString(),
      sessionExpiry: this.state.sessionExpiry?.toISOString(),
      token: this.generateSessionToken(),
    }

    localStorage.setItem('domainFlipper_ownerSession', JSON.stringify(sessionData))
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem('domainFlipper_ownerSession')
      if (!stored) return

      const sessionData = JSON.parse(stored)
      const expiry = new Date(sessionData.sessionExpiry)

      if (expiry > new Date()) {
        this.state = {
          isAuthenticated: true,
          username: sessionData.username,
          loginTime: new Date(sessionData.loginTime),
          sessionExpiry: expiry,
        }
      } else {
        localStorage.removeItem('domainFlipper_ownerSession')
      }
    } catch {
      localStorage.removeItem('domainFlipper_ownerSession')
    }
  }

  private generateSessionToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
  }

  getSessionInfo(): { loginTime: Date | null; expiresIn: number } {
    const expiresIn = this.state.sessionExpiry
      ? Math.max(0, this.state.sessionExpiry.getTime() - Date.now())
      : 0

    return { loginTime: this.state.loginTime, expiresIn }
  }
}

// Export singleton
export const ownerAuth = new OwnerAuth()
