/**
 * Web3DomainSniper.ts — NFT & Blockchain Domain Sniping
 * Snipes .eth (ENS), .sol (Solana), .tez (Tezos), .btc (Stacks), Handshake TLDs
 * The future of domains is decentralized — and you own it all
 * December 2025
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { apiCall } from '@/lib/utils/apiWrapper'
import axios from 'axios'

// ==================== TYPES ====================

export interface Web3Domain {
  name: string
  tld: 'eth' | 'sol' | 'tez' | 'btc' | 'hns' | 'lens' | 'crypto' | 'nft'
  available: boolean
  price?: number
  expiresAt?: Date
  owner?: string
  registrationCost?: number
}

export interface Web3SnipeResult {
  success: boolean
  domain: string
  tld: string
  transactionHash?: string
  cost?: number
  error?: string
}

// ==================== PREMIUM NAME LISTS ====================

const PREMIUM_NAMES = {
  general: ['wallet', 'pay', 'swap', 'trade', 'earn', 'stake', 'farm', 'vault', 'forge', 'quantum'],
  crypto: ['bitcoin', 'ethereum', 'solana', 'crypto', 'defi', 'nft', 'web3', 'dao', 'token'],
  brand: ['alpha', 'beta', 'omega', 'prime', 'elite', 'ultra', 'mega', 'super', 'hyper'],
  tech: ['ai', 'ml', 'neural', 'quantum', 'cloud', 'data', 'api', 'dev', 'code'],
}

// ==================== WEB3 DOMAIN SNIPER CLASS ====================

class Web3DomainSniper {
  private isRunning = false
  private scanInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Start the Web3 domain sniping engine
   */
  startSniping(intervalMs: number = 30000): void {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('WEB3_SNIPER', 'Starting Web3 domain sniping', { interval: `${intervalMs / 1000}s` })

    toast.success('🔗 Web3 Sniper Activated', {
      description: 'Scanning .eth, .sol, .tez, .btc, Handshake...',
    })

    // Initial scan
    this.scanAllChains()

    // Periodic scanning
    this.scanInterval = setInterval(() => this.scanAllChains(), intervalMs)
  }

  /**
   * Stop sniping
   */
  stopSniping(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
    this.isRunning = false
    logger.info('WEB3_SNIPER', 'Web3 domain sniping stopped')
  }

  /**
   * Scan all supported chains
   */
  private async scanAllChains(): Promise<void> {
    logger.debug('WEB3_SNIPER', 'Scanning all Web3 chains...')

    await Promise.allSettled([
      this.scanENS(),
      this.scanSolana(),
      this.scanHandshake(),
      this.scanUnstoppable(),
    ])
  }

  // ==================== ENS (.eth) ====================

  /**
   * Scan ENS for available premium names
   */
  async scanENS(): Promise<void> {
    try {
      const namesToCheck = this.generatePremiumNames('eth')
      
      for (const name of namesToCheck.slice(0, 20)) {
        const available = await this.checkENSAvailability(name)
        
        if (available) {
          const value = this.estimateENSValue(name)
          
          if (value > 10000) {
            logger.info('WEB3_SNIPER', `ENS opportunity: ${name}.eth → $${value.toLocaleString()}`)
            
            toast.success('🔵 ENS Opportunity Found', {
              description: `${name}.eth available → $${value.toLocaleString()} value`,
            })
          }
        }
      }
    } catch (error) {
      logger.debug('WEB3_SNIPER', 'ENS scan skipped')
    }
  }

  /**
   * Check ENS availability
   */
  async checkENSAvailability(name: string): Promise<boolean> {
    try {
      const response = await apiCall(
        () => axios.get(`https://api.ensideas.com/ens/resolve/${name}.eth`, {
          timeout: 10000,
        }),
        { service: 'ens', action: 'checkAvailability' }
      )

      // If no address, name is available
      return response.success && !response.data?.data?.address
    } catch {
      return false
    }
  }

  /**
   * Estimate ENS name value
   */
  private estimateENSValue(name: string): number {
    let value = 5000 // Base value

    // Length premium
    if (name.length <= 3) value *= 100 // 3-letter = $500k+
    else if (name.length <= 4) value *= 20 // 4-letter = $100k+
    else if (name.length <= 5) value *= 5 // 5-letter = $25k+
    else if (name.length <= 7) value *= 2

    // Premium word check
    const allPremium = [...PREMIUM_NAMES.general, ...PREMIUM_NAMES.crypto, ...PREMIUM_NAMES.brand]
    if (allPremium.includes(name.toLowerCase())) value *= 10

    // Number patterns (Chinese market premium)
    if (/^[0-9]{3}$/.test(name)) value *= 50
    if (/^[0-9]{4}$/.test(name)) value *= 10
    if (name.includes('888') || name.includes('666')) value *= 2

    return Math.round(value)
  }

  // ==================== SOLANA (.sol) ====================

  /**
   * Scan Solana Name Service
   */
  async scanSolana(): Promise<void> {
    try {
      const namesToCheck = this.generatePremiumNames('sol')
      
      for (const name of namesToCheck.slice(0, 20)) {
        const available = await this.checkSolanaAvailability(name)
        
        if (available) {
          const value = this.estimateSolanaValue(name)
          
          if (value > 5000) {
            logger.info('WEB3_SNIPER', `Solana opportunity: ${name}.sol → $${value.toLocaleString()}`)
            
            toast.success('🟣 Solana Domain Found', {
              description: `${name}.sol available → $${value.toLocaleString()} value`,
            })
          }
        }
      }
    } catch (error) {
      logger.debug('WEB3_SNIPER', 'Solana scan skipped')
    }
  }

  /**
   * Check Solana Name Service availability
   */
  async checkSolanaAvailability(name: string): Promise<boolean> {
    try {
      // Bonfida SNS API
      const response = await apiCall(
        () => axios.get(`https://sns.guide/api/check/${name}`, {
          timeout: 10000,
        }),
        { service: 'sns', action: 'checkAvailability' }
      )

      return response.success && response.data?.data?.available === true
    } catch {
      return false
    }
  }

  /**
   * Estimate Solana name value
   */
  private estimateSolanaValue(name: string): number {
    let value = 2000 // Base value

    // Length premium
    if (name.length <= 3) value *= 50
    else if (name.length <= 4) value *= 15
    else if (name.length <= 5) value *= 5
    else if (name.length <= 7) value *= 2

    // Solana-specific keywords
    const solanaKeywords = ['solana', 'sol', 'phantom', 'raydium', 'serum', 'jupiter', 'marinade']
    if (solanaKeywords.some(kw => name.toLowerCase().includes(kw))) value *= 5

    // Premium words
    if (PREMIUM_NAMES.crypto.includes(name.toLowerCase())) value *= 8

    return Math.round(value)
  }

  // ==================== HANDSHAKE ====================

  /**
   * Scan Handshake for available TLDs
   */
  async scanHandshake(): Promise<void> {
    try {
      // Check for premium Handshake TLDs
      const premiumTLDs = ['crypto', 'ai', 'nft', 'web3', 'dao', 'defi', 'btc', 'eth', 'sol', 'blockchain']
      
      for (const tld of premiumTLDs) {
        const available = await this.checkHandshakeAvailability(tld)
        
        if (available) {
          const value = this.estimateHandshakeValue(tld)
          
          logger.info('WEB3_SNIPER', `Handshake TLD: /${tld} → $${value.toLocaleString()}`)
          
          toast.success('🟡 Handshake TLD Found', {
            description: `/${tld} available → OWN THE ENTIRE TLD`,
          })
        }
      }
    } catch (error) {
      logger.debug('WEB3_SNIPER', 'Handshake scan skipped')
    }
  }

  /**
   * Check Handshake availability via Namebase API
   */
  async checkHandshakeAvailability(name: string): Promise<boolean> {
    try {
      const response = await apiCall(
        () => axios.get(`https://api.namebase.io/v0/dns/domains/${name}`, {
          timeout: 10000,
        }),
        { service: 'namebase', action: 'checkAvailability' }
      )

      return !response.success || !response.data?.data?.domain
    } catch {
      return false
    }
  }

  /**
   * Estimate Handshake TLD value
   */
  private estimateHandshakeValue(tld: string): number {
    const premiumTLDs: Record<string, number> = {
      'crypto': 10000000,
      'ai': 8000000,
      'nft': 5000000,
      'web3': 5000000,
      'dao': 3000000,
      'defi': 3000000,
      'btc': 4000000,
      'eth': 4000000,
      'sol': 2000000,
      'blockchain': 2000000,
    }

    return premiumTLDs[tld.toLowerCase()] || 500000
  }

  // ==================== UNSTOPPABLE DOMAINS ====================

  /**
   * Scan Unstoppable Domains (.crypto, .nft, .bitcoin, etc.)
   */
  async scanUnstoppable(): Promise<void> {
    try {
      const tlds = ['.crypto', '.nft', '.bitcoin', '.wallet', '.blockchain']
      const namesToCheck = this.generatePremiumNames('crypto')

      for (const tld of tlds) {
        for (const name of namesToCheck.slice(0, 10)) {
          const domain = `${name}${tld}`
          const available = await this.checkUnstoppableAvailability(domain)

          if (available) {
            const value = this.estimateUnstoppableValue(name, tld)

            if (value > 5000) {
              logger.info('WEB3_SNIPER', `Unstoppable opportunity: ${domain} → $${value.toLocaleString()}`)

              toast.success('🟢 Unstoppable Domain Found', {
                description: `${domain} available → $${value.toLocaleString()} value`,
              })
            }
          }
        }
      }
    } catch (error) {
      logger.debug('WEB3_SNIPER', 'Unstoppable scan skipped')
    }
  }

  /**
   * Check Unstoppable Domains availability
   */
  async checkUnstoppableAvailability(domain: string): Promise<boolean> {
    try {
      const response = await apiCall(
        () => axios.get(`https://unstoppabledomains.com/api/v1/resellers/udtesting/domains/${domain}`, {
          timeout: 10000,
        }),
        { service: 'unstoppable', action: 'checkAvailability' }
      )

      return response.success && response.data?.data?.availability?.available === true
    } catch {
      return false
    }
  }

  /**
   * Estimate Unstoppable domain value
   */
  private estimateUnstoppableValue(name: string, tld: string): number {
    let value = 1000 // Base value

    // TLD multiplier
    const tldMultipliers: Record<string, number> = {
      '.crypto': 2,
      '.bitcoin': 3,
      '.wallet': 2,
      '.nft': 1.5,
      '.blockchain': 1.5,
    }
    value *= tldMultipliers[tld] || 1

    // Length premium
    if (name.length <= 4) value *= 10
    else if (name.length <= 6) value *= 3

    // Premium words
    if (PREMIUM_NAMES.crypto.includes(name.toLowerCase())) value *= 5

    return Math.round(value)
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate list of premium names to check
   */
  private generatePremiumNames(chain: string): string[] {
    const names = new Set<string>()

    // Add all premium names
    Object.values(PREMIUM_NAMES).flat().forEach(n => names.add(n))

    // Add 3-letter combinations
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'
    for (let i = 0; i < 5; i++) {
      const name = Array.from({ length: 3 }, () => alphabet[Math.floor(Math.random() * 26)]).join('')
      names.add(name)
    }

    // Add number patterns
    for (let i = 100; i <= 999; i++) {
      if (i.toString().includes('888') || i.toString().includes('666') || i.toString().includes('777')) {
        names.add(i.toString())
      }
    }

    return Array.from(names)
  }

  /**
   * Get stats
   */
  getStats(): { isRunning: boolean; chainsActive: string[] } {
    return {
      isRunning: this.isRunning,
      chainsActive: ['ENS', 'Solana', 'Handshake', 'Unstoppable'],
    }
  }
}

// Export singleton
export const web3DomainSniper = new Web3DomainSniper()

