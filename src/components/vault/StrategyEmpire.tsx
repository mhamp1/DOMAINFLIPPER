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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        {strategies.map((strat, i) => {
          const Icon = LUXURY_ICONS[strat.id as keyof typeof LUXURY_ICONS] || Diamond
          
          return (
            <motion.div
              key={strat.id}
              initial={{ opacity: 0, y: 60, rotateY: -30 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ 
                delay: i * 0.15, 
                duration: 0.8, 
                ease: [0.22, 1, 0.36, 1]
              }}
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              onHoverStart={handleStrategyHover}
              onClick={() => handleStrategyClick(strat)}
              className="relative group cursor-pointer"
            >
              {/* Gold border glow on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-600 rounded-3xl blur-lg opacity-0 group-hover:opacity-70 transition-opacity duration-700" />
              
              <Card className="relative bg-black border-2 border-yellow-600/30 rounded-3xl p-8 text-center overflow-hidden h-full group-hover:border-yellow-600/60 transition-all duration-500">
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

                {/* Luxury Icon with smooth rotation on hover */}
                <motion.div
                  className="mb-8 relative"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                >
                  <div className="p-8 rounded-full bg-gradient-to-br from-yellow-600/20 to-amber-600/20 mx-auto w-fit border-4 border-yellow-600/40 group-hover:border-yellow-600/80 transition-all duration-500">
                    <Icon size={72} weight="duotone" className="text-yellow-600 drop-shadow-2xl" />
                  </div>
                </motion.div>

                <h3 className="text-xl font-bold text-yellow-600 mb-4 tracking-wider uppercase">
                  {strat.name}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                      AVG FLIP PROFIT
                    </p>
                    <motion.p 
                      className="text-4xl font-black text-yellow-600"
                      animate={{ 
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {formatCurrency(strat.expectedProfit)}
                    </motion.p>
                  </div>
                  
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="inline-block"
                  >
                    <Badge 
                      variant="gold" 
                      className="text-base px-8 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-black font-bold border-0"
                    >
                      {strat.domainsBought || 0} ACQUIRED
                    </Badge>
                  </motion.div>
                </div>

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
