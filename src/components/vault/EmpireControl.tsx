/**
 * EmpireControl.tsx — AUTONOMOUS EMPIRE CONTROL PANEL
 * Start/stop autonomous operations and view real-time stats
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Robot, Brain, Lightning, CurrencyDollar, TrendUp, Timer } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { empireEngine } from '@/lib/autonomy/EmpireEngine'
import { autoSeller } from '@/lib/empire/AutoSeller'
import { learningEngine } from '@/lib/learning/LearningEngine'

export function EmpireControl() {
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState(empireEngine.getStats())
  const [sellerStats, setSellerStats] = useState(autoSeller.getStats())
  const [learningMetrics, setLearningMetrics] = useState(learningEngine.getMetrics())
  const [uptime, setUptime] = useState('00:00:00')

  useEffect(() => {
    // Update stats every second
    const interval = setInterval(() => {
      setStats(empireEngine.getStats())
      setSellerStats(autoSeller.getStats())
      setLearningMetrics(learningEngine.getMetrics())
      
      // Format uptime
      const seconds = stats.uptime
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      setUptime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [stats.uptime])

  const handleToggleEmpire = async () => {
    if (isRunning) {
      empireEngine.stop()
      setIsRunning(false)
    } else {
      await empireEngine.runForever()
      setIsRunning(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Empire Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{
              scale: isRunning ? [1, 1.1, 1] : 1,
              rotate: isRunning ? [0, 360] : 0,
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
            }}
          >
            <Robot size={48} weight="duotone" className={isRunning ? 'text-green-500' : 'text-zinc-600'} />
          </motion.div>
          
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Autonomous Empire</h2>
            <div className="flex items-center gap-3">
              <Badge variant={isRunning ? 'success' : 'outline'}>
                {isRunning ? '🟢 ONLINE' : '⚫ OFFLINE'}
              </Badge>
              {isRunning && (
                <span className="text-zinc-500 text-sm font-mono">
                  Uptime: {uptime}
                </span>
              )}
            </div>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            variant={isRunning ? 'destructive' : 'default'}
            onClick={handleToggleEmpire}
            className="font-bold"
          >
            <Lightning className="mr-2" size={20} weight="fill" />
            {isRunning ? 'STOP EMPIRE' : 'LAUNCH EMPIRE'}
          </Button>
        </motion.div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CurrencyDollar size={24} weight="duotone" className="text-green-500" />
            <span className="text-zinc-500 text-sm font-medium">Balance</span>
          </div>
          <motion.div
            className="text-3xl font-bold text-white"
            key={stats.balance}
            initial={{ scale: 1.1, color: '#10b981' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ duration: 0.3 }}
          >
            ${stats.balance.toLocaleString()}
          </motion.div>
          <div className="text-xs text-zinc-600 mt-1">
            Daily spent: ${stats.dailySpent.toLocaleString()}
          </div>
        </Card>

        {/* Profit */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendUp size={24} weight="duotone" className="text-yellow-500" />
            <span className="text-zinc-500 text-sm font-medium">Total Profit</span>
          </div>
          <motion.div
            className="text-3xl font-bold text-yellow-500"
            key={stats.totalProfit}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            ${stats.totalProfit.toLocaleString()}
          </motion.div>
          <div className="text-xs text-zinc-600 mt-1">
            ROI: {stats.roi.toFixed(1)}%
          </div>
        </Card>

        {/* Portfolio */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Robot size={24} weight="duotone" className="text-blue-500" />
            <span className="text-zinc-500 text-sm font-medium">Portfolio</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {stats.domainsOwned}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Sold: {stats.domainsSold} • Win rate: {stats.winRate.toFixed(1)}%
          </div>
        </Card>

        {/* AI Learning */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain size={24} weight="duotone" className="text-purple-500" />
            <span className="text-zinc-500 text-sm font-medium">AI Accuracy</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {learningMetrics.aiAccuracy}%
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {learningMetrics.totalFlips} flips analyzed
          </div>
        </Card>
      </div>

      {/* Subsystems Status */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4">🤖 Subsystems Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* AutoBuyer */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">AutoBuyer</span>
              <Badge variant={isRunning ? 'success' : 'outline'}>
                {isRunning ? 'ACTIVE' : 'IDLE'}
              </Badge>
            </div>
            <div className="text-xs text-zinc-600">
              Decisions today: {stats.decisionsToday}
            </div>
          </div>

          {/* AutoSeller */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">AutoSeller</span>
              <Badge variant="success">MONITORING</Badge>
            </div>
            <div className="text-xs text-zinc-600">
              Active negotiations: {sellerStats.activeNegotiations}
            </div>
          </div>

          {/* AI Pricing */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">AI Pricing</span>
              <Badge variant="success">OPTIMIZING</Badge>
            </div>
            <div className="text-xs text-zinc-600">
              Next update in 2h 14m
            </div>
          </div>

          {/* Learning Engine */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">Learning Engine</span>
              <Badge variant="success">TRAINING</Badge>
            </div>
            <div className="text-xs text-zinc-600">
              Success rate: {learningMetrics.profitability.toFixed(1)}%
            </div>
          </div>

          {/* Marketplace Lister */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">Marketplace Lister</span>
              <Badge variant="success">READY</Badge>
            </div>
            <div className="text-xs text-zinc-600">
              5 platforms connected
            </div>
          </div>

          {/* Crypto Payments */}
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">Crypto Payments</span>
              <Badge variant="success">ACCEPTING</Badge>
            </div>
            <div className="text-xs text-zinc-600">
              BTC • ETH • SOL
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Summary */}
      {isRunning && stats.totalProfit > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-green-950/30 to-zinc-900/50 border-green-900/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendUp size={32} weight="duotone" className="text-green-500" />
              <div>
                <h3 className="text-xl font-bold text-white">Empire Performance</h3>
                <p className="text-sm text-zinc-500">Fully autonomous since launch</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  ${stats.totalProfit.toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500">Total Profit</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-white">
                  {stats.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-zinc-500">Win Rate</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-white">
                  {learningMetrics.avgDaysToSell}d
                </div>
                <div className="text-xs text-zinc-500">Avg Days to Sell</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {stats.roi.toFixed(0)}%
                </div>
                <div className="text-xs text-zinc-500">ROI</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-400">
                ✅ Best strategy: <span className="text-white font-medium">{learningMetrics.bestStrategy}</span> • 
                📊 AI is learning from every flip • 
                🚀 Operating at peak efficiency
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions (when running) */}
      {isRunning && (
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <h3 className="text-lg font-bold text-white mb-4">⚡ Quick Actions</h3>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm">
              📊 View Full Analytics
            </Button>
            <Button variant="outline" size="sm">
              💰 Adjust Budget
            </Button>
            <Button variant="outline" size="sm">
              🎯 Strategy Settings
            </Button>
            <Button variant="outline" size="sm">
              📈 Export Report
            </Button>
          </div>
        </Card>
      )}

      {/* Warning when offline */}
      {!isRunning && (
        <Card className="bg-yellow-950/20 border-yellow-900/30 p-6">
          <div className="flex items-center gap-3">
            <Timer size={24} weight="duotone" className="text-yellow-500" />
            <div>
              <h4 className="font-bold text-yellow-500 mb-1">Empire Offline</h4>
              <p className="text-sm text-yellow-300/80">
                The autonomous system is not running. Click "LAUNCH EMPIRE" to start automated buying, selling, and learning.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
