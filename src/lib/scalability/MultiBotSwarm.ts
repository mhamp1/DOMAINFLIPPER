/**
 * MultiBotSwarm.ts — EMPIRE SCALING ENGINE
 * Deploy multiple bots with different strategies for 10x profit
 * December 2025 — One empire, many soldiers
 */

import { toast } from 'sonner'

// ==================== TYPES ====================

interface BotConfig {
  id: string
  name: string
  strategy: 'quick-flip' | 'premium-hold' | 'trend-rider' | 'lease-focus' | 'auction-sniper' | 'affiliate'
  status: 'active' | 'paused' | 'stopped' | 'error'
  capitalAllocation?: number // percentage of total capital (optional, uses strategy default)
  maxDailyBudget?: number
  targetROI?: number
  riskLevel?: 'conservative' | 'balanced' | 'aggressive'
  tldFocus?: string[]
  priceRange?: { min: number; max: number }
  autoScaling: boolean
}

interface BotStats {
  id: string
  domainsOwned: number
  domainsSold: number
  totalProfit: number
  todayProfit: number
  winRate: number
  avgROI: number
  lastAction: Date | null
  uptime: number
  decisionsToday: number
  capitalUsed: number
}

interface SwarmConfig {
  maxBots: number
  totalCapital: number
  autoRebalance: boolean
  rebalanceInterval: number // hours
  minBotCapital: number
  profitSharingEnabled: boolean
}

interface SwarmStats {
  totalBots: number
  activeBots: number
  totalCapital: number
  totalProfit: number
  todayProfit: number
  combinedWinRate: number
  bestPerformer: string | null
  worstPerformer: string | null
}

// ==================== MULTI-BOT SWARM ====================

export class MultiBotSwarm {
  private bots: Map<string, BotConfig> = new Map()
  private botStats: Map<string, BotStats> = new Map()
  private config: SwarmConfig
  private rebalanceInterval: ReturnType<typeof setInterval> | null = null

  constructor(config?: Partial<SwarmConfig>) {
    this.config = {
      maxBots: 10,
      totalCapital: 10000,
      autoRebalance: true,
      rebalanceInterval: 24,
      minBotCapital: 500,
      profitSharingEnabled: true,
      ...config,
    }
  }

  // ==================== BOT MANAGEMENT ====================

  /**
   * Create a new bot with specific strategy
   */
  createBot(params: Partial<BotConfig> & { name: string; strategy: BotConfig['strategy'] }): BotConfig {
    if (this.bots.size >= this.config.maxBots) {
      throw new Error(`Maximum bot limit (${this.config.maxBots}) reached`)
    }

    const id = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    
    // Default configs by strategy
    const strategyDefaults: Record<BotConfig['strategy'], Partial<BotConfig>> = {
      'quick-flip': {
        capitalAllocation: 20,
        maxDailyBudget: 500,
        targetROI: 100,
        riskLevel: 'aggressive',
        tldFocus: ['.com', '.io'],
        priceRange: { min: 10, max: 100 },
      },
      'premium-hold': {
        capitalAllocation: 30,
        maxDailyBudget: 1000,
        targetROI: 500,
        riskLevel: 'conservative',
        tldFocus: ['.com'],
        priceRange: { min: 500, max: 10000 },
      },
      'trend-rider': {
        capitalAllocation: 15,
        maxDailyBudget: 300,
        targetROI: 200,
        riskLevel: 'balanced',
        tldFocus: ['.ai', '.io', '.com'],
        priceRange: { min: 50, max: 500 },
      },
      'lease-focus': {
        capitalAllocation: 20,
        maxDailyBudget: 500,
        targetROI: 50, // Monthly yield target
        riskLevel: 'conservative',
        tldFocus: ['.com', '.co'],
        priceRange: { min: 200, max: 2000 },
      },
      'auction-sniper': {
        capitalAllocation: 10,
        maxDailyBudget: 200,
        targetROI: 300,
        riskLevel: 'aggressive',
        tldFocus: ['.com', '.net', '.org'],
        priceRange: { min: 5, max: 200 },
      },
      'affiliate': {
        capitalAllocation: 5,
        maxDailyBudget: 100,
        targetROI: 50,
        riskLevel: 'conservative',
        tldFocus: ['*'],
        priceRange: { min: 0, max: 0 }, // No purchases, just promotions
      },
    }

    const bot: BotConfig = {
      id,
      name: params.name,
      strategy: params.strategy,
      status: 'paused',
      autoScaling: true,
      ...strategyDefaults[params.strategy],
      ...params,
    }

    this.bots.set(id, bot)
    
    // Initialize stats
    this.botStats.set(id, {
      id,
      domainsOwned: 0,
      domainsSold: 0,
      totalProfit: 0,
      todayProfit: 0,
      winRate: 0,
      avgROI: 0,
      lastAction: null,
      uptime: 0,
      decisionsToday: 0,
      capitalUsed: 0,
    })

    toast.success(`🤖 Bot "${bot.name}" created`, {
      description: `Strategy: ${bot.strategy} | Capital: ${bot.capitalAllocation}%`,
    })

    return bot
  }

