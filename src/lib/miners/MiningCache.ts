/**
 * MiningCache.ts — In-Memory Domain Mining Cache
 * Prevents duplicate mining and tracks domain history
 * December 2025
 */

import type { MinedDomain, MinerSource, MiningSession } from './types'

interface CacheEntry {
  domain: string
  source: MinerSource
  minedAt: Date
  estValue: number
  price: number
}

export class MiningCache {
  private cache: Map<string, CacheEntry> = new Map()
  private gems: MinedDomain[] = []
  private legendaryDomains: MinedDomain[] = []
  private sessions: MiningSession[] = []
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 days
  private readonly MAX_CACHE_SIZE = 50000
  private readonly MAX_GEMS = 500
  private readonly MAX_LEGENDARY = 100

  constructor() {
    // Clear any old mock data on startup
    this.clear()
    console.log('[MINING_CACHE] Initialized fresh - all old data cleared')
  }

  /**
   * Check if domain was already mined recently
   */
  isDuplicate(domain: string): boolean {
    const entry = this.cache.get(domain.toLowerCase())
    if (!entry) return false
    
    // Check if cache entry is still valid
    const age = Date.now() - entry.minedAt.getTime()
    if (age > this.CACHE_TTL) {
      this.cache.delete(domain.toLowerCase())
      return false
    }
    
    return true
  }

  /**
   * Add domain to cache
   */
  addToCache(domain: MinedDomain): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.pruneCache()
    }

    this.cache.set(domain.domain.toLowerCase(), {
      domain: domain.domain,
      source: domain.source,
      minedAt: domain.minedAt,
      estValue: domain.estValue,
      price: domain.price,
    })

    // Track gems ($1000+)
    if (domain.estValue >= 1000 && domain.priority !== 'normal') {
      this.gems.unshift(domain)
      if (this.gems.length > this.MAX_GEMS) {
        this.gems.pop()
      }
    }

    // Track legendary domains ($10000+)
    if (domain.estValue >= 10000) {
      domain.priority = 'legendary'
      this.legendaryDomains.unshift(domain)
      if (this.legendaryDomains.length > this.MAX_LEGENDARY) {
        this.legendaryDomains.pop()
      }
    }
  }

  /**
   * Get all gems found
   */
  getGems(limit = 100): MinedDomain[] {
    return this.gems.slice(0, limit)
  }

  /**
   * Get legendary domains
   */
  getLegendary(limit = 50): MinedDomain[] {
    return this.legendaryDomains.slice(0, limit)
  }

  /**
   * Get domains by source
   */
  getBySource(source: MinerSource, limit = 100): MinedDomain[] {
    return this.gems
      .filter(d => d.source === source)
      .slice(0, limit)
  }

  /**
   * Get cache stats
   */
  getStats(): {
    totalCached: number
    gemsCount: number
    legendaryCount: number
    bySource: Record<MinerSource, number>
  } {
    const bySource: Record<string, number> = {}
    
    this.gems.forEach(gem => {
      bySource[gem.source] = (bySource[gem.source] || 0) + 1
    })

    return {
      totalCached: this.cache.size,
      gemsCount: this.gems.length,
      legendaryCount: this.legendaryDomains.length,
      bySource: bySource as Record<MinerSource, number>,
    }
  }

  /**
   * Record mining session
   */
  recordSession(session: MiningSession): void {
    this.sessions.unshift(session)
    if (this.sessions.length > 100) {
      this.sessions.pop()
    }
  }

  /**
   * Get recent sessions
   */
  getSessions(limit = 20): MiningSession[] {
    return this.sessions.slice(0, limit)
  }

  /**
   * Prune old cache entries
   */
  private pruneCache(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Sort by age and remove oldest 20%
    entries
      .sort((a, b) => a[1].minedAt.getTime() - b[1].minedAt.getTime())
      .slice(0, Math.floor(entries.length * 0.2))
      .forEach(([key]) => this.cache.delete(key))
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.gems = []
    this.legendaryDomains = []
  }

  /**
   * Export gems to watchlist format
   */
  exportWatchlist(): string[] {
    return this.gems.map(g => g.domain)
  }

  /**
   * Get highest ROI domains
   */
  getHighestROI(limit = 20): MinedDomain[] {
    return [...this.gems]
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit)
  }

  /**
   * Get domains by minimum ROI
   */
  getByMinROI(minRoi: number, limit = 50): MinedDomain[] {
    return this.gems
      .filter(d => d.roi >= minRoi)
      .slice(0, limit)
  }
}

export const miningCache = new MiningCache()

