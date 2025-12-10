/**
 * GemFeed.tsx — Live Feed of Mined Gems
 * Shows real-time stream of high-value domains found
 * December 2025 — Gold Rush Interface
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Diamond, 
  Crown, 
  TrendUp, 
  Eye,
  Crosshair,
  Clock,
  Fire
} from '@phosphor-icons/react'
import type { MinedDomain, MinerSource } from '@/lib/miners/types'
import { formatCurrency } from '@/lib/utils'
import { miningEngine } from '@/lib/miners'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

interface GemFeedProps {
  gems: MinedDomain[]
  onSnipe?: (domain: MinedDomain) => void
  maxItems?: number
}

export function GemFeed({ gems, onSnipe, maxItems = 15 }: GemFeedProps) {
  const handleSnipe = (gem: MinedDomain) => {
    soundEngine.snipeAlert()
    toast.success(`Added to watchlist: ${gem.domain}`, {
      description: `Est. value: ${formatCurrency(gem.estValue)} | ROI: ${gem.roi}x`,
      icon: '🎯',
    })
    onSnipe?.(gem)
  }

  const getPriorityColor = (priority: MinedDomain['priority']) => {
    switch (priority) {
      case 'legendary': return 'from-purple-500 to-pink-500'
      case 'gem': return 'from-yellow-500 to-amber-500'
      case 'high': return 'from-green-500 to-emerald-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getPriorityIcon = (priority: MinedDomain['priority']) => {
    switch (priority) {
      case 'legendary': return <Crown size={20} weight="fill" className="text-purple-400" />
      case 'gem': return <Diamond size={20} weight="fill" className="text-yellow-400" />
      case 'high': return <Fire size={20} weight="fill" className="text-orange-400" />
      default: return <TrendUp size={20} weight="fill" className="text-green-400" />
    }
  }

  const getSourceColor = (source: MinerSource) => {
    return miningEngine.getSourceColor(source)
  }

  const formatTime = (date: Date) => {
    const now = Date.now()
    const diff = Math.floor((now - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    return `${Math.floor(diff / 3600)}h`
  }

  if (gems.length === 0) {
    return (
      <Card className="bg-black/60 border border-yellow-600/20 rounded-2xl p-8 text-center">
        <Diamond size={64} weight="duotone" className="mx-auto text-yellow-600/50 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Mining for Gems...</h3>
        <p className="text-gray-500">Start the mining engine to find high-value domains</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {gems.slice(0, maxItems).map((gem, index) => (
          <motion.div
            key={gem.id}
            layout
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
          >
            {/* Glow for legendary */}
            {gem.priority === 'legendary' && (
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-xl blur-lg opacity-40"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}

            <Card className={`relative bg-black/80 border-2 rounded-xl overflow-hidden transition-all duration-300 ${
              gem.priority === 'legendary' 
                ? 'border-purple-500/50' 
                : gem.priority === 'gem' 
                  ? 'border-yellow-500/50' 
                  : 'border-yellow-600/20'
            } group-hover:border-yellow-500/60`}>
              {/* Gradient accent bar */}
              <div className={`h-1 bg-gradient-to-r ${getPriorityColor(gem.priority)}`} />
              
              <div className="p-4">
                <div className="flex items-center justify-between">
                  {/* Left: Domain info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getPriorityIcon(gem.priority)}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white truncate font-orbitron text-lg">
                        {gem.domain}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className="text-xs border-none px-2 py-0.5"
                          style={{ 
                            backgroundColor: `${getSourceColor(gem.source)}20`,
                            color: getSourceColor(gem.source)
                          }}
                        >
                          {miningEngine.getSourceDisplayName(gem.source)}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(gem.minedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Value & ROI */}
                  <div className="flex items-center gap-6 px-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Price</p>
                      <p className="text-lg font-bold text-white">${gem.price}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Est. Value</p>
                      <p className={`text-lg font-bold ${
                        gem.estValue >= 10000 ? 'text-purple-400' : 'text-green-400'
                      }`}>
                        {formatCurrency(gem.estValue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">ROI</p>
                      <p className={`text-lg font-bold font-orbitron ${
                        gem.roi >= 100 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {gem.roi}x
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                    >
                      <Eye size={18} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSnipe(gem)}
                      className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-bold"
                    >
                      <Crosshair size={16} className="mr-1" />
                      Snipe
                    </Button>
                  </div>
                </div>

                {/* Metrics row for legendary/gem */}
                {(gem.priority === 'legendary' || gem.priority === 'gem') && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-yellow-600/10">
                    {gem.backlinks > 0 && (
                      <span className="text-xs text-gray-500">
                        <span className="text-white font-medium">{gem.backlinks.toLocaleString()}</span> backlinks
                      </span>
                    )}
                    {gem.traffic > 0 && (
                      <span className="text-xs text-gray-500">
                        <span className="text-white font-medium">{gem.traffic.toLocaleString()}</span> monthly traffic
                      </span>
                    )}
                    {gem.ageYears > 0 && (
                      <span className="text-xs text-gray-500">
                        <span className="text-white font-medium">{gem.ageYears}</span> years old
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

