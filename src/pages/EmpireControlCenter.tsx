/**
 * EmpireControlCenter.tsx — YOU ARE GOD
 * Total control over every aspect of your empire
 * December 27, 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Gear,
  Play,
  Pause,
  Lightning,
  Shield,
  CurrencyDollar,
  Target,
  ChartLineUp,
  Power,
  Warning,
  CheckCircle,
  Rocket,
  Crown,
  Fire,
  Coins,
  ArrowsClockwise,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useEmpireConfig, ALL_STRATEGIES, formatUptime } from '@/lib/config/UserEmpireConfig'
import { toast } from 'sonner'

const RISK_LEVELS = [
  { id: 'conservative', label: 'Conservative', color: 'text-blue-400', maxBid: 5 },
  { id: 'balanced', label: 'Balanced', color: 'text-green-400', maxBid: 15 },
  { id: 'aggressive', label: 'Aggressive', color: 'text-orange-400', maxBid: 30 },
  { id: 'god', label: 'GOD MODE', color: 'text-yellow-400', maxBid: 100 },
] as const

export default function EmpireControlCenter() {
  const config = useEmpireConfig()
  const [uptime, setUptime] = useState(0)

  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(config.getUptime())
    }, 1000)
    return () => clearInterval(interval)
  }, [config])

  const handleLaunch = () => {
    if (config.emergencyPaused) {
      toast.error('Empire is emergency paused. Resume first.')
      return
    }
    
    if (config.botRunning) {
      config.stopBot()
      toast.info('Empire Paused', { description: 'Bot stopped scanning' })
    } else {
      config.startBot()
      toast.success('🚀 EMPIRE LAUNCHED', { 
        description: 'Bot is now scanning and sniping domains',
        duration: 5000,
      })
    }
  }

  const handleEmergencyPause = () => {
    config.emergencyPause()
    toast.error('🛑 EMERGENCY PAUSE ACTIVATED', {
      description: 'All operations stopped immediately',
      duration: 10000,
    })
  }

  const handleResume = () => {
    config.resume()
    toast.success('Empire resumed', { description: 'Ready to launch' })
  }

  return (
    <div className="min-h-screen bg-black text-yellow-600 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-6xl font-black gold-gradient-text flex items-center justify-center gap-4">
            <Crown size={48} weight="fill" className="text-yellow-500" />
            EMPIRE CONTROL CENTER
            <Crown size={48} weight="fill" className="text-yellow-500" />
          </h1>
          <p className="text-yellow-600/60">Total Control • Zero Limits • God Mode</p>
        </div>

        {/* Status Bar */}
        <Card className="card-obsidian-premium p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${config.botRunning ? 'bg-green-500 animate-pulse' : config.emergencyPaused ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <span className="text-lg font-bold">
                {config.emergencyPaused ? '🛑 EMERGENCY PAUSED' : config.botRunning ? '🟢 LIVE & SCANNING' : '🟡 READY'}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Badge variant="outline" className="border-yellow-600/30 text-yellow-600">
                Uptime: {formatUptime(uptime)}
              </Badge>
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                Profit: ${config.totalProfit.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="border-yellow-600/30 text-yellow-600">
                Domains: {config.domainsAcquired}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Capital & Budget Section */}
        <Card className="card-obsidian-premium p-8">
          <h2 className="text-2xl md:text-3xl font-bold gold-gradient-text mb-8 flex items-center gap-3">
            <CurrencyDollar size={32} weight="fill" />
            CAPITAL & BUDGET
          </h2>
          
          <div className="space-y-8">
            {/* Total Capital */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl text-yellow-600">Total Capital</span>
                <span className="text-3xl font-bold gold-gradient-text font-orbitron">
                  ${config.capital.toLocaleString()}
                </span>
              </div>
              <Slider
                value={[config.capital]}
                onValueChange={([v]) => config.setCapital(v)}
                min={100}
                max={10000000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-yellow-600/50 mt-2">
                <span>$100</span>
                <span>$10,000,000</span>
              </div>
            </div>

            {/* Daily Budget */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl text-yellow-600">Daily Budget</span>
                <span className="text-2xl font-bold text-yellow-500">
                  {config.dailyBudgetPercent}% = ${((config.capital * config.dailyBudgetPercent) / 100).toLocaleString()}
                </span>
              </div>
              <Slider
                value={[config.dailyBudgetPercent]}
                onValueChange={([v]) => config.setDailyBudget(v)}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-yellow-600/50 mt-2">
                <span>1%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Min ROI */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl text-yellow-600">Minimum ROI Target</span>
                <span className="text-2xl font-bold text-green-400">{config.minROI}x</span>
              </div>
              <Slider
                value={[config.minROI]}
                onValueChange={([v]) => config.setMinROI(v)}
                min={2}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-yellow-600/50 mt-2">
                <span>2x</span>
                <span>50x</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Level */}
        <Card className="card-obsidian-premium p-8">
          <h2 className="text-2xl md:text-3xl font-bold gold-gradient-text mb-8 flex items-center gap-3">
            <Shield size={32} weight="fill" />
            RISK LEVEL
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {RISK_LEVELS.map((level) => (
              <Button
                key={level.id}
                onClick={() => config.setRiskLevel(level.id)}
                className={`h-24 text-lg font-bold transition-all ${
                  config.riskLevel === level.id
                    ? 'bg-yellow-600 text-black border-2 border-yellow-400 shadow-lg shadow-yellow-600/30'
                    : 'bg-black/50 border border-yellow-600/30 hover:border-yellow-600/60'
                }`}
              >
                <div className="text-center">
                  <div className={level.color}>{level.label}</div>
                  <div className="text-xs opacity-70">Max {level.maxBid}% per domain</div>
                </div>
              </Button>
            ))}
          </div>
        </Card>

        {/* Active Strategies */}
        <Card className="card-obsidian-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold gold-gradient-text flex items-center gap-3">
              <Target size={32} weight="fill" />
              ACTIVE STRATEGIES
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => config.enableAllStrategies()}
                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
              >
                Enable All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => config.disableAllStrategies()}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Disable All
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ALL_STRATEGIES.map((strategy) => {
              const isActive = config.activeStrategies.includes(strategy.id)
              return (
                <Button
                  key={strategy.id}
                  onClick={() => config.toggleStrategy(strategy.id)}
                  className={`h-20 text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-green-600/20 border-2 border-green-500 text-green-400'
                      : 'bg-black/50 border border-yellow-600/20 text-yellow-600/50 hover:border-yellow-600/40'
                  }`}
                >
                  <span>{isActive ? '✓' : '○'} {strategy.name.split(' ')[0]}</span>
                  <span className="text-xs opacity-60">{strategy.desc.slice(0, 20)}...</span>
                </Button>
              )
            })}
          </div>
          
          <p className="text-center text-yellow-600/50 mt-4">
            {config.activeStrategies.length} of {ALL_STRATEGIES.length} strategies active
          </p>
        </Card>

        {/* Automation Toggles */}
        <Card className="card-obsidian-premium p-8">
          <h2 className="text-2xl md:text-3xl font-bold gold-gradient-text mb-8 flex items-center gap-3">
            <Gear size={32} weight="fill" />
            AUTOMATION
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <div>
                <p className="font-bold text-yellow-600">Auto-Fund</p>
                <p className="text-xs text-yellow-600/50">Fund from card when low</p>
              </div>
              <Switch
                checked={config.autoFund}
                onCheckedChange={() => config.toggleAutoFund()}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <div>
                <p className="font-bold text-yellow-600">Auto-Compound</p>
                <p className="text-xs text-yellow-600/50">Reinvest profits</p>
              </div>
              <Switch
                checked={config.autoCompound}
                onCheckedChange={() => config.toggleAutoCompound()}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <div>
                <p className="font-bold text-yellow-600">Auto-List</p>
                <p className="text-xs text-yellow-600/50">List on marketplaces</p>
              </div>
              <Switch
                checked={config.autoList}
                onCheckedChange={() => config.toggleAutoList()}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <div>
                <p className="font-bold text-yellow-600">Auto-Bid</p>
                <p className="text-xs text-yellow-600/50">Bid on auctions</p>
              </div>
              <Switch
                checked={config.autoBid}
                onCheckedChange={() => config.toggleAutoBid()}
              />
            </div>
          </div>
        </Card>

        {/* Launch Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Button
            onClick={handleLaunch}
            disabled={config.emergencyPaused}
            className={`h-24 text-2xl font-black transition-all ${
              config.botRunning
                ? 'bg-yellow-600 hover:bg-yellow-500 text-black'
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {config.botRunning ? (
              <><Pause size={32} className="mr-3" /> PAUSE EMPIRE</>
            ) : (
              <><Rocket size={32} className="mr-3" /> LAUNCH EMPIRE</>
            )}
          </Button>

          {config.emergencyPaused ? (
            <Button
              onClick={handleResume}
              className="h-24 text-2xl font-black bg-blue-600 hover:bg-blue-500 text-white"
            >
              <ArrowsClockwise size={32} className="mr-3" /> RESUME OPERATIONS
            </Button>
          ) : (
            <Button
              onClick={handleEmergencyPause}
              className="h-24 text-2xl font-black bg-red-600 hover:bg-red-500 text-white"
            >
              <Warning size={32} className="mr-3" /> EMERGENCY PAUSE
            </Button>
          )}
        </div>

        {/* Stats Summary */}
        <Card className="card-obsidian-premium p-8">
          <h2 className="text-2xl md:text-3xl font-bold gold-gradient-text mb-6 flex items-center gap-3">
            <ChartLineUp size={32} weight="fill" />
            REAL-TIME STATS
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <p className="text-2xl font-bold gold-gradient-text">${config.capital.toLocaleString()}</p>
              <p className="text-xs text-yellow-600/50">Total Capital</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg border border-green-500/20">
              <p className="text-2xl font-bold text-green-400">${config.totalProfit.toLocaleString()}</p>
              <p className="text-xs text-green-500/50">Total Profit</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <p className="text-2xl font-bold text-yellow-500">${config.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-yellow-600/50">Total Spent</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <p className="text-2xl font-bold text-yellow-600">{config.domainsAcquired}</p>
              <p className="text-xs text-yellow-600/50">Domains Acquired</p>
            </div>
            <div className="text-center p-4 bg-black/30 rounded-lg border border-yellow-600/20">
              <p className="text-2xl font-bold text-yellow-600">{config.domainsSold}</p>
              <p className="text-xs text-yellow-600/50">Domains Sold</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

