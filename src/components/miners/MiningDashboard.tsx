/**
 * MiningDashboard.tsx — Complete Mining Empire Control Center
 * Full UI for managing all domain miners
 * December 2025 — The Ultimate Mining Interface
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Lightning,
  ArrowsClockwise,
  Hammer,
  Diamond,
  Crown,
  Export,
  Gear,
  ChartBar,
  List,
  GridFour
} from '@phosphor-icons/react'
import { MinerCard } from './MinerCard'
import { GemFeed } from './GemFeed'
import { MiningStats } from './MiningStats'
import { miningEngine, type MiningEngineStats, type MinedDomain, type MinerSource } from '@/lib/miners'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

type ViewMode = 'dashboard' | 'gems' | 'legendary'

export function MiningDashboard() {
  const [stats, setStats] = useState<MiningEngineStats>(miningEngine.getStats())
  const [isRunning, setIsRunning] = useState(miningEngine.isActive())
  const [isLoading, setIsLoading] = useState<Record<MinerSource, boolean>>({
    godaddy_closeouts: false,
    namecheap_market: false,
    dynadot_closeouts: false,
    expireddomains_net: false,
    justdropped: false,
    domcop: false,
    namejet: false,
  })
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')

  // Subscribe to stats updates
  useEffect(() => {
    const unsubscribeStats = miningEngine.onStatsUpdate((newStats) => {
      setStats(newStats)
      setIsRunning(newStats.isRunning)
    })

    const unsubscribeEvents = miningEngine.onEvent((event) => {
      // Handle special events
      if (event.type === 'legendary_found') {
        soundEngine.vaultOpen()
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#8B5CF6', '#EC4899', '#D4AF37', '#FFD700']
        })
        toast.success('🏆 LEGENDARY DOMAIN FOUND!', {
          description: `${event.domain} → ${event.value ? `$${event.value.toLocaleString()}` : 'High Value'}`,
          duration: 10000,
        })
      } else if (event.type === 'gem_found') {
        soundEngine.success()
        toast.success('💎 Gem Found!', {
          description: `${event.domain} → ${event.value ? `$${event.value.toLocaleString()}` : 'High Value'}`,
        })
      }
    })

    // Initial stats load
    setStats(miningEngine.getStats())

    return () => {
      unsubscribeStats()
      unsubscribeEvents()
    }
  }, [])

  const handleStartAll = useCallback(() => {
    miningEngine.startAll()
    setIsRunning(true)
    soundEngine.success()
    toast.success('⛏️ Mining Empire Started!', {
      description: 'All miners are now hunting for gems',
    })
  }, [])

  const handleStopAll = useCallback(() => {
    miningEngine.stopAll()
    setIsRunning(false)
    toast.info('Mining Empire Paused')
  }, [])

  const handleRunAllCycles = useCallback(async () => {
    setIsLoading({
      godaddy_closeouts: true,
      namecheap_market: true,
      dynadot_closeouts: true,
      expireddomains_net: true,
      justdropped: false,
      domcop: false,
      namejet: false,
    })

    try {
      const results = await miningEngine.runAllCycles()
      toast.success(`Mining Complete!`, {
        description: `Found ${results.length} gems across all sources`,
      })
    } finally {
      setIsLoading({
        godaddy_closeouts: false,
        namecheap_market: false,
        dynadot_closeouts: false,
        expireddomains_net: false,
        justdropped: false,
        domcop: false,
        namejet: false,
      })
    }
  }, [])

  const handleRunCycle = useCallback(async (source: MinerSource) => {
    setIsLoading(prev => ({ ...prev, [source]: true }))
    
    try {
      const results = await miningEngine.runManualCycle(source)
      toast.success(`${miningEngine.getSourceDisplayName(source)} Complete`, {
        description: `Found ${results.length} gems`,
      })
    } finally {
      setIsLoading(prev => ({ ...prev, [source]: false }))
    }
  }, [])

  const handleExportWatchlist = useCallback(() => {
    const watchlist = miningEngine.exportWatchlist()
    const blob = new Blob([watchlist.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mining-watchlist-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Watchlist Exported', {
      description: `${watchlist.length} domains saved to file`,
    })
  }, [])

  const handleSnipe = useCallback((domain: MinedDomain) => {
    // Add to sniper watchlist (integrate with existing sniper)
    try {
      const watchlist = JSON.parse(localStorage.getItem('miner_watchlist') || '[]')
      watchlist.unshift({
        domain: domain.domain,
        price: domain.price,
        estValue: domain.estValue,
        source: domain.source,
        addedAt: new Date().toISOString(),
      })
      localStorage.setItem('miner_watchlist', JSON.stringify(watchlist.slice(0, 500)))
    } catch (e) {
      console.error('Failed to add to watchlist:', e)
    }
  }, [])

  const minerSources: MinerSource[] = [
    'godaddy_closeouts',
    'namecheap_market', 
    'dynadot_closeouts',
    'expireddomains_net'
  ]

  return (
    <div className="min-h-screen bg-black p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: isRunning ? [0, 15, -15, 0] : 0 }}
            transition={{ duration: 0.5, repeat: isRunning ? Infinity : 0, repeatDelay: 2 }}
          >
            <Hammer size={48} weight="duotone" className="text-yellow-500" />
          </motion.div>
          <div>
            <h1 className="text-4xl font-black text-yellow-500 font-orbitron tracking-wider">
              MINING EMPIRE
            </h1>
            <p className="text-gray-500">
              {isRunning ? '⛏️ Actively mining for domain gold...' : 'Start mining to find high-value domains'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggles */}
          <div className="flex bg-black/50 rounded-lg p-1 border border-yellow-600/20">
            <Button
              size="sm"
              variant={viewMode === 'dashboard' ? 'default' : 'ghost'}
              onClick={() => setViewMode('dashboard')}
              className={viewMode === 'dashboard' ? 'bg-yellow-600/20 text-yellow-500' : 'text-gray-500'}
            >
              <GridFour size={18} />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'gems' ? 'default' : 'ghost'}
              onClick={() => setViewMode('gems')}
              className={viewMode === 'gems' ? 'bg-yellow-600/20 text-yellow-500' : 'text-gray-500'}
            >
              <Diamond size={18} />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'legendary' ? 'default' : 'ghost'}
              onClick={() => setViewMode('legendary')}
              className={viewMode === 'legendary' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-500'}
            >
              <Crown size={18} />
            </Button>
          </div>

          {/* Export */}
          <Button
            variant="outline"
            onClick={handleExportWatchlist}
            className="border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/10"
          >
            <Export size={18} className="mr-2" />
            Export
          </Button>

          {/* Run All */}
          <Button
            onClick={handleRunAllCycles}
            disabled={Object.values(isLoading).some(Boolean)}
            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-600/50"
          >
            {Object.values(isLoading).some(Boolean) ? (
              <ArrowsClockwise size={18} className="animate-spin mr-2" />
            ) : (
              <Lightning size={18} className="mr-2" />
            )}
            Run All
          </Button>

          {/* Start/Stop */}
          <Button
            onClick={isRunning ? handleStopAll : handleStartAll}
            className={`min-w-32 ${
              isRunning 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50' 
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50'
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={18} weight="fill" className="mr-2" />
                Stop Empire
              </>
            ) : (
              <>
                <Play size={18} weight="fill" className="mr-2" />
                Start Empire
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <MiningStats stats={stats} />

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Miners Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-yellow-500 font-orbitron flex items-center gap-2">
                <Lightning size={24} />
                ACTIVE MINERS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {minerSources.map((source) => (
                  <MinerCard
                    key={source}
                    source={source}
                    stats={stats.minerStats[source] || {
                      source,
                      status: 'idle',
                      lastRun: null,
                      totalMined: 0,
                      gemsFound: 0,
                      legendaryFound: 0,
                      avgRoi: 0,
                      successRate: 100,
                      errorCount: 0,
                      nextRun: null,
                    }}
                    displayName={miningEngine.getSourceDisplayName(source)}
                    color={miningEngine.getSourceColor(source)}
                    onStart={() => miningEngine.startMiner(source)}
                    onStop={() => miningEngine.stopMiner(source)}
                    onRunCycle={() => handleRunCycle(source)}
                    isLoading={isLoading[source]}
                  />
                ))}
              </div>
            </div>

            {/* Recent Gems Sidebar */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-yellow-500 font-orbitron flex items-center gap-2">
                <Diamond size={24} />
                RECENT GEMS
              </h2>
              <GemFeed 
                gems={stats.recentGems} 
                onSnipe={handleSnipe}
                maxItems={8}
              />
            </div>
          </motion.div>
        )}

        {viewMode === 'gems' && (
          <motion.div
            key="gems"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-yellow-500 font-orbitron flex items-center gap-2">
                <Diamond size={32} />
                ALL GEMS ({stats.totalGemsFound})
              </h2>
              <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/50">
                {stats.recentGems.length} shown
              </Badge>
            </div>
            <GemFeed 
              gems={stats.recentGems} 
              onSnipe={handleSnipe}
              maxItems={50}
            />
          </motion.div>
        )}

        {viewMode === 'legendary' && (
          <motion.div
            key="legendary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-purple-400 font-orbitron flex items-center gap-2">
                <Crown size={32} />
                LEGENDARY DOMAINS ({stats.totalLegendaryFound})
              </h2>
              <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/50">
                $10,000+ Value
              </Badge>
            </div>
            {stats.legendaryDomains.length > 0 ? (
              <GemFeed 
                gems={stats.legendaryDomains} 
                onSnipe={handleSnipe}
                maxItems={30}
              />
            ) : (
              <Card className="bg-black/60 border border-purple-600/20 rounded-2xl p-12 text-center">
                <Crown size={80} weight="duotone" className="mx-auto text-purple-500/50 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3 font-orbitron">
                  No Legendary Domains Yet
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Keep the mining empire running to find domains worth $10,000+. 
                  Legendary domains are rare but incredibly profitable.
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MiningDashboard

