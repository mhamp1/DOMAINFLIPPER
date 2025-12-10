/**
 * MinerCard.tsx — Individual Miner Status Card
 * Displays status, stats, and controls for each miner
 * December 2025 — Cyberpunk Gold Theme
 */

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Lightning, 
  ArrowsClockwise,
  CheckCircle,
  Warning,
  Timer,
  TrendUp,
  Diamond,
  Crown
} from '@phosphor-icons/react'
import type { MinerStats, MinerSource } from '@/lib/miners/types'
import { formatCurrency } from '@/lib/utils'

interface MinerCardProps {
  source: MinerSource
  stats: MinerStats
  displayName: string
  color: string
  onStart: () => void
  onStop: () => void
  onRunCycle: () => void
  isLoading?: boolean
}

export function MinerCard({
  source,
  stats,
  displayName,
  color,
  onStart,
  onStop,
  onRunCycle,
  isLoading
}: MinerCardProps) {
  const isActive = stats.status === 'mining' || stats.status === 'idle'
  const hasError = stats.status === 'error'

  const getStatusIcon = () => {
    switch (stats.status) {
      case 'mining':
        return <Lightning size={20} weight="fill" className="text-yellow-400 animate-pulse" />
      case 'idle':
        return <CheckCircle size={20} weight="fill" className="text-green-400" />
      case 'error':
        return <Warning size={20} weight="fill" className="text-red-400" />
      case 'paused':
        return <Pause size={20} weight="fill" className="text-gray-400" />
      default:
        return <Timer size={20} weight="fill" className="text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (stats.status) {
      case 'mining': return 'Mining...'
      case 'idle': return 'Ready'
      case 'error': return 'Error'
      case 'paused': return 'Paused'
      default: return 'Idle'
    }
  }

  const formatTimeAgo = (date: Date | null): string => {
    if (!date) return 'Never'
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div 
        className="absolute -inset-1 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
        style={{ backgroundColor: color }}
      />

      <Card className="relative bg-black/80 border-2 border-yellow-600/30 rounded-2xl p-6 backdrop-blur-xl overflow-hidden">
        {/* Background accent */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
            >
              <Diamond size={24} weight="duotone" style={{ color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-orbitron">{displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon()}
                <span className={`text-sm ${hasError ? 'text-red-400' : 'text-gray-400'}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick action */}
          <Button
            size="sm"
            variant="ghost"
            onClick={stats.status === 'paused' ? onStart : onStop}
            className={`${isActive ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-gray-300'}`}
          >
            {isActive ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" />}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/40 rounded-xl p-3 border border-yellow-600/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mined</p>
            <p className="text-2xl font-bold text-yellow-500 font-orbitron">
              {stats.totalMined.toLocaleString()}
            </p>
          </div>
          <div className="bg-black/40 rounded-xl p-3 border border-yellow-600/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Gems</p>
            <p className="text-2xl font-bold text-green-400 font-orbitron">
              {stats.gemsFound}
            </p>
          </div>
          <div className="bg-black/40 rounded-xl p-3 border border-yellow-600/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg ROI</p>
            <div className="flex items-center gap-1">
              <TrendUp size={16} className="text-yellow-500" />
              <p className="text-xl font-bold text-yellow-500 font-orbitron">
                {stats.avgRoi}x
              </p>
            </div>
          </div>
          <div className="bg-black/40 rounded-xl p-3 border border-yellow-600/20">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Legendary</p>
            <div className="flex items-center gap-1">
              <Crown size={16} className="text-purple-400" />
              <p className="text-xl font-bold text-purple-400 font-orbitron">
                {stats.legendaryFound}
              </p>
            </div>
          </div>
        </div>

        {/* Last Run */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Last run: {formatTimeAgo(stats.lastRun)}</span>
          {stats.nextRun && (
            <span>Next: {formatTimeAgo(stats.nextRun)}</span>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={onRunCycle}
          disabled={isLoading || stats.status === 'mining'}
          className="w-full h-12 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 hover:from-yellow-600/30 hover:to-amber-600/30 border border-yellow-600/50 text-yellow-500 font-bold"
        >
          {isLoading || stats.status === 'mining' ? (
            <>
              <ArrowsClockwise size={20} className="animate-spin mr-2" />
              Mining...
            </>
          ) : (
            <>
              <Lightning size={20} className="mr-2" />
              Run Now
            </>
          )}
        </Button>

        {/* Error count badge */}
        {stats.errorCount > 0 && (
          <Badge 
            variant="warning" 
            className="absolute top-4 right-4 bg-red-500/20 text-red-400 border-red-500/50"
          >
            {stats.errorCount} errors
          </Badge>
        )}
      </Card>
    </motion.div>
  )
}

