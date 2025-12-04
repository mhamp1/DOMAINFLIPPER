import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer, ArrowRight, TrendUp, Sparkle } from '@phosphor-icons/react'
import type { Domain } from '@/types/domain'
import { formatCurrency } from '@/lib/utils'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface LiveDropsProps {
  domains: Domain[]
  onSnipe: (domain: Domain) => void
}

export function LiveDrops({ domains, onSnipe }: LiveDropsProps) {
  const handleSnipe = (domain: Domain) => {
    soundEngine.snipeAlert()
    
    // Gold confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#FFD700', '#F0E68C', '#B8941E']
    })

    onSnipe(domain)

    toast.success(`SNIPED: ${domain.name}`, {
      description: `Acquired for ${formatCurrency(domain.currentBid || 0)}`,
      icon: '💎',
    })
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkle size={64} weight="duotone" className="text-yellow-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Scanning for Opportunities</h3>
        <p className="text-zinc-500">No live drops matching criteria yet...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">Live Domain Drops</h2>
          <p className="text-zinc-500">Premium opportunities expiring soon</p>
        </div>
        <Badge variant="gold" className="text-lg px-6 py-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          {domains.length} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {domains.slice(0, 9).map((domain, i) => (
          <motion.div
            key={domain.id}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: i * 0.1,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            whileHover={{ 
              scale: 1.03,
              transition: { duration: 0.2 }
            }}
            className="relative group"
          >
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <Card className="relative bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-8 hover:border-yellow-600/50 transition-all duration-500 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <motion.h3 
                    className="text-3xl font-bold text-white mb-2 break-all"
                    animate={{ 
                      textShadow: [
                        "0 0 0px rgba(212, 175, 55, 0)",
                        "0 0 10px rgba(212, 175, 55, 0.3)",
                        "0 0 0px rgba(212, 175, 55, 0)"
                      ]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {domain.name}
                  </motion.h3>
                  <p className="text-sm text-zinc-500">{domain.registrar}</p>
                </div>
                
                <Badge 
                  variant="gold" 
                  className="flex items-center gap-2 text-sm px-3 py-2 ml-2"
                >
                  <Timer size={16} weight="fill" />
                  {domain.timeLeft}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Current Bid</p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(domain.currentBid || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Est. Value</p>
                  <p className="text-xl font-bold text-green-500">
                    {formatCurrency(domain.estimatedValue)}
                  </p>
                </div>
              </div>

              {/* AI Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">AI CONFIDENCE</span>
                  <span className="text-sm font-bold text-yellow-600">{domain.aiScore}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${domain.aiScore}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full bg-gradient-to-r from-yellow-600 to-amber-600"
                  />
                </div>
              </div>

              {/* ROI Badge */}
              {domain.estimatedValue > (domain.currentBid || 0) && (
                <div className="mb-6">
                  <Badge variant="success" className="w-full justify-center py-3 text-sm font-bold">
                    <TrendUp size={16} weight="bold" className="mr-2" />
                    +{Math.round(((domain.estimatedValue - (domain.currentBid || 0)) / (domain.currentBid || 1)) * 100)}% ROI
                  </Badge>
                </div>
              )}

              {/* Snipe Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-auto"
              >
                <Button 
                  variant="gold"
                  size="lg"
                  className="w-full text-xl font-bold h-16 group/btn"
                  onClick={() => handleSnipe(domain)}
                  onMouseEnter={() => soundEngine.hover()}
                >
                  <span>SNIPE NOW</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="ml-4" weight="bold" size={24} />
                  </motion.div>
                </Button>
              </motion.div>

              {/* Corner badge for strategy */}
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="text-xs uppercase">
                  {domain.strategyId}
                </Badge>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
