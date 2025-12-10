/**
 * ProductionControlPanel.tsx — PRODUCTION BRAIN CONTROL CENTER
 * Full control over the autonomous domain flipping system
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Stop,
  Brain,
  Lightning,
  Shield,
  Warning,
  CheckCircle,
  XCircle,
  Gear,
  ChartLine,
  Handshake,
  Clock,
  CurrencyDollar,
  Eye,
  ArrowsClockwise,
  Fire,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { productionBrain, type BrainState, type ProductionConfig } from '@/lib/autonomy/ProductionBrain'
import { killSwitches, type KillSwitchState, type KillSwitchType } from '@/lib/infrastructure/KillSwitches'
import { spendGuards } from '@/lib/infrastructure/SpendGuards'
import { metrics, type KPIs } from '@/lib/infrastructure/Metrics'
import { circuitBreaker } from '@/lib/infrastructure/CircuitBreaker'
import { formatCurrency } from '@/lib/utils'

// ==================== MOOD ICONS ====================

const moodIcons: Record<string, { icon: typeof Brain; color: string }> = {
  dormant: { icon: Brain, color: 'text-zinc-500' },
  scanning: { icon: Eye, color: 'text-blue-500' },
  hunting: { icon: Fire, color: 'text-orange-500' },
  acquiring: { icon: Lightning, color: 'text-yellow-500' },
  listing: { icon: ChartLine, color: 'text-purple-500' },
  negotiating: { icon: Handshake, color: 'text-cyan-500' },
  triumphant: { icon: CheckCircle, color: 'text-green-500' },
  cautious: { icon: Warning, color: 'text-red-500' },
}

// ==================== MAIN COMPONENT ====================

export default function ProductionControlPanel() {
  const [brainState, setBrainState] = useState<BrainState>(productionBrain.getState())
  const [config, setConfig] = useState<ProductionConfig>(productionBrain.getConfig())
  const [kpis, setKpis] = useState<KPIs>(productionBrain.getKPIs())
  const [killSwitchStates, setKillSwitchStates] = useState<Map<KillSwitchType, KillSwitchState>>(killSwitches.getAllStates())
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'control' | 'safety' | 'metrics' | 'config'>('control')

  // Subscribe to updates
  useEffect(() => {
    const unsubBrain = productionBrain.subscribe(setBrainState)
    const unsubKillSwitch = killSwitches.subscribe(setKillSwitchStates)

    // Update KPIs every 5 seconds
    const kpiInterval = setInterval(() => {
      setKpis(productionBrain.getKPIs())
    }, 5000)

    return () => {
      unsubBrain()
      unsubKillSwitch()
      clearInterval(kpiInterval)
    }
  }, [])

  // Launch/Stop handlers
  const handleLaunch = async () => {
    setIsLoading(true)
    try {
      await productionBrain.launch()
      toast.success('🚀 Production Brain Launched', {
        description: config.dryRun ? 'Running in DRY RUN mode' : 'Running in PRODUCTION mode',
      })
    } catch (error: any) {
      toast.error('Launch Failed', { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = () => {
    productionBrain.stop()
    toast.warning('🛑 Production Brain Stopped')
  }

  const handlePause = () => {
    if (brainState.isPaused) {
      productionBrain.resume()
    } else {
      productionBrain.pause()
    }
  }

  const handleEmergencyStop = () => {
    killSwitches.emergencyStop('Manual emergency stop', 'user')
    productionBrain.stop()
  }

  const toggleDryRun = (enabled: boolean) => {
    productionBrain.setDryRun(enabled)
    setConfig(productionBrain.getConfig())
  }

  const updateConfig = (updates: Partial<ProductionConfig>) => {
    productionBrain.setConfig(updates)
    setConfig(productionBrain.getConfig())
  }

  const MoodIcon = moodIcons[brainState.mood]?.icon || Brain
  const moodColor = moodIcons[brainState.mood]?.color || 'text-zinc-500'

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{
              scale: brainState.isRunning ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`p-3 rounded-xl ${brainState.isRunning ? 'bg-green-500/20' : 'bg-zinc-800'}`}
          >
            <MoodIcon size={32} weight="duotone" className={moodColor} />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Production Brain
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={brainState.isRunning ? 'success' : 'outline'}>
                {brainState.isRunning ? (brainState.isPaused ? '⏸️ PAUSED' : '🟢 RUNNING') : '⚫ STOPPED'}
              </Badge>
              <Badge variant={config.dryRun ? 'outline' : 'warning'} className={config.dryRun ? 'border-blue-500 text-blue-400' : 'bg-red-500/20 text-red-400 border-red-500/50'}>
                {config.dryRun ? '🔵 DRY RUN' : '🔴 PRODUCTION'}
              </Badge>
              <span className="text-sm text-zinc-500">Mood: {brainState.mood}</span>
            </div>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex gap-2">
          {!brainState.isRunning ? (
            <Button
              onClick={handleLaunch}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isLoading ? (
                <ArrowsClockwise size={20} className="animate-spin mr-2" />
              ) : (
                <Play size={20} className="mr-2" />
              )}
              LAUNCH
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePause}
                variant="outline"
                size="lg"
              >
                {brainState.isPaused ? <Play size={20} className="mr-2" /> : <Pause size={20} className="mr-2" />}
                {brainState.isPaused ? 'RESUME' : 'PAUSE'}
              </Button>
              <Button
                onClick={handleStop}
                variant="destructive"
                size="lg"
              >
                <Stop size={20} className="mr-2" />
                STOP
              </Button>
            </>
          )}
          <Button
            onClick={handleEmergencyStop}
            variant="destructive"
            size="lg"
            className="bg-red-600 hover:bg-red-700"
          >
            <Warning size={20} className="mr-2" />
            EMERGENCY
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {[
          { id: 'control', label: 'Control', icon: Lightning },
          { id: 'safety', label: 'Safety', icon: Shield },
          { id: 'metrics', label: 'Metrics', icon: ChartLine },
          { id: 'config', label: 'Config', icon: Gear },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-yellow-600/20 text-yellow-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* DRY RUN Toggle - Always Visible */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.dryRun ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
              {config.dryRun ? <Eye size={24} className="text-blue-500" /> : <Fire size={24} className="text-red-500" />}
            </div>
            <div>
              <h3 className="font-semibold text-white">DRY RUN Mode</h3>
              <p className="text-sm text-zinc-500">
                {config.dryRun 
                  ? 'Simulating trades without real money' 
                  : '⚠️ REAL MONEY - Trades will execute!'}
              </p>
            </div>
          </div>
          <Switch
            checked={config.dryRun}
            onCheckedChange={toggleDryRun}
          />
        </div>
      </Card>

      {/* Control Tab */}
      {activeTab === 'control' && (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Cycles</div>
              <div className="text-2xl font-bold text-white">{brainState.cyclesCompleted}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Domains Scanned</div>
              <div className="text-2xl font-bold text-blue-500">{brainState.domainsScanned}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Acquired</div>
              <div className="text-2xl font-bold text-green-500">{brainState.domainsAcquired}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-500">{brainState.domainsRejected}</div>
            </Card>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Available Capital</div>
              <div className="text-2xl font-bold text-yellow-500">{formatCurrency(brainState.availableCapital)}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Today Spent</div>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(brainState.todaySpent)}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Total Profit</div>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(brainState.totalProfit)}</div>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="text-xs text-zinc-500 uppercase mb-1">Hit Rate</div>
              <div className="text-2xl font-bold text-purple-500">{brainState.hitRate.toFixed(1)}%</div>
            </Card>
          </div>

          {/* Brain Thoughts */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain size={20} className="text-purple-500" />
              Brain Activity
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {brainState.thoughts.length > 0 ? (
                brainState.thoughts.slice(0, 20).map((thought, i) => (
                  <div key={i} className="text-sm text-zinc-400 p-2 bg-zinc-800/50 rounded">
                    {thought}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-600">
                  No activity yet. Launch the brain to see thoughts.
                </div>
              )}
            </div>
          </Card>

          {/* Pending Approvals */}
          <PendingApprovalsPanel />
        </div>
      )}

      {/* Safety Tab */}
      {activeTab === 'safety' && (
        <KillSwitchPanel 
          states={killSwitchStates} 
          onToggle={(type) => {
            const state = killSwitchStates.get(type)
            if (state?.enabled) {
              killSwitches.reset(type)
            } else {
              killSwitches.trigger(type, 'Manual toggle', 'user')
            }
          }}
        />
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && <MetricsDashboard kpis={kpis} />}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <ConfigPanel config={config} onUpdate={updateConfig} />
      )}
    </div>
  )
}

