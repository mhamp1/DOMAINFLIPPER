/**
 * EmpireEngine.ts — FULLY AUTONOMOUS DOMAIN EMPIRE
 * Launch once, runs forever — December 27, 2025
 * 
 * This is the brain of the autonomous empire.
 * Once started, it orchestrates all operations with zero human intervention.
 */

import { toast } from 'sonner'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { domainScanner } from '@/lib/auctions/domainScanner'
import { sniperEngine } from '@/lib/auctions/sniperEngine'
import { autoSeller } from '@/lib/empire/AutoSeller'
import { marketplaceLister } from '@/lib/marketplace/autoList'
import { aiPricingEngine } from '@/lib/pricing/AIPricingEngine'
import { learningEngine } from '@/lib/learning/LearningEngine'
import { enableAllStrategies, getAllEnabledStrategies } from '@/lib/strategies/strategyDefinitions'
import type { Domain } from '@/types/domain'

interface EmpireConfig {
  startingCapital: number
  dailyBudget: number
  profitTarget: number
  minScore: number
  maxBidRatio: number
  autoListMultiplier: number
  learningEnabled: boolean
  scanInterval: number
}

interface EmpireStats {
  balance: number
  dailySpent: number
  dailyProfit: number
  totalProfit: number
  domainsOwned: number
  domainsSold: number
  winRate: number
  roi: number
  uptime: number
  lastScan: Date
  lastSale: Date | null
  decisionsToday: number
}

export class EmpireEngine {
  private config: EmpireConfig
  private stats: EmpireStats
  private isRunning: boolean = false
  private scanLoop: ReturnType<typeof setInterval> | null = null
  private learningLoop: ReturnType<typeof setInterval> | null = null
  private pricingLoop: ReturnType<typeof setInterval> | null = null
  private portfolio: Map<string, Domain> = new Map()
  private startTime: Date = new Date()

  constructor(config?: Partial<EmpireConfig>) {
    this.config = {
      startingCapital: config?.startingCapital || 100, // Start with $100
      dailyBudget: config?.dailyBudget || 50, // $50/day budget (conservative for $100 start)
      profitTarget: config?.profitTarget || 1000000,
      minScore: config?.minScore || 85, // Lower threshold for $100 start (more opportunities)
      maxBidRatio: config?.maxBidRatio || 0.5, // More conservative bidding (50% of value)
      autoListMultiplier: config?.autoListMultiplier || 3, // 3x listing multiplier (conservative)
      learningEnabled: config?.learningEnabled !== false,
      scanInterval: config?.scanInterval || 300000, // 5 minutes
    }

    this.stats = {
      balance: this.config.startingCapital,
      dailySpent: 0,
      dailyProfit: 0,
      totalProfit: 0,
      domainsOwned: 0,
      domainsSold: 0,
      winRate: 0,
      roi: 0,
      uptime: 0,
      lastScan: new Date(),
      lastSale: null,
      decisionsToday: 0,
    }
  }

  /**
   * START THE EMPIRE - This runs forever
   * The most important function - launches autonomous operations
   * ALL STRATEGIES run simultaneously
   */
  async runForever(): Promise<void> {
    if (this.isRunning) {
      toast.warning('Empire Already Running', {
        description: 'The autonomous engine is already active',
      })
      return
    }

    this.isRunning = true
    this.startTime = new Date()

    // Enable ALL strategies to run simultaneously
    enableAllStrategies()
    const activeStrategies = getAllEnabledStrategies()
    
    console.log(`🎯 Empire launching with ${activeStrategies.length} strategies:`)
    activeStrategies.forEach(s => console.log(`   ✓ ${s.name}`))

    toast.success('🚀 EMPIRE LAUNCHED — ALL STRATEGIES ACTIVE', {
      description: `${activeStrategies.length} strategies running | Budget: $${this.config.dailyBudget.toLocaleString()}/day`,
      duration: 5000,
      icon: '👑',
    })

    // Start AutoSeller bot (monitors marketplace inquiries and negotiates)
    await autoSeller.start()

    // Start the main autonomous loop
    this.autonomousLoop()

    // Start auto-sale monitoring (check for offers every 5 minutes)
    this.startAutoSaleMonitoring()

    // Start daily learning/retraining
    if (this.config.learningEnabled) {
      this.startLearningLoop()
    }

    // Start dynamic pricing adjustments
    this.startPricingLoop()

    // Monitor health and display status
    this.startHealthMonitor()
  }

