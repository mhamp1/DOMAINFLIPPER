import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { TrendUp, Wallet, Crown, Target } from '@phosphor-icons/react'
import type { UserStats } from '@/types/domain'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface StatsOverviewProps {
  stats: UserStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statsData = [
    {
      label: 'Total Profit',
      value: formatCurrency(stats.totalProfit),
      icon: TrendUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-600/10',
      trend: '+18.2%',
    },
    {
      label: "Today's Gain",
      value: formatCurrency(stats.todayProfit),
      icon: Wallet,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: '+$18,420',
    },
    {
      label: 'Domains Owned',
      value: stats.domainsOwned.toString(),
      icon: Crown,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: '+8',
    },
    {
      label: 'Avg ROI',
      value: `+${formatPercentage(stats.avgROI)}`,
      icon: Target,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-600/10',
      trend: '+42%',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, i) => {
        const Icon = stat.icon
        
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: i * 0.1,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1]
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
          >
            <Card className="bg-zinc-950 border-zinc-800 p-6 hover:border-zinc-700 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon size={28} weight="duotone" className={stat.color} />
                </div>
                <motion.span 
                  className="text-sm font-bold text-green-500"
                  animate={{ 
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {stat.trend}
                </motion.span>
              </div>
              
              <div>
                <p className="text-sm text-zinc-500 mb-2">{stat.label}</p>
                <motion.p 
                  className={`text-4xl font-black ${stat.color}`}
                  animate={{ 
                    scale: [1, 1.02, 1]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2
                  }}
                >
                  {stat.value}
                </motion.p>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