  /**
   * Start a bot
   */
  startBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (!bot) throw new Error('Bot not found')

    bot.status = 'active'
    
    toast.success(`▶️ Bot "${bot.name}" started`, {
      description: `Running ${bot.strategy} strategy`,
    })
  }

  /**
   * Pause a bot
   */
  pauseBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (!bot) throw new Error('Bot not found')

    bot.status = 'paused'
    toast.info(`⏸️ Bot "${bot.name}" paused`)
  }

  /**
   * Stop and remove a bot
   */
  removeBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (!bot) throw new Error('Bot not found')

    bot.status = 'stopped'
    this.bots.delete(botId)
    this.botStats.delete(botId)

    toast.info(`🗑️ Bot "${bot.name}" removed`)
  }

  /**
   * Update bot configuration
   */
  updateBot(botId: string, updates: Partial<BotConfig>): BotConfig {
    const bot = this.bots.get(botId)
    if (!bot) throw new Error('Bot not found')

    Object.assign(bot, updates)
    return bot
  }

  // ==================== CAPITAL ALLOCATION ====================

  /**
   * Allocate capital to a bot
   */
  allocateCapital(botId: string, percentage: number): void {
    const bot = this.bots.get(botId)
    if (!bot) throw new Error('Bot not found')

    // Check total allocation doesn't exceed 100%
    const currentTotal = Array.from(this.bots.values())
      .filter(b => b.id !== botId)
      .reduce((sum, b) => sum + b.capitalAllocation, 0)

    if (currentTotal + percentage > 100) {
      throw new Error(`Capital allocation would exceed 100% (current: ${currentTotal}%)`)
    }

    bot.capitalAllocation = percentage
    
    toast.success(`💰 Capital reallocated`, {
      description: `${bot.name}: ${percentage}% ($${Math.round(this.config.totalCapital * percentage / 100).toLocaleString()})`,
    })
  }

  /**
   * Get capital allocated to a bot
   */
  getBotCapital(botId: string): number {
    const bot = this.bots.get(botId)
    if (!bot) return 0
    return (this.config.totalCapital * bot.capitalAllocation) / 100
  }

  /**
   * Auto-rebalance capital based on performance
   */
  rebalanceCapital(): void {
    const bots = Array.from(this.bots.values()).filter(b => b.status === 'active')
    if (bots.length === 0) return

    // Calculate performance scores
    const scores = bots.map(bot => {
      const stats = this.botStats.get(bot.id)
      if (!stats) return { bot, score: 0 }
      
      // Score based on ROI, win rate, and consistency
      const roiScore = Math.min(100, stats.avgROI / 5)
      const winScore = stats.winRate
      const activityScore = stats.decisionsToday > 0 ? 20 : 0
      
      return { bot, score: (roiScore + winScore + activityScore) / 3 }
    })

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
    if (totalScore === 0) return

    // Reallocate proportionally to scores (with minimum)
    const minAllocation = 5
    const allocatablePercent = 100 - (minAllocation * bots.length)

    scores.forEach(({ bot, score }) => {
      const proportionalAllocation = allocatablePercent * (score / totalScore)
      bot.capitalAllocation = Math.round(minAllocation + proportionalAllocation)
    })

    // Normalize to exactly 100%
    const total = bots.reduce((sum, b) => sum + b.capitalAllocation, 0)
    if (total !== 100 && bots.length > 0) {
      bots[0].capitalAllocation += (100 - total)
    }

    toast.success('⚖️ Capital rebalanced', {
      description: `Optimized allocation based on performance`,
    })
  }

  // ==================== SWARM OPERATIONS ====================

  /**
   * Start all bots
   */
  startSwarm(): void {
    this.bots.forEach(bot => {
      if (bot.status === 'paused') {
        bot.status = 'active'
      }
    })

    // Start auto-rebalancing
    if (this.config.autoRebalance) {
      this.startAutoRebalance()
    }

    toast.success('🚀 SWARM LAUNCHED', {
      description: `${this.bots.size} bots now active`,
      icon: '🐝',
    })
  }

  /**
   * Pause all bots
   */
  pauseSwarm(): void {
    this.bots.forEach(bot => {
      if (bot.status === 'active') {
        bot.status = 'paused'
      }
    })

    this.stopAutoRebalance()

    toast.info('⏸️ Swarm paused', {
      description: 'All bots paused',
    })
  }

  /**
   * Start automatic rebalancing
   */
  private startAutoRebalance(): void {
    if (this.rebalanceInterval) return

    this.rebalanceInterval = setInterval(() => {
      this.rebalanceCapital()
    }, this.config.rebalanceInterval * 60 * 60 * 1000)
  }

  /**
   * Stop automatic rebalancing
   */
  private stopAutoRebalance(): void {
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval)
      this.rebalanceInterval = null
    }
  }

  // ==================== PRESET CONFIGURATIONS ====================

  /**
   * Create a balanced swarm with recommended bots
   */
  createBalancedSwarm(): void {
    // Clear existing bots
    this.bots.clear()
    this.botStats.clear()

    // Create balanced portfolio of bots
    const presets = [
      { name: 'Alpha Flipper', strategy: 'quick-flip' as const, capitalAllocation: 20 },
      { name: 'Premium Hunter', strategy: 'premium-hold' as const, capitalAllocation: 25 },
      { name: 'Trend Surfer', strategy: 'trend-rider' as const, capitalAllocation: 15 },
      { name: 'Lease Master', strategy: 'lease-focus' as const, capitalAllocation: 20 },
      { name: 'Auction Hawk', strategy: 'auction-sniper' as const, capitalAllocation: 15 },
      { name: 'Affiliate Pro', strategy: 'affiliate' as const, capitalAllocation: 5 },
    ]

    presets.forEach(preset => this.createBot(preset))

    toast.success('🐝 BALANCED SWARM DEPLOYED', {
      description: '6 specialized bots ready for action',
      icon: '⚡',
    })
  }

  /**
   * Create aggressive growth swarm
   */
  createAggressiveSwarm(): void {
    this.bots.clear()
    this.botStats.clear()

    const presets = [
      { name: 'Speed Demon 1', strategy: 'quick-flip' as const, capitalAllocation: 25, riskLevel: 'aggressive' as const },
      { name: 'Speed Demon 2', strategy: 'quick-flip' as const, capitalAllocation: 25, riskLevel: 'aggressive' as const },
      { name: 'Trend Chaser', strategy: 'trend-rider' as const, capitalAllocation: 20, riskLevel: 'aggressive' as const },
      { name: 'Auction Sniper', strategy: 'auction-sniper' as const, capitalAllocation: 20, riskLevel: 'aggressive' as const },
      { name: 'Affiliate Machine', strategy: 'affiliate' as const, capitalAllocation: 10 },
    ]

    presets.forEach(preset => this.createBot(preset))

    toast.success('🔥 AGGRESSIVE SWARM DEPLOYED', {
      description: '5 high-velocity bots ready',
      icon: '🚀',
    })
  }

  /**
   * Create passive income swarm
   */
  createPassiveSwarm(): void {
    this.bots.clear()
    this.botStats.clear()

    const presets = [
      { name: 'Lease Bot 1', strategy: 'lease-focus' as const, capitalAllocation: 35, riskLevel: 'conservative' as const },
      { name: 'Lease Bot 2', strategy: 'lease-focus' as const, capitalAllocation: 35, riskLevel: 'conservative' as const },
      { name: 'Premium Collector', strategy: 'premium-hold' as const, capitalAllocation: 20, riskLevel: 'conservative' as const },
      { name: 'Affiliate Stream', strategy: 'affiliate' as const, capitalAllocation: 10 },
    ]

    presets.forEach(preset => this.createBot(preset))

    toast.success('💤 PASSIVE SWARM DEPLOYED', {
      description: '4 income-generating bots ready',
      icon: '🏖️',
    })
  }

  // ==================== STATS & MONITORING ====================

  /**
   * Update bot stats (called by individual bots)
   */
  updateBotStats(botId: string, updates: Partial<BotStats>): void {
    const stats = this.botStats.get(botId)
    if (!stats) return
    Object.assign(stats, updates)
  }

  /**
   * Record a profit event for a bot
   */
  recordProfit(botId: string, profit: number, domain: string): void {
    const stats = this.botStats.get(botId)
    if (!stats) return

    stats.totalProfit += profit
    stats.todayProfit += profit
    stats.domainsSold++
    stats.lastAction = new Date()

    // Recalculate win rate and ROI
    const totalTrades = stats.domainsOwned + stats.domainsSold
    if (totalTrades > 0) {
      stats.winRate = (stats.domainsSold / totalTrades) * 100
    }

    // Profit sharing
    if (this.config.profitSharingEnabled && profit > 0) {
      this.distributeProfit(botId, profit)
    }

    toast.success(`🤖 Bot profit recorded`, {
      description: `${this.bots.get(botId)?.name}: +$${profit.toLocaleString()} from ${domain}`,
    })
  }

  /**
   * Distribute profit to other bots (profit sharing)
   */
  private distributeProfit(sourceBotId: string, profit: number): void {
    const activeBots = Array.from(this.bots.values()).filter(b => b.id !== sourceBotId && b.status === 'active')
    if (activeBots.length === 0) return

    // Share 10% of profit with other bots proportionally
    const sharePool = profit * 0.1
    const totalAllocation = activeBots.reduce((sum, b) => sum + b.capitalAllocation, 0)

    activeBots.forEach(bot => {
      const share = (bot.capitalAllocation / totalAllocation) * sharePool
      const stats = this.botStats.get(bot.id)
      if (stats) {
        stats.totalProfit += share
      }
    })
  }

  /**
   * Get swarm-wide statistics
   */
  getSwarmStats(): SwarmStats {
    const allStats = Array.from(this.botStats.values())
    const activeBots = Array.from(this.bots.values()).filter(b => b.status === 'active')

    const totalProfit = allStats.reduce((sum, s) => sum + s.totalProfit, 0)
    const todayProfit = allStats.reduce((sum, s) => sum + s.todayProfit, 0)
    const combinedWinRate = allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.winRate, 0) / allStats.length
      : 0

    // Find best/worst performers
    const sorted = [...allStats].sort((a, b) => b.totalProfit - a.totalProfit)
    const bestPerformer = sorted[0] ? this.bots.get(sorted[0].id)?.name || null : null
    const worstPerformer = sorted.length > 1 ? this.bots.get(sorted[sorted.length - 1].id)?.name || null : null

    return {
      totalBots: this.bots.size,
      activeBots: activeBots.length,
      totalCapital: this.config.totalCapital,
      totalProfit,
      todayProfit,
      combinedWinRate,
      bestPerformer,
      worstPerformer,
    }
  }

  /**
   * Get all bots
   */
  getBots(): BotConfig[] {
    return Array.from(this.bots.values())
  }

  /**
   * Get bot by ID
   */
  getBot(botId: string): BotConfig | undefined {
    return this.bots.get(botId)
  }

  /**
   * Get stats for a specific bot
   */
  getBotStats(botId: string): BotStats | undefined {
    return this.botStats.get(botId)
  }

  /**
   * Set total swarm capital
   */
  setTotalCapital(amount: number): void {
    this.config.totalCapital = amount
    toast.success('💰 Swarm capital updated', {
      description: `Total: $${amount.toLocaleString()}`,
    })
  }

  /**
   * Reset daily stats for all bots
   */
  resetDailyStats(): void {
    this.botStats.forEach(stats => {
      stats.todayProfit = 0
      stats.decisionsToday = 0
    })
  }
}

// Export singleton
export const multiBotSwarm = new MultiBotSwarm()

