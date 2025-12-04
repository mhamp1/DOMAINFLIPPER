import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Timer, ArrowRight, TrendUp, Sparkle, Diamond } from '@phosphor-icons/react'
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
    <div className="space-y-12">
      {/* GOD-TIER HEADER */}
      <motion.div className="text-center">
        <h2 className="text-7xl font-black text-yellow-600 mb-4">LIVE DROPS</h2>
        <p className="text-3xl text-yellow-600/80">God-tier domains expiring now</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {domains.slice(0, 9).map((domain, i) => (
          <motion.div
            key={domain.id}
            initial={{ opacity: 0, y: 100, rotateX: -30 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.2, duration: 0.8 }}
            whileHover={{ scale: 1.05, rotateY: 10 }}
            className="relative group"
          >
            {/* Epic glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 rounded-3xl blur-2xl opacity-0 group-hover:opacity-80 transition-opacity duration-1000" />
            
            <Card className="relative bg-black border-4 border-yellow-600/40 rounded-3xl p-12 text-center h-full">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 6, repeat: Infinity }}
                className="mb-8"
              >
                <Diamond size={120} weight="duotone" className="mx-auto text-yellow-600 drop-shadow-2xl" />
              </motion.div>

              <h3 className="text-5xl font-black text-yellow-600 mb-6">{domain.name}</h3>
              
              <div className="space-y-6 mb-12">
                <div>
                  <p className="text-yellow-600/80 text-xl uppercase mb-2">CURRENT BID</p>
                  <p className="text-6xl font-black text-white">${(domain.currentBid || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-yellow-600/80 text-xl uppercase mb-2">AI VALUE</p>
                  <p className="text-7xl font-black text-green-500">${domain.estimatedValue.toLocaleString()}</p>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  className="w-full h-24 text-4xl font-black bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black shadow-2xl shadow-yellow-600/50"
                  onClick={() => handleSnipe(domain)}
                >
                  SNIPE NOW
                </Button>
              </motion.div>

              {/* Live timer */}
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="mt-8 text-2xl text-red-500 font-bold"
              >
                {domain.timeLeft}
              </motion.div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
