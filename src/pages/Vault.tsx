/**
 * Vault.tsx — YOUR PRIVATE EMPIRE
 * Pure luxury black + gold theme
 * December 27, 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Diamond, Wallet, Lightning, Shield, TrendUp, Coins } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import confetti from 'canvas-confetti'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabaseDB } from '@/lib/database/supabase'

export default function Vault() {
  const [profit, setProfit] = useState(0)
  const [today, setToday] = useState(0)
  const [owned, setOwned] = useState(0)
  const [activeSnipes, setActiveSnipes] = useState(0)

  // Fetch real portfolio stats (using supabaseDB methods)
  const { data: stats } = useQuery({
    queryKey: ['portfolio-stats'],
    queryFn: async () => {
      const todayDate = new Date().toISOString().split('T')[0]
      
      // Use supabaseDB methods which handle demo mode gracefully
      const ownedDomains = await supabaseDB.getOwnedDomains()
      
      // Calculate total profit from sold domains
      const soldDomains = ownedDomains.filter(d => d.sold && d.sale_price)
      const totalProfit = soldDomains.reduce((sum, d) => {
        return sum + ((d.sale_price || 0) - d.purchase_price)
      }, 0)
      
      // Calculate today's profit
      const todayProfit = soldDomains
        .filter(d => {
          if (!d.sale_date) return false
          const saleDate = new Date(d.sale_date).toISOString().split('T')[0]
          return saleDate === todayDate
        })
        .reduce((sum, d) => sum + ((d.sale_price || 0) - d.purchase_price), 0)

      return {
        profit: totalProfit,
        today: todayProfit,
        owned: ownedDomains.length,
      }
    },
    refetchInterval: 5000, // Update every 5 seconds
  })

  useEffect(() => {
    if (stats) {
      setProfit(stats.profit)
      setToday(stats.today)
      setOwned(stats.owned)
    }
  }, [stats])

  // Trigger confetti on profit increase
  useEffect(() => {
    if (today > 0) {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
      })
    }
  }, [today])

  return (
    <div className="min-h-screen bg-black text-gold font-['Satoshi',sans-serif] overflow-hidden">
      {/* Rotating Crown */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed top-8 right-8 z-50 pointer-events-none"
      >
        <Crown size={100} weight="fill" className="text-gold drop-shadow-[0_0_60px_rgba(212,175,55,0.8)]" />
      </motion.div>

      <div className="max-w-7xl mx-auto p-12 space-y-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8"
        >
          <h1 className="text-8xl font-black tracking-tight bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent">
            DOMAINFLIPPER VAULT
          </h1>
          <p className="text-4xl text-gold/80 font-light">Your Private Domain Empire</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-obsidian border-4 border-gold/30 p-12 text-center obsidian-glass hover:border-gold/50 transition-all duration-300">
              <Wallet size={80} className="mx-auto mb-6 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <p className="text-6xl font-black text-gold mb-2">{formatCurrency(profit)}</p>
              <p className="text-gold/80 mt-2 text-xl">Total Profit</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-obsidian border-4 border-gold/30 p-12 text-center obsidian-glass hover:border-gold/50 transition-all duration-300">
              <Lightning size={80} className="mx-auto mb-6 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <p className="text-6xl font-black text-gold mb-2">+{formatCurrency(today)}</p>
              <p className="text-gold/80 mt-2 text-xl">Today</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-obsidian border-4 border-gold/30 p-12 text-center obsidian-glass hover:border-gold/50 transition-all duration-300">
              <Diamond size={80} className="mx-auto mb-6 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <p className="text-6xl font-black text-gold mb-2">{owned}</p>
              <p className="text-gold/80 mt-2 text-xl">Domains Owned</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-obsidian border-4 border-gold/30 p-12 text-center obsidian-glass hover:border-gold/50 transition-all duration-300">
              <Shield size={80} className="mx-auto mb-6 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <p className="text-6xl font-black text-gold mb-2">GOD MODE</p>
              <p className="text-gold/80 mt-2 text-xl">All Strategies Active</p>
            </Card>
          </motion.div>
        </div>

        {/* Empire Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-20 space-y-8"
        >
          <h2 className="text-6xl font-black uppercase tracking-wider text-gold">
            THE EMPIRE RUNS ITSELF
          </h2>
          <p className="text-4xl text-gold/80 mt-8 font-light">
            You do nothing. The bot buys. The bot sells. You get rich.
          </p>
          
          {/* Live Activity Indicator */}
          <div className="flex items-center justify-center gap-4 mt-12">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-4 h-4 bg-gold rounded-full"
            />
            <span className="text-2xl text-gold/80">Empire Active</span>
          </div>
        </motion.div>

        {/* Profit Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <Card className="bg-obsidian border-4 border-gold/30 p-12 obsidian-glass">
            <div className="flex items-center gap-4 mb-8">
              <TrendUp size={48} className="text-gold" />
              <h3 className="text-4xl font-black text-gold">Profit Growth</h3>
            </div>
            <div className="h-64 flex items-center justify-center">
              <p className="text-2xl text-gold/60">Chart integration coming soon</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

