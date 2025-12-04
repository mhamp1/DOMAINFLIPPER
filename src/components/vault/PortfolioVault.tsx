/**
 * PortfolioVault.tsx — FINAL 20X LUXURY VERSION
 * Gold vault that fills with real profit
 * Pure luxury black + gold theme
 * December 27, 2025
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coins, TrendingUp, Package, Crown, Sparkles, Diamond } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/utils'
import confetti from 'canvas-confetti'
import type { Domain } from '@/types/domain'

interface OwnedDomain {
  domain: { name: string; id: string }
  purchasePrice: number
  currentValue: number
  profit: number
  roi: number
  listed: boolean
  offers: number
}

interface PortfolioVaultProps {
  ownedDomains: OwnedDomain[]
  totalSpent: number
  totalEarned: number
  totalValue?: number
}

export function PortfolioVault({ 
  ownedDomains, 
  totalSpent, 
  totalEarned,
  totalValue
}: PortfolioVaultProps) {
  const totalProfit = totalEarned - totalSpent
  const vaultFill = Math.min(100, (totalEarned / 1000000) * 100) // 1M = full vault

  // Trigger confetti when profit increases
  const prevProfit = React.useRef(totalProfit)
  React.useEffect(() => {
    if (totalProfit > prevProfit.current) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
      })
    }
    prevProfit.current = totalProfit
  }, [totalProfit])

  return (
    <div className="space-y-12">
      {/* GOD-TIER HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <h2 className="text-7xl font-black tracking-tight bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
          YOUR VAULT
        </h2>
        <p className="text-3xl text-yellow-600/80">Private Domain Empire — Untouchable</p>
      </motion.div>

      {/* 3D GOLD VAULT — FILLS WITH REAL PROFIT */}
      <Card className="relative bg-black border-4 border-yellow-600/40 rounded-3xl overflow-hidden p-16">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />
        
        {/* Gold Bars — Grow with Profit */}
        <div className="relative h-96 flex items-end justify-center gap-3">
          {Array.from({ length: 30 }).map((_, i) => {
            const shouldShow = (i / 30) * 100 < vaultFill
            return (
              <motion.div
                key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: shouldShow ? 300 : 0,
                  opacity: shouldShow ? 1 : 0
                }}
                transition={{ delay: i * 0.05, duration: 1 }}
                className="w-12 bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-400 rounded-t-2xl shadow-2xl shadow-yellow-600/50"
                style={{ filter: 'drop-shadow(0 0 30px gold)' }}
              />
            )
          })}
        </div>

        {/* Profit Display */}
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <p className="text-yellow-600/80 text-2xl uppercase tracking-widest mb-4">TOTAL EMPIRE VALUE</p>
          <p className="text-8xl font-black text-yellow-500 drop-shadow-2xl">
            {formatCurrency(totalEarned)}
          </p>
          <p className="text-4xl text-green-500 mt-6">+{formatCurrency(totalProfit)} PROFIT</p>
        </motion.div>
      </Card>

      {/* Owned Domains Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {ownedDomains.map((d, i) => (
          <motion.div
            key={d.domain.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="bg-zinc-950 border-2 border-yellow-600/30 p-8 text-center hover:border-yellow-600 transition-all duration-300">
              <Diamond size={64} className="mx-auto mb-4 text-yellow-600 drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
              <h4 className="text-2xl font-bold text-yellow-600 mb-2">{d.domain.name}</h4>
              <p className="text-green-500 text-3xl font-black">+{formatCurrency(d.profit)}</p>
              <p className="text-yellow-600/80 mt-2">{d.roi.toFixed(0)}% ROI</p>
              {d.listed && (
                <Badge variant="success" className="mt-4">LISTED</Badge>
              )}
              {d.offers > 0 && (
                <Badge variant="gold" className="mt-2">{d.offers} OFFERS</Badge>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