// ==================== KILL SWITCH PANEL ====================

function KillSwitchPanel({ 
  states, 
  onToggle 
}: { 
  states: Map<KillSwitchType, KillSwitchState>
  onToggle: (type: KillSwitchType) => void
}) {
  const switchGroups = {
    'Global': ['global'],
    'Operations': ['acquisitions', 'listings', 'negotiations', 'transfers'],
    'Registrars': ['registrar_godaddy', 'registrar_namecheap', 'registrar_dropcatch'],
    'Marketplaces': ['marketplace_sedo', 'marketplace_afternic', 'marketplace_flippa', 'marketplace_dan', 'marketplace_godaddy'],
    'Strategies': ['strategy_crypto', 'strategy_ai', 'strategy_trending', 'strategy_premium'],
    'Risk': ['high_value'],
  }

  return (
    <div className="space-y-4">
      <Card className="bg-red-950/30 border-red-900/50 p-4">
        <div className="flex items-center gap-3">
          <Warning size={24} className="text-red-500" />
          <div>
            <h3 className="font-semibold text-red-400">Kill Switches</h3>
            <p className="text-sm text-red-300/70">Toggle switches to pause specific operations. Red = BLOCKED.</p>
          </div>
        </div>
      </Card>

      {Object.entries(switchGroups).map(([group, types]) => (
        <Card key={group} className="bg-zinc-900/50 border-zinc-800 p-4">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">{group}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {types.map(type => {
              const state = states.get(type as KillSwitchType)
              const isBlocked = state?.enabled || false
              return (
                <button
                  key={type}
                  onClick={() => onToggle(type as KillSwitchType)}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isBlocked 
                      ? 'bg-red-500/20 border border-red-500/50 text-red-400' 
                      : 'bg-zinc-800/50 border border-zinc-700 text-zinc-300 hover:bg-zinc-700/50'
                  }`}
                >
                  <span className="text-sm font-medium">{type.replace(/_/g, ' ')}</span>
                  {isBlocked ? (
                    <XCircle size={18} className="text-red-500" />
                  ) : (
                    <CheckCircle size={18} className="text-green-500" />
                  )}
                </button>
              )
            })}
          </div>
        </Card>
      ))}

      {/* Spend Guards */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Spend Guards</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Daily Remaining</div>
            <div className="text-xl font-bold text-yellow-500">
              {formatCurrency(spendGuards.getRemainingBudget().daily)}
            </div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Weekly Remaining</div>
            <div className="text-xl font-bold text-yellow-500">
              {formatCurrency(spendGuards.getRemainingBudget().weekly)}
            </div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Monthly Remaining</div>
            <div className="text-xl font-bold text-yellow-500">
              {formatCurrency(spendGuards.getRemainingBudget().monthly)}
            </div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Cumulative P&L</div>
            <div className={`text-xl font-bold ${spendGuards.getCumulativePnL() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(spendGuards.getCumulativePnL())}
            </div>
          </div>
        </div>
      </Card>

      {/* Circuit Breakers */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Circuit Breakers</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from(circuitBreaker.getAllStats().entries()).map(([name, stats]) => (
            <div 
              key={name}
              className={`p-3 rounded-lg border ${
                stats.state === 'open' 
                  ? 'bg-red-500/20 border-red-500/50' 
                  : stats.state === 'half-open'
                  ? 'bg-yellow-500/20 border-yellow-500/50'
                  : 'bg-zinc-800/50 border-zinc-700'
              }`}
            >
              <div className="text-xs text-zinc-400">{name}</div>
              <div className="flex items-center justify-between mt-1">
                <Badge className={`text-xs ${
                  stats.state === 'open' ? 'bg-red-500' : 
                  stats.state === 'half-open' ? 'bg-yellow-500' : 'bg-green-500'
                }`}>
                  {stats.state}
                </Badge>
                <span className="text-xs text-zinc-500">{(stats.successRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ==================== METRICS DASHBOARD ====================

function MetricsDashboard({ kpis }: { kpis: KPIs }) {
  return (
    <div className="space-y-4">
      {/* Acquisition Metrics */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Acquisition Metrics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Scan Rate</div>
            <div className="text-xl font-bold text-blue-500">{kpis.scanRate.toFixed(0)}/hr</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Hit Rate</div>
            <div className="text-xl font-bold text-purple-500">{(kpis.hitRate * 100).toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Win Rate</div>
            <div className="text-xl font-bold text-green-500">{kpis.winRate.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Snipe Success</div>
            <div className="text-xl font-bold text-yellow-500">{kpis.snipeSuccessRate.toFixed(1)}%</div>
          </div>
        </div>
      </Card>

      {/* Financial Metrics */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Financial Metrics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Total ROI</div>
            <div className="text-xl font-bold text-green-500">{kpis.totalROI.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Avg ROI per Flip</div>
            <div className="text-xl font-bold text-green-500">{kpis.avgFlipROI.toFixed(0)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Total Profit</div>
            <div className="text-xl font-bold text-green-500">{formatCurrency(kpis.totalProfit)}</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Avg Days to Sale</div>
            <div className="text-xl font-bold text-yellow-500">{kpis.avgTimeToSale.toFixed(0)}d</div>
          </div>
        </div>
      </Card>

      {/* Operational Metrics */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Operational Metrics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">API Success Rate</div>
            <div className="text-xl font-bold text-green-500">{kpis.apiSuccessRate.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Avg API Latency</div>
            <div className="text-xl font-bold text-yellow-500">{kpis.avgApiLatency.toFixed(0)}ms</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Queue Depth</div>
            <div className="text-xl font-bold text-blue-500">{kpis.queueDepth}</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Active Negotiations</div>
            <div className="text-xl font-bold text-purple-500">{kpis.activeNegotiations}</div>
          </div>
        </div>
      </Card>

      {/* Risk Metrics */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-3">Risk Metrics</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Portfolio Exposure</div>
            <div className="text-xl font-bold text-orange-500">{kpis.portfolioExposure.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Max Drawdown</div>
            <div className="text-xl font-bold text-red-500">{kpis.maxDrawdown.toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Sharpe Ratio</div>
            <div className="text-xl font-bold text-green-500">{kpis.sharpeRatio.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-xs text-zinc-500">Valuation Accuracy</div>
            <div className="text-xl font-bold text-purple-500">{kpis.valuationAccuracy.toFixed(1)}%</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

// ==================== CONFIG PANEL ====================

function ConfigPanel({ 
  config, 
  onUpdate 
}: { 
  config: ProductionConfig
  onUpdate: (updates: Partial<ProductionConfig>) => void
}) {
  return (
    <div className="space-y-4">
      {/* Acquisition Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-4">Acquisition Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Min God Score: {config.minGodScore}</label>
            <Slider
              value={[config.minGodScore]}
              onValueChange={([v]) => onUpdate({ minGodScore: v })}
              min={50}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Min ROI: {config.minROI}x</label>
            <Slider
              value={[config.minROI]}
              onValueChange={([v]) => onUpdate({ minROI: v })}
              min={2}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Min Confidence: {(config.minConfidence * 100).toFixed(0)}%</label>
            <Slider
              value={[config.minConfidence * 100]}
              onValueChange={([v]) => onUpdate({ minConfidence: v / 100 })}
              min={30}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Max Price Per Domain: ${config.maxPricePerDomain}</label>
            <Slider
              value={[config.maxPricePerDomain]}
              onValueChange={([v]) => onUpdate({ maxPricePerDomain: v })}
              min={10}
              max={1000}
              step={10}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Listing Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-4">Listing Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Auto-List Enabled</span>
            <Switch
              checked={config.autoListEnabled}
              onCheckedChange={(v) => onUpdate({ autoListEnabled: v })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">List Price Multiplier: {config.listPriceMultiplier}x</label>
            <Slider
              value={[config.listPriceMultiplier]}
              onValueChange={([v]) => onUpdate({ listPriceMultiplier: v })}
              min={2}
              max={20}
              step={1}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Human Approval Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-4">Human Approval</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Require Human Approval</span>
            <Switch
              checked={config.requireHumanApproval}
              onCheckedChange={(v) => onUpdate({ requireHumanApproval: v })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Approval Threshold: ${config.humanApprovalThreshold}</label>
            <Slider
              value={[config.humanApprovalThreshold]}
              onValueChange={([v]) => onUpdate({ humanApprovalThreshold: v })}
              min={100}
              max={5000}
              step={100}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Scan Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase mb-4">Scan Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400">Scan Interval: {config.scanIntervalMs / 1000}s</label>
            <Slider
              value={[config.scanIntervalMs / 1000]}
              onValueChange={([v]) => onUpdate({ scanIntervalMs: v * 1000 })}
              min={30}
              max={300}
              step={30}
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400">Max Domains Per Scan: {config.maxDomainsPerScan}</label>
            <Slider
              value={[config.maxDomainsPerScan]}
              onValueChange={([v]) => onUpdate({ maxDomainsPerScan: v })}
              min={10}
              max={200}
              step={10}
              className="mt-2"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

// ==================== PENDING APPROVALS ====================

function PendingApprovalsPanel() {
  const [approvals, setApprovals] = useState(productionBrain.getPendingApprovals())

  useEffect(() => {
    const interval = setInterval(() => {
      setApprovals(productionBrain.getPendingApprovals())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  if (approvals.length === 0) {
    return null
  }

  return (
    <Card className="bg-yellow-950/30 border-yellow-900/50 p-4">
      <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
        <Clock size={20} />
        Pending Approvals ({approvals.length})
      </h3>
      <div className="space-y-3">
        {approvals.map(candidate => (
          <div key={candidate.domain} className="p-4 bg-zinc-900/50 rounded-lg border border-yellow-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">{candidate.domain}</span>
              <Badge className="bg-yellow-500/20 text-yellow-400">
                ${candidate.price}
              </Badge>
            </div>
            <div className="text-sm text-zinc-400 mb-3">
              {candidate.reasoning}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div className="p-2 bg-zinc-800/50 rounded">
                <div className="text-zinc-500">God Score</div>
                <div className="text-white font-bold">{candidate.godScore}</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded">
                <div className="text-zinc-500">Est. Value</div>
                <div className="text-green-500 font-bold">{formatCurrency(candidate.valuation.value)}</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded">
                <div className="text-zinc-500">ROI</div>
                <div className="text-yellow-500 font-bold">{(candidate.valuation.value / candidate.price).toFixed(1)}x</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await productionBrain.approveAcquisition(candidate.domain)
                  setApprovals(productionBrain.getPendingApprovals())
                  toast.success(`Approved: ${candidate.domain}`)
                }}
                className="flex-1 bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle size={16} className="mr-1" />
                Approve
              </Button>
              <Button
                onClick={() => {
                  productionBrain.rejectAcquisition(candidate.domain)
                  setApprovals(productionBrain.getPendingApprovals())
                  toast.info(`Rejected: ${candidate.domain}`)
                }}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <XCircle size={16} className="mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
