/**
 * IntelligencePanel.tsx — Display Intelligence Core Metrics
 * 
 * Shows the brain's learning progress, market analysis, and strategic priorities.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  TrendUp, 
  TrendDown,
  Lightning,
  Target,
  ChartLine,
  BookOpen,
  Sparkle,
  Shield,
  Users,
  Gauge,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  intelligenceCore, 
  type IntelligenceState, 
  type FlipMemory,
  type StrategicPriority,
} from '@/lib/intelligence/IntelligenceCore'

// Evolution level names
const EVOLUTION_NAMES = ['', 'Novice', 'Apprentice', 'Expert', 'Master', 'Legendary']
const EVOLUTION_COLORS = ['', 'text-gray-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400', 'text-cyan-400']

// Mood colors
const MOOD_CONFIG = {
  cautious: { color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: '🛡️' },
  balanced: { color: 'text-blue-500', bg: 'bg-blue-500/20', icon: '⚖️' },
  aggressive: { color: 'text-orange-500', bg: 'bg-orange-500/20', icon: '🔥' },
  godlike: { color: 'text-cyan-400', bg: 'bg-cyan-400/20', icon: '👑' },
}

// Market phase config
const MARKET_CONFIG = {
  bull: { color: 'text-green-400', bg: 'bg-green-500/20', icon: '🐂', label: 'BULL' },
  bear: { color: 'text-red-400', bg: 'bg-red-500/20', icon: '🐻', label: 'BEAR' },
  neutral: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '📊', label: 'NEUTRAL' },
  volatile: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: '⚡', label: 'VOLATILE' },
}

export function IntelligencePanel() {
  const [state, setState] = useState<IntelligenceState>(intelligenceCore.getState())
  const [priorities, setPriorities] = useState<StrategicPriority[]>(intelligenceCore.getPriorities())
  const [recentFlips, setRecentFlips] = useState<FlipMemory[]>([])
  const [lessons, setLessons] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = intelligenceCore.subscribe((newState) => {
      setState(newState)
      setPriorities(intelligenceCore.getPriorities())
      setRecentFlips(intelligenceCore.getFlipMemory(5))
      setLessons(intelligenceCore.getLessonsLearned().slice(0, 5))
    })

    // Initial load
    setRecentFlips(intelligenceCore.getFlipMemory(5))
    setLessons(intelligenceCore.getLessonsLearned().slice(0, 5))

    return unsubscribe
  }, [])

  const moodConfig = MOOD_CONFIG[state.mood]
  const marketConfig = MARKET_CONFIG[state.marketCondition.phase]

  return (
    <Card className="bg-black/40 border-cyan-500/30 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="w-8 h-8 text-cyan-400" weight="duotone" />
              <motion.div 
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-cyan-400 font-orbitron">INTELLIGENCE CORE</h3>
              <p className="text-xs text-gray-400">Learning • Evolving • Adapting</p>
            </div>
          </div>
          
          {/* Evolution Badge */}
          <Badge className={`${EVOLUTION_COLORS[state.evolutionLevel]} bg-black/60 border border-current`}>
            <Sparkle className="w-3 h-3 mr-1" />
            Level {state.evolutionLevel} — {EVOLUTION_NAMES[state.evolutionLevel]}
          </Badge>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Intelligence Score */}
        <div className="bg-black/30 rounded-lg p-3 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Intelligence</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-cyan-400">{state.intelligence.toFixed(0)}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${state.intelligence}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Market Phase */}
        <div className={`${marketConfig.bg} rounded-lg p-3 border border-current/30`}>
          <div className="flex items-center gap-2 mb-2">
            <ChartLine className={`w-4 h-4 ${marketConfig.color}`} />
            <span className="text-xs text-gray-400">Market</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{marketConfig.icon}</span>
            <span className={`text-xl font-bold ${marketConfig.color}`}>{marketConfig.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {state.marketCondition.opportunity}% opportunity
          </p>
        </div>

        {/* Mood / Risk Mode */}
        <div className={`${moodConfig.bg} rounded-lg p-3 border border-current/30`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`w-4 h-4 ${moodConfig.color}`} />
            <span className="text-xs text-gray-400">Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{moodConfig.icon}</span>
            <span className={`text-xl font-bold uppercase ${moodConfig.color}`}>{state.mood}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {state.riskMultiplier}x risk multiplier
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-black/30 rounded-lg p-3 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Win Rate</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-green-400">{state.winRate.toFixed(0)}</span>
            <span className="text-xs text-gray-500">%</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {state.totalFlips} total flips
          </p>
        </div>
      </div>

      {/* Learning Stats */}
      <div className="px-4 pb-4">
        <div className="bg-black/30 rounded-lg p-3 border border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">Learning Progress</span>
            </div>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-white"
            >
              {expanded ? 'Show Less' : 'Show More'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-purple-400">{state.lessonsLearned}</div>
              <div className="text-xs text-gray-500">Lessons</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-400">{state.avgROI.toFixed(1)}x</div>
              <div className="text-xs text-gray-500">Avg ROI</div>
            </div>
            <div>
              <div className="text-xl font-bold text-cyan-400">{priorities.length}</div>
              <div className="text-xs text-gray-500">Strategies</div>
            </div>
          </div>

          {/* Expanded Content */}
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 space-y-3"
            >
              {/* Strategic Priorities */}
              <div>
                <h4 className="text-xs text-gray-400 mb-2">Strategic Priorities</h4>
                <div className="space-y-1">
                  {priorities.map(p => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                          style={{ width: `${p.adjustedWeight}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-24 truncate">{p.name}</span>
                      <span className="text-xs text-cyan-400 w-8 text-right">{p.adjustedWeight.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Lessons */}
              {lessons.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-400 mb-2">Recent Lessons</h4>
                  <div className="space-y-1">
                    {lessons.map((lesson, i) => (
                      <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400">•</span>
                        <span>{lesson}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Best/Worst Flips */}
              <div className="grid grid-cols-2 gap-3">
                {state.bestFlip && (
                  <div className="bg-green-500/10 rounded p-2 border border-green-500/20">
                    <div className="flex items-center gap-1 text-green-400 text-xs mb-1">
                      <TrendUp className="w-3 h-3" />
                      Best Flip
                    </div>
                    <div className="text-xs text-white truncate">{state.bestFlip.domain}</div>
                    <div className="text-xs text-green-400">
                      +${state.bestFlip.profit?.toFixed(0) || 'TBD'}
                    </div>
                  </div>
                )}
                {state.worstFlip && (
                  <div className="bg-red-500/10 rounded p-2 border border-red-500/20">
                    <div className="flex items-center gap-1 text-red-400 text-xs mb-1">
                      <TrendDown className="w-3 h-3" />
                      Worst Flip
                    </div>
                    <div className="text-xs text-white truncate">{state.worstFlip.domain}</div>
                    <div className="text-xs text-red-400">
                      ${state.worstFlip.profit?.toFixed(0) || 'TBD'}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Market Description Bar */}
      <div className="px-4 pb-4">
        <div className={`${marketConfig.bg} rounded p-2 border border-current/20`}>
          <p className={`text-xs ${marketConfig.color}`}>
            {intelligenceCore.getMarketDescription()}
          </p>
        </div>
      </div>
    </Card>
  )
}

export default IntelligencePanel
