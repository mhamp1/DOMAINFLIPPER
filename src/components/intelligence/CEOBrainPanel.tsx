/**
 * CEO BRAIN PANEL - Executive Intelligence Dashboard
 * 
 * Visualizes the CEO Brain's strategic thinking, decisions, and market analysis.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  TrendUp,
  TrendDown,
  Minus,
  Target,
  ChartBar,
  Lightning,
  Shield,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkle,
  Eye,
  ChartLine,
  Buildings,
  Warning,
  ArrowsClockwise,
  Crown,
} from '@phosphor-icons/react'
import { ceoBrain } from '../../lib/intelligence/CEOBrain'
import type { CEOState, ExecutiveDecision, MarketCondition } from '../../lib/intelligence/CEOBrain'

export function CEOBrainPanel() {
  const [state, setState] = useState<CEOState>(ceoBrain.getState())
  const [showDecisions, setShowDecisions] = useState(true)
  const [showInsights, setShowInsights] = useState(false)

  useEffect(() => {
    const unsubscribe = ceoBrain.subscribe(setState)
    return unsubscribe
  }, [])

  const handleStart = async () => {
    await ceoBrain.start()
  }

  const handleStop = () => {
    ceoBrain.stop()
  }

  const handleForceReview = async () => {
    await ceoBrain.forceStrategicReview()
  }

  const getMoodEmoji = (mood: number): string => {
    if (mood >= 80) return '😎'
    if (mood >= 60) return '🙂'
    if (mood >= 40) return '😐'
    if (mood >= 20) return '😟'
    return '😰'
  }

  const getMarketIcon = (condition: MarketCondition) => {
    switch (condition.trend) {
      case 'up': return <TrendUp className="w-5 h-5 text-green-400" weight="bold" />
      case 'down': return <TrendDown className="w-5 h-5 text-red-400" weight="bold" />
      default: return <Minus className="w-5 h-5 text-yellow-400" weight="bold" />
    }
  }

  const getPhaseColor = (phase: string): string => {
    switch (phase) {
      case 'bull': return 'text-green-400 bg-green-500/20 border-green-500/50'
      case 'bear': return 'text-red-400 bg-red-500/20 border-red-500/50'
      case 'volatile': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
      default: return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50'
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  const formatDecisionType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-purple-900/40 rounded-2xl border border-purple-500/30 p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`p-4 rounded-xl ${state.isActive ? 'bg-purple-500/30 animate-pulse' : 'bg-gray-700/50'}`}>
                <Crown className="w-10 h-10 text-purple-400" weight="fill" />
              </div>
              {state.isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">CEO BRAIN</h2>
              <p className="text-gray-400">Executive Strategic Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!state.isActive ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-bold flex items-center gap-2"
              >
                <Brain className="w-5 h-5" weight="fill" />
                Activate CEO Brain
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleForceReview}
                  className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-xl text-cyan-400 flex items-center gap-2"
                >
                  <ArrowsClockwise className="w-4 h-4" />
                  Force Review
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStop}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Deactivate
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* Current Focus */}
        {state.isActive && (
          <motion.div 
            className="mt-4 p-3 bg-black/30 rounded-xl border border-purple-500/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-gray-400">Current Focus:</span>
              <span className="text-white font-medium">{state.currentFocus}</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CEO Mood & Confidence */}
        <motion.div 
          className="bg-gray-900/60 rounded-xl border border-purple-500/30 p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            CEO Mental State
          </h3>

          <div className="space-y-6">
            {/* Mood Gauge */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Mood</span>
                <span className="text-2xl">{getMoodEmoji(state.moodIndex)}</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full ${
                    state.moodIndex >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    state.moodIndex >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' :
                    'bg-gradient-to-r from-red-500 to-orange-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${state.moodIndex}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="text-right text-sm text-gray-500 mt-1">{state.moodIndex}%</div>
            </div>

            {/* Confidence Gauge */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Confidence</span>
                <span className="text-white font-bold">{state.confidenceIndex}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${state.confidenceIndex}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Risk Profile */}
            <div className="pt-4 border-t border-gray-800">
              <span className="text-gray-400 text-sm">Risk Profile</span>
              <div className="flex gap-2 mt-2">
                {['conservative', 'moderate', 'aggressive'].map((profile) => (
                  <button
                    key={profile}
                    onClick={() => ceoBrain.setRiskProfile(profile as 'conservative' | 'moderate' | 'aggressive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      state.portfolioStrategy.riskProfile === profile
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {profile.charAt(0).toUpperCase() + profile.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Market Condition */}
        <motion.div 
          className="bg-gray-900/60 rounded-xl border border-cyan-500/30 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ChartLine className="w-5 h-5 text-cyan-400" />
            Market Condition
          </h3>

          <div className="space-y-4">
            {/* Phase Badge */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Market Phase</span>
              <span className={`px-3 py-1 rounded-lg border text-sm font-bold uppercase ${getPhaseColor(state.marketCondition.phase)}`}>
                {getMarketIcon(state.marketCondition)}
                <span className="ml-2">{state.marketCondition.phase}</span>
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-500 text-xs">Opportunity</div>
                <div className="text-green-400 font-bold text-lg">{state.marketCondition.opportunity.toFixed(0)}%</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-500 text-xs">Risk Level</div>
                <div className="text-red-400 font-bold text-lg">{state.marketCondition.risk.toFixed(0)}%</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-500 text-xs">Volatility</div>
                <div className="text-yellow-400 font-bold text-lg">{state.marketCondition.volatility.toFixed(0)}%</div>
              </div>
              <div className="bg-black/30 rounded-lg p-3">
                <div className="text-gray-500 text-xs">Confidence</div>
                <div className="text-cyan-400 font-bold text-lg">{state.marketCondition.confidence.toFixed(0)}%</div>
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {getMarketIcon(state.marketCondition)}
              <span className={`font-medium ${
                state.marketCondition.trend === 'up' ? 'text-green-400' :
                state.marketCondition.trend === 'down' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                Trending {state.marketCondition.trend.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Resource Allocation */}
        <motion.div 
          className="bg-gray-900/60 rounded-xl border border-green-500/30 p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-green-400" />
            Resource Allocation
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Acquisition Budget</span>
              <span className="text-green-400 font-bold">${state.resources.acquisitionBudget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Renewal Reserve</span>
              <span className="text-yellow-400 font-bold">${state.resources.renewalReserve.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Marketing Budget</span>
              <span className="text-cyan-400 font-bold">${state.resources.marketingBudget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Emergency Fund</span>
              <span className="text-red-400 font-bold">${state.resources.emergencyFund.toLocaleString()}</span>
            </div>
            
            <div className="pt-3 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Reinvestment Rate</span>
                <span className="text-purple-400 font-bold">{(state.resources.reinvestmentRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Strategic Priorities */}
      <motion.div 
        className="bg-gray-900/60 rounded-xl border border-orange-500/30 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-400" />
          Strategic Priorities
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.priorities.map((priority, index) => (
            <motion.div
              key={priority.id}
              className={`relative p-4 rounded-xl border ${
                priority.status === 'active' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-gray-800/50 border-gray-700/30'
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{priority.name}</span>
                <span className="text-orange-400 font-bold">{priority.weight}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
                  style={{ width: `${priority.weight}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">{priority.reason}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Toggle Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => { setShowDecisions(true); setShowInsights(false); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showDecisions 
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Executive Decisions
        </button>
        <button
          onClick={() => { setShowDecisions(false); setShowInsights(true); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showInsights 
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Strategic Insights
        </button>
      </div>

      {/* Executive Decisions */}
      <AnimatePresence mode="wait">
        {showDecisions && (
          <motion.div 
            key="decisions"
            className="bg-gray-900/60 rounded-xl border border-purple-500/30 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lightning className="w-5 h-5 text-purple-400" weight="fill" />
              Executive Decisions
              <span className="ml-2 px-2 py-0.5 bg-purple-500/30 rounded-full text-xs text-purple-300">
                {state.recentDecisions.length}
              </span>
            </h3>

            {state.recentDecisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No decisions yet. Activate CEO Brain to start strategic thinking.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {state.recentDecisions.map((decision, index) => (
                  <motion.div
                    key={decision.id}
                    className="p-4 bg-black/30 rounded-xl border border-gray-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getPriorityColor(decision.priority)}`}>
                          {decision.executed ? (
                            <CheckCircle className="w-4 h-4" weight="fill" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{decision.decision}</div>
                          <div className="text-gray-500 text-sm">{decision.reasoning}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-medium ${getPriorityColor(decision.priority)} px-2 py-1 rounded`}>
                          {decision.priority.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(decision.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs">
                      <span className="text-gray-400">
                        Type: <span className="text-cyan-400">{formatDecisionType(decision.type)}</span>
                      </span>
                      <span className="text-gray-400">
                        Risk: <span className={decision.riskLevel > 60 ? 'text-red-400' : 'text-green-400'}>{decision.riskLevel}%</span>
                      </span>
                      <span className="text-gray-400">
                        Confidence: <span className="text-purple-400">{decision.confidenceLevel}%</span>
                      </span>
                    </div>

                    {decision.expectedOutcome && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <ArrowRight className="w-3 h-3" />
                        <span>Expected: {decision.expectedOutcome}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {showInsights && (
          <motion.div 
            key="insights"
            className="bg-gray-900/60 rounded-xl border border-cyan-500/30 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-cyan-400" weight="fill" />
              Strategic Insights
            </h3>

            {ceoBrain.getInsights().length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No insights available. CEO Brain will generate insights during strategic review.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ceoBrain.getInsights().map((insight, index) => (
                  <motion.div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      insight.category === 'threat' ? 'bg-red-500/10 border-red-500/30' :
                      insight.category === 'opportunity' ? 'bg-green-500/10 border-green-500/30' :
                      insight.category === 'trend' ? 'bg-cyan-500/10 border-cyan-500/30' :
                      'bg-purple-500/10 border-purple-500/30'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {insight.category === 'threat' ? <Warning className="w-4 h-4 text-red-400" /> :
                       insight.category === 'opportunity' ? <Target className="w-4 h-4 text-green-400" /> :
                       insight.category === 'trend' ? <TrendUp className="w-4 h-4 text-cyan-400" /> :
                       <Sparkle className="w-4 h-4 text-purple-400" />}
                      <span className="text-white font-medium">{insight.title}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                        insight.urgency > 70 ? 'bg-red-500/30 text-red-300' :
                        insight.urgency > 40 ? 'bg-yellow-500/30 text-yellow-300' :
                        'bg-gray-500/30 text-gray-300'
                      }`}>
                        Urgency: {insight.urgency}%
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{insight.description}</p>
                    <div className="space-y-1">
                      {insight.actionItems.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                          <ArrowRight className="w-3 h-3" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Review Timer */}
      <motion.div 
        className="bg-gray-900/40 rounded-xl border border-gray-700/30 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Last Strategic Review: {state.lastStrategicReview.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <ArrowsClockwise className="w-4 h-4" />
            <span>Next Review: {state.nextStrategicReview.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

