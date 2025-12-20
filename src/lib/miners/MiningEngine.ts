/**
 * MiningEngine.ts — Master Domain Mining Orchestrator
 * Controls all miners, aggregates stats, and provides unified API
 * December 2025 — The Empire's Mining Core
 */

import { godaddyCloseoutsMiner } from './GoDaddyCloseoutsMiner'
import { namecheapMarketMiner } from './NamecheapMarketMiner'
import { dynadotCloseoutsMiner } from './DynadotCloseoutsMiner'
import { expiredDomainsMiner } from './ExpiredDomainsMiner'
import { miningCache } from './MiningCache'
import { logger } from '@/lib/utils/logger'
import type { 
  MinedDomain, 
  MinerSource, 
  MinerStats, 
  MiningEvent,
  MiningConfig 
} from './types'
import { generateId } from '@/lib/utils'

export interface MiningEngineStats {
  isRunning: boolean
  totalDomainsMined: number
  totalGemsFound: number
  totalLegendaryFound: number
  avgROI: number
  activeMiners: number
  lastUpdate: Date | null
  minerStats: Record<MinerSource, MinerStats>
  recentGems: MinedDomain[]
  legendaryDomains: MinedDomain[]
  profitPotential: {
    daily: number
    weekly: number
    monthly: number
  }
}

class MiningEngine {
  private isRunning = false
  private eventListeners: ((event: MiningEvent) => void)[] = []
  private statsUpdateListeners: ((stats: MiningEngineStats) => void)[] = []

  // All miners
  private miners = {
    godaddy_closeouts: godaddyCloseoutsMiner,
    namecheap_market: namecheapMarketMiner,
    dynadot_closeouts: dynadotCloseoutsMiner,
    expireddomains_net: expiredDomainsMiner,
  }

  constructor() {
    // Subscribe to events from all miners
    Object.values(this.miners).forEach(miner => {
      miner.onEvent((event) => {
        this.handleMinerEvent(event)
      })
    })
  }

  /**
   * Start all miners
   */
  startAll(): void {
    if (this.isRunning) return

    logger.info('MINING_ENGINE', '🚀 MINING EMPIRE STARTING — All miners launching...')
    this.isRunning = true

    Object.values(this.miners).forEach(miner => miner.start())

    this.emitStatsUpdate()
  }

  /**
   * Stop all miners
   */
  stopAll(): void {
    if (!this.isRunning) return

    logger.info('MINING_ENGINE', '⏹️ MINING EMPIRE PAUSED — All miners stopping...')
    this.isRunning = false

    Object.values(this.miners).forEach(miner => miner.stop())

    this.emitStatsUpdate()
  }

  /**
   * Start specific miner
   */
  startMiner(source: MinerSource): void {
    const miner = this.miners[source]
    if (miner) {
      miner.start()
      this.emitStatsUpdate()
    }
  }

  /**
   * Stop specific miner
   */
  stopMiner(source: MinerSource): void {
    const miner = this.miners[source]
    if (miner) {
      miner.stop()
      this.emitStatsUpdate()
    }
  }

  /**
   * Run manual mining cycle for specific source
   */
  async runManualCycle(source: MinerSource): Promise<MinedDomain[]> {
    const miner = this.miners[source]
    if (miner) {
      const results = await miner.runMiningCycle()
      this.emitStatsUpdate()
      return results
    }
    return []
  }

  /**
   * Run mining cycle for all sources
   */
  async runAllCycles(): Promise<MinedDomain[]> {
    logger.info('MINING_ENGINE', '⛏️ Running manual mining cycle for all sources...')
    
    const results = await Promise.all(
      Object.values(this.miners).map(miner => miner.runMiningCycle())
    )

    const allDomains = results.flat()
    this.emitStatsUpdate()

    logger.info('MINING_ENGINE', `✅ Manual cycle complete: ${allDomains.length} gems found`)
    return allDomains
  }

