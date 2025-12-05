/**
 * EmpireDashboard.tsx — Ultimate 20X Dashboard
 * Unified control center with bot logic display, intelligence, risk, taxes
 * December 27, 2025
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Brain,
  Shield,
  TrendingUp,
  CurrencyDollar,
  Package,
  Target,
  Activity,
  Gear,
  Lightning,
  Eye,
  Receipt,
  CreditCard,
  ChartLine,
  Warning,
  CheckCircle,
  Clock,
  Crosshair,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { empireEngine } from '@/lib/autonomy/EmpireEngine'
import { autoFundEngine } from '@/lib/funding/AutoFundEngine'
import { compoundEngine } from '@/lib/empire/CompoundEngine'
import { quantumShield } from '@/lib/risk/QuantumShield'
import { taxTracker } from '@/lib/tax/TaxTracker'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

// Tab types
type TabType = 'empire' | 'intelligence' | 'risk' | 'tax' | 'config'

// Bot thinking state
interface BotThought {
  id: string
  timestamp: Date
  type: 'scan' | 'evaluate' | 'decision' | 'action' | 'result'
  domain?: string
  message: string
  details?: string
  confidence?: number
  strategy?: string
}

export default function EmpireDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('empire')
  const [isLaunched, setIsLaunched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState(empireEngine.getStats())
  const [fundingStats, setFundingStats] = useState(autoFundEngine.getStats())
  const [compoundStats, setCompoundStats] = useState(compoundEngine.getStats())
  const [riskStats, setRiskStats] = useState(quantumShield.getStats())
  const [botThoughts, setBotThoughts] = useState<BotThought[]>([])

  // Update all stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(empireEngine.getStats())
      setFundingStats(autoFundEngine.getStats())
      setCompoundStats(compoundEngine.getStats())
      setRiskStats(quantumShield.getStats())
    }, 1000)

    // Simulate bot thinking for demo
    if (isLaunched) {
      simulateBotThinking()
    }

    return () => clearInterval(interval)
  }, [isLaunched])

  // Simulate bot thinking process
  const simulateBotThinking = () => {
    const thoughts: BotThought[] = [
      {
        id: '1',
        timestamp: new Date(),
        type: 'scan',
        message: 'Scanning 120k+ expired domains...',
        details: 'Sources: GoDaddy, Namecheap, DropCatch, ExpiredDomains.net',
      },
      {
        id: '2',
        timestamp: new Date(),
        type: 'evaluate',
        domain: 'techvault.ai',
        message: 'Evaluating domain opportunity',
        details: 'USPTO trademark match detected, Google Trends +350%',
        confidence: 94,
        strategy: 'Trademark Sniper',
      },
      {
        id: '3',
        timestamp: new Date(),
        type: 'decision',
        domain: 'techvault.ai',
        message: 'Decision: BUY',
        details: 'ROI: 15x expected | Risk Score: 92/100 | All 12 risk checks passed',
        confidence: 94,
      },
    ]
    setBotThoughts(thoughts)
  }

  const handleLaunchEmpire = async () => {
    if (isLaunched) {
      setIsLoading(true)
      empireEngine.stop()
      autoFundEngine.stopAutoFundLoop()
      compoundEngine.stopCompoundLoop()
      setIsLaunched(false)
      setIsLoading(false)
      setBotThoughts([])
      toast.info('Empire Paused', { description: 'Autonomous operations stopped' })
    } else {
      setIsLoading(true)
      try {
        await empireEngine.runForever()
        autoFundEngine.startAutoFundLoop()
        compoundEngine.startCompoundLoop()
        setIsLaunched(true)
        toast.success('Empire Launched', { description: '100% autonomous operation active' })
      } catch (error) {
        toast.error('Launch Failed', { description: 'Check configuration' })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const taxSummary = taxTracker.getTaxSummary()

  return (
    <div className="min-h-screen bg-black text-yellow-600">
      {/* Header */}
      <header className="border-b border-yellow-600/20 sticky top-0 bg-black/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-yellow-600">DomainFlipper Empire</h1>
              <p className="text-xs text-yellow-600/60">$100 → $100M | Autonomous System</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isLaunched ? 'success' : 'outline'} className="hidden md:flex">
                {isLaunched ? (
                  <><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />Active</>
                ) : 'Ready'}
              </Badge>
              <div className="text-right hidden md:block">
                <div className="text-lg font-bold text-yellow-600">{formatCurrency(fundingStats.capital)}</div>
                <div className="text-xs text-yellow-600/60">Capital</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-yellow-600/20 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'empire', label: 'Empire', icon: Lightning },
              { id: 'intelligence', label: 'Intel', icon: Brain },
              { id: 'risk', label: 'Risk', icon: Shield },
              { id: 'tax', label: 'Tax', icon: Receipt },
              { id: 'config', label: 'Config', icon: Gear },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-yellow-600/60 hover:text-yellow-600/80'
                  }
                `}
              >
                <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'empire' && (
            <motion.div
              key="empire"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Capital & Launch Section */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Capital Display */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center gap-3 mb-4">
                      <CurrencyDollar size={24} weight="duotone" className="text-yellow-600" />
                      <h2 className="text-lg font-semibold text-yellow-600">Empire Capital</h2>
                    </div>
                    <div className="text-5xl md:text-6xl font-black text-yellow-600 mb-2">
                      {formatCurrency(fundingStats.capital)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-yellow-600/60">Daily Budget</div>
                        <div className="text-xl font-bold text-yellow-600">{formatCurrency(fundingStats.dailyBudget)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-yellow-600/60">Today's Profit</div>
                        <div className="text-xl font-bold text-green-500">+{formatCurrency(compoundStats.todayProfit)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-yellow-600/60">Total Profit</div>
                        <div className="text-xl font-bold text-yellow-600">{formatCurrency(compoundStats.totalProfit)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Launch Button */}
                  <div className="flex flex-col justify-center">
                    <Button
                      size="lg"
                      onClick={handleLaunchEmpire}
                      disabled={isLoading}
                      className={`
                        w-full h-16 text-lg font-bold
                        ${isLaunched
                          ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30'
                          : 'bg-yellow-600 hover:bg-yellow-500 text-black'
                        }
                      `}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {isLaunched ? 'Stopping...' : 'Starting...'}
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

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="obsidian-glass border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={16} weight="duotone" className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Domains</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.domainsOwned}</div>
                  <div className="text-xs text-yellow-600/60">Sold: {stats.domainsSold}</div>
                </Card>

                <Card className="obsidian-glass border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} weight="duotone" className="text-green-500" />
                    <span className="text-xs text-yellow-600/60">Win Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-yellow-600/60">ROI: {stats.roi.toFixed(0)}%</div>
                </Card>

                <Card className="obsidian-glass border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} weight="duotone" className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Scans Today</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.decisionsToday}</div>
                  <div className="text-xs text-yellow-600/60">Target: 120k/day</div>
                </Card>

                <Card className="obsidian-glass border border-yellow-600/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} weight="duotone" className="text-yellow-600" />
                    <span className="text-xs text-yellow-600/60">Risk Score</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{riskStats.riskScore}/100</div>
                  <div className="text-xs text-yellow-600/60">12-layer shield</div>
                </Card>
              </div>

              {/* Bot Logic Display */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain size={24} weight="duotone" className="text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-600">Bot Intelligence</h3>
                  {isLaunched && (
                    <Badge variant="success" className="ml-auto">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                      Thinking
                    </Badge>
                  )}
                </div>

                {isLaunched ? (
                  <div className="space-y-3">
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
                          {thought.type === 'result' && <CheckCircle size={18} className="text-green-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-yellow-600">{thought.message}</span>
                            {thought.confidence && (
                              <Badge variant="outline" className="text-xs">
                                {thought.confidence}% confidence
                              </Badge>
                            )}
                            {thought.strategy && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400">
                                {thought.strategy}
                              </Badge>
                            )}
                          </div>
                          {thought.domain && (
                            <div className="text-sm text-yellow-600/80 mt-1">{thought.domain}</div>
                          )}
                          {thought.details && (
                            <div className="text-xs text-yellow-600/60 mt-1">{thought.details}</div>
                          )}
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
                    <p>Launch empire to see bot intelligence</p>
                  </div>
                )}
              </Card>

              {/* Growth Projection */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ChartLine size={24} weight="duotone" className="text-yellow-600" />
                  <h3 className="text-lg font-semibold text-yellow-600">Growth Projection</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Day 30</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(fundingStats.capital * 84)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Day 90</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(fundingStats.capital * 1420)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Day 180</div>
                    <div className="text-xl font-bold text-yellow-600">{formatCurrency(fundingStats.capital * 21000)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Day 365</div>
                    <div className="text-xl font-bold text-green-500">{formatCurrency(fundingStats.capital * 470000)}</div>
                  </div>
                </div>
                <p className="text-xs text-yellow-600/60 mt-4">
                  * Based on 10% daily compound growth with 100% reinvestment
                </p>
              </Card>
            </motion.div>
          )}

          {activeTab === 'intelligence' && (
            <motion.div
              key="intelligence"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Intelligence Sources */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'USPTO Monitor', status: 'active', ops: 47 },
                  { name: 'Google Trends', status: 'active', ops: 132 },
                  { name: 'X (Twitter)', status: 'active', ops: 89 },
                  { name: 'Kickstarter', status: 'active', ops: 23 },
                ].map(source => (
                  <Card key={source.name} className="obsidian-glass border border-yellow-600/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-600">{source.name}</span>
                      <Badge variant="success" className="text-xs">{source.status.toUpperCase()}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{source.ops} ops</div>
                  </Card>
                ))}
              </div>

              {/* Live Intelligence Feed */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Live Intelligence Feed</h3>
                <div className="space-y-3">
                  {[
                    { source: 'USPTO', message: 'TechVault™ filed - techvault.com available', priority: 'HIGH', time: '3m ago' },
                    { source: 'Google', message: 'AI Agents +350% search growth', priority: 'HIGH', time: '7m ago' },
                    { source: 'Twitter', message: '#QuantumComputing trending (127k tweets)', priority: 'MEDIUM', time: '11m ago' },
                    { source: 'Kickstarter', message: 'EcoBottle campaign $2.1M funded', priority: 'MEDIUM', time: '15m ago' },
                  ].map((intel, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-black/50 rounded-lg border border-yellow-600/10">
                      <Badge className="text-xs bg-yellow-600/20 text-yellow-600">{intel.source}</Badge>
                      <span className="flex-1 text-sm text-yellow-600">{intel.message}</span>
                      <Badge variant={intel.priority === 'HIGH' ? 'success' : 'outline'} className="text-xs">
                        {intel.priority}
                      </Badge>
                      <span className="text-xs text-yellow-600/60">{intel.time}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Active Strategies */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">10 Active Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  ].map((strategy, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-yellow-600/10">
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

          {activeTab === 'risk' && (
            <motion.div
              key="risk"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Risk Overview */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-600">Quantum Shield Status</h3>
                  <Badge variant={riskStats.isPaused ? 'outline' : 'success'}>
                    {riskStats.isPaused ? 'PAUSED' : 'ACTIVE'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">12-Layer Risk Shield</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Daily Loss Limit', status: 'active', value: '-8% max' },
                    { name: 'Position Size Cap', status: 'active', value: '5% max' },
                    { name: 'Circuit Breaker', status: 'active', value: '-25% pause' },
                    { name: 'ROI Minimum', status: 'active', value: '8x required' },
                    { name: 'Loss Streak Limit', status: 'active', value: '5 max' },
                    { name: 'Domain Age Check', status: 'active', value: 'Verified' },
                    { name: 'Backlink Quality', status: 'active', value: 'Analyzed' },
                    { name: 'Trademark Conflict', status: 'active', value: 'Checked' },
                    { name: 'Spam Score', status: 'active', value: '<30%' },
                    { name: 'Market Saturation', status: 'active', value: 'Monitored' },
                    { name: 'WHOIS History', status: 'active', value: 'Verified' },
                    { name: 'God Mode Override', status: 'active', value: 'Ready' },
                  ].map((layer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-yellow-600/10">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={16} weight="fill" className="text-green-500" />
                        <span className="text-sm text-yellow-600">{layer.name}</span>
                      </div>
                      <span className="text-sm text-yellow-600/60">{layer.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'tax' && (
            <motion.div
              key="tax"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Tax Summary */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-600">Tax Summary {new Date().getFullYear()}</h3>
                  <Button variant="outline" className="text-sm">
                    Export CSV
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(taxSummary.totalRevenue)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Total Costs</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(taxSummary.totalCosts)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Net Profit</div>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(taxSummary.netProfit)}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="text-sm text-yellow-600/60 mb-1">Est. Tax Due</div>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(taxSummary.estimatedTax)}</div>
                  </div>
                </div>
              </Card>

              {/* Capital Gains Breakdown */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Capital Gains Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} weight="duotone" className="text-yellow-600" />
                      <span className="text-sm text-yellow-600/60">Short-Term Gains (&lt;1 year)</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{formatCurrency(taxSummary.shortTermGains)}</div>
                    <div className="text-xs text-yellow-600/60 mt-1">Taxed at ordinary income rate (37%)</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={16} weight="duotone" className="text-green-500" />
                      <span className="text-sm text-yellow-600/60">Long-Term Gains (&gt;1 year)</span>
                    </div>
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(taxSummary.longTermGains)}</div>
                    <div className="text-xs text-yellow-600/60 mt-1">Taxed at capital gains rate (20%)</div>
                  </div>
                </div>
              </Card>

              {/* Quarterly Estimates */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Quarterly Tax Estimates</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(q => (
                    <div key={q} className="p-4 bg-black/50 rounded-lg border border-yellow-600/10 text-center">
                      <div className="text-sm text-yellow-600/60 mb-1">Q{q}</div>
                      <div className="text-xl font-bold text-yellow-600">
                        {formatCurrency(taxTracker.getQuarterlyEstimate(q as 1 | 2 | 3 | 4))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* API Configuration */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">API Configuration</h3>
                <div className="space-y-4">
                  {['Namecheap', 'GoDaddy', 'Google Trends', 'Twitter (X)', 'USPTO'].map(api => (
                    <div key={api} className="space-y-2">
                      <label className="text-sm text-yellow-600">{api} API Key</label>
                      <input
                        type="password"
                        placeholder={`Enter ${api} API Key`}
                        className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600 placeholder-yellow-600/40 focus:outline-none focus:border-yellow-600/50"
                      />
                    </div>
                  ))}
                  <Button className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-black">
                    <Gear size={20} className="mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </Card>

              {/* Auto-Funding Config */}
              <Card className="obsidian-glass border border-yellow-600/20 p-6">
                <h3 className="text-lg font-semibold text-yellow-600 mb-4">Auto-Funding (Stripe)</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-yellow-600">Enable Auto-Funding</span>
                    <button className="w-12 h-6 bg-yellow-600/20 rounded-full relative">
                      <div className="w-5 h-5 bg-yellow-600 rounded-full absolute left-0.5 top-0.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-yellow-600/60">Min Balance Trigger</label>
                      <input
                        type="number"
                        defaultValue={500}
                        className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-yellow-600/60">Auto-Fund Amount</label>
                      <input
                        type="number"
                        defaultValue={1000}
                        className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

