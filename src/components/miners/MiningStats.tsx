/**
 * MiningStats.tsx — Mining Empire Statistics Overview
 * Shows aggregate mining stats and profit potential
 * December 2025 — Empire Dashboard
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { 
  Diamond, 
  Crown, 
  TrendUp, 
  CurrencyDollar,
  Lightning,
  ChartLineUp,
  Rocket,
  Target
} from '@phosphor-icons/react'
import type { MiningEngineStats } from '@/lib/miners'
import { formatCurrency } from '@/lib/utils'

interface MiningStatsProps {
  stats: MiningEngineStats
}

export function MiningStats({ stats }: MiningStatsProps) {
  const statCards = [
    {
      label: 'Total Mined',
      value: stats.totalDomainsMined.toLocaleString(),
      icon: Lightning,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      label: 'Gems Found',
      value: stats.totalGemsFound.toLocaleString(),
      icon: Diamond,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      label: 'Legendary',
      value: stats.totalLegendaryFound.toLocaleString(),
      icon: Crown,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
    {
      label: 'Avg ROI',
      value: `${stats.avgROI}x`,
      icon: TrendUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
  ]

  const profitCards = [
    {
      label: 'Daily Potential',
      value: formatCurrency(stats.profitPotential.daily),
      icon: Target,
    },
    {
      label: 'Weekly Potential',
      value: formatCurrency(stats.profitPotential.weekly),
      icon: ChartLineUp,
    },
    {
      label: 'Monthly Potential',
      value: formatCurrency(stats.profitPotential.monthly),
      icon: Rocket,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 backdrop-blur-sm`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon size={24} weight="duotone" className={stat.color} />
                </div>
                <span className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-3xl font-bold font-orbitron ${stat.color}`}>
                {stat.value}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Profit Potential */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-yellow-600/10 to-amber-600/10 border border-yellow-600/30 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-yellow-500 mb-4 flex items-center gap-2 font-orbitron">
            <CurrencyDollar size={24} weight="fill" />
            PROFIT POTENTIAL
          </h3>
          
          <div className="grid grid-cols-3 gap-4">
            {profitCards.map((card, index) => (
              <div 
                key={card.label}
                className="bg-black/40 rounded-xl p-4 text-center border border-yellow-600/20"
              >
                <card.icon size={28} weight="duotone" className="mx-auto text-yellow-500 mb-2" />
                <p className="text-xs text-gray-500 uppercase mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-green-400 font-orbitron">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            * Based on 18% success rate and average gem value across all miners
          </p>
        </Card>
      </motion.div>

      {/* Active Miners Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between bg-black/40 rounded-xl p-4 border border-yellow-600/20"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${stats.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-400">
            {stats.isRunning ? 'Mining Empire Active' : 'Mining Empire Paused'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            <span className="text-yellow-500 font-bold">{stats.activeMiners}</span> / 4 miners active
          </span>
          {stats.lastUpdate && (
            <span className="text-gray-600">
              Last update: {new Date(stats.lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

