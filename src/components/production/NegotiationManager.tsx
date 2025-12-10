/**
 * NegotiationManager.tsx — AI NEGOTIATION CONTROL CENTER
 * Manage all automated negotiations with buyers
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Handshake,
  ChatCircle,
  CurrencyDollar,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Robot,
  Warning,
  ChartLine,
  Fire,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  negotiationBot, 
  type NegotiationSession, 
  type NegotiationState 
} from '@/lib/negotiation/NegotiationBot'
import { formatCurrency } from '@/lib/utils'

// State colors
const stateColors: Record<NegotiationState, { bg: string; text: string }> = {
  idle: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  waiting_for_offer: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  evaluating_offer: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  counter_offered: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  accepted: { bg: 'bg-green-500/20', text: 'text-green-400' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400' },
  expired: { bg: 'bg-zinc-500/20', text: 'text-zinc-400' },
  escalated: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
}

export default function NegotiationManager() {
  const [sessions, setSessions] = useState<NegotiationSession[]>([])
  const [stats, setStats] = useState(negotiationBot.getStats())
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [manualOffer, setManualOffer] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Load sessions
  useEffect(() => {
    const loadSessions = () => {
      const allSessions = negotiationBot.getAllSessions()
      setSessions(allSessions)
      setStats(negotiationBot.getStats())
    }

    loadSessions()
    const interval = setInterval(loadSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredSessions = sessions.filter(s => {
    if (filter === 'active') {
      return ['idle', 'waiting_for_offer', 'evaluating_offer', 'counter_offered', 'escalated'].includes(s.state)
    }
    if (filter === 'completed') {
      return ['accepted', 'rejected', 'expired'].includes(s.state)
    }
    return true
  })

  const handleManualCounter = async (sessionId: string, amount: number) => {
    const result = await negotiationBot.manualOverride(sessionId, { type: 'counter', price: amount })
    if (result.success) {
      toast.success('Counter offer sent', { description: `$${amount.toLocaleString()}` })
      setManualOffer('')
    } else {
      toast.error('Failed to send counter offer', { description: result.message })
    }
  }

  const handleAccept = async (sessionId: string) => {
    const result = await negotiationBot.manualOverride(sessionId, { type: 'accept' })
    if (result.success) {
      toast.success('Offer accepted!', { description: 'Deal closed' })
    }
  }

  const handleReject = async (sessionId: string) => {
    const result = await negotiationBot.manualOverride(sessionId, { type: 'reject' })
    if (result.success) {
      toast.info('Offer rejected')
    }
  }

  const handleEscalate = (sessionId: string) => {
    negotiationBot.escalateToHuman(sessionId, 'Manual escalation by user')
    toast.warning('Escalated to human review')
  }

  const isActiveState = (state: NegotiationState) => 
    ['idle', 'waiting_for_offer', 'evaluating_offer', 'counter_offered', 'escalated'].includes(state)

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Handshake size={16} className="text-cyan-500" />
            <span className="text-xs text-zinc-500 uppercase">Active</span>
          </div>
          <div className="text-2xl font-bold text-cyan-500">{stats.activeSessions}</div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-xs text-zinc-500 uppercase">Closed</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{stats.completedDeals}</div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollar size={16} className="text-green-500" />
            <span className="text-xs text-zinc-500 uppercase">Total Value</span>
          </div>
          <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalVolume)}</div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ChartLine size={16} className="text-purple-500" />
            <span className="text-xs text-zinc-500 uppercase">Avg Discount</span>
          </div>
          <div className="text-2xl font-bold text-purple-500">{stats.avgDiscount.toFixed(1)}%</div>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Fire size={16} className="text-yellow-500" />
            <span className="text-xs text-zinc-500 uppercase">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-yellow-500">{stats.successRate.toFixed(1)}%</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-yellow-600/20 text-yellow-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && stats.activeSessions > 0 && (
              <Badge className="ml-2 bg-cyan-500">{stats.activeSessions}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800 p-8">
            <div className="text-center text-zinc-500">
              <Handshake size={48} className="mx-auto mb-4 opacity-50" />
              <p>No negotiations {filter !== 'all' ? `(${filter})` : ''} at the moment</p>
              <p className="text-sm mt-1">Negotiations will appear here when buyers make offers</p>
            </div>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredSessions.map(session => {
              const isSelected = selectedSession === session.id
              const stateStyle = stateColors[session.state] || stateColors.idle
              const lastRound = session.rounds[session.rounds.length - 1]
              
              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card 
                    className={`bg-zinc-900/50 border-zinc-800 p-4 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-yellow-500' : 'hover:border-zinc-700'
                    }`}
                    onClick={() => setSelectedSession(isSelected ? null : session.id)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-lg">{session.domain}</span>
                        <Badge className={`${stateStyle.bg} ${stateStyle.text}`}>
                          {session.state.replace(/_/g, ' ')}
                        </Badge>
                        {session.state === 'escalated' && (
                          <Badge className="bg-orange-500/20 text-orange-400">
                            <User size={12} className="mr-1" />
                            Human Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500">
                          Round {session.rounds.length}
                        </span>
                      </div>
                    </div>

                    {/* Price Info */}
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div className="p-2 bg-zinc-800/50 rounded">
                        <div className="text-xs text-zinc-500">Asking</div>
                        <div className="text-white font-bold">{formatCurrency(session.askingPrice)}</div>
                      </div>
                      <div className="p-2 bg-zinc-800/50 rounded">
                        <div className="text-xs text-zinc-500">Floor</div>
                        <div className="text-red-400 font-bold">{formatCurrency(session.floorPrice)}</div>
                      </div>
                      <div className="p-2 bg-zinc-800/50 rounded">
                        <div className="text-xs text-zinc-500">Current Offer</div>
                        <div className="text-cyan-500 font-bold">{formatCurrency(session.currentOffer || 0)}</div>
                      </div>
                      <div className="p-2 bg-zinc-800/50 rounded">
                        <div className="text-xs text-zinc-500">Our Counter</div>
                        <div className="text-purple-400 font-bold">{formatCurrency(session.ourLastCounter || 0)}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-gradient-to-r from-yellow-600 to-green-500 transition-all"
                        style={{ 
                          width: `${Math.min(100, ((session.currentOffer || 0) / session.askingPrice) * 100)}%` 
                        }}
                      />
                    </div>

                    {/* Expanded Details */}
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-zinc-800"
                      >
                        {/* Negotiation Timeline */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-zinc-400 mb-2">Timeline</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {session.rounds.map((round, i) => (
                              <div 
                                key={i}
                                className={`flex items-center gap-3 p-2 rounded ${
                                  round.theirOffer ? 'bg-blue-500/10' : 'bg-green-500/10'
                                }`}
                              >
                                {round.theirOffer ? (
                                  <User size={16} className="text-blue-400" />
                                ) : (
                                  <Robot size={16} className="text-green-400" />
                                )}
                                <span className="text-sm text-zinc-400">
                                  {round.action.replace(/_/g, ' ')}
                                </span>
                                <span className="ml-auto font-bold">
                                  {formatCurrency(round.theirOffer || round.ourCounter || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {isActiveState(session.state) && (
                          <div className="space-y-3">
                            {/* Manual Counter */}
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Enter counter offer..."
                                value={manualOffer}
                                onChange={(e) => setManualOffer(e.target.value)}
                                className="flex-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (manualOffer) {
                                    handleManualCounter(session.id, parseFloat(manualOffer))
                                  }
                                }}
                                disabled={!manualOffer}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <ArrowUp size={16} className="mr-1" />
                                Counter
                              </Button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAccept(session.id)
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle size={16} className="mr-1" />
                                Accept Current
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReject(session.id)
                                }}
                                variant="outline"
                                className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                              >
                                <XCircle size={16} className="mr-1" />
                                Walk Away
                              </Button>
                              {session.state !== 'escalated' && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEscalate(session.id)
                                  }}
                                  variant="outline"
                                >
                                  <Warning size={16} className="mr-1" />
                                  Escalate
                                </Button>
                              )}
                            </div>

                            {/* ZOPA Display */}
                            <div className="p-3 bg-zinc-800/50 rounded-lg">
                              <div className="text-xs text-zinc-500 mb-1">Zone of Possible Agreement (ZOPA)</div>
                              <div className="flex items-center justify-between">
                                <span className="text-red-400">{formatCurrency(session.floorPrice)}</span>
                                <div className="flex-1 mx-3 h-2 bg-zinc-700 rounded-full relative">
                                  <div 
                                    className="absolute h-full bg-green-500/50 rounded-full"
                                    style={{
                                      left: '0%',
                                      width: `${((session.ceilingPrice - session.floorPrice) / (session.askingPrice - session.floorPrice)) * 100}%`,
                                    }}
                                  />
                                  {session.currentOffer && (
                                    <div 
                                      className="absolute w-2 h-full bg-yellow-500 rounded-full"
                                      style={{
                                        left: `${Math.min(100, Math.max(0, ((session.currentOffer - session.floorPrice) / (session.askingPrice - session.floorPrice)) * 100))}%`,
                                      }}
                                    />
                                  )}
                                </div>
                                <span className="text-green-400">{formatCurrency(session.askingPrice)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Completed Session Info */}
                        {session.state === 'accepted' && (
                          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle size={20} className="text-green-500" />
                              <span className="font-semibold text-green-400">Deal Completed!</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-zinc-500">Final Price</div>
                                <div className="text-white font-bold">{formatCurrency(session.finalPrice || 0)}</div>
                              </div>
                              <div>
                                <div className="text-zinc-500">vs Asking</div>
                                <div className="text-green-400 font-bold">
                                  {session.finalPrice ? ((session.finalPrice / session.askingPrice) * 100).toFixed(0) : 0}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {session.state === 'rejected' && (
                          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                            <div className="flex items-center gap-2">
                              <XCircle size={20} className="text-red-500" />
                              <span className="font-semibold text-red-400">Negotiation Failed</span>
                            </div>
                            <p className="text-sm text-zinc-500 mt-1">
                              Buyer's final offer was below floor price
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Bot Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Robot size={20} className="text-purple-500" />
          Auto-Negotiation Settings
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-zinc-500 mb-1">Auto-Accept Above</div>
            <div className="text-white font-bold">95% of asking</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-zinc-500 mb-1">Max Rounds</div>
            <div className="text-white font-bold">5 rounds</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-zinc-500 mb-1">Counter Strategy</div>
            <div className="text-white font-bold">Gradual (70%→90%)</div>
          </div>
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="text-zinc-500 mb-1">Response Time</div>
            <div className="text-white font-bold">2-6 hours</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
