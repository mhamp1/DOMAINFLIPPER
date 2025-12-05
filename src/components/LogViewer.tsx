/**
 * LogViewer.tsx - Real-Time Log Viewer Component
 * Beautiful, filterable, searchable log viewer for the dashboard
 * December 2025
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bug, Info, Warning, XCircle, Fire, MagnifyingGlass, Funnel,
  ArrowDown, ArrowUp, Trash, Download, Copy, Eye, EyeSlash,
} from '@phosphor-icons/react'
import { logger, type LogLevel } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

// ==================== TYPES ====================

interface LogEntry {
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  data?: unknown
  error?: Error
}

interface LogViewerProps {
  maxHeight?: string
  autoScroll?: boolean
  showFilters?: boolean
  showSearch?: boolean
  initialLevel?: LogLevel
}

// ==================== CONSTANTS ====================

const LOG_LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; color: string; bg: string }> = {
  debug: { icon: Bug, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  info: { icon: Info, color: 'text-green-400', bg: 'bg-green-500/10' },
  warn: { icon: Warning, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  critical: { icon: Fire, color: 'text-red-500', bg: 'bg-red-500/20' },
}

const CATEGORIES = ['ALL', 'API', 'SCANNER', 'VALUATION', 'PURCHASE', 'SALE', 'STRATEGY', 'RISK', 'HEALTH']

// ==================== LOG VIEWER COMPONENT ====================

export const LogViewer: React.FC<LogViewerProps> = ({
  maxHeight = '400px',
  autoScroll = true,
  showFilters = true,
  showSearch = true,
  initialLevel = 'info',
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll)
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())
  const [isPaused, setIsPaused] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Subscribe to logger updates
  useEffect(() => {
    // Get initial logs
    setLogs(logger.getLogs({ level: initialLevel }))

    // Subscribe to new logs
    const unsubscribe = logger.subscribe((entry: LogEntry) => {
      if (!isPaused) {
        setLogs(prev => [...prev.slice(-499), entry]) // Keep last 500
      }
    })

    return () => unsubscribe()
  }, [initialLevel, isPaused])

  // Filter logs when filters change
  useEffect(() => {
    let filtered = [...logs]

    // Filter by level
    if (selectedLevel !== 'all') {
      const levelPriority: Record<LogLevel, number> = {
        debug: 0, info: 1, warn: 2, error: 3, critical: 4,
      }
      filtered = filtered.filter(log => 
        levelPriority[log.level] >= levelPriority[selectedLevel as LogLevel]
      )
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(log => log.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.category.toLowerCase().includes(query) ||
        JSON.stringify(log.data).toLowerCase().includes(query)
      )
    }

    setFilteredLogs(filtered)
  }, [logs, selectedLevel, selectedCategory, searchQuery])

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScrolling && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, isAutoScrolling])

  // Toggle log expansion
  const toggleExpand = (index: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // Export logs
  const handleExport = () => {
    const exportData = logger.exportLogs()
    const blob = new Blob([exportData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `domainFlipper_logs_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Logs exported')
  }

  // Clear logs
  const handleClear = () => {
    logger.clear()
    setLogs([])
    toast.success('Logs cleared')
  }

  // Copy log to clipboard
  const handleCopyLog = (log: LogEntry) => {
    const text = JSON.stringify(log, null, 2)
    navigator.clipboard.writeText(text)
    toast.success('Log copied to clipboard')
  }

  // Get stats
  const stats = useMemo(() => {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, critical: 0 }
    logs.forEach(log => byLevel[log.level]++)
    return byLevel
  }, [logs])

  return (
    <Card className="bg-black/50 border border-yellow-600/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-yellow-600/20 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-yellow-600">System Logs</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-600/50">
              {filteredLogs.length} / {logs.length} logs
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPaused(!isPaused)}
              className={`text-yellow-600/70 hover:text-yellow-600 ${isPaused ? 'bg-red-500/20' : ''}`}
            >
              {isPaused ? <Eye size={16} /> : <EyeSlash size={16} />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAutoScrolling(!isAutoScrolling)}
              className={`text-yellow-600/70 hover:text-yellow-600 ${isAutoScrolling ? 'bg-yellow-600/20' : ''}`}
            >
              <ArrowDown size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleExport}
              className="text-yellow-600/70 hover:text-yellow-600"
            >
              <Download size={16} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="text-red-500/70 hover:text-red-500"
            >
              <Trash size={16} />
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 text-xs">
          {Object.entries(stats).map(([level, count]) => (
            <div key={level} className={`flex items-center gap-1 ${LOG_LEVEL_CONFIG[level as LogLevel].color}`}>
              <span className="opacity-70">{level}:</span>
              <span className="font-mono">{count}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            {/* Level filter */}
            <div className="flex gap-1">
              {(['all', 'debug', 'info', 'warn', 'error', 'critical'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    selectedLevel === level
                      ? 'bg-yellow-600 text-black font-semibold'
                      : 'bg-yellow-600/10 text-yellow-600/70 hover:bg-yellow-600/20'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 text-xs rounded bg-black border border-yellow-600/30 text-yellow-600 focus:outline-none focus:border-yellow-600"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600/50" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-black/50 border border-yellow-600/30 rounded text-yellow-600 placeholder:text-yellow-600/30 focus:outline-none focus:border-yellow-600"
            />
          </div>
        )}
      </div>

      {/* Log list */}
      <div
        ref={containerRef}
        className="overflow-y-auto font-mono text-sm"
        style={{ maxHeight }}
      >
        <AnimatePresence initial={false}>
          {filteredLogs.map((log, index) => {
            const config = LOG_LEVEL_CONFIG[log.level]
            const Icon = config.icon
            const isExpanded = expandedLogs.has(index)

            return (
              <motion.div
                key={`${log.timestamp.getTime()}-${index}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`border-b border-yellow-600/10 ${config.bg} hover:bg-yellow-600/5 transition-colors`}
              >
                <div
                  className="p-2 flex items-start gap-2 cursor-pointer"
                  onClick={() => log.data && toggleExpand(index)}
                >
                  <Icon size={16} weight="fill" className={`${config.color} mt-0.5 shrink-0`} />
                  
                  <span className="text-yellow-600/40 text-xs shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  
                  <span className={`${config.color} text-xs font-semibold shrink-0`}>
                    [{log.category}]
                  </span>
                  
                  <span className="text-yellow-600/80 flex-1 break-all">
                    {log.message}
                  </span>

                  {log.data !== undefined && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyLog(log)
                      }}
                      className="text-yellow-600/30 hover:text-yellow-600/70 shrink-0"
                    >
                      <Copy size={14} />
                    </button>
                  )}

                  {log.data !== undefined && (
                    <span className="text-yellow-600/30">
                      {isExpanded ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </span>
                  )}
                </div>

                {/* Expanded data */}
                {isExpanded && log.data !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2"
                  >
                    <pre className="text-xs text-yellow-600/50 bg-black/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Empty state */}
      {filteredLogs.length === 0 && (
        <div className="p-8 text-center text-yellow-600/50">
          <Funnel size={32} className="mx-auto mb-2 opacity-50" />
          <p>No logs match your filters</p>
        </div>
      )}
    </Card>
  )
}

export default LogViewer

