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
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { empireEngine } from '@/lib/autonomy/EmpireEngine'
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
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// Tab types
type TabType = 'empire' | 'intelligence' | 'portfolio' | 'revenue' | 'risk' | 'finance' | 'swarm' | 'config'

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
      empireEngine.stop()
      autoFundEngine.stopAutoFundLoop()
      compoundEngine.stopCompoundLoop()
      marketIntelEngine.stopMonitoring()
      leasingEngine.stopAutoRenewalMonitoring()
      multiBotSwarm.pauseSwarm()
      setIsLaunched(false)
      setIsLoading(false)
      setBotThoughts([])
      aiNarrator.narrateWarning('Empire paused — all autonomous operations stopped', 'info')
      toast.info('Empire Paused', { description: 'All systems on standby' })
    } else {
      setIsLoading(true)
      try {
        await empireEngine.runForever()
        autoFundEngine.startAutoFundLoop()
        compoundEngine.startCompoundLoop()
        await marketIntelEngine.startMonitoring()
        leasingEngine.startAutoRenewalMonitoring()
        multiBotSwarm.startSwarm()
        setIsLaunched(true)
        aiNarrator.narrateInsight('Empire Launched', 'All systems now operating autonomously at full capacity', 'high')
        toast.success('🚀 EMPIRE LAUNCHED', { description: '100% autonomous operation active' })
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
      {/* Header */}
      <header className="border-b border-yellow-600/20 sticky top-0 bg-black/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-500 flex items-center justify-center">
                <Sparkle size={24} weight="fill" className="text-black" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-yellow-600">DomainFlipper Empire</h1>
                <p className="text-xs text-yellow-600/60">$100 → $100M | Autonomous AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleVoice}
                className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-yellow-600/20 text-yellow-600' : 'text-yellow-600/40 hover:text-yellow-600/60'}`}
              >
                <Microphone size={20} weight={voiceEnabled ? 'fill' : 'regular'} />
              </button>
              <Badge variant={isLaunched ? 'success' : 'outline'} className="hidden sm:flex">
                {isLaunched ? (
                  <><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />LIVE</>
                ) : 'READY'}
              </Badge>
              <div className="text-right hidden md:block">
                <div className="text-lg font-bold text-yellow-600">{formatCurrency(fundingStats.capital)}</div>
                <div className="text-xs text-yellow-600/60">Capital</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Scrollable on mobile */}
      <nav className="border-b border-yellow-600/20 overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 min-w-max">
            {[
              { id: 'empire', label: 'Empire', icon: Lightning },
              { id: 'intelligence', label: 'Intel', icon: Brain },
              { id: 'portfolio', label: 'Portfolio', icon: ChartPie },
              { id: 'revenue', label: 'Revenue', icon: Coins },
              { id: 'risk', label: 'Risk', icon: Shield },
              { id: 'finance', label: 'Finance', icon: Wallet },
              { id: 'swarm', label: 'Swarm', icon: Robot },
              { id: 'config', label: 'Config', icon: Gear },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-yellow-600/50 hover:text-yellow-600/70'
                  }
                `}
              >
                <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                <span className="hidden sm:inline">{tab.label}</span>
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
              {/* Capital & Launch */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <CurrencyDollar size={24} weight="duotone" className="text-yellow-600" />
                      <h2 className="text-lg font-semibold text-yellow-600">Empire Capital</h2>
                    </div>
                    <motion.div 
                      className="text-5xl md:text-6xl font-black text-yellow-600 mb-2"
                      key={fundingStats.capital}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                    >
                      {formatCurrency(fundingStats.capital)}
                    </motion.div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-xs text-yellow-600/60">Daily Budget</div>
                        <div className="text-lg font-bold text-yellow-600">{formatCurrency(fundingStats.dailyBudget)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-yellow-600/60">Today's Profit</div>
                        <div className="text-lg font-bold text-green-500">+{formatCurrency(compoundStats.todayProfit)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-yellow-600/60">Total Profit</div>
                        <div className="text-lg font-bold text-yellow-600">{formatCurrency(compoundStats.totalProfit)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-yellow-600/60">Passive Income</div>
                        <div className="text-lg font-bold text-green-500">{formatCurrency(totalPassiveMonthly)}/mo</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <Button
                      size="lg"
                      onClick={handleLaunchEmpire}
                      disabled={isLoading}
                      className={`
                        w-full h-16 text-lg font-bold transition-all
                        ${isLaunched
                          ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30'
                          : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black'
                        }
                      `}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {isLaunched ? 'Stopping...' : 'Launching...'}
                        </div>
                      ) : isLaunched ? (
                        <><Pause size={24} weight="fill" className="mr-2" />Pause Empire</>
                      ) : (
                        <><Play size={24} weight="fill" className="mr-2" />Launch Empire</>
                      )}
                    </Button>
                    {isLaunched && (
                      <div className="text-center mt-3 text-sm text-yellow-600/60">
                        Uptime: {formatUptime(stats.uptime)}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Package, label: 'Domains', value: stats.domainsOwned, sub: `Sold: ${stats.domainsSold}`, color: 'text-yellow-600' },
                  { icon: Target, label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, sub: `ROI: ${stats.roi.toFixed(0)}%`, color: 'text-green-500' },
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

          {/* ===== CONFIG TAB ===== */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* API Configuration */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">API Keys</h3>
                <div className="space-y-4">
                  {['Namecheap', 'GoDaddy', 'Google Trends', 'Twitter (X)', 'USPTO', 'Stripe'].map(api => (
                    <div key={api} className="space-y-2">
                      <label className="text-sm text-yellow-600">{api} API Key</label>
                      <input
                        type="password"
                        placeholder={`Enter ${api} API Key`}
                        className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600 placeholder-yellow-600/40 focus:outline-none focus:border-yellow-600/50"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Auto-Funding */}
              <Card className="bg-black/50 border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Auto-Funding (Stripe)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-yellow-600/60">Min Balance Trigger</label>
                    <input
                      type="number"
                      defaultValue={500}
                      className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-yellow-600/60">Auto-Fund Amount</label>
                    <input
                      type="number"
                      defaultValue={1000}
                      className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600 mt-1"
                    />
                  </div>
                </div>
              </Card>

              {/* Save Button */}
              <Button className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                <Gear size={20} className="mr-2" />
                Save Configuration
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Safe Area */}
      <div className="h-20 sm:h-0" />
    </div>
  )
}
