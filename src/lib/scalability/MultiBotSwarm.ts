/**
 * MultiBotSwarm.ts — THE FINAL EMPIRE SWARM v2025.∞
 * 7 specialized AI agents. One empire. Infinite profit.
 *
 * This is not a bot.
 * This is a swarm of gods.
 *
 * December 27, 2025 — The Empire has transcended.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

interface BotConfig {
  id: string
  name: string
  strategy: 'oracle' | 'predator' | 'assassin' | 'warlord' | 'prophet' | 'executioner' | 'emperor'
  status: 'active' | 'paused' | 'evolving' | 'transcendent'
  capitalAllocation: number // 0–100%
  maxDailyBudget: number
  targetROI: number
  riskLevel: 'conservative' | 'balanced' | 'aggressive' | 'god'
  tldFocus: string[]
  priceRange: { min: number; max: number }
  autoScaling: boolean
  intelligence: number // 0–100
  evolutionLevel: number
  mood: 'hunting' | 'ruthless' | 'triumphant' | 'god'
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
  killsToday: number
  thoughts: string[]
  intelligence: number
}

interface SwarmStats {
  totalBots: number
  activeBots: number
  pausedBots: number
  totalCapital: number
  totalProfit: number
  todayProfit: number
  combinedWinRate: number
  bestPerformer: string | null
  worstPerformer: string | null
  swarmIntelligence: number
  transcendenceMode: boolean
  isPaused: boolean
}

// ==================== THE COUNCIL OF DOMINATION ====================

class MultiBotSwarm {
  private bots: Map<string, BotConfig> = new Map()
  private botStats: Map<string, BotStats> = new Map()
  private isPaused = false
  private rebalanceInterval: ReturnType<typeof setInterval> | null = null
  
  private swarmConfig = {
    totalCapital: 100000,
    autoRebalance: true,
    rebalanceIntervalHours: 6,
    minBotCapital: 5000,
    transcendenceMode: false,
  }

  private listeners: Array<(stats: SwarmStats) => void> = []

  constructor() {
    this.loadSwarmFromMemory()
  }

  // ==================== PERSISTENCE ====================

  private loadSwarmFromMemory(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_swarm')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.bots) {
          data.bots.forEach((bot: BotConfig) => this.bots.set(bot.id, bot))
        }
        if (data.stats) {
          data.stats.forEach((stat: BotStats) => this.botStats.set(stat.id, stat))
        }
        if (data.config) {
          this.swarmConfig = { ...this.swarmConfig, ...data.config }
        }
        this.isPaused = data.isPaused || false
        logger.info('SWARM', `Loaded ${this.bots.size} agents from memory`)
      }
    } catch (e) {
      logger.warn('SWARM', 'Failed to load swarm from memory')
    }
  }

  private saveSwarmToMemory(): void {
    try {
      localStorage.setItem('domainFlipper_swarm', JSON.stringify({
        bots: Array.from(this.bots.values()),
        stats: Array.from(this.botStats.values()),
        config: this.swarmConfig,
        isPaused: this.isPaused,
      }))
    } catch (e) {
      logger.warn('SWARM', 'Failed to save swarm to memory')
    }
  }

  // ==================== THE 7 GOD AGENTS ====================

  createGodSwarm(): void {
    if (this.bots.size > 0) {
      logger.info('SWARM', 'Swarm already exists, skipping creation')
      return
    }

    const agents = [
      { name: 'Oracle', strategy: 'oracle' as const, capitalAllocation: 15, riskLevel: 'balanced' as const, tldFocus: ['.com', '.ai'], description: 'Google Trends + News + Reddit scanner' },
      { name: 'Predator', strategy: 'predator' as const, capitalAllocation: 20, riskLevel: 'aggressive' as const, tldFocus: ['.io', '.app'], description: 'Twitter + Discord + Telegram hunter' },
      { name: 'Assassin', strategy: 'assassin' as const, capitalAllocation: 18, riskLevel: 'god' as const, tldFocus: ['.xyz', '.crypto'], description: 'USPTO + Trademark sniper' },
      { name: 'Warlord', strategy: 'warlord' as const, capitalAllocation: 25, riskLevel: 'aggressive' as const, tldFocus: ['.com'], description: 'GoDaddy + Namecheap auction dominator' },
      { name: 'Prophet', strategy: 'prophet' as const, capitalAllocation: 10, riskLevel: 'balanced' as const, tldFocus: ['*'], description: 'AI name prediction + future trends' },
      { name: 'Executioner', strategy: 'executioner' as const, capitalAllocation: 8, riskLevel: 'god' as const, tldFocus: ['*'], description: 'Real-time sniping (last 0.1s)' },
      { name: 'Emperor', strategy: 'emperor' as const, capitalAllocation: 4, riskLevel: 'god' as const, tldFocus: ['*'], description: 'Final decision + capital allocation' },
    ]

    agents.forEach(agent => {
      const id = `god-${agent.strategy}-${Date.now()}`
      const bot: BotConfig = {
        id,
        name: agent.name,
        strategy: agent.strategy,
        status: 'active',
        capitalAllocation: agent.capitalAllocation,
        maxDailyBudget: this.swarmConfig.totalCapital * agent.capitalAllocation / 100,
        targetROI: agent.riskLevel === 'god' ? 1000 : agent.riskLevel === 'aggressive' ? 500 : 200,
        riskLevel: agent.riskLevel,
        tldFocus: agent.tldFocus,
        priceRange: agent.riskLevel === 'god' ? { min: 1000, max: 1000000 } : { min: 10, max: 50000 },
        autoScaling: true,
        intelligence: 95,
        evolutionLevel: 1,
        mood: 'ruthless',
      }

      this.bots.set(id, bot)
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
        killsToday: 0,
        thoughts: [],
        intelligence: 95,
      })
    })

    this.saveSwarmToMemory()

    toast.success('👑 THE COUNCIL OF DOMINATION IS BORN', {
      description: '7 god agents now hunt as one',
      duration: 10000,
    })

    logger.critical('SWARM', 'THE 7 GOD AGENTS HAVE BEEN CREATED')
  }

  // ==================== SWARM CONTROL ====================

  startSwarm(): void {
    if (this.bots.size === 0) {
      this.createGodSwarm()
    }

    this.isPaused = false
    this.bots.forEach(bot => {
      if (bot.status === 'paused') bot.status = 'active'
    })

    this.saveSwarmToMemory()
    this.startAutoRebalance()

    toast.success('⚡ SWARM AWAKENED', {
      description: `${this.bots.size} agents now hunting`,
    })

    logger.info('SWARM', `Started swarm with ${this.bots.size} agents`)
    this.notifyListeners()
  }

  pauseSwarm(): void {
    this.isPaused = true
    this.bots.forEach(bot => {
      if (bot.status === 'active') bot.status = 'paused'
    })

    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval)
      this.rebalanceInterval = null
    }

    this.saveSwarmToMemory()

    toast.warning('⏸️ SWARM PAUSED', {
      description: 'All agents are dormant',
    })

    logger.info('SWARM', 'Swarm paused')
    this.notifyListeners()
  }

  toggleSwarm(): void {
    if (this.isPaused) {
      this.startSwarm()
    } else {
      this.pauseSwarm()
    }
  }

  // ==================== INDIVIDUAL BOT CONTROL ====================

  pauseBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (bot) {
      bot.status = 'paused'
      this.saveSwarmToMemory()
      toast.info(`⏸️ ${bot.name} Paused`)
      this.notifyListeners()
    }
  }

  resumeBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (bot) {
      bot.status = 'active'
      this.saveSwarmToMemory()
      toast.success(`▶️ ${bot.name} Resumed`)
      this.notifyListeners()
    }
  }

  toggleBot(botId: string): void {
    const bot = this.bots.get(botId)
    if (bot) {
      if (bot.status === 'active') {
        this.pauseBot(botId)
      } else {
        this.resumeBot(botId)
      }
    }
  }

  // ==================== AUTO-REBALANCE ====================

  private startAutoRebalance(): void {
    if (this.rebalanceInterval) {
      clearInterval(this.rebalanceInterval)
    }

    this.rebalanceInterval = setInterval(() => {
      if (!this.isPaused) {
        this.rebalanceCapital()
        this.evolveSwarm()
      }
    }, this.swarmConfig.rebalanceIntervalHours * 60 * 60 * 1000)
  }

  private rebalanceCapital(): void {
    const performance = Array.from(this.botStats.entries()).map(([id, stats]) => ({
      bot: this.bots.get(id)!,
      stats,
      score: stats.totalProfit / (stats.capitalUsed || 1),
    }))

    performance.sort((a, b) => b.score - a.score)

    if (performance.length >= 7) {
      // Top performer gets 40% of capital
      performance[0].bot.capitalAllocation = 40
      // Next 3 get 15% each
      performance.slice(1, 4).forEach(b => b.bot.capitalAllocation = 15)
      // Bottom 3 get 5% each
      performance.slice(4).forEach(b => b.bot.capitalAllocation = 5)
    }

    this.saveSwarmToMemory()

    logger.info('SWARM', `Rebalanced: ${performance[0]?.bot.name} dominates → 40% capital`)
    this.notifyListeners()
  }

  private evolveSwarm(): void {
    this.bots.forEach(bot => {
      bot.evolutionLevel++
      bot.intelligence = Math.min(100, bot.intelligence + 0.8)

      if (bot.evolutionLevel > 50) {
        bot.mood = 'god'
        this.swarmConfig.transcendenceMode = true
      }
    })

    this.saveSwarmToMemory()

    toast.success('🧬 SWARM EVOLVED', {
      description: `All agents ascended → Intelligence: ${this.getSwarmStats().swarmIntelligence.toFixed(1)}%`,
    })

    this.notifyListeners()
  }

  // ==================== STATS ====================

  getSwarmStats(): SwarmStats {
    const allStats = Array.from(this.botStats.values())
    const allBots = Array.from(this.bots.values())
    
    const totalProfit = allStats.reduce((sum, s) => sum + s.totalProfit, 0)
    const todayProfit = allStats.reduce((sum, s) => sum + s.todayProfit, 0)
    const combinedWinRate = allStats.length > 0 
      ? allStats.reduce((sum, s) => sum + s.winRate, 0) / allStats.length 
      : 0
    const swarmIntelligence = allStats.length > 0
      ? allStats.reduce((sum, s) => sum + s.intelligence, 0) / allStats.length
      : 95

    const activeBots = allBots.filter(b => b.status === 'active').length
    const pausedBots = allBots.filter(b => b.status === 'paused').length

    // Find best/worst performer
    const sorted = allStats.sort((a, b) => b.totalProfit - a.totalProfit)
    const bestId = sorted[0]?.id
    const worstId = sorted[sorted.length - 1]?.id

    return {
      totalBots: this.bots.size,
      activeBots,
      pausedBots,
      totalCapital: this.swarmConfig.totalCapital,
      totalProfit,
      todayProfit,
      combinedWinRate,
      bestPerformer: bestId ? this.bots.get(bestId)?.name || null : null,
      worstPerformer: worstId ? this.bots.get(worstId)?.name || null : null,
      swarmIntelligence,
      transcendenceMode: this.swarmConfig.transcendenceMode,
      isPaused: this.isPaused,
    }
  }

  getBots(): BotConfig[] {
    return Array.from(this.bots.values())
  }

  getBotStats(botId: string): BotStats | undefined {
    return this.botStats.get(botId)
  }

  getAllBotStats(): BotStats[] {
    return Array.from(this.botStats.values())
  }

  isActive(): boolean {
    return !this.isPaused && this.bots.size > 0
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (stats: SwarmStats) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    const stats = this.getSwarmStats()
    this.listeners.forEach(l => l(stats))
  }
}

// ==================== SINGLETON ====================

export const multiBotSwarm = new MultiBotSwarm()
