import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STRATEGIES } from '@/lib/strategies/strategyDefinitions'
import { LUXURY_ICONS } from '@/lib/strategies/luxuryIcons'
import { Diamond } from '@phosphor-icons/react'
import { formatCurrency } from '@/lib/utils'
import { soundEngine } from '@/lib/sounds/soundEffects'
import type { Strategy } from '@/types/domain'

interface StrategyEmpireProps {
  strategies?: Strategy[]
}

export function StrategyEmpire({ strategies = STRATEGIES }: StrategyEmpireProps) {
  const handleStrategyHover = () => {
    soundEngine.hover()
  }

  const handleStrategyClick = (_strategy: Strategy) => {
    soundEngine.click()
    soundEngine.goldShimmer()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Strategy Empire</h2>
          <p className="text-zinc-500">10 God-Tier Domain Flipping Strategies</p>
        </div>
        <Badge variant="gold" className="text-lg px-6 py-3">
          {strategies.filter(s => s.enabled).length} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
        {strategies.map((strat, i) => {
          const Icon = LUXURY_ICONS[strat.id as keyof typeof LUXURY_ICONS] || Diamond
          
          return (
            <motion.div
              key={strat.id}
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: i * 0.15, duration: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              onHoverStart={handleStrategyHover}
              onClick={() => handleStrategyClick(strat)}
              className="relative group cursor-pointer"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-3xl blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-1000" />
              
              <Card className="relative bg-black border-4 border-yellow-600/40 rounded-3xl p-12 text-center h-full hover:border-yellow-600 transition-all duration-500">
                {/* Subtle gold particle background */}
                <div className="absolute inset-0 opacity-5">
                  <motion.div 
                    className="absolute top-10 left-10 w-32 h-32 bg-yellow-600 rounded-full blur-3xl"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div 
                    className="absolute bottom-10 right-10 w-40 h-40 bg-amber-600 rounded-full blur-3xl"
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1
                    }}
                  />
                </div>

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="mb-8"
                >
                  <Icon size={100} weight="duotone" className="mx-auto text-yellow-600 drop-shadow-2xl" />
                </motion.div>

                <h3 className="text-3xl font-black text-yellow-600 mb-4">{strat.name.toUpperCase()}</h3>
                <p className="text-5xl font-black text-white mb-2">{formatCurrency(strat.expectedProfit)}</p>
                <p className="text-yellow-600/80 mb-8">avg flip profit</p>
                
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="mt-8"
                >
                  <Badge className="text-2xl px-12 py-6 bg-gradient-to-r from-yellow-600 to-amber-600 text-black">
                    {strat.domainsBought || 0} ACQUIRED
                  </Badge>
                </motion.div>

                {/* Live auction indicator */}
                {strat.liveAuctions && strat.liveAuctions > 0 && (
                  <motion.div 
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-6 right-6 flex items-center gap-2"
                  >
                    <div className="w-3 h-3 bg-red-600 rounded-full shadow-lg shadow-red-600/50" />
                    <span className="text-xs text-red-500 font-bold">LIVE</span>
                  </motion.div>
                )}
                
                {/* Enabled/Disabled indicator */}
                {!strat.enabled && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm">
                      DISABLED
                    </Badge>
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
