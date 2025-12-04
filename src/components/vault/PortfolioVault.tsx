/**
 * Portfolio Vault Component
 * 3D vault visualization showing owned domains, spent, earned
 * Gold bars fill as profits grow
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coins, TrendingUp, TrendingDown, Package } from '@phosphor-icons/react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import type { Domain } from '@/types/domain'

interface OwnedDomain {
  domain: Domain
  purchasePrice: number
  purchaseDate: Date
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
  totalValue: number
}

export function PortfolioVault({ 
  ownedDomains, 
  totalSpent, 
  totalEarned, 
  totalValue 
}: PortfolioVaultProps) {
  const totalProfit = totalEarned - totalSpent
  const overallROI = totalSpent > 0 ? ((totalEarned - totalSpent) / totalSpent) * 100 : 0
  
  // Calculate vault fill percentage (0-100%)
  const vaultFillPercentage = Math.min(100, (totalEarned / (totalSpent || 1)) * 50)

  return (
    <div className="space-y-8">
      {/* Vault Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gold mb-2">Portfolio Vault</h2>
          <p className="text-zinc-500">Your domain empire at a glance</p>
        </div>
        <Badge variant="gold" className="text-lg px-6 py-3">
          {ownedDomains.length} Domains
        </Badge>
      </div>

      {/* 3D Vault Visualization */}
      <Card className="obsidian-glass obsidian-glass-hover p-12 relative overflow-hidden">
        {/* Vault Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900 to-black" />
        
        {/* Gold Bars Stack */}
        <div className="relative z-10 flex items-end justify-center h-64 gap-2">
          {Array.from({ length: 20 }).map((_, i) => {
            const shouldShow = (i / 20) * 100 < vaultFillPercentage
            const height = Math.random() * 40 + 20
            
            return (
              <motion.div
                key={i}
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: shouldShow ? height : 0,
                  opacity: shouldShow ? 1 : 0
                }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="w-8 bg-gradient-to-t from-gold-dark via-gold to-gold-pure rounded-t-lg shadow-gold"
                style={{ height: shouldShow ? `${height}px` : '0px' }}
              />
            )
          })}
        </div>

        {/* Vault Stats Overlay */}
        <div className="relative z-20 mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-2">Total Spent</p>
            <motion.p 
              className="text-3xl font-bold text-gold"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {formatCurrency(totalSpent)}
            </motion.p>
          </div>

          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-2">Total Earned</p>
            <motion.p 
              className="text-3xl font-bold text-green-500"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            >
              {formatCurrency(totalEarned)}
            </motion.p>
          </div>

          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-2">Net Profit</p>
            <motion.p 
              className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
            >
              {formatCurrency(totalProfit)}
            </motion.p>
          </div>

          <div className="text-center">
            <p className="text-sm text-zinc-500 mb-2">Overall ROI</p>
            <motion.p 
              className={`text-3xl font-bold ${overallROI >= 0 ? 'text-green-500' : 'text-red-500'}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
            >
              {formatPercentage(overallROI)}
            </motion.p>
          </div>
        </div>
      </Card>

      {/* Portfolio Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="obsidian-glass obsidian-glass-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <Package size={32} weight="duotone" className="text-gold" />
            <Badge variant="gold">{ownedDomains.length}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mb-2">Domains Owned</p>
          <p className="text-2xl font-bold text-gold">{ownedDomains.length}</p>
          <p className="text-xs text-zinc-600 mt-2">
            {ownedDomains.filter(d => d.listed).length} listed for sale
          </p>
        </Card>

        <Card className="obsidian-glass obsidian-glass-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp size={32} weight="duotone" className="text-green-500" />
            <Badge variant="success">{formatCurrency(totalValue)}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mb-2">Portfolio Value</p>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-zinc-600 mt-2">
            {formatPercentage(((totalValue - totalSpent) / (totalSpent || 1)) * 100)} unrealized gain
          </p>
        </Card>

        <Card className="obsidian-glass obsidian-glass-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <Coins size={32} weight="duotone" className="text-gold" />
            <Badge variant="gold">{ownedDomains.reduce((sum, d) => sum + d.offers, 0)}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mb-2">Active Offers</p>
          <p className="text-2xl font-bold text-gold">
            {ownedDomains.reduce((sum, d) => sum + d.offers, 0)}
          </p>
          <p className="text-xs text-zinc-600 mt-2">
            Pending negotiations
          </p>
        </Card>
      </div>

      {/* Owned Domains List */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gold">Owned Domains</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownedDomains.map((owned, i) => (
            <motion.div
              key={owned.domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="obsidian-glass obsidian-glass-hover p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gold mb-1">{owned.domain.name}</h4>
                    <p className="text-xs text-zinc-500">
                      Purchased {new Date(owned.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  {owned.listed && (
                    <Badge variant="success" className="text-xs">LISTED</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Purchase Price</span>
                    <span className="text-gold">{formatCurrency(owned.purchasePrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Current Value</span>
                    <span className="text-green-500">{formatCurrency(owned.currentValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Profit</span>
                    <span className={owned.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCurrency(owned.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">ROI</span>
                    <span className={owned.roi >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatPercentage(owned.roi)}
                    </span>
                  </div>
                  {owned.offers > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                      <span className="text-zinc-500">Active Offers</span>
                      <Badge variant="gold">{owned.offers}</Badge>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

