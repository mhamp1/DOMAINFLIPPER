/**
 * Empire Launch Dashboard — Pristine Professional UI
 * Clean, Beautiful, User-Friendly
 * December 27, 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  CurrencyDollar, 
  TrendUp, 
  Package, 
  Target,
  CheckCircle,
  Clock,
  ArrowRight
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { empireEngine } from '@/lib/autonomy/EmpireEngine'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function EmpireLaunch() {
  const [isLaunched, setIsLaunched] = useState(false)
  const [stats, setStats] = useState(empireEngine.getStats())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      const newStats = empireEngine.getStats()
      setStats(newStats)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleLaunchEmpire = async () => {
    if (isLaunched) {
      // Pause empire
      setIsLoading(true)
      empireEngine.stop()
      setIsLaunched(false)
      setIsLoading(false)
      toast.info('Empire Paused', {
        description: 'Autonomous operations stopped',
      })
    } else {
      // Launch empire
      setIsLoading(true)
      try {
        await empireEngine.runForever()
        setIsLaunched(true)
        toast.success('Empire Launched', {
          description: 'Autonomous domain empire is now active',
        })
      } catch (error) {
        toast.error('Launch Failed', {
          description: 'Please check your configuration',
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-black text-yellow-600">
      {/* Header */}
      <div className="border-b border-yellow-600/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-yellow-600">Domain Empire</h1>
              <p className="text-sm text-yellow-600/60 mt-1">Autonomous Domain Flipping</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge 
                variant={isLaunched ? 'success' : 'outline'}
                className="px-4 py-2"
              >
                {isLaunched ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Active
                  </div>
                ) : (
                  'Ready'
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Launch Section */}
        <div className="mb-12">
          <Card className="obsidian-glass border border-yellow-600/20 p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-yellow-600 mb-2">
                  {isLaunched ? 'Empire Running' : 'Start Your Empire'}
                </h2>
                <p className="text-yellow-600/70 mb-6">
                  {isLaunched 
                    ? 'Your autonomous domain empire is running. It will scan, buy, sell, and profit automatically.'
                    : 'Start with $100. The bot will automatically scan domains, make intelligent buying decisions, list for sale, negotiate, and withdraw profits. No manual intervention needed.'
                  }
                </p>
                
                {isLaunched && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-black/50 rounded-lg p-4 border border-yellow-600/10">
                      <div className="text-sm text-yellow-600/60 mb-1">Uptime</div>
                      <div className="text-xl font-semibold text-yellow-600">
                        {formatUptime(stats.uptime)}
                      </div>
                    </div>
                    <div className="bg-black/50 rounded-lg p-4 border border-yellow-600/10">
                      <div className="text-sm text-yellow-600/60 mb-1">Decisions Today</div>
                      <div className="text-xl font-semibold text-yellow-600">
                        {stats.decisionsToday || 0}
                      </div>
                    </div>
                    <div className="bg-black/50 rounded-lg p-4 border border-yellow-600/10">
                      <div className="text-sm text-yellow-600/60 mb-1">Last Scan</div>
                      <div className="text-sm font-medium text-yellow-600">
                        {stats.lastScan ? new Date(stats.lastScan).toLocaleTimeString() : 'Never'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Features List */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-yellow-600/80">
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                    <span>Auto-scan 120k+ domains daily</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-600/80">
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                    <span>AI-powered buying decisions (10x+ ROI only)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-600/80">
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                    <span>Auto-list on 5 marketplaces</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-600/80">
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                    <span>Auto-negotiate sales</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-yellow-600/80">
                    <CheckCircle size={16} weight="fill" className="text-green-500" />
                    <span>Auto-withdraw profits</span>
                  </div>
                </div>
              </div>

              <div className="ml-8">
                <Button
                  size="lg"
                  onClick={handleLaunchEmpire}
                  disabled={isLoading}
                  className={`
                    min-w-[200px] h-14 text-lg font-semibold
                    ${isLaunched 
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30' 
                      : 'bg-yellow-600 hover:bg-yellow-500 text-black border-0'
                    }
                    transition-all duration-200
                  `}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {isLaunched ? 'Stopping...' : 'Starting...'}
                    </div>
                  ) : isLaunched ? (
                    <div className="flex items-center gap-2">
                      <Pause size={20} weight="fill" />
                      Pause Empire
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play size={20} weight="fill" />
                      Start Empire
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Balance */}
          <Card className="obsidian-glass border border-yellow-600/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-600/10 rounded-lg">
                <CurrencyDollar size={24} weight="duotone" className="text-yellow-600" />
              </div>
              <Badge variant="outline" className="text-xs">Balance</Badge>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {formatCurrency(stats.balance || 0)}
            </div>
            <div className="text-sm text-yellow-600/60">
              Daily spent: {formatCurrency(stats.dailySpent || 0)}
            </div>
          </Card>

          {/* Today's Profit */}
          <Card className="obsidian-glass border border-yellow-600/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendUp size={24} weight="duotone" className="text-green-500" />
              </div>
              <Badge variant="outline" className="text-xs">Today</Badge>
            </div>
            <div className="text-3xl font-bold text-green-500 mb-1">
              {formatCurrency(stats.dailyProfit || 0)}
            </div>
            <div className="text-sm text-yellow-600/60">
              {stats.dailyProfit > 0 ? '+' : ''}{formatCurrency(stats.dailyProfit || 0)}
            </div>
          </Card>

          {/* Total Profit */}
          <Card className="obsidian-glass border border-yellow-600/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-600/10 rounded-lg">
                <Target size={24} weight="duotone" className="text-yellow-600" />
              </div>
              <Badge variant="outline" className="text-xs">Total</Badge>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {formatCurrency(stats.totalProfit || 0)}
            </div>
            <div className="text-sm text-yellow-600/60">
              ROI: {stats.roi.toFixed(1)}%
            </div>
          </Card>

          {/* Portfolio */}
          <Card className="obsidian-glass border border-yellow-600/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-600/10 rounded-lg">
                <Package size={24} weight="duotone" className="text-yellow-600" />
              </div>
              <Badge variant="outline" className="text-xs">Portfolio</Badge>
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">
              {stats.domainsOwned || 0}
            </div>
            <div className="text-sm text-yellow-600/60">
              Sold: {stats.domainsSold || 0} • Win: {stats.winRate.toFixed(1)}%
            </div>
          </Card>
        </div>

        {/* Activity Status */}
        {isLaunched && (
          <Card className="obsidian-glass border border-yellow-600/20 p-6 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={20} weight="duotone" className="text-green-500" />
              <h3 className="text-lg font-semibold text-yellow-600">System Status</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-yellow-600">Scanner</div>
                  <div className="text-xs text-yellow-600/60">Active</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-yellow-600">Auto-Buyer</div>
                  <div className="text-xs text-yellow-600/60">Monitoring</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-black/50 rounded-lg border border-yellow-600/10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="text-sm font-medium text-yellow-600">Auto-Seller</div>
                  <div className="text-xs text-yellow-600/60">Negotiating</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Start Guide */}
        {!isLaunched && (
          <Card className="obsidian-glass border border-yellow-600/20 p-6">
            <h3 className="text-lg font-semibold text-yellow-600 mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-sm font-semibold text-yellow-600">
                  1
                </div>
                <div>
                  <div className="font-medium text-yellow-600 mb-1">Start with $100</div>
                  <div className="text-sm text-yellow-600/70">
                    Your starting capital. The bot will use this intelligently to buy profitable domains.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-sm font-semibold text-yellow-600">
                  2
                </div>
                <div>
                  <div className="font-medium text-yellow-600 mb-1">Click "Start Empire"</div>
                  <div className="text-sm text-yellow-600/70">
                    The bot begins scanning 120k+ domains daily and making intelligent buying decisions.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-sm font-semibold text-yellow-600">
                  3
                </div>
                <div>
                  <div className="font-medium text-yellow-600 mb-1">Autonomous Operation</div>
                  <div className="text-sm text-yellow-600/70">
                    The bot automatically buys profitable domains, lists them for sale, negotiates offers, and withdraws profits. No manual work needed.
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-600/20 flex items-center justify-center text-sm font-semibold text-yellow-600">
                  4
                </div>
                <div>
                  <div className="font-medium text-yellow-600 mb-1">Watch Profits Grow</div>
                  <div className="text-sm text-yellow-600/70">
                    Monitor your profits in real-time. The bot learns from every transaction and gets smarter over time.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
