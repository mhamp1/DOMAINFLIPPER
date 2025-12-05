/**
 * MetricsDashboard.tsx - Real-Time Metrics & Monitoring
 * Live performance metrics, health status, and system monitoring
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartLine, Heartbeat, Lightning, Clock, Database, Cloud, CheckCircle,
  Warning, XCircle, ArrowUp, ArrowDown, Minus, Cpu, HardDrives, WifiHigh,
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { healthMonitor, type ServiceHealth, type SystemHealth } from '@/lib/health/HealthMonitor'
import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

interface MetricsDashboardProps {
  compact?: boolean
  showLogs?: boolean
}

interface Metric {
  label: string
  value: string | number
  change?: number
  icon: typeof ChartLine
  color: string
}

// ==================== CONSTANTS ====================

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  degraded: { icon: Warning, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  unknown: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-500/20' },
}

// ==================== HELPER COMPONENTS ====================

const StatusIndicator: React.FC<{ status: ServiceHealth['status'] }> = ({ status }) => {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg}`}>
      <Icon size={14} weight="fill" className={config.color} />
      <span className={`text-xs font-medium capitalize ${config.color}`}>{status}</span>
    </div>
  )
}

const MetricCard: React.FC<Metric> = ({ label, value, change, icon: Icon, color }) => (
  <div className="bg-black/30 border border-yellow-600/10 rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-yellow-600/50 text-xs">{label}</span>
      <Icon size={16} className={color} />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-xl font-bold text-yellow-600">{value}</span>
      {change !== undefined && (
        <span className={`text-xs flex items-center ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(change).toFixed(1)}%
        </span>
      )}
    </div>
  </div>
)

const ServiceCard: React.FC<{ service: ServiceHealth }> = ({ service }) => {
  const config = STATUS_CONFIG[service.status]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-black/30 border rounded-lg p-3 transition-all ${
        service.status === 'healthy' 
          ? 'border-yellow-600/10' 
          : service.status === 'down'
          ? 'border-red-500/30'
          : 'border-yellow-500/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-yellow-600 font-medium capitalize">{service.name}</span>
        <StatusIndicator status={service.status} />
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-yellow-600/40">Latency</span>
          <p className={`font-mono ${service.latency > 5000 ? 'text-red-400' : service.latency > 2000 ? 'text-yellow-400' : 'text-green-400'}`}>
            {service.latency}ms
          </p>
        </div>
        <div>
          <span className="text-yellow-600/40">Errors/hr</span>
          <p className={`font-mono ${service.errorRate > 5 ? 'text-red-400' : service.errorRate > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
            {service.errorRate}
          </p>
        </div>
        <div>
          <span className="text-yellow-600/40">Failures</span>
          <p className={`font-mono ${service.consecutiveFailures > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {service.consecutiveFailures}
          </p>
        </div>
      </div>
      
      {service.lastError && (
        <div className="mt-2 text-xs text-red-400/70 truncate">
          ⚠️ {service.lastError}
        </div>
      )}
    </motion.div>
  )
}

// ==================== MAIN COMPONENT ====================

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  compact = false,
  showLogs = false,
}) => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    requestsPerSec: 0,
    avgLatency: 0,
  })
  const [logStats, setLogStats] = useState({ total: 0, byLevel: { debug: 0, info: 0, warn: 0, error: 0, critical: 0 }, byCategory: {} as Record<string, number> })

  // Start health monitoring and update state
  useEffect(() => {
    healthMonitor.startMonitoring(30000) // Every 30 seconds
    
    const updateHealth = () => {
      setSystemHealth(healthMonitor.getSystemHealth())
      setLogStats(logger.getStats())
      
      // Simulate performance metrics (in real app, would come from actual measurements)
      setPerformanceMetrics({
        cpuUsage: Math.random() * 30 + 10, // 10-40%
        memoryUsage: Math.random() * 20 + 40, // 40-60%
        requestsPerSec: Math.floor(Math.random() * 50) + 10,
        avgLatency: Math.floor(Math.random() * 200) + 50,
      })
    }

    updateHealth()
    const interval = setInterval(updateHealth, 5000) // Update every 5 seconds

    return () => {
      clearInterval(interval)
    }
  }, [])

  if (!systemHealth) {
    return (
      <Card className="p-4 bg-black/50 border border-yellow-600/20 animate-pulse">
        <div className="h-32 bg-yellow-600/10 rounded" />
      </Card>
    )
  }

  const overallConfig = STATUS_CONFIG[systemHealth.overall]
  const OverallIcon = overallConfig.icon

  // Format uptime
  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (compact) {
    return (
      <Card className="p-4 bg-black/50 border border-yellow-600/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${overallConfig.bg}`}>
              <OverallIcon size={24} weight="fill" className={overallConfig.color} />
            </div>
            <div>
              <p className="text-yellow-600/50 text-xs">System Status</p>
              <p className={`text-lg font-bold capitalize ${overallConfig.color}`}>
                {systemHealth.overall}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 text-xs">
            <div className="text-center">
              <p className="text-yellow-600/40">Uptime</p>
              <p className="text-yellow-600 font-mono">{formatUptime(systemHealth.uptime)}</p>
            </div>
            <div className="text-center">
              <p className="text-yellow-600/40">Errors (24h)</p>
              <p className={`font-mono ${systemHealth.errorsLast24h > 10 ? 'text-red-400' : 'text-green-400'}`}>
                {systemHealth.errorsLast24h}
              </p>
            </div>
            <div className="text-center">
              <p className="text-yellow-600/40">Bot</p>
              <p className={`font-mono ${systemHealth.botRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                {systemHealth.botRunning ? 'Active' : 'Idle'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <Card className="p-4 bg-black/50 border border-yellow-600/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${overallConfig.bg}`}>
              <OverallIcon size={32} weight="fill" className={overallConfig.color} />
            </div>
            <div>
              <p className="text-yellow-600/50 text-sm">System Health</p>
              <p className={`text-2xl font-bold capitalize ${overallConfig.color}`}>
                {systemHealth.overall}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full ${systemHealth.botRunning ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <span className={`text-sm font-medium ${systemHealth.botRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                {systemHealth.botRunning ? '🟢 Bot Running' : '🟡 Bot Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard
            label="Uptime"
            value={formatUptime(systemHealth.uptime)}
            icon={Clock}
            color="text-green-400"
          />
          <MetricCard
            label="Domains Processed"
            value={systemHealth.domainsProcessed.toLocaleString()}
            icon={Database}
            color="text-blue-400"
          />
          <MetricCard
            label="Errors (24h)"
            value={systemHealth.errorsLast24h}
            icon={Warning}
            color={systemHealth.errorsLast24h > 10 ? 'text-red-400' : 'text-green-400'}
          />
          <MetricCard
            label="Avg Latency"
            value={`${performanceMetrics.avgLatency}ms`}
            icon={Lightning}
            color={performanceMetrics.avgLatency > 500 ? 'text-yellow-400' : 'text-green-400'}
          />
        </div>
      </Card>

      {/* Services Grid */}
      <Card className="p-4 bg-black/50 border border-yellow-600/20">
        <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center gap-2">
          <WifiHigh size={20} />
          Service Status
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.values(systemHealth.services).map(service => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card className="p-4 bg-black/50 border border-yellow-600/20">
        <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center gap-2">
          <ChartLine size={20} />
          Performance Metrics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="CPU Usage"
            value={`${performanceMetrics.cpuUsage.toFixed(1)}%`}
            icon={Cpu}
            color={performanceMetrics.cpuUsage > 70 ? 'text-red-400' : performanceMetrics.cpuUsage > 50 ? 'text-yellow-400' : 'text-green-400'}
          />
          <MetricCard
            label="Memory"
            value={`${performanceMetrics.memoryUsage.toFixed(1)}%`}
            icon={HardDrives}
            color={performanceMetrics.memoryUsage > 80 ? 'text-red-400' : performanceMetrics.memoryUsage > 60 ? 'text-yellow-400' : 'text-green-400'}
          />
          <MetricCard
            label="Requests/sec"
            value={performanceMetrics.requestsPerSec}
            icon={Cloud}
            color="text-blue-400"
          />
          <MetricCard
            label="Active Services"
            value={`${Object.values(systemHealth.services).filter(s => s.status === 'healthy').length}/${Object.keys(systemHealth.services).length}`}
            icon={Heartbeat}
            color="text-green-400"
          />
        </div>
      </Card>

      {/* Log Stats */}
      {showLogs && (
        <Card className="p-4 bg-black/50 border border-yellow-600/20">
          <h3 className="text-lg font-semibold text-yellow-600 mb-4">Log Statistics</h3>
          
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(logStats.byLevel).map(([level, count]) => (
              <div key={level} className="text-center p-2 bg-black/30 rounded">
                <p className="text-yellow-600/50 text-xs capitalize">{level}</p>
                <p className={`text-lg font-bold ${
                  level === 'critical' ? 'text-red-500' :
                  level === 'error' ? 'text-red-400' :
                  level === 'warn' ? 'text-yellow-400' :
                  level === 'info' ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {count}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-yellow-600/40 text-sm mt-3">
            Total logs: {logStats.total.toLocaleString()}
          </p>
        </Card>
      )}
    </div>
  )
}

export default MetricsDashboard

