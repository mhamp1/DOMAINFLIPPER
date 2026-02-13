/**
 * Logger.ts — Production-Ready Logging System
 * Structured logging with levels, timestamps, and persistence
 * December 2025
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

interface LogEntry {
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  data?: any
  error?: Error
}

interface LoggerConfig {
  minLevel: LogLevel
  persistLogs: boolean
  maxLogEntries: number
  enableConsole: boolean
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  debug: 'color: #888',
  info: 'color: #4CAF50',
  warn: 'color: #FF9800',
  error: 'color: #F44336',
  critical: 'color: #FF0000; font-weight: bold',
}

const LOG_LEVEL_EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌',
  critical: '🚨',
}

class Logger {
  private config: LoggerConfig
  private logs: LogEntry[] = []
  private listeners: Array<(entry: LogEntry) => void> = []

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: config?.minLevel || 'info',
      persistLogs: config?.persistLogs ?? true,
      maxLogEntries: config?.maxLogEntries || 1000,
      enableConsole: config?.enableConsole ?? true,
    }

    // Load persisted logs
    if (this.config.persistLogs) {
      this.loadLogs()
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel]
  }

  private log(level: LogLevel, category: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      error,
    }

    // Add to in-memory logs
    this.logs.push(entry)

    // Trim if over max
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries)
    }

    // Persist
    if (this.config.persistLogs) {
      this.saveLogs()
    }

    // Console output
    if (this.config.enableConsole) {
      const emoji = LOG_LEVEL_EMOJI[level]
      const style = LOG_LEVEL_STYLES[level]
      const timestamp = entry.timestamp.toISOString()
      
      console.log(
        `%c${emoji} [${timestamp}] [${category}] ${message}`,
        style,
        data ? data : '',
        error ? error : ''
      )
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry))
  }

  // Log methods
  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data)
  }

  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data)
  }

  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data)
  }

  error(category: string, message: string, error?: Error, data?: any): void {
    this.log('error', category, message, data, error)
  }

  critical(category: string, message: string, error?: Error, data?: any): void {
    this.log('critical', category, message, data, error)
  }

  // Specialized logging methods
  api(action: string, details?: any): void {
    this.info('API', action, details)
  }

  apiError(action: string, error: Error, details?: any): void {
    this.error('API', `${action} failed`, error, details)
  }

  scanner(action: string, details?: any): void {
    this.info('SCANNER', action, details)
  }

  valuation(domain: string, value: number, score: number): void {
    this.info('VALUATION', `${domain} → $${value.toLocaleString()} (score: ${score})`, { domain, value, score })
  }

  purchase(domain: string, price: number, registrar: string): void {
    this.info('PURCHASE', `Acquired ${domain} for $${price} via ${registrar}`, { domain, price, registrar })
  }

  sale(domain: string, price: number, profit: number): void {
    this.info('SALE', `Sold ${domain} for $${price} (profit: $${profit})`, { domain, price, profit })
  }

  strategy(name: string, action: string, details?: any): void {
    this.info('STRATEGY', `[${name}] ${action}`, details)
  }

  risk(event: string, details?: any): void {
    this.warn('RISK', event, details)
  }

  // Get logs
  getLogs(options?: { level?: LogLevel; category?: string; limit?: number }): LogEntry[] {
    let filtered = [...this.logs]

    if (options?.level) {
      filtered = filtered.filter(l => LOG_LEVEL_PRIORITY[l.level] >= LOG_LEVEL_PRIORITY[options.level!])
    }

    if (options?.category) {
      filtered = filtered.filter(l => l.category === options.category)
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered
  }

  // Get recent errors
  getRecentErrors(count: number = 10): LogEntry[] {
    return this.logs.filter(l => l.level === 'error' || l.level === 'critical').slice(-count)
  }

  // Subscribe to log events
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Persistence
  private saveLogs(): void {
    try {
      // Only save last 100 logs to localStorage (to save space)
      const logsToSave = this.logs.slice(-100).map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
        error: l.error?.message,
      }))
      localStorage.setItem('domainFlipper_logs', JSON.stringify(logsToSave))
    } catch (e) {
      // Ignore storage errors
    }
  }

  private loadLogs(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_logs')
      if (saved) {
        const parsed = JSON.parse(saved)
        this.logs = parsed.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        }))
      }
    } catch (e) {
      // Ignore load errors
    }
  }

  // Clear logs
  clear(): void {
    this.logs = []
    localStorage.removeItem('domainFlipper_logs')
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // Get stats
  getStats(): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<string, number> } {
    const byLevel: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, critical: 0 }
    const byCategory: Record<string, number> = {}

    this.logs.forEach(l => {
      byLevel[l.level]++
      byCategory[l.category] = (byCategory[l.category] || 0) + 1
    })

    return { total: this.logs.length, byLevel, byCategory }
  }
}

// Export singleton
export const logger = new Logger({
  minLevel: import.meta.env.DEV ? 'debug' : 'info',
  persistLogs: true,
  maxLogEntries: 1000,
  enableConsole: true,
})

