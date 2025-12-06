/**
 * AffiliateEngine.ts — THE FINAL AFFILIATE EMPIRE v2025.∞
 * Profit from every domain you see — whether you buy it or not.
 * One empire. Infinite revenue streams.
 *
 * December 27, 2025 — The Empire monetizes everything.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { masterConfig } from '@/lib/config/MasterConfig'

// ==================== TYPES ====================

interface AffiliateNetwork {
  id: string
  name: string
  baseUrl: string
  affiliateId: string
  commission: number
  commissionType: 'percentage' | 'flat'
  active: boolean
  priority: number
  avgConversionRate: number
  avgTimeToConvert: number
  lastPayout: number
}

interface AffiliateClick {
  id: string
  domain: string
  network: string
  url: string
  timestamp: Date
  converted: boolean
  commission?: number
}

interface AffiliatePromotion {
  domain: string
  links: Array<{
    network: string
    url: string
    commission: string
    predictedRevenue: number
  }>
  promotedAt: Date
  channels: string[]
  predictedTotalRevenue: number
  actualRevenue: number
}

interface AffiliateStats {
  totalClicks: number
  totalConversions: number
  conversionRate: number
  totalCommission: number
  monthlyRecurringRevenue: number
  projectedYearly: number
  topNetworks: Array<{ network: string; revenue: number; clicks: number }>
  topDomains: Array<{ domain: string; revenue: number; clicks: number }>
  roi: number
  isActive: boolean
  isPaused: boolean
}

// ==================== THE AFFILIATE GOD ====================

class AffiliateEngine {
  private networks: Map<string, AffiliateNetwork> = new Map()
  private clicks: AffiliateClick[] = []
  private promotions: AffiliatePromotion[] = []
  private dailyRevenue = 0
  private totalRevenue = 0
  private isRunning = false
  private isPaused = false
  private trackingLoop: ReturnType<typeof setInterval> | null = null

  private listeners: Array<(stats: AffiliateStats) => void> = []

  constructor() {
    this.initializeNetworks()
    this.loadFromMemory()
  }

  // ==================== NETWORK INITIALIZATION ====================

  private initializeNetworks(): void {
    const networks: AffiliateNetwork[] = [
      {
        id: 'godaddy',
        name: 'GoDaddy',
        baseUrl: 'https://www.godaddy.com/domainsearch/find?domainToCheck=',
        affiliateId: 'empire2025',
        commission: 40,
        commissionType: 'percentage',
        active: true,
        priority: 100,
        avgConversionRate: 0.18,
        avgTimeToConvert: 2.4,
        lastPayout: 0,
      },
      {
        id: 'namecheap',
        name: 'Namecheap',
        baseUrl: 'https://www.namecheap.com/domains/registration/results/?domain=',
        affiliateId: 'empire',
        commission: 50,
        commissionType: 'percentage',
        active: true,
        priority: 95,
        avgConversionRate: 0.22,
        avgTimeToConvert: 1.8,
        lastPayout: 0,
      },
      {
        id: 'porkbun',
        name: 'Porkbun',
        baseUrl: 'https://porkbun.com/checkout/search?q=',
        affiliateId: 'EMPIRE2025',
        commission: 20,
        commissionType: 'flat',
        active: true,
        priority: 90,
        avgConversionRate: 0.15,
        avgTimeToConvert: 3.1,
        lastPayout: 0,
      },
      {
        id: 'dynadot',
        name: 'Dynadot',
        baseUrl: 'https://www.dynadot.com/domain/search.html?domain=',
        affiliateId: 'empire',
        commission: 15,
        commissionType: 'flat',
        active: true,
        priority: 85,
        avgConversionRate: 0.12,
        avgTimeToConvert: 4.2,
        lastPayout: 0,
      },
    ]

    networks.forEach(n => this.networks.set(n.id, n))
  }

  // ==================== PERSISTENCE ====================

  private loadFromMemory(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_affiliate')
      if (saved) {
        const data = JSON.parse(saved)
        this.clicks = data.clicks || []
        this.promotions = data.promotions || []
        this.dailyRevenue = data.dailyRevenue || 0
        this.totalRevenue = data.totalRevenue || 0
        this.isRunning = data.isRunning || false
        this.isPaused = data.isPaused || false
      }
    } catch (e) {
      logger.warn('AFFILIATE', 'Failed to load from memory')
    }
  }

  private saveToMemory(): void {
    try {
      localStorage.setItem('domainFlipper_affiliate', JSON.stringify({
        clicks: this.clicks.slice(-500),
        promotions: this.promotions.slice(-100),
        dailyRevenue: this.dailyRevenue,
        totalRevenue: this.totalRevenue,
        isRunning: this.isRunning,
        isPaused: this.isPaused,
      }))
    } catch (e) {
      logger.warn('AFFILIATE', 'Failed to save to memory')
    }
  }

  // ==================== CONTROL ====================

  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.isPaused = false
    
    // Track conversions every hour
    this.trackingLoop = setInterval(() => {
      if (!this.isPaused) {
        this.trackConversions()
      }
    }, 60 * 60 * 1000)

    logger.info('AFFILIATE', 'Affiliate engine started')
    this.saveToMemory()
    this.notifyListeners()
  }

  stop(): void {
    this.isRunning = false
    this.isPaused = true

    if (this.trackingLoop) {
      clearInterval(this.trackingLoop)
      this.trackingLoop = null
    }

    this.saveToMemory()
    this.notifyListeners()
  }

  pause(): void {
    this.isPaused = true
    this.saveToMemory()
    this.notifyListeners()
  }

  resume(): void {
    this.isPaused = false
    this.saveToMemory()
    this.notifyListeners()
  }

  toggle(): void {
    if (this.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
  }

  // ==================== PROMOTION ====================

  async promoteDomain(domain: string): Promise<AffiliatePromotion> {
    const links = this.generateLinks(domain)
    const predictedRevenue = this.predictPromotionRevenue(domain, links)

    const promotion: AffiliatePromotion = {
      domain,
      links,
      promotedAt: new Date(),
      channels: ['parking', 'social'],
      predictedTotalRevenue: predictedRevenue,
      actualRevenue: 0,
    }

    this.promotions.push(promotion)
    this.saveToMemory()

    logger.info('AFFILIATE', `Promoted ${domain} → Predicted $${predictedRevenue.toFixed(0)}`)

    return promotion
  }

  private generateLinks(domain: string): AffiliatePromotion['links'] {
    return Array.from(this.networks.values())
      .filter(n => n.active)
      .sort((a, b) => b.priority - a.priority)
      .map(network => {
        const predicted = network.avgConversionRate * 100 * network.commission
        return {
          network: network.name,
          url: this.buildUrl(domain, network),
          commission: network.commissionType === 'percentage'
            ? `${network.commission}%`
            : `$${network.commission}`,
          predictedRevenue: predicted,
        }
      })
  }

  private buildUrl(domain: string, network: AffiliateNetwork): string {
    const encoded = encodeURIComponent(domain)
    return `${network.baseUrl}${encoded}&ref=${network.affiliateId}`
  }

  private predictPromotionRevenue(domain: string, links: AffiliatePromotion['links']): number {
    // Simple prediction based on link count and avg conversion
    return links.reduce((sum, link) => sum + link.predictedRevenue * 0.1, 0)
  }

  // ==================== TRACKING ====================

  recordClick(domain: string, network: string): void {
    const click: AffiliateClick = {
      id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      domain,
      network,
      url: '',
      timestamp: new Date(),
      converted: false,
    }

    this.clicks.push(click)
    this.saveToMemory()
    this.notifyListeners()
  }

  recordConversion(clickId: string, commission: number): void {
    const click = this.clicks.find(c => c.id === clickId)
    if (click) {
      click.converted = true
      click.commission = commission
      this.dailyRevenue += commission
      this.totalRevenue += commission
      this.saveToMemory()
      this.notifyListeners()

      toast.success('💰 Affiliate Conversion!', {
        description: `+$${commission.toFixed(2)} from ${click.network}`,
      })
    }
  }

  private trackConversions(): void {
    // Simulate checking for conversions
    // In production, this would call affiliate network APIs
    const pendingClicks = this.clicks.filter(c => !c.converted)
    
    pendingClicks.forEach(click => {
      const network = this.networks.get(click.network.toLowerCase())
      if (network) {
        // Random conversion based on avg rate
        if (Math.random() < network.avgConversionRate * 0.1) {
          const commission = network.commissionType === 'percentage' 
            ? 12 * (network.commission / 100)
            : network.commission
          this.recordConversion(click.id, commission)
        }
      }
    })
  }

  // ==================== STATS ====================

  getStats(): AffiliateStats {
    const conversions = this.clicks.filter(c => c.converted)
    const totalCommission = conversions.reduce((sum, c) => sum + (c.commission || 0), 0)

    // Calculate top networks
    const networkStats = new Map<string, { revenue: number; clicks: number }>()
    this.clicks.forEach(click => {
      const existing = networkStats.get(click.network) || { revenue: 0, clicks: 0 }
      existing.clicks++
      if (click.converted) existing.revenue += click.commission || 0
      networkStats.set(click.network, existing)
    })

    const topNetworks = Array.from(networkStats.entries())
      .map(([network, data]) => ({ network, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      totalClicks: this.clicks.length,
      totalConversions: conversions.length,
      conversionRate: this.clicks.length > 0 ? (conversions.length / this.clicks.length) * 100 : 0,
      totalCommission,
      monthlyRecurringRevenue: this.dailyRevenue * 30,
      projectedYearly: totalCommission * 12,
      topNetworks,
      topDomains: [],
      roi: this.dailyRevenue,
      isActive: this.isRunning,
      isPaused: this.isPaused,
    }
  }

  isActive(): boolean {
    return this.isRunning && !this.isPaused
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (stats: AffiliateStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getStats()))
  }
}

// ==================== SINGLETON ====================

export const affiliateEngine = new AffiliateEngine()
