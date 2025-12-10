/**
 * BrainFeed.tsx — LIVE BOT REASONING DISPLAY
 * Shows the bot's thinking process in real-time
 * Like watching an AI reason through decisions
 * December 2025
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  Zap, 
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Calculator,
  Handshake,
  Lightbulb,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { thoughtStream } from '@/lib/autonomy/ThoughtStream'
import type { Thought, ThoughtType, ThinkingSession } from '@/lib/autonomy/ThoughtStream'
import { cn } from '@/lib/utils'

// ==================== ICONS ====================

const THOUGHT_ICONS: Record<ThoughtType, React.ReactNode> = {
  observation: <Eye className="w-4 h-4" />,
  analysis: <Search className="w-4 h-4" />,
  evaluation: <Activity className="w-4 h-4" />,
  decision: <CheckCircle className="w-4 h-4" />,
  action: <Zap className="w-4 h-4" />,
  result: <TrendingUp className="w-4 h-4" />,
  strategy: <Target className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  opportunity: <Lightbulb className="w-4 h-4" />,
  negotiation: <Handshake className="w-4 h-4" />,
  calculation: <Calculator className="w-4 h-4" />,
  learning: <Brain className="w-4 h-4" />,
}

const THOUGHT_COLORS: Record<ThoughtType, string> = {
  observation: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  analysis: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  evaluation: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  decision: 'text-green-400 border-green-400/30 bg-green-400/10',
  action: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  result: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  strategy: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  warning: 'text-red-400 border-red-400/30 bg-red-400/10',
  opportunity: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  negotiation: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  calculation: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10',
  learning: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
}

// ==================== THOUGHT ITEM COMPONENT ====================

interface ThoughtItemProps {
  thought: Thought
  isNew?: boolean
}

function ThoughtItem({ thought, isNew }: ThoughtItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = thought.details && thought.details.length > 0

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative pl-6 pb-4 border-l-2 border-gray-700/50',
        isNew && 'animate-pulse-once'
      )}
    >
      {/* Timeline dot */}
      <div className={cn(
        'absolute left-[-5px] top-0 w-2 h-2 rounded-full',
        THOUGHT_COLORS[thought.type].includes('text-') 
          ? THOUGHT_COLORS[thought.type].replace('text-', 'bg-').split(' ')[0]
          : 'bg-cyan-400'
      )} />

      {/* Thought content */}
      <div 
        className={cn(
          'rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.01]',
          THOUGHT_COLORS[thought.type]
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          {THOUGHT_ICONS[thought.type]}
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            {thought.title}
          </span>
          <span className="text-xs opacity-50 ml-auto">
            {formatTime(thought.timestamp)}
          </span>
          {hasDetails && (
            <button className="opacity-50 hover:opacity-100">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Main content */}
        <p className="text-sm text-white/90 leading-relaxed">
          {thought.content}
        </p>

        {/* Domain tag */}
        {thought.relatedDomain && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-black/30 text-cyan-300 font-mono">
            {thought.relatedDomain}
          </span>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && thought.details && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/10">
                <ul className="space-y-1">
                  {thought.details.map((detail, i) => (
                    <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-white/30">›</span>
                      <span className="font-mono">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confidence indicator */}
        {thought.confidence !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-black/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-current rounded-full transition-all"
                style={{ width: `${thought.confidence}%` }}
              />
            </div>
            <span className="text-xs opacity-60">{thought.confidence}%</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ==================== TYPING INDICATOR ====================

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 pl-6 py-2"
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30">
        <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-sm text-cyan-400">Thinking</span>
        <span className="flex gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </motion.div>
  )
}

// ==================== MAIN COMPONENT ====================

interface BrainFeedProps {
  className?: string
  maxHeight?: string
  showControls?: boolean
}

export function BrainFeed({ className, maxHeight = '600px', showControls = true }: BrainFeedProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [currentSession, setCurrentSession] = useState<ThinkingSession | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [newThoughtIds, setNewThoughtIds] = useState<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  // Subscribe to thought stream
  useEffect(() => {
    // Load initial thoughts
    setThoughts(thoughtStream.getThoughts(100))
    setCurrentSession(thoughtStream.getCurrentSession())

    // Subscribe to new thoughts
    const unsubThoughts = thoughtStream.subscribe((thought) => {
      if (!isPaused) {
        setThoughts(prev => [thought, ...prev].slice(0, 100))
        setNewThoughtIds(prev => new Set([...prev, thought.id]))
        
        // Clear "new" status after animation
        setTimeout(() => {
          setNewThoughtIds(prev => {
            const next = new Set(prev)
            next.delete(thought.id)
            return next
          })
        }, 1000)

        // Auto-scroll if at top
        if (autoScrollRef.current && feedRef.current) {
          feedRef.current.scrollTop = 0
        }
      }
    })

    // Subscribe to sessions
    const unsubSessions = thoughtStream.subscribeToSessions((session) => {
      setCurrentSession(session.status === 'thinking' ? session : null)
    })

    return () => {
      unsubThoughts()
      unsubSessions()
    }
  }, [isPaused])

  // Handle scroll
  const handleScroll = () => {
    if (feedRef.current) {
      autoScrollRef.current = feedRef.current.scrollTop === 0
    }
  }

  // Clear thoughts
  const handleClear = () => {
    thoughtStream.clear()
    setThoughts([])
  }

  return (
    <div 
      className={cn(
        'relative bg-black/40 backdrop-blur-xl rounded-xl border border-cyan-500/20 overflow-hidden',
        isExpanded && 'fixed inset-4 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-6 h-6 text-cyan-400" />
            {currentSession && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              Brain Feed
              {currentSession && (
                <span className="text-xs font-normal text-cyan-400 animate-pulse">
                  • Thinking...
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              Real-time reasoning & decisions
            </p>
          </div>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isPaused 
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              )}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-black/20 border-b border-white/5 text-xs">
        <span className="text-gray-400">
          <span className="text-white font-bold">{thoughts.length}</span> thoughts
        </span>
        {currentSession && (
          <span className="text-cyan-400">
            Session: {currentSession.topic}
          </span>
        )}
        {isPaused && (
          <span className="text-yellow-400 ml-auto">⏸ Paused</span>
        )}
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="overflow-y-auto p-4"
        style={{ maxHeight: isExpanded ? 'calc(100vh - 200px)' : maxHeight }}
      >
        {/* Thinking indicator */}
        <AnimatePresence>
          {currentSession && <ThinkingIndicator />}
        </AnimatePresence>

        {/* Thoughts list */}
        <AnimatePresence mode="popLayout">
          {thoughts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500"
            >
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No thoughts yet...</p>
              <p className="text-sm mt-1">The bot will show its reasoning here</p>
            </motion.div>
          ) : (
            thoughts.map((thought) => (
              <ThoughtItem 
                key={thought.id} 
                thought={thought} 
                isNew={newThoughtIds.has(thought.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
    </div>
  )
}

// ==================== HELPERS ====================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default BrainFeed
