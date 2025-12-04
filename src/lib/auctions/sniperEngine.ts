import type { Domain, Transaction } from '@/types/domain'
import { generateId } from '@/lib/utils'
import { soundEngine } from '@/lib/sounds/soundEffects'

/**
 * Auto-sniper engine for last-second bidding
 * Executes bids in the final 3 seconds of auctions
 */
export class SniperEngine {
  private activeSnipes: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private godMode: boolean = false

  /**
   * Enable God Mode (creator always wins)
   */
  enableGodMode() {
    this.godMode = true
    soundEngine.vaultOpen()
  }

  /**
   * Disable God Mode
   */
  disableGodMode() {
    this.godMode = false
  }

  /**
   * Calculate optimal bid amount
   */
  private calculateBid(domain: Domain, maxBid: number): number {
    const { currentBid = 0, estimatedValue } = domain

    // In God Mode, always bid exactly what's needed to win
    if (this.godMode) {
      return Math.min(currentBid * 1.05, maxBid)
    }

    // Normal mode: bid strategically
    const minIncrement = 100
    const suggestedBid = currentBid + minIncrement

    // Don't exceed 70% of estimated value
    const maxReasonableBid = estimatedValue * 0.7

    return Math.min(suggestedBid, maxBid, maxReasonableBid)
  }

  /**
   * Execute snipe bid
   */
  async executeBid(
    domain: Domain,
    bidAmount: number,
    _registrar: string
  ): Promise<Transaction> {
    // Simulate API call to registrar
    await new Promise(resolve => setTimeout(resolve, 500))

    // In God Mode, success rate is 100%
    const successRate = this.godMode ? 1.0 : 0.85
    const success = Math.random() < successRate

    soundEngine.success()

    return {
      id: generateId(),
      type: 'buy',
      domain: domain.name,
      amount: bidAmount,
      date: new Date(),
      strategyId: domain.strategyId,
      status: success ? 'completed' : 'failed',
    }
  }

  /**
   * Schedule a snipe for last 3 seconds
   */
  scheduleSnipe(
    domain: Domain,
    maxBid: number,
    callback: (transaction: Transaction) => void
  ) {
    // Cancel existing snipe for this domain if any
    this.cancelSnipe(domain.id)

    // Parse time left (format: "00:MM:SS")
    const timeLeft = domain.timeLeft || '00:00:00'
    const [hours, minutes, seconds] = timeLeft.split(':').map(Number)
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    // Schedule for 3 seconds before end
    const delayMs = Math.max(0, (totalSeconds - 3) * 1000)

    const timeout = setTimeout(async () => {
      const bidAmount = this.calculateBid(domain, maxBid)
      
      soundEngine.snipeAlert()
      
      const transaction = await this.executeBid(
        domain,
        bidAmount,
        domain.registrar || 'Unknown'
      )

      callback(transaction)
      this.activeSnipes.delete(domain.id)
    }, delayMs)

    this.activeSnipes.set(domain.id, timeout)
  }

  /**
   * Snipe immediately (manual snipe)
   */
  async snipeNow(domain: Domain, maxBid: number): Promise<Transaction> {
    const bidAmount = this.calculateBid(domain, maxBid)
    
    soundEngine.snipeAlert()
    
    return await this.executeBid(
      domain,
      bidAmount,
      domain.registrar || 'Unknown'
    )
  }

  /**
   * Cancel scheduled snipe
   */
  cancelSnipe(domainId: string) {
    const timeout = this.activeSnipes.get(domainId)
    if (timeout) {
      clearTimeout(timeout)
      this.activeSnipes.delete(domainId)
    }
  }

  /**
   * Cancel all snipes
   */
  cancelAllSnipes() {
    this.activeSnipes.forEach(timeout => clearTimeout(timeout))
    this.activeSnipes.clear()
  }

  /**
   * Get count of active snipes
   */
  getActiveSnipeCount(): number {
    return this.activeSnipes.size
  }

  /**
   * Check if domain has scheduled snipe
   */
  hasSnipe(domainId: string): boolean {
    return this.activeSnipes.has(domainId)
  }
}

export const sniperEngine = new SniperEngine()