  /**
   * Get comprehensive stats
   */
  getStats(): MiningEngineStats {
    const minerStats: Record<string, MinerStats> = {}
    let totalMined = 0
    let totalGems = 0
    let totalLegendary = 0
    let totalROI = 0
    let activeCount = 0

    Object.entries(this.miners).forEach(([source, miner]) => {
      const stats = miner.getStats()
      minerStats[source] = stats
      totalMined += stats.totalMined
      totalGems += stats.gemsFound
      totalLegendary += stats.legendaryFound
      totalROI += stats.avgRoi
      if (miner.isActive()) activeCount++
    })

    const avgROI = Object.keys(this.miners).length > 0 
      ? totalROI / Object.keys(this.miners).length 
      : 0

    const gems = miningCache.getGems(20)
    const legendary = miningCache.getLegendary(10)

    // Calculate profit potential - NO FAKE DATA
    // Only calculate if we have real gems
    const avgGemValue = gems.length > 0 
      ? gems.reduce((sum, g) => sum + g.estValue, 0) / gems.length 
      : 0 // NO FAKE VALUE
    const avgGemCost = gems.length > 0
      ? gems.reduce((sum, g) => sum + g.price, 0) / gems.length
      : 0 // NO FAKE VALUE

    const dailyGems = totalGems > 0 ? Math.ceil(totalGems / 7) : 0 // NO FAKE ESTIMATE
    const profitPerGem = avgGemValue - avgGemCost

    return {
      isRunning: this.isRunning,
      totalDomainsMined: totalMined,
      totalGemsFound: totalGems,
      totalLegendaryFound: totalLegendary,
      avgROI: Math.round(avgROI),
      activeMiners: activeCount,
      lastUpdate: new Date(),
      minerStats: minerStats as Record<MinerSource, MinerStats>,
      recentGems: gems,
      legendaryDomains: legendary,
      profitPotential: {
        daily: gems.length > 0 ? Math.round(dailyGems * profitPerGem * 0.18) : 0,
        weekly: gems.length > 0 ? Math.round(dailyGems * 7 * profitPerGem * 0.18) : 0,
        monthly: gems.length > 0 ? Math.round(dailyGems * 30 * profitPerGem * 0.18) : 0,
      },
    }
  }

  /**
   * Get gems from all sources
   */
  getGems(limit = 50): MinedDomain[] {
    return miningCache.getGems(limit)
  }

  /**
   * Get legendary domains
   */
  getLegendary(limit = 20): MinedDomain[] {
    return miningCache.getLegendary(limit)
  }

  /**
   * Get highest ROI domains
   */
  getHighestROI(limit = 20): MinedDomain[] {
    return miningCache.getHighestROI(limit)
  }

  /**
   * Get domains by source
   */
  getBySource(source: MinerSource, limit = 50): MinedDomain[] {
    return miningCache.getBySource(source, limit)
  }

  /**
   * Export watchlist
   */
  exportWatchlist(): string[] {
    return miningCache.exportWatchlist()
  }

  /**
   * Update config for specific miner
   */
  updateMinerConfig(source: MinerSource, config: Partial<MiningConfig>): void {
    const miner = this.miners[source]
    if (miner) {
      miner.updateConfig(config)
    }
  }

  /**
   * Get miner config
   */
  getMinerConfig(source: MinerSource): MiningConfig | null {
    const miner = this.miners[source]
    return miner ? miner.getConfig() : null
  }

  /**
   * Subscribe to all mining events
   */
  onEvent(listener: (event: MiningEvent) => void): () => void {
    this.eventListeners.push(listener)
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== listener)
    }
  }

  /**
   * Subscribe to stats updates
   */
  onStatsUpdate(listener: (stats: MiningEngineStats) => void): () => void {
    this.statsUpdateListeners.push(listener)
    return () => {
      this.statsUpdateListeners = this.statsUpdateListeners.filter(l => l !== listener)
    }
  }

  /**
   * Handle event from child miner
   */
  private handleMinerEvent(event: MiningEvent): void {
    // Forward to all listeners
    this.eventListeners.forEach(listener => listener(event))
    
    // Emit stats update for significant events
    if (['gem_found', 'legendary_found', 'session_complete'].includes(event.type)) {
      this.emitStatsUpdate()
    }
  }

  /**
   * Emit stats update to all listeners
   */
  private emitStatsUpdate(): void {
    const stats = this.getStats()
    this.statsUpdateListeners.forEach(listener => listener(stats))
  }

  /**
   * Check if engine is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Get source display name
   */
  getSourceDisplayName(source: MinerSource): string {
    const names: Record<MinerSource, string> = {
      godaddy_closeouts: 'GoDaddy Closeouts',
      namecheap_market: 'Namecheap Market',
      dynadot_closeouts: 'Dynadot Closeouts',
      expireddomains_net: 'Expired Domains',
      justdropped: 'JustDropped',
      domcop: 'DomCop',
      namejet: 'NameJet',
    }
    return names[source] || source
  }

  /**
   * Get source color for UI
   */
  getSourceColor(source: MinerSource): string {
    const colors: Record<MinerSource, string> = {
      godaddy_closeouts: '#00A4E4', // GoDaddy blue
      namecheap_market: '#DE3618', // Namecheap orange-red
      dynadot_closeouts: '#5C2D91', // Dynadot purple
      expireddomains_net: '#2ECC71', // Green
      justdropped: '#F39C12', // Orange
      domcop: '#3498DB', // Blue
      namejet: '#9B59B6', // Purple
    }
    return colors[source] || '#D4AF37'
  }
}

export const miningEngine = new MiningEngine()