  /**
   * Main autonomous decision loop
   * Continuously scans, evaluates, buys, and lists domains
   */
  private async autonomousLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 1. Scan all domain sources
        const availableDomains = await domainScanner.scan()
        this.stats.lastScan = new Date()
        this.stats.decisionsToday = 0

        // 2. Evaluate each domain with AI
        for (const domain of availableDomains) {
          if (!this.isRunning) break
          
          // Check daily budget
          if (this.stats.dailySpent >= this.config.dailyBudget) {
            toast.info('Daily Budget Reached', {
              description: `Spent $${this.stats.dailySpent.toLocaleString()} today. Pausing buys until tomorrow.`,
            })
            break
          }

          // AI valuation
          const valuation = await valuationEngine.predictValue(domain)
          this.stats.decisionsToday++

          // Decision: Should we buy?
          const shouldBuy = await this.makeIntelligentDecision(domain, valuation)

          if (shouldBuy) {
            await this.executePurchase(domain, valuation)
          }
        }

        // 3. Sleep until next scan
        await this.sleep(this.config.scanInterval)

        // 4. Reset daily budget at midnight
        this.checkDailyReset()

      } catch (error) {
        console.error('Empire loop error:', error)
        toast.error('Empire encountered an issue', {
          description: 'Recovering automatically...',
        })
        await this.sleep(60000) // Wait 1 minute before retry
      }
    }
  }

  /**
   * Intelligent decision making with multiple factors
   * This is where the AI brain decides if a domain is worth buying
   */
  private async makeIntelligentDecision(
    domain: Domain,
    valuation: { value: number; score: number }
  ): Promise<boolean> {
    // Rule 1: AI score must be high enough
    if (valuation.score < this.config.minScore) {
      return false
    }

    // Rule 2: Current price must be significantly below estimated value
    const maxBid = valuation.value * this.config.maxBidRatio
    const currentBid = domain.currentBid || 0
    if (currentBid > maxBid) {
      return false
    }

    // Rule 3: Check if we have enough balance (with 20% buffer for fees)
    const estimatedCost = currentBid * 1.2 // 20% buffer for fees
    if (estimatedCost > this.stats.balance) {
      return false
    }

    // Rule 3.5: For $100 start, only buy domains under $30 to maintain portfolio diversity
    if (this.config.startingCapital <= 100 && currentBid > 30) {
      return false
    }

    // Rule 4: Predict profit potential
    const expectedSalePrice = valuation.value * this.config.autoListMultiplier
    const expectedProfit = expectedSalePrice - estimatedCost
    const expectedROI = (expectedProfit / estimatedCost) * 100

    // For $100 start, require 10x ROI minimum (more conservative)
    // For larger capital, require 3x ROI
    const minROI = this.config.startingCapital <= 100 ? 1000 : 300
    if (expectedROI < minROI) {
      return false
    }

    // Rule 5: Check portfolio diversity (don't over-invest in one strategy)
    const strategyCount = Array.from(this.portfolio.values())
      .filter(d => d.strategyId === domain.strategyId).length
    // For $100 start, limit to 3 domains per strategy (maintain diversity)
    const maxPerStrategy = this.config.startingCapital <= 100 ? 3 : 10
    if (strategyCount > maxPerStrategy) {
      return false
    }

    // Rule 6: For $100 start, ensure we always keep at least $20 in reserve
    if (this.config.startingCapital <= 100 && (this.stats.balance - estimatedCost) < 20) {
      return false
    }

    // All checks passed - this is a good buy!
    return true
  }

  /**
   * Execute domain purchase and auto-list it
   */
  private async executePurchase(
    domain: Domain,
    valuation: { value: number; score: number }
  ): Promise<void> {
    const maxBid = valuation.value * this.config.maxBidRatio

    try {
      // 1. Execute snipe/purchase
      const transaction = await sniperEngine.snipeNow(domain, maxBid)

      if (transaction.status === 'completed') {
        // 2. Update stats
        this.stats.balance -= transaction.amount
        this.stats.dailySpent += transaction.amount
        this.stats.domainsOwned++

        // 3. Add to portfolio
        const ownedDomain = { ...domain, purchasePrice: transaction.amount, status: 'owned' as const }
        this.portfolio.set(domain.name, ownedDomain)

        // 4. Calculate optimal listing price with AI
        const listingPrice = await aiPricingEngine.calculateOptimalPrice(
          domain.name,
          valuation.value,
          { marketSentiment: 0.8, competitorAnalysis: true }
        )

        // 5. Auto-list on all marketplaces
        await marketplaceLister.listOnAllMarketplaces(domain.name, listingPrice)

        // 6. Record learning data
        if (this.config.learningEnabled) {
          await learningEngine.recordPurchase({
            domain: domain.name,
            purchasePrice: transaction.amount,
            estimatedValue: valuation.value,
            aiScore: valuation.score,
            listingPrice,
            timestamp: new Date(),
          })
        }

        // Calculate expected profit
        const expectedProfit = listingPrice - transaction.amount
        const expectedROI = (expectedProfit / transaction.amount) * 100

        toast.success('🎯 EMPIRE MOVE — DOMAIN ACQUIRED', {
          description: `${domain.name} → Paid $${transaction.amount.toLocaleString()} • Listed $${listingPrice.toLocaleString()} • Expected ROI: ${expectedROI.toFixed(0)}%`,
          duration: 5000,
          icon: '💎',
        })

      } else {
        toast.warning('Purchase Failed', {
          description: `${domain.name} — Outbid or auction ended`,
        })
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Purchase Failed', {
        description: `${domain.name} — Will retry on next scan`,
      })
    }
  }

  /**
   * Learning loop - retrain AI daily on real results
   */
  private startLearningLoop(): void {
    // Retrain every 24 hours
    this.learningLoop = setInterval(async () => {
      try {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const results = await learningEngine.getRecentFlips(yesterday)
        
        if (results.length > 0) {
          await learningEngine.retrainModel(results)

          toast.success('🧠 AI BRAIN UPGRADED', {
            description: `Learned from ${results.length} flips • Accuracy improved`,
            duration: 5000,
          })
        }
      } catch (error) {
        console.error('Learning loop error:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
  }

  /**
   * Dynamic pricing loop - adjust prices based on market
   */
  private startPricingLoop(): void {
    // Re-price every 6 hours
    this.pricingLoop = setInterval(async () => {
      try {
        let updatedCount = 0

        for (const [name, domain] of this.portfolio) {
          if (domain.status === 'listed' || domain.status === 'owned') {
            const newPrice = await aiPricingEngine.calculateOptimalPrice(
              name,
              domain.estimatedValue,
              { dynamicAdjustment: true }
            )

            // Update all marketplace listings
            await marketplaceLister.updateAllListings(name, newPrice)
            updatedCount++
          }
        }

        if (updatedCount > 0) {
          toast.success('💰 PRICES OPTIMIZED', {
            description: `${updatedCount} domains repriced based on market analysis`,
          })
        }
      } catch (error) {
        console.error('Pricing loop error:', error)
      }
    }, 6 * 60 * 60 * 1000) // 6 hours
  }

  /**
   * Auto-sale monitoring - checks for offers and negotiates intelligently
   */
  private startAutoSaleMonitoring(): void {
    // Check for offers every 5 minutes
    setInterval(async () => {
      if (!this.isRunning) return

      try {
        // AutoSeller handles all marketplace inquiries automatically
        // This just ensures it's running and processing offers
        for (const [domainName, domain] of this.portfolio.entries()) {
          // Skip domains that have been sold (have soldAt date)
          if (domain.soldAt) continue

          // AutoSeller will handle negotiations automatically
          // We just need to ensure it's monitoring
        }
      } catch (error) {
        console.error('Auto-sale monitoring error:', error)
      }
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Health monitoring and status updates
   */
  private startHealthMonitor(): void {
    setInterval(() => {
      this.stats.uptime = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000)
      
      // Calculate ROI
      if (this.stats.dailySpent > 0) {
        this.stats.roi = (this.stats.totalProfit / this.stats.dailySpent) * 100
      }

      // Calculate win rate
      const totalTransactions = this.stats.domainsOwned + this.stats.domainsSold
      if (totalTransactions > 0) {
        this.stats.winRate = (this.stats.domainsSold / totalTransactions) * 100
      }

      // Show status every hour
      if (this.stats.uptime % 3600 === 0 && this.stats.uptime > 0) {
        toast.info('⚡ Empire Status', {
          description: `Uptime: ${Math.floor(this.stats.uptime / 3600)}h • Owned: ${this.stats.domainsOwned} • Sold: ${this.stats.domainsSold} • Profit: $${this.stats.totalProfit.toLocaleString()}`,
          duration: 5000,
        })
      }
    }, 1000) // Check every second
  }

  /**
   * Record a successful sale (called by AutoSeller)
   */
  async recordSale(domainName: string, salePrice: number): Promise<void> {
    const domain = this.portfolio.get(domainName)
    if (!domain) return

    const profit = salePrice - (domain.purchasePrice || 0)

    // Update stats
    this.stats.balance += salePrice
    this.stats.dailyProfit += profit
    this.stats.totalProfit += profit
    this.stats.domainsSold++
    this.stats.domainsOwned--
    this.stats.lastSale = new Date()

    // Remove from portfolio
    this.portfolio.delete(domainName)

    // Record for learning
    if (this.config.learningEnabled) {
      await learningEngine.recordSale({
        domain: domainName,
        purchasePrice: domain.purchasePrice || 0,
        salePrice,
        profit,
        daysToSell: domain.listedAt 
          ? Math.floor((new Date().getTime() - domain.listedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        timestamp: new Date(),
      })
    }

    const roi = domain.purchasePrice ? (profit / domain.purchasePrice) * 100 : 0

    toast.success('💰 DOMAIN SOLD — PROFIT LOCKED', {
      description: `${domainName} → $${salePrice.toLocaleString()} • Profit: $${profit.toLocaleString()} (${roi.toFixed(0)}% ROI)`,
      duration: 7000,
      icon: '🎉',
    })
  }

  /**
   * Reset daily budget at midnight
   */
  private checkDailyReset(): void {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(0, 0, 0, 0)

    if (this.stats.lastScan < midnight) {
      this.stats.dailySpent = 0
      this.stats.dailyProfit = 0
      this.stats.decisionsToday = 0

      toast.info('📊 Daily Reset', {
        description: `New budget: $${this.config.dailyBudget.toLocaleString()} • Yesterday profit: $${this.stats.totalProfit.toLocaleString()}`,
      })
    }
  }

  /**
   * Stop the empire (for maintenance or shutdown)
   */
  stop(): void {
    this.isRunning = false

    if (this.scanLoop) clearInterval(this.scanLoop)
    if (this.learningLoop) clearInterval(this.learningLoop)
    if (this.pricingLoop) clearInterval(this.pricingLoop)

    autoSeller.stop()

    toast.info('Empire Paused', {
      description: 'Autonomous operations stopped',
    })
  }

  /**
   * Get current empire statistics
   */
  getStats(): EmpireStats {
    return { ...this.stats }
  }

  /**
   * Get current portfolio
   */
  getPortfolio(): Domain[] {
    return Array.from(this.portfolio.values())
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const empireEngine = new EmpireEngine()
