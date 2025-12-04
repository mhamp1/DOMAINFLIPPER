import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Sparkle, Play, Pause, ShieldCheck, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { StatsOverview } from '@/components/vault/StatsOverview'
import { StrategyEmpire } from '@/components/vault/StrategyEmpire'
import { LiveDrops } from '@/components/vault/LiveDrops'
import { PortfolioVault } from '@/components/vault/PortfolioVault'
import { APISetup } from '@/components/setup/APISetup'
import type { Domain, UserStats } from '@/types/domain'
import { domainScanner } from '@/lib/auctions/domainScanner'
import { sniperEngine } from '@/lib/auctions/sniperEngine'
import { autonomousEngine } from '@/lib/autonomous/autonomousEngine'
import { securityEngine } from '@/lib/security/securityEngine'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export function VaultDashboard() {
  const [godMode, setGodMode] = useState(false)
  const [autonomousMode, setAutonomousMode] = useState(false)
  const [liveDrops, setLiveDrops] = useState<Domain[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [showAPISetup, setShowAPISetup] = useState(false)
  const [ownedDomains, setOwnedDomains] = useState<any[]>([])
  
  const [stats, setStats] = useState<UserStats>({
    balance: 124567,
    domainsOwned: 42,
    totalProfit: 892341,
    todayProfit: 18420,
    monthlyProfit: 156000,
    avgROI: 842,
    totalInvested: 105000,
    activeSnipes: 0,
    successRate: 94,
  })

  useEffect(() => {
    // Start scanning on mount
    handleStartScanning()
    
    // Update stats from autonomous engine
    const interval = setInterval(() => {
      if (autonomousMode) {
        const dailyStats = autonomousEngine.getDailyStats()
        const portfolioValue = autonomousEngine.getPortfolioValue()
        const totalInvested = autonomousEngine.getTotalInvested()
        const owned = autonomousEngine.getOwnedDomains()

        setOwnedDomains(owned.map(o => {
          const purchasePrice = o.purchasePrice || 1 // Prevent division by zero
          const profit = o.domain.estimatedValue - o.purchasePrice
          const roi = purchasePrice > 0 
            ? ((o.domain.estimatedValue - o.purchasePrice) / purchasePrice) * 100 
            : 0
          
          return {
            domain: o.domain,
            purchasePrice: o.purchasePrice,
            purchaseDate: o.purchaseDate,
            currentValue: o.domain.estimatedValue,
            profit,
            roi,
            listed: o.listings.length > 0,
            offers: o.offers.length,
          }
        }))

        setStats(prev => ({
          ...prev,
          domainsOwned: owned.length,
          totalInvested,
          totalProfit: portfolioValue - totalInvested,
          todayProfit: dailyStats.totalEarned - dailyStats.totalSpent,
        }))
      }
    }, 5000)
    
    return () => {
      domainScanner.stopScanning()
      clearInterval(interval)
    }
  }, [autonomousMode])

  const handleStartScanning = async () => {
    if (isScanning) return
    
    setIsScanning(true)
    soundEngine.notification()
    
    toast.success('Scanner Active', {
      description: 'Monitoring GoDaddy, Namecheap, and DropCatch',
    })

    domainScanner.startScanning((domains) => {
      setLiveDrops(domains)
      soundEngine.goldShimmer()
    }, 30000)

    const initialDomains = await domainScanner.scan()
    setLiveDrops(initialDomains)
  }

  const handleToggleAutonomousMode = () => {
    const newMode = !autonomousMode
    setAutonomousMode(newMode)
    
    if (newMode) {
      autonomousEngine.start()
      soundEngine.vaultOpen()
      
      // Gold confetti
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
      })
      
      toast.success('AUTONOMOUS EMPIRE ACTIVATED', {
        description: '100% automated • Auto-buy • Auto-sell • Auto-profit',
        icon: '🚀',
        duration: 5000,
      })
    } else {
      autonomousEngine.stop()
      toast.info('Autonomous Mode Deactivated', {
        description: 'Manual control restored',
      })
    }
  }

  const handleToggleGodMode = () => {
    const newGodMode = !godMode
    setGodMode(newGodMode)
    
    if (newGodMode) {
      sniperEngine.enableGodMode()
      soundEngine.vaultOpen()
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700']
      })
      
      toast.success('GOD MODE ACTIVATED', {
        description: '100% win rate • Infinite budget • Always wins',
        icon: '👑',
      })
    } else {
      sniperEngine.disableGodMode()
      toast.info('God Mode Deactivated', {
        description: 'Back to normal operations',
      })
    }
  }

  const handleSnipeDomain = async (domain: Domain) => {
    // Check security
    const canExecute = await securityEngine.canExecuteTransaction(
      domain.name,
      domain.currentBid || 0,
      domain.estimatedValue
    )

    if (!canExecute) {
      toast.error('Transaction Blocked', {
        description: 'Security check failed',
      })
      return
    }

    const maxBid = domain.estimatedValue * 0.7
    
    try {
      const transaction = await sniperEngine.snipeNow(domain, maxBid)
      
      if (transaction.status === 'completed') {
        // Gold confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
        })

        soundEngine.success()
        
        setStats(prev => ({
          ...prev,
          domainsOwned: prev.domainsOwned + 1,
          balance: prev.balance - transaction.amount,
          totalInvested: prev.totalInvested + transaction.amount,
        }))

        setLiveDrops(prev => prev.filter(d => d.id !== domain.id))
        
        toast.success(`SNIPED: ${domain.name}`, {
          description: `Acquired for ${formatCurrency(transaction.amount)}`,
          icon: '💎',
        })
      } else {
        toast.error('Snipe Failed', {
          description: 'Outbid by another user',
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to execute snipe',
      })
    }
  }

  const handleEmergencyPause = () => {
    securityEngine.emergencyPause()
    autonomousEngine.stop()
    setAutonomousMode(false)
    
    toast.error('EMERGENCY PAUSE ACTIVATED', {
      description: 'All transactions stopped',
      icon: '🚨',
      duration: 10000,
    })
  }

  const portfolioStats = {
    totalSpent: stats.totalInvested,
    totalEarned: stats.totalProfit + stats.totalInvested,
    totalValue: stats.totalProfit + stats.totalInvested,
  }

  return (
    <div className="min-h-screen bg-black font-inter text-gold">
      {/* Header */}
      <div className="border-b border-gold/20 px-8 lg:px-12 py-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <motion.h1 
              className="text-4xl lg:text-6xl font-bold tracking-tight text-gold mb-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              DOMAINFLIPPER VAULT
            </motion.h1>
            <motion.p 
              className="text-zinc-500 text-sm lg:text-base"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Autonomous Domain Empire • 100% Automated • Pure Profit
            </motion.p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-zinc-500 text-sm">Vault Balance</p>
              <motion.p 
                className="text-3xl lg:text-4xl font-bold text-gold"
                animate={{ 
                  textShadow: [
                    "0 0 20px rgba(212, 175, 55, 0.3)",
                    "0 0 30px rgba(212, 175, 55, 0.5)",
                    "0 0 20px rgba(212, 175, 55, 0.3)"
                  ]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {formatCurrency(stats.balance)}
              </motion.p>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant={autonomousMode ? "gold" : "outline"}
                size="lg"
                onClick={handleToggleAutonomousMode}
                className="flex items-center gap-2"
              >
                {autonomousMode ? <Pause size={20} weight="bold" /> : <Play size={20} weight="bold" />}
                <span className="font-bold">
                  {autonomousMode ? 'AUTONOMOUS ACTIVE' : 'START AUTONOMOUS'}
                </span>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant={godMode ? "gold" : "outline"}
                size="lg"
                onClick={handleToggleGodMode}
                onMouseEnter={() => soundEngine.hover()}
              >
                <Crown 
                  className="mr-2" 
                  size={20} 
                  weight={godMode ? "fill" : "regular"} 
                />
                <span className="font-bold">
                  {godMode ? 'GOD MODE' : 'GOD MODE'}
                </span>
              </Button>
            </motion.div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAPISetup(!showAPISetup)}
            >
              <Gear size={20} weight="bold" className="mr-2" />
              API Setup
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleEmergencyPause}
              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
            >
              <ShieldCheck size={20} weight="bold" className="mr-2" />
              EMERGENCY PAUSE
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 space-y-16">
        {/* API Setup */}
        {showAPISetup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <APISetup />
          </motion.div>
        )}

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <StatsOverview stats={stats} />
        </motion.div>

        {/* Portfolio Vault */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <PortfolioVault
            ownedDomains={ownedDomains}
            totalSpent={portfolioStats.totalSpent}
            totalEarned={portfolioStats.totalEarned}
            totalValue={portfolioStats.totalValue}
          />
        </motion.div>

        {/* Strategy Empire */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <StrategyEmpire />
        </motion.div>

        {/* Live Drops */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <LiveDrops domains={liveDrops} onSnipe={handleSnipeDomain} />
        </motion.div>

        {/* Scanner Status */}
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-8 right-8 obsidian-glass border-2 border-gold/30 rounded-2xl p-6 shadow-gold"
          >
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkle size={32} weight="duotone" className="text-gold" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-gold">Scanner Active</p>
                <p className="text-xs text-zinc-500">
                  {autonomousMode ? 'Autonomous Mode: ON' : 'Monitoring 3 sources'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
