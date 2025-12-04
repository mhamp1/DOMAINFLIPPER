import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { StatsOverview } from '@/components/vault/StatsOverview'
import { StrategyEmpire } from '@/components/vault/StrategyEmpire'
import { LiveDrops } from '@/components/vault/LiveDrops'
import { EmpireControl } from '@/components/vault/EmpireControl'
import type { Domain, UserStats } from '@/types/domain'
import { domainScanner } from '@/lib/auctions/domainScanner'
import { sniperEngine } from '@/lib/auctions/sniperEngine'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export function VaultDashboard() {
  const [godMode, setGodMode] = useState(false)
  const [liveDrops, setLiveDrops] = useState<Domain[]>([])
  const [isScanning, setIsScanning] = useState(false)
  
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
    
    return () => {
      domainScanner.stopScanning()
    }
  }, [])

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
    }, 30000) // Scan every 30 seconds for demo

    // Initial scan
    const initialDomains = await domainScanner.scan()
    setLiveDrops(initialDomains)
  }

  const handleToggleGodMode = () => {
    const newGodMode = !godMode
    setGodMode(newGodMode)
    
    if (newGodMode) {
      sniperEngine.enableGodMode()
      soundEngine.vaultOpen()
      
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
    const maxBid = domain.estimatedValue * 0.7
    
    try {
      const transaction = await sniperEngine.snipeNow(domain, maxBid)
      
      if (transaction.status === 'completed') {
        // Update stats
        setStats(prev => ({
          ...prev,
          domainsOwned: prev.domainsOwned + 1,
          balance: prev.balance - transaction.amount,
          totalInvested: prev.totalInvested + transaction.amount,
        }))

        // Remove from live drops
        setLiveDrops(prev => prev.filter(d => d.id !== domain.id))
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

  return (
    <div className="min-h-screen bg-black font-inter text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-8 lg:px-12 py-8">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <motion.h1 
              className="text-4xl lg:text-6xl font-bold tracking-tight text-white mb-2"
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
              Private Domain Acquisition System • Est. 2025
            </motion.p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-zinc-500 text-sm">Vault Balance</p>
              <motion.p 
                className="text-3xl lg:text-4xl font-bold text-yellow-600"
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
                variant={godMode ? "gold" : "outline"}
                size="lg"
                onClick={handleToggleGodMode}
                onMouseEnter={() => soundEngine.hover()}
                className={`${godMode ? 'shadow-gold-lg' : ''} transition-all duration-300`}
              >
                <Crown 
                  className="mr-2" 
                  size={20} 
                  weight={godMode ? "fill" : "regular"} 
                />
                <span className="font-bold">
                  {godMode ? 'GOD MODE ACTIVE' : 'ACTIVATE GOD MODE'}
                </span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 lg:px-12 py-12 space-y-16">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <StatsOverview stats={stats} />
        </motion.div>

        {/* Empire Control - NEW AUTONOMOUS SYSTEM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <EmpireControl />
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
            className="fixed bottom-8 right-8 bg-zinc-950 border-2 border-yellow-600/30 rounded-2xl p-6 shadow-gold"
          >
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkle size={32} weight="duotone" className="text-yellow-600" />
              </motion.div>
              <div>
                <p className="text-sm font-bold text-white">Scanner Active</p>
                <p className="text-xs text-zinc-500">Monitoring 3 sources</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
