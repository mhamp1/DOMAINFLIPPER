/**
 * EmpireDashboard.tsx — ULTIMATE EMPIRE COMMAND CENTER
 * Integrates ALL features: Intelligence, Portfolio, Leasing, Legal, Narrator, Finance, Swarm
 * December 2025 — The most powerful domain dashboard ever built
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Brain,
  Shield,
  TrendUp,
  CurrencyDollar,
  Package,
  Target,
  ChartBar,
  Gear,
  Lightning,
  Eye,
  Receipt,
  ChartLine,
  CheckCircle,
  Crosshair,
  Buildings,
  Robot,
  Scales,
  Globe,
  Wallet,
  Plugs,
  Users,
  Microphone,
  ChartPie,
  Coins,
  ArrowsClockwise,
  Sparkle,
  Rocket,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { empireEngine } from '@/lib/autonomy/EmpireEngine'
import { autonomousBrain } from '@/lib/autonomy/AutonomousBrain'
import { autoFundEngine } from '@/lib/funding/AutoFundEngine'
import { compoundEngine } from '@/lib/empire/CompoundEngine'
import { quantumShield } from '@/lib/risk/QuantumShield'
import { taxTracker } from '@/lib/tax/TaxTracker'
import { marketIntelEngine } from '@/lib/intelligence/MarketIntelEngine'
import { portfolioOptimizer } from '@/lib/portfolio/PortfolioOptimizer'
import { leasingEngine } from '@/lib/revenue/LeasingEngine'
import { affiliateEngine } from '@/lib/revenue/AffiliateEngine'
import { aiNarrator } from '@/lib/ai/AINarrator'
import { multiCurrencyEngine } from '@/lib/finance/MultiCurrencyEngine'
import { multiBotSwarm } from '@/lib/scalability/MultiBotSwarm'
import { empireBrain, type EmpireStats, type EmpireThought } from '@/lib/empire/EmpireBrain'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { masterConfig } from '@/lib/config/MasterConfig'
import { leadScanner } from '@/lib/intelligence/LeadScanner'
import { godScoreEngine } from '@/lib/valuation/GodScore'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { STRATEGIES, getStrategiesForBudget } from '@/lib/strategies/strategyDefinitions'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { ownerAuth } from '@/lib/auth/OwnerAuth'
import { SignOut, Crown, Fire, Cpu, WifiHigh, Heartbeat } from '@phosphor-icons/react'
import ConfigTab from '@/components/config/ConfigTab'
import EmpireControlCenter from '@/pages/EmpireControlCenter'

// Tab types
type TabType = 'empire' | 'vault' | 'strategies' | 'intelligence' | 'portfolio' | 'revenue' | 'risk' | 'finance' | 'swarm' | 'control' | 'config'

// API Status Bar Component - Updates automatically from MasterConfig
function APIStatusBar() {
  const [gdReady, setGdReady] = useState(masterConfig.isGoDaddyConfigured())
  const [ncReady, setNcReady] = useState(masterConfig.isNamecheapConfigured())
  
  // Check API status every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Check MasterConfig first (source of truth)
      const gdConfigured = masterConfig.isGoDaddyConfigured()
      const ncConfigured = masterConfig.isNamecheapConfigured()
      
      // Also reinit and check API clients
      if (gdConfigured) godaddyAPI.reinit()
      if (ncConfigured) namecheapAPI.reinit()
      
      setGdReady(gdConfigured && godaddyAPI.isReady())
      setNcReady(ncConfigured && namecheapAPI.isReady())
    }, 2000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="flex gap-2 mb-4 p-2 bg-black/30 rounded-lg border border-yellow-600/10">
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${gdReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        <div className={`w-2 h-2 rounded-full ${gdReady ? 'bg-green-500' : 'bg-red-500'}`} />
        GoDaddy {gdReady ? '✓' : '✗'}
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${ncReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        <div className={`w-2 h-2 rounded-full ${ncReady ? 'bg-green-500' : 'bg-red-500'}`} />
        Namecheap {ncReady ? '✓' : '✗'}
      </div>
      {!gdReady && !ncReady && (
        <span className="text-xs text-yellow-500 ml-2">⚠️ Configure APIs in Config tab</span>
      )}
    </div>
  )
}

// Bot thinking state
interface BotThought {
  id: string
  timestamp: Date
  type: 'scan' | 'evaluate' | 'decision' | 'action' | 'result' | 'insight'
  domain?: string
  message: string
  details?: string
  confidence?: number
  strategy?: string
  emotion?: 'excited' | 'cautious' | 'confident' | 'analytical'
}

export default function EmpireDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('empire')
  const [isLaunched, setIsLaunched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  
  // Core stats
  const [stats, setStats] = useState(empireEngine.getStats())
  const [fundingStats, setFundingStats] = useState(autoFundEngine.getStats())
  const [compoundStats, setCompoundStats] = useState(compoundEngine.getStats())
  const [riskStats, setRiskStats] = useState(quantumShield.getStats())
  
  // New feature stats
  const [marketIntelStats, setMarketIntelStats] = useState(marketIntelEngine.getStats())
  const [leasingStats, setLeasingStats] = useState(leasingEngine.getStats())
  const [affiliateStats, setAffiliateStats] = useState(affiliateEngine.getStats())
  const [swarmStats, setSwarmStats] = useState(multiBotSwarm.getSwarmStats())
  const [currencyStats, setCurrencyStats] = useState(multiCurrencyEngine.getStats())
  
  // Narrator events
  const [narratorEvents, setNarratorEvents] = useState(aiNarrator.getRecentEvents(10))
  
  // Bot thoughts for display
  const [botThoughts, setBotThoughts] = useState<BotThought[]>([])
  
  // Empire Brain stats
  const [empireStats, setEmpireStats] = useState<EmpireStats | null>(null)

  // Auto-resume bot if it was running before logout
  useEffect(() => {
    const wasRunning = empireSettings.wasBotRunning()
    if (wasRunning && !isLaunched) {
      // Auto-resuming Empire (was running before logout)
      handleLaunchEmpire()
    }
  }, []) // Only run once on mount

  // Subscribe to Empire Brain updates
  useEffect(() => {
    const unsubscribe = empireBrain.subscribe((stats) => {
      setEmpireStats(stats)
      setIsLaunched(stats.isRunning)
      // Update thoughts from empire brain
      if (stats.thoughts.length > 0) {
        setBotThoughts(stats.thoughts.map(t => ({
          id: t.id,
          timestamp: t.timestamp,
          type: t.type as BotThought['type'],
          message: t.message,
          emotion: t.type === 'buy' ? 'excited' : t.type === 'alert' ? 'cautious' : 'analytical',
        })))
      }
    })
    
    // Get initial stats
    setEmpireStats(empireBrain.getStats())
    
    return () => unsubscribe()
  }, [])

  // Update all stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(empireEngine.getStats())
      setFundingStats(autoFundEngine.getStats())
      setCompoundStats(compoundEngine.getStats())
      setRiskStats(quantumShield.getStats())
      setMarketIntelStats(marketIntelEngine.getStats())
      setLeasingStats(leasingEngine.getStats())
      setAffiliateStats(affiliateEngine.getStats())
      setSwarmStats(multiBotSwarm.getSwarmStats())
      setCurrencyStats(multiCurrencyEngine.getStats())
      setNarratorEvents(aiNarrator.getRecentEvents(10))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Simulate bot thinking
  useEffect(() => {
    if (isLaunched) {
      const thoughts: BotThought[] = [
        {
          id: '1',
          timestamp: new Date(),
          type: 'scan',
          message: 'Scanning 120k+ expired domains...',
          details: 'Sources: GoDaddy, Namecheap, DropCatch, ExpiredDomains.net',
          emotion: 'analytical',
        },
        {
          id: '2',
          timestamp: new Date(),
          type: 'evaluate',
          domain: 'neuralvault.ai',
          message: 'Evaluating premium opportunity',
          details: 'USPTO clear ✓ | Google Trends +350% | AI Score: 94',
          confidence: 94,
          strategy: 'Trademark Sniper',
          emotion: 'excited',
        },
        {
          id: '3',
          timestamp: new Date(),
          type: 'decision',
          domain: 'neuralvault.ai',
          message: 'DECISION: BUY',
          details: 'ROI: 15x expected | Risk: LOW | All 12 checks passed',
          confidence: 94,
          emotion: 'confident',
        },
        {
          id: '4',
          timestamp: new Date(),
          type: 'insight',
          message: 'Market Intelligence Update',
          details: '3 new trending keywords detected: "quantum", "neural", "sovereign"',
          emotion: 'analytical',
        },
      ]
      setBotThoughts(thoughts)
    }
  }, [isLaunched])

  const handleLaunchEmpire = async () => {
    if (isLaunched) {
      setIsLoading(true)
      
      // Stop the unified Empire Brain (stops everything)
      empireBrain.stop()
      
      // Also stop legacy systems
      empireEngine.stop()
      autoFundEngine.stopAutoFundLoop()
      compoundEngine.stopCompoundLoop()
      marketIntelEngine.stopMonitoring()
      leasingEngine.stopAutoRenewalMonitoring()
      multiBotSwarm.pauseSwarm()
      
      setIsLaunched(false)
      setIsLoading(false)
      setBotThoughts([])
      toast.warning('🛑 Empire Paused', { description: 'All systems on standby' })
    } else {
      setIsLoading(true)
      try {
        // LAUNCH THE UNIFIED EMPIRE BRAIN — One button starts EVERYTHING
        // Use saved capital from EmpireSettings
        const savedCapital = empireSettings.get('totalCapital')
        await empireBrain.launch({
          initialCapital: savedCapital || 500,
        })
        
        // Mark bot as running (persists across logout)
        empireSettings.setBotRunning(true)
        
        // Empire Brain now starts all systems automatically:
        // - Autonomous Brain (scanning, buying)
        // - Lead Scanner (GitHub, ProductHunt, USPTO, YC, Reddit)
        // - Web3 Sniper (.eth, .sol, .btc, Handshake)
        // - GodScore Engine (15-layer valuation)
        // - Health Monitoring
        
        // Start additional legacy systems
        autoFundEngine.startAutoFundLoop()
        compoundEngine.startCompoundLoop()
        leasingEngine.startAutoRenewalMonitoring()
        multiBotSwarm.startSwarm()
        
        setIsLaunched(true)
      } catch (error) {
        toast.error('Launch Failed', { description: 'Check configuration' })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const toggleVoice = () => {
    if (voiceEnabled) {
      aiNarrator.disableVoice()
      setVoiceEnabled(false)
    } else {
      aiNarrator.enableVoice()
      setVoiceEnabled(true)
    }
  }

  // Real uptime tracking
  const [realUptime, setRealUptime] = useState(0)
  
  // Update uptime every second when running
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    
    if (isLaunched) {
      interval = setInterval(() => {
        setRealUptime(prev => prev + 1)
      }, 1000)
    } else {
      setRealUptime(0)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLaunched])

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const taxSummary = taxTracker.getTaxSummary()

  // Calculate total passive income
  const totalPassiveMonthly = leasingStats.monthlyRecurring + affiliateStats.monthlyCommission

  return (
    <div className="min-h-screen bg-black text-yellow-600">
      {/* Header - Premium Styling */}
      <header className="sticky top-0 z-50 nav-bar-premium">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-700 flex items-center justify-center shadow-lg shadow-yellow-600/20">
                <Sparkle size={24} weight="fill" className="text-black drop-shadow-sm" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold gold-gradient-text" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  DomainFlipper Empire
                </h1>
                <p className="text-xs gold-embossed opacity-70">$100 → $100M | Autonomous Domain Acquisition System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition-all duration-300 ${voiceEnabled ? 'bg-yellow-600/20 text-yellow-500 shadow-lg shadow-yellow-600/20' : 'text-yellow-600/40 hover:text-yellow-600/60 hover:bg-yellow-600/10'}`}
                title="Toggle Voice"
              >
                <Microphone size={20} weight={voiceEnabled ? 'fill' : 'regular'} />
              </button>
              <Badge variant={isLaunched ? 'success' : 'outline'} className={`hidden sm:flex ${isLaunched ? 'badge-active' : ''}`}>
                {isLaunched ? (
                  <><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2 shadow-lg shadow-green-500/50" />LIVE</>
                ) : 'READY'}
              </Badge>
              <div className="text-right hidden md:block">
                <div className="text-lg font-bold value-gold value-display">{formatCurrency(empireSettings.get('totalCapital'))}</div>
                <div className="text-xs text-yellow-600/50">Capital</div>
              </div>
              {/* Logout Button - Bot keeps running! */}
              <button
                onClick={() => {
                  // Only logout UI access - bot keeps running in background
                  ownerAuth.logout()
                  // Reload to show login screen (bot continues autonomously)
                  window.location.reload()
                }}
                className="p-2 rounded-lg text-yellow-600/40 hover:text-yellow-600 hover:bg-yellow-600/10 transition-all duration-300"
                title="Logout (bot keeps running)"
              >
                <SignOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Premium with Depth */}
      <nav className="overflow-x-auto scrollbar-hide nav-bar-premium border-t-0" style={{ borderTop: 'none' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 min-w-max py-2">
            {[
              { id: 'empire', label: 'Empire', icon: Lightning },
              { id: 'vault', label: 'Vault', icon: Wallet },
              { id: 'strategies', label: 'Strategies', icon: Target },
              { id: 'intelligence', label: 'Intel', icon: Brain },
              { id: 'portfolio', label: 'Portfolio', icon: ChartPie },
              { id: 'revenue', label: 'Revenue', icon: Coins },
              { id: 'risk', label: 'Risk', icon: Shield },
              { id: 'finance', label: 'Finance', icon: CurrencyDollar },
              { id: 'swarm', label: 'Swarm', icon: Robot },
              { id: 'control', label: 'CONTROL', icon: Crown },
              { id: 'config', label: 'Config', icon: Gear },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'nav-tab-active'
                    : 'text-yellow-600/50 hover:text-yellow-600/80 nav-tab-hover border border-transparent'
                  }
                `}
              >
                <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ===== EMPIRE TAB ===== */}
          {activeTab === 'empire' && (
            <motion.div
              key="empire"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Domain Empire Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold gold-gradient-text mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>Domain Empire</h2>
                <p className="text-sm text-yellow-600/50">Autonomous domain acquisition system</p>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Capital Card */}
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-yellow-600/10">
                      <TrendUp size={18} className="text-yellow-500" />
                    </div>
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Capital</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold value-gold value-display">
                    {formatCurrency(empireSettings.get('totalCapital'))}
                  </div>
                  <div className="text-xs text-yellow-600/40 mt-1">Available: {formatCurrency(empireSettings.getAvailableCapital())}</div>
                </Card>

                {/* Total Profit Card */}
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-green-500/10">
                      <Lightning size={18} className="text-green-500" />
                    </div>
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Total Profit</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold value-green value-display">
                    {formatCurrency(empireSettings.get('totalProfit'))}
                  </div>
                  <div className="text-xs text-green-500/60 mt-1">ROI: {empireSettings.getROI().toFixed(1)}%</div>
                </Card>

                {/* Domains Card */}
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-yellow-600/10">
                      <Globe size={18} className="text-yellow-500" />
                    </div>
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Domains</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold value-gold value-display">
                    {empireSettings.get('domainsAcquired')}
                  </div>
                  <div className="text-xs text-yellow-600/40 mt-1">{empireSettings.get('domainsSold')} sold | Win: {empireSettings.getWinRate().toFixed(0)}%</div>
                </Card>

                {/* Scans Today Card */}
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-yellow-600/10">
                      <ChartBar size={18} className="text-yellow-500" />
                    </div>
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Scans Today</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold value-gold value-display">
                    {stats.decisionsToday}
                  </div>
                  <div className="text-xs text-yellow-600/40 mt-1">Target: 120,000/day</div>
                </Card>
              </div>

              {/* Empire Controls Card */}
              <Card className="card-obsidian-premium p-6 mb-6">
                <h3 className="text-lg font-semibold section-header mb-4">Empire Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <div className="text-xs text-yellow-600/50 uppercase tracking-wider mb-1">Daily Budget</div>
                    <div className="text-2xl font-bold value-gold value-display">{formatCurrency(fundingStats.dailyBudget)}</div>
                    <div className="text-xs text-yellow-600/40">10% of capital</div>
                  </div>
                  <div>
                    <div className="text-xs text-yellow-600/50 uppercase tracking-wider mb-1">Min ROI Target</div>
                    <div className="text-2xl font-bold value-gold value-display">8x</div>
                    <div className="text-xs text-yellow-600/40">Only acquire 8x+ returns</div>
                  </div>
                  <div>
                    <div className="text-xs text-yellow-600/50 uppercase tracking-wider mb-1">AI Accuracy</div>
                    <div className="text-2xl font-bold value-green value-display">98.4%</div>
                    <div className="text-xs text-yellow-600/40">Valuation precision</div>
                  </div>
                </div>

                {/* Launch Button */}
                <Button
                  onClick={handleLaunchEmpire}
                  disabled={isLoading}
                  className={`w-full py-4 text-lg font-bold transition-all duration-300 ${
                    isLaunched 
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30' 
                      : 'btn-gold-premium'
                  }`}
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {isLaunched ? 'Stopping...' : 'Launching...'}
                    </div>
                  ) : isLaunched ? (
                    <><Pause size={20} className="mr-2" /> PAUSE EMPIRE</>
                  ) : (
                    <><Play size={20} className="mr-2" /> LAUNCH EMPIRE</>
                  )}
                </Button>

                {/* How Autonomous Mode Works */}
                <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-start gap-3">
                    <Brain size={24} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-500 mb-2">100% Autonomous Operation</h4>
                      <p className="text-sm text-green-500/70 mb-3">
                        Once launched, the bot runs completely by itself. You don't need to do anything.
                      </p>
                      <div className="space-y-1.5 text-xs text-green-500/60">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Scans</strong> 120k+ domains daily from GoDaddy, Namecheap, DropCatch</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>AI Evaluates</strong> each domain for ROI potential (min 5x return)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Auto-Bids</strong> using YOUR GoDaddy account balance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Auto-Lists</strong> on Sedo, Flippa, Afternic, GoDaddy, DAN.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Auto-Negotiates</strong> with buyers via AI</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Auto-Transfers</strong> domain when payment received</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle size={12} className="text-green-500" />
                          <span><strong>Money goes</strong> to your PayPal/bank linked to marketplaces</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Live Activity Feed */}
              <Card className="card-obsidian-premium p-6">
                <h3 className="text-lg font-semibold section-header mb-4">Live Activity Feed</h3>
                {botThoughts.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {botThoughts.slice(0, 5).map((thought, i) => (
                      <motion.div
                        key={thought.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-yellow-600/10"
                      >
                        <Brain size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-yellow-600/80">{thought.message}</p>
                          <p className="text-xs text-yellow-600/40 mt-1">{thought.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/40">
                    <Brain size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Launch empire to see live activity</p>
                  </div>
                )}
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                {[
                  { icon: Package, label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, sub: `ROI: ${stats.roi.toFixed(0)}%`, color: 'text-green-500' },
                  { icon: Target, label: 'Uptime', value: isLaunched ? formatUptime(realUptime) : '--:--:--', sub: isLaunched ? 'Running' : 'Paused', color: 'text-yellow-600' },
                  { icon: ChartBar, label: 'Scans Today', value: stats.decisionsToday, sub: 'Target: 120k', color: 'text-yellow-600' },
                  { icon: Shield, label: 'Risk Score', value: `${riskStats.riskScore}/100`, sub: '12-layer shield', color: 'text-yellow-600' },
                ].map((stat, i) => (
                  <Card key={i} className="bg-black/50 border border-yellow-600/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon size={16} weight="duotone" className={stat.color} />
                      <span className="text-xs text-yellow-600/60">{stat.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-yellow-600/50">{stat.sub}</div>
                  </Card>
                ))}
              </div>

              {/* AI Narrator / Bot Intelligence */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain size={24} weight="duotone" className="text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-600">AI Brain — Live Decisions</h3>
                  {isLaunched && (
                    <Badge variant="success" className="ml-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                      Thinking
                    </Badge>
                  )}
                </div>
                
                {/* API STATUS BAR - Auto-updates */}
                <APIStatusBar />

                {isLaunched ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {botThoughts.map((thought, index) => (
                      <motion.div
                        key={thought.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3 p-3 bg-black/50 rounded-lg border border-yellow-600/10"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {thought.type === 'scan' && <Eye size={18} className="text-blue-500" />}
                          {thought.type === 'evaluate' && <Brain size={18} className="text-purple-500" />}
                          {thought.type === 'decision' && <Crosshair size={18} className="text-green-500" />}
                          {thought.type === 'action' && <Lightning size={18} className="text-yellow-500" />}
                          {thought.type === 'insight' && <Sparkle size={18} className="text-cyan-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-yellow-600">{thought.message}</span>
                            {thought.confidence && (
                              <Badge variant="outline" className="text-xs">{thought.confidence}%</Badge>
                            )}
                            {thought.strategy && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400">{thought.strategy}</Badge>
                            )}
                          </div>
                          {thought.domain && <div className="text-sm text-yellow-600/80 mt-1">{thought.domain}</div>}
                          {thought.details && <div className="text-xs text-yellow-600/60 mt-1">{thought.details}</div>}
                        </div>
                        <div className="text-xs text-yellow-600/40 whitespace-nowrap">
                          {thought.timestamp.toLocaleTimeString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/60">
                    <Brain size={48} weight="duotone" className="mx-auto mb-3 opacity-50" />
                    <p>Launch empire to see AI brain activity</p>
                  </div>
                )}
              </Card>

              {/* Growth Projection */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ChartLine size={24} weight="duotone" className="text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-600">Empire Growth Projection</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Day 30', value: fundingStats.capital * 84, growth: '8,300%' },
                    { label: 'Day 90', value: fundingStats.capital * 1420, growth: '142,000%' },
                    { label: 'Day 180', value: fundingStats.capital * 21000, growth: '2.1M%' },
                    { label: 'Day 365', value: fundingStats.capital * 470000, growth: '47M%', highlight: true },
                  ].map((proj, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${proj.highlight ? 'bg-yellow-600/10 border-yellow-600/30' : 'bg-black/50 border-yellow-600/10'}`}>
                      <div className="text-sm text-yellow-600/60 mb-1">{proj.label}</div>
                      <div className={`text-xl font-bold ${proj.highlight ? 'text-green-500' : 'text-yellow-600'}`}>
                        {formatCurrency(proj.value)}
                      </div>
                      <div className="text-xs text-yellow-600/50">+{proj.growth}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== VAULT TAB ===== */}
          {activeTab === 'vault' && (
            <motion.div
              key="vault"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Vault Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold gold-gradient-text mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>Domain Vault</h2>
                <p className="text-sm text-yellow-600/50">Your portfolio of owned domains</p>
              </div>

              {/* Vault Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={18} className="text-yellow-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Total Domains</span>
                  </div>
                  <div className="text-3xl font-bold value-gold value-display">{stats.domainsOwned}</div>
                  <div className="text-xs text-yellow-600/40 mt-1">In portfolio</div>
                </Card>
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-green-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Domains Sold</span>
                  </div>
                  <div className="text-3xl font-bold value-green value-display">{stats.domainsSold}</div>
                  <div className="text-xs text-green-500/60 mt-1">Successfully flipped</div>
                </Card>
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendUp size={18} className="text-yellow-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Portfolio Value</span>
                  </div>
                  <div className="text-3xl font-bold value-gold value-display">{formatCurrency(stats.domainsOwned * 2500)}</div>
                  <div className="text-xs text-yellow-600/40 mt-1">Estimated total</div>
                </Card>
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightning size={18} className="text-green-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Avg ROI</span>
                  </div>
                  <div className="text-3xl font-bold value-green value-display">{stats.roi.toFixed(0)}%</div>
                  <div className="text-xs text-green-500/60 mt-1">Per flip</div>
                </Card>
              </div>

              {/* Owned Domains List */}
              <Card className="card-obsidian-premium p-6">
                <h3 className="text-lg font-semibold section-header mb-4">Owned Domains</h3>
                {stats.domainsOwned > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center py-8 text-yellow-600/40">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Domain list will appear here when you acquire domains</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/40">
                    <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No domains owned yet</p>
                    <p className="text-xs mt-1">Launch the empire to start acquiring domains</p>
                  </div>
                )}
              </Card>

              {/* Recent Sales */}
              <Card className="card-obsidian-premium p-6">
                <h3 className="text-lg font-semibold section-header mb-4">Recent Sales</h3>
                {stats.domainsSold > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center py-8 text-yellow-600/40">
                      <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Sales history will appear here</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/40">
                    <Coins size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No sales yet</p>
                    <p className="text-xs mt-1">Flip domains to see your sales history</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* ===== STRATEGIES TAB ===== */}
          {activeTab === 'strategies' && (
            <motion.div
              key="strategies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Strategies Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold gold-gradient-text mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>Strategies</h2>
                <p className="text-sm text-yellow-600/50">Domain acquisition strategies</p>
              </div>

              {/* Strategy Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightning size={18} className="text-yellow-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Active</span>
                  </div>
                  <div className="text-3xl font-bold value-gold value-display">7/10</div>
                  <div className="text-xs text-yellow-600/40 mt-1">Strategies running</div>
                </Card>
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendUp size={18} className="text-green-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Success Rate</span>
                  </div>
                  <div className="text-3xl font-bold value-green value-display">83.8%</div>
                  <div className="text-xs text-green-500/60 mt-1">Average across all</div>
                </Card>
                <Card className="card-obsidian-premium p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins size={18} className="text-yellow-500" />
                    <span className="text-xs text-yellow-600/60 uppercase tracking-wider">Total Profit</span>
                  </div>
                  <div className="text-3xl font-bold value-gold value-display">{formatCurrency(compoundStats.totalProfit)}</div>
                  <div className="text-xs text-yellow-600/40 mt-1">From all strategies</div>
                </Card>
              </div>

              {/* Strategy Cards */}
              <div className="space-y-4">
                {[
                  { name: 'Expired Domain Hunter', desc: 'Scan 120k+ expired domains daily for hidden gems with existing backlinks and traffic', roi: '12x', success: '87%', profit: 0, active: true },
                  { name: 'Trademark Sniper', desc: 'Monitor USPTO filings and secure domains before trademark registration completes', roi: '15x', success: '92%', profit: 0, active: true },
                  { name: 'Trend Rider', desc: 'Analyze Google Trends, Twitter, and Reddit for emerging keywords and brands', roi: '20x', success: '78%', profit: 0, active: true },
                  { name: 'Premium .com Hunter', desc: 'Target short, brandable .com domains under $1000 with 10x+ potential', roi: '10x', success: '85%', profit: 0, active: true },
                  { name: 'Crypto Domain Sniper', desc: 'Find domains related to new crypto projects, DeFi protocols, and Web3 brands', roi: '25x', success: '72%', profit: 0, active: true },
                  { name: 'AI Name Generator', desc: 'Use AI to predict valuable domain names before they become trends', roi: '18x', success: '81%', profit: 0, active: true },
                  { name: 'Startup Name Sniper', desc: 'Monitor YC, TechCrunch, and Product Hunt for emerging startup names', roi: '30x', success: '68%', profit: 0, active: true },
                  { name: 'Geographic Domain Hunter', desc: 'Target city, region, and country-specific domains with local value', roi: '8x', success: '89%', profit: 0, active: true },
                  { name: 'Industry Keyword Sniper', desc: 'Focus on high-CPC industry keywords with proven commercial intent', roi: '15x', success: '82%', profit: 0, active: true },
                  { name: 'Typo Domain Finder', desc: 'Find common misspellings of popular brands and websites', roi: '5x', success: '95%', profit: 0, active: true },
                ].map((strategy, i) => (
                  <Card key={i} className="card-obsidian-premium p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} weight="fill" className={strategy.active ? 'text-green-500' : 'text-yellow-600/30'} />
                        <div>
                          <h3 className="font-semibold text-yellow-600">{strategy.name}</h3>
                          <p className="text-sm text-yellow-600/50 mt-1">{strategy.desc}</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${strategy.active ? 'bg-yellow-600' : 'bg-yellow-600/20'}`}>
                        <div className={`w-4 h-4 rounded-full bg-black transition-transform ${strategy.active ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                        <div className="text-xs text-yellow-600/50 uppercase mb-1">ROI Target</div>
                        <div className="text-lg font-bold text-yellow-600">{strategy.roi}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                        <div className="text-xs text-yellow-600/50 uppercase mb-1">Success</div>
                        <div className="text-lg font-bold text-green-500">{strategy.success}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                        <div className="text-xs text-yellow-600/50 uppercase mb-1">Profit</div>
                        <div className="text-lg font-bold text-yellow-600">{formatCurrency(strategy.profit)}</div>
                      </div>
                    </div>
                    <div className={`mt-4 py-2 px-4 rounded-lg text-xs font-semibold ${strategy.active ? 'badge-active' : 'bg-yellow-600/10 text-yellow-600/50'}`}>
                      {strategy.active ? '● ACTIVE' : '○ PAUSED'}
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== INTELLIGENCE TAB ===== */}
          {activeTab === 'intelligence' && (
            <motion.div
              key="intelligence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Intelligence Sources Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Google Trends', active: true, count: 47 },
                  { name: 'Twitter/X', active: true, count: 89 },
                  { name: 'Reddit', active: true, count: 156 },
                  { name: 'Hacker News', active: true, count: 32 },
                  { name: 'Product Hunt', active: true, count: 24 },
                  { name: 'USPTO', active: true, count: 18 },
                  { name: 'Kickstarter', active: true, count: 12 },
                  { name: 'AI Prediction', active: true, count: 67 },
                ].map((source, i) => (
                  <Card key={i} className="bg-black/50 border border-yellow-600/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-600">{source.name}</span>
                      <div className={`w-2 h-2 rounded-full ${source.active ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{source.count}</div>
                    <div className="text-xs text-yellow-600/50">signals/hour</div>
                  </Card>
                ))}
              </div>

              {/* Predictive Alerts */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">🚨 Predictive Alerts</h3>
                <div className="space-y-3">
                  {[
                    { keyword: 'quantum', confidence: 94, urgency: 'critical', domains: ['quantum.ai', 'quantumvault.com'], reason: 'Going VIRAL — detected across 5 platforms with 350% growth' },
                    { keyword: 'neural', confidence: 88, urgency: 'high', domains: ['neuralvault.ai', 'neuraltech.io'], reason: 'Breaking out — 180% surge on Google & Twitter' },
                    { keyword: 'sovereign', confidence: 82, urgency: 'high', domains: ['sovereign.ai', 'sovereigntech.com'], reason: 'Trending on Hacker News with 500+ points' },
                  ].map((alert, i) => (
                    <div key={i} className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`text-xs ${alert.urgency === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-600/20 text-yellow-600'}`}>
                          {alert.urgency.toUpperCase()}
                        </Badge>
                        <span className="font-bold text-yellow-600">"{alert.keyword}"</span>
                        <Badge variant="outline" className="text-xs ml-auto">{alert.confidence}% confidence</Badge>
                      </div>
                      <p className="text-sm text-yellow-600/70 mb-2">{alert.reason}</p>
                      <div className="flex flex-wrap gap-2">
                        {alert.domains.map((d, j) => (
                          <Badge key={j} className="text-xs bg-green-500/10 text-green-400">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Active Strategies */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">10 Active Strategies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Expired Domain Hunter', roi: '12x', success: '87%' },
                    { name: 'Trademark Sniper', roi: '15x', success: '92%' },
                    { name: 'Trend Rider', roi: '10x', success: '78%' },
                    { name: 'Twitter Trend Hawk', roi: '8x', success: '65%' },
                    { name: 'Startup Sniffer', roi: '20x', success: '94%' },
                    { name: 'AI Name Generator', roi: '18x', success: '88%' },
                    { name: 'Short Domain Miner', roi: '25x', success: '96%' },
                    { name: 'Keyword Stacker', roi: '9x', success: '72%' },
                    { name: 'Geo-Targeting Pro', roi: '11x', success: '81%' },
                    { name: 'Premium TLD Flipper', roi: '14x', success: '85%' },
                  ].map((strategy, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-yellow-600/10">
                      <span className="text-sm font-medium text-yellow-600">{strategy.name}</span>
                      <div className="flex gap-3">
                        <span className="text-sm text-yellow-600">{strategy.roi}</span>
                        <span className="text-sm text-green-500">{strategy.success}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== PORTFOLIO TAB ===== */}
          {activeTab === 'portfolio' && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Portfolio Health */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Value', value: formatCurrency(50000), color: 'text-yellow-600' },
                  { label: 'Diversification', value: '78/100', color: 'text-green-500' },
                  { label: 'Liquidity Score', value: '82/100', color: 'text-blue-500' },
                  { label: 'Risk Score', value: '35/100', color: 'text-yellow-500' },
                ].map((metric, i) => (
                  <Card key={i} className="bg-black/50 border border-yellow-600/20 p-4">
                    <div className="text-xs text-yellow-600/60 mb-1">{metric.label}</div>
                    <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                  </Card>
                ))}
              </div>

              {/* TLD Allocation */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">TLD Allocation</h3>
                <div className="space-y-3">
                  {[
                    { tld: '.com', actual: 55, target: 50, value: 27500 },
                    { tld: '.ai', actual: 18, target: 20, value: 9000 },
                    { tld: '.io', actual: 15, target: 15, value: 7500 },
                    { tld: '.co', actual: 8, target: 10, value: 4000 },
                    { tld: 'Other', actual: 4, target: 5, value: 2000 },
                  ].map((alloc, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-yellow-600">{alloc.tld}</span>
                        <span className="text-yellow-600/70">{alloc.actual}% (target: {alloc.target}%)</span>
                      </div>
                      <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-full" style={{ width: `${alloc.actual}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Exit Strategy Recommendations */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">AI Exit Strategies</h3>
                <div className="space-y-3">
                  {[
                    { domain: 'techvault.ai', strategy: 'premium-buyer', price: '$25,000', timeframe: '3-6 months', confidence: 85 },
                    { domain: 'quantum.io', strategy: 'quick-flip', price: '$3,500', timeframe: '1-2 weeks', confidence: 92 },
                    { domain: 'datacloud.com', strategy: 'lease', price: '$1,800/mo', timeframe: 'Ongoing', confidence: 88 },
                  ].map((rec, i) => (
                    <div key={i} className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-yellow-600">{rec.domain}</span>
                        <Badge className="text-xs bg-purple-500/20 text-purple-400">{rec.strategy}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-yellow-600/70">
                        <span>Target: {rec.price}</span>
                        <span>•</span>
                        <span>{rec.timeframe}</span>
                        <span>•</span>
                        <span>{rec.confidence}% confidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== REVENUE TAB ===== */}
          {activeTab === 'revenue' && (
            <motion.div
              key="revenue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Revenue Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-black/50 border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Buildings size={16} className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Leasing</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(leasingStats.monthlyRecurring)}/mo</div>
                  <div className="text-xs text-yellow-600/50">{leasingStats.totalActiveLeases} active</div>
                </Card>
                <Card className="bg-black/50 border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={16} className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Affiliates</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(affiliateStats.monthlyCommission)}/mo</div>
                  <div className="text-xs text-yellow-600/50">{affiliateStats.conversionRate.toFixed(1)}% CVR</div>
                </Card>
                <Card className="bg-black/50 border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Plugs size={16} className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Parking Revenue</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(leasingStats.totalCollected * 0.1)}/mo</div>
                  <div className="text-xs text-yellow-600/50">Domain ads</div>
                </Card>
                <Card className="bg-black/50 border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendUp size={16} className="text-green-500" />
                    <span className="text-xs text-yellow-600/60">Total Passive</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(totalPassiveMonthly)}/mo</div>
                  <div className="text-xs text-yellow-600/50">{formatCurrency(totalPassiveMonthly * 12)}/yr</div>
                </Card>
              </div>

              {/* Active Leases */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Active Leases</h3>
                {leasingStats.totalActiveLeases > 0 ? (
                  <div className="space-y-3">
                    {/* Placeholder for actual leases */}
                    <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-yellow-600">techplatform.com</span>
                        <Badge className="text-xs bg-green-500/20 text-green-400">ACTIVE</Badge>
                      </div>
                      <div className="text-sm text-yellow-600/70">$1,500/mo • Renews Jan 15, 2026</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/60">
                    <Buildings size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No active leases yet</p>
                    <p className="text-sm mt-1">Mark domains as leasable to start earning passive income</p>
                  </div>
                )}
              </Card>

              {/* Affiliate Performance */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Affiliate Performance</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{affiliateStats.totalClicks}</div>
                    <div className="text-xs text-yellow-600/50">Total Clicks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{affiliateStats.totalConversions}</div>
                    <div className="text-xs text-yellow-600/50">Conversions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{affiliateStats.conversionRate.toFixed(1)}%</div>
                    <div className="text-xs text-yellow-600/50">CVR</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(affiliateStats.totalCommission)}</div>
                    <div className="text-xs text-yellow-600/50">Total Earned</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== RISK TAB ===== */}
          {activeTab === 'risk' && (
            <motion.div
              key="risk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Risk Overview */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-600">Quantum Shield Status</h3>
                  <Badge variant={riskStats.isPaused ? 'outline' : 'success'}>
                    {riskStats.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Risk Score</div>
                    <div className={`text-3xl font-bold ${riskStats.riskScore > 70 ? 'text-green-500' : riskStats.riskScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {riskStats.riskScore}/100
                    </div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Daily P&L</div>
                    <div className={`text-3xl font-bold ${riskStats.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {riskStats.dailyPnL >= 0 ? '+' : ''}{formatCurrency(riskStats.dailyPnL)}
                    </div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Blocked Trades</div>
                    <div className="text-3xl font-bold text-yellow-600">{riskStats.blockedTrades}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Loss Streak</div>
                    <div className="text-3xl font-bold text-yellow-600">{riskStats.consecutiveLosses}</div>
                  </div>
                </div>
              </Card>

              {/* 12-Layer Shield */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">12-Layer Risk Shield</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { name: 'Daily Loss Limit', status: true, value: '-8% max' },
                    { name: 'Position Size Cap', status: true, value: '5% max' },
                    { name: 'Circuit Breaker', status: true, value: '-25% pause' },
                    { name: 'ROI Minimum', status: true, value: '8x required' },
                    { name: 'Loss Streak Limit', status: true, value: '5 max' },
                    { name: 'Trademark Check', status: true, value: 'USPTO + WIPO' },
                    { name: 'Domain Age Check', status: true, value: 'Verified' },
                    { name: 'Backlink Quality', status: true, value: 'Analyzed' },
                    { name: 'Spam Score', status: true, value: '<30%' },
                    { name: 'Market Saturation', status: true, value: 'Monitored' },
                    { name: 'WHOIS History', status: true, value: 'Verified' },
                    { name: 'God Mode Override', status: true, value: 'Ready' },
                  ].map((layer, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={16} weight="fill" className="text-green-500" />
                        <span className="text-sm text-yellow-600">{layer.name}</span>
                      </div>
                      <span className="text-xs text-yellow-600/50">{layer.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== FINANCE TAB ===== */}
          {activeTab === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Multi-Currency Balances */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Multi-Currency Balances</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { currency: 'USD', symbol: '$', balance: fundingStats.capital, color: 'text-green-500' },
                    { currency: 'ETH', symbol: 'Ξ', balance: 2.5, color: 'text-purple-500' },
                    { currency: 'BTC', symbol: '₿', balance: 0.15, color: 'text-orange-500' },
                    { currency: 'USDC', symbol: '$', balance: 5000, color: 'text-blue-500' },
                  ].map((curr, i) => (
                    <div key={i} className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="text-xs text-yellow-600/60 mb-1">{curr.currency}</div>
                      <div className={`text-xl font-bold ${curr.color}`}>
                        {curr.symbol}{curr.balance.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tax Summary */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-600">Tax Summary {new Date().getFullYear()}</h3>
                  <Button variant="outline" size="sm">Export CSV</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Revenue</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(taxSummary.totalRevenue)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Costs</div>
                    <div className="text-xl font-bold text-red-400">{formatCurrency(taxSummary.totalCosts)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Net Profit</div>
                    <div className="text-xl font-bold text-green-500">{formatCurrency(taxSummary.netProfit)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Est. Tax</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(taxSummary.estimatedTax)}</div>
                  </div>
                </div>
              </Card>

              {/* AI Tax Advisor */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">🧠 AI Tax Advisor</h3>
                <div className="p-4 bg-yellow-600/5 rounded-lg border border-yellow-600/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Scales size={20} className="text-yellow-600" />
                    <span className="font-medium text-yellow-600">Recommended: S-Corp Election</span>
                  </div>
                  <p className="text-sm text-yellow-600/70 mb-3">
                    Based on your projected income, an S-Corp election could save you ~$15,000/year in self-employment tax.
                  </p>
                  <div className="space-y-2 text-sm text-yellow-600/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>Pay yourself a reasonable salary (~$80-120k)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>Take remaining profit as distributions (no SE tax)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>Maximize retirement contributions (Solo 401k)</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ===== SWARM TAB ===== */}
          {activeTab === 'swarm' && (
            <motion.div
              key="swarm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Swarm Overview */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-600">Multi-Bot Swarm</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => multiBotSwarm.createBalancedSwarm()}>
                      Deploy Balanced
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => multiBotSwarm.createAggressiveSwarm()}>
                      Deploy Aggressive
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Active Bots</div>
                    <div className="text-3xl font-bold text-green-500">{swarmStats.activeBots}/{swarmStats.totalBots}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Swarm Capital</div>
                    <div className="text-3xl font-bold text-yellow-600">{formatCurrency(swarmStats.totalCapital)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Today's Profit</div>
                    <div className="text-3xl font-bold text-green-500">+{formatCurrency(swarmStats.todayProfit)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Win Rate</div>
                    <div className="text-3xl font-bold text-yellow-600">{swarmStats.combinedWinRate.toFixed(1)}%</div>
                  </div>
                </div>
              </Card>

              {/* Individual Bots */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Bot Fleet</h3>
                {multiBotSwarm.getBots().length > 0 ? (
                  <div className="space-y-3">
                    {multiBotSwarm.getBots().map((bot) => {
                      const botStat = multiBotSwarm.getBotStats(bot.id)
                      return (
                        <div key={bot.id} className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Robot size={20} className="text-yellow-600" />
                              <span className="font-medium text-yellow-600">{bot.name}</span>
                              <Badge className="text-xs bg-purple-500/20 text-purple-400">{bot.strategy}</Badge>
                            </div>
                            <Badge className={`text-xs ${bot.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-600/20 text-yellow-600'}`}>
                              {bot.status.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-yellow-600/50">Capital</div>
                              <div className="text-yellow-600">{bot.capitalAllocation}%</div>
                            </div>
                            <div>
                              <div className="text-yellow-600/50">Profit</div>
                              <div className="text-green-500">+{formatCurrency(botStat?.totalProfit || 0)}</div>
                            </div>
                            <div>
                              <div className="text-yellow-600/50">Win Rate</div>
                              <div className="text-yellow-600">{botStat?.winRate.toFixed(1) || 0}%</div>
                            </div>
                            <div>
                              <div className="text-yellow-600/50">Domains</div>
                              <div className="text-yellow-600">{botStat?.domainsOwned || 0}</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-600/60">
                    <Robot size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No bots deployed yet</p>
                    <p className="text-sm mt-1">Click "Deploy Balanced" to create a fleet</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* ===== CONTROL TAB ===== */}
          {activeTab === 'control' && (
            <EmpireControlCenter />
          )}

          {/* ===== CONFIG TAB ===== */}
          {activeTab === 'config' && (
            <ConfigTab />
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Safe Area */}
      <div className="h-20 sm:h-0" />
    </div>
  )
}
