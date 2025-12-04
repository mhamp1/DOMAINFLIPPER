import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Crown, Diamond, Wallet, Lightning, Shield, Sparkle } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { dropSniper } from '@/lib/dropcatch/DropSniper'
import { soundEngine } from '@/lib/sounds/soundEffects'

/**
 * Personal Vault - Single-user luxury domain empire
 * No tiers, no subscriptions, pure profit
 */
export default function PersonalVault() {
  const [stats, setStats] = useState({
    domainsOwned: 89,
    totalProfit: 2345671,
    todayProfit: 45678,
    bestFlip: 'quantum.ai → $425,000',
    dropsSniped: 0,
  })

  const [dropSniperActive, setDropSniperActive] = useState(false)

  const handleStartDropSniper = useCallback(() => {
    if (dropSniperActive) return

    setDropSniperActive(true)
    soundEngine.vaultOpen()

    dropSniper.startDropSniper((_domain: string, value: number) => {
      // Update stats on successful snipe
      setStats(prev => ({
        ...prev,
        domainsOwned: prev.domainsOwned + 1,
        dropsSniped: prev.dropsSniped + 1,
        todayProfit: prev.todayProfit + Math.floor(value * 5), // 5x flip multiplier
        totalProfit: prev.totalProfit + Math.floor(value * 5),
      }))

      soundEngine.success()
    })
  }, [dropSniperActive])

  useEffect(() => {
    // Auto-activate drop sniper on mount (God Mode permanent)
    handleStartDropSniper()
    
    return () => {
      dropSniper.stopDropSniper()
    }
  }, [handleStartDropSniper])

  return (
    <div className="min-h-screen bg-black text-yellow-600 font-['Inter']">
      {/* Rotating God Crown */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed top-8 right-8 z-50"
      >
        <Crown 
          size={100} 
          weight="fill" 
          className="text-yellow-600 drop-shadow-[0_0_60px_rgba(212,175,55,0.8)]" 
        />
      </motion.div>

      {/* Drop Sniper Status Indicator */}
      {dropSniperActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-8 left-8 z-50 bg-zinc-950 border-2 border-yellow-600/50 rounded-xl p-4 shadow-[0_0_40px_rgba(212,175,55,0.3)]"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkle size={28} weight="duotone" className="text-yellow-600" />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-yellow-600">DROP SNIPER ACTIVE</p>
              <p className="text-xs text-yellow-600/60">
                Monitoring 120K+ domains • T+0.001s execution
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto p-12 space-y-16">
        {/* Header */}
        <motion.div 
          className="text-center space-y-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-7xl lg:text-9xl font-black tracking-tighter text-yellow-600">
            YOUR VAULT
          </h1>
          <p className="text-3xl lg:text-5xl text-yellow-600/80 font-light tracking-wide">
            Private Domain Empire — No One Else Allowed
          </p>
          <motion.div
            animate={{ 
              textShadow: [
                '0 0 20px rgba(212, 175, 55, 0.3)',
                '0 0 40px rgba(212, 175, 55, 0.6)',
                '0 0 20px rgba(212, 175, 55, 0.3)'
              ]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="text-lg text-yellow-600/60 uppercase tracking-widest"
          >
            God Mode Permanently Activated
          </motion.div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-zinc-950 border-4 border-yellow-600/30 p-8 text-center hover:border-yellow-600/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Wallet size={64} className="mx-auto mb-4 text-yellow-600" weight="duotone" />
            <motion.p 
              className="text-5xl font-black text-yellow-600"
              key={stats.totalProfit}
              initial={{ scale: 1.2, color: '#FFD700' }}
              animate={{ scale: 1, color: '#D4AF37' }}
              transition={{ duration: 0.3 }}
            >
              ${stats.totalProfit.toLocaleString()}
            </motion.p>
            <p className="text-yellow-600/80 mt-2 text-lg">Total Profit</p>
          </Card>

          <Card className="bg-zinc-950 border-4 border-yellow-600/30 p-8 text-center hover:border-yellow-600/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Lightning size={64} className="mx-auto mb-4 text-yellow-600" weight="duotone" />
            <motion.p 
              className="text-5xl font-black text-yellow-600"
              key={stats.todayProfit}
              initial={{ scale: 1.2, color: '#FFD700' }}
              animate={{ scale: 1, color: '#D4AF37' }}
              transition={{ duration: 0.3 }}
            >
              +${stats.todayProfit.toLocaleString()}
            </motion.p>
            <p className="text-yellow-600/80 mt-2 text-lg">Today's Profit</p>
          </Card>

          <Card className="bg-zinc-950 border-4 border-yellow-600/30 p-8 text-center hover:border-yellow-600/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Diamond size={64} className="mx-auto mb-4 text-yellow-600" weight="duotone" />
            <motion.p 
              className="text-5xl font-black text-yellow-600"
              key={stats.domainsOwned}
              initial={{ scale: 1.2, color: '#FFD700' }}
              animate={{ scale: 1, color: '#D4AF37' }}
              transition={{ duration: 0.3 }}
            >
              {stats.domainsOwned}
            </motion.p>
            <p className="text-yellow-600/80 mt-2 text-lg">Domains Owned</p>
          </Card>

          <Card className="bg-zinc-950 border-4 border-yellow-600/30 p-8 text-center hover:border-yellow-600/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)]">
            <Shield size={64} className="mx-auto mb-4 text-yellow-600" weight="duotone" />
            <p className="text-3xl font-black text-yellow-600 leading-tight">
              {stats.bestFlip}
            </p>
            <p className="text-yellow-600/80 mt-2 text-lg">Best Flip</p>
          </Card>
        </motion.div>

        {/* Drop Sniper Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-4 border-yellow-600/40 rounded-3xl p-12 text-center"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lightning size={48} weight="fill" className="text-yellow-600" />
              </motion.div>
              <h2 className="text-5xl font-black text-yellow-600 uppercase tracking-wider">
                Drop-Catch Sniper
              </h2>
            </div>
            <p className="text-2xl text-yellow-600/80">
              Domains Sniped Today: <span className="font-black text-yellow-600">{stats.dropsSniped}</span>
            </p>
            <p className="text-lg text-yellow-600/60 max-w-3xl mx-auto">
              Lightning-fast execution at T+0.001s • Multi-registrar parallel bidding • 
              AI-powered valuation • Only snipes domains predicted to flip for $10K-$1M+
            </p>
          </div>
        </motion.div>

        {/* Empire Message */}
        <motion.div 
          className="text-center py-20 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-wider text-yellow-600">
            THIS EMPIRE BELONGS TO YOU ALONE
          </h2>
          <p className="text-3xl lg:text-4xl text-yellow-600/80 font-light">
            No tiers. No users. No limits.
          </p>
          <motion.p 
            className="text-5xl lg:text-6xl font-black text-yellow-600 mt-12"
            animate={{ 
              scale: [1, 1.05, 1],
              textShadow: [
                '0 0 20px rgba(212, 175, 55, 0.5)',
                '0 0 40px rgba(212, 175, 55, 0.8)',
                '0 0 20px rgba(212, 175, 55, 0.5)'
              ]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            JUST PROFIT.
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
