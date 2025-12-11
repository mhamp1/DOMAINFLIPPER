/**
 * Autonomous Empire Control
 * The command center for the fully autonomous domain trading empire
 * December 2025 - The Final Frontier
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Power,
  Pulse,
  TrendUp,
  Shield,
  Lightning,
  Warning,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  Gear,
  ChartBar,
  Cpu,
  WifiHigh,
  Database,
  Globe,
} from '@phosphor-icons/react'
import { autonomousEmpire, type EmpireStatus, type EmpireStats } from '@/lib/autonomy/AutonomousEmpire'
import { masterAutonomousController } from '@/lib/autonomy/MasterAutonomousController'
import { soundEngine } from '@/lib/sounds/soundEffects'
import { toast } from 'sonner'

export function AutonomousEmpireControl() {
  const [empireStatus, setEmpireStatus] = useState<EmpireStatus>(autonomousEmpire.getStatus())
  const [empireStats, setEmpireStats] = useState<EmpireStats>(autonomousEmpire.getStats())
  const [isLaunching, setIsLaunching] = useState(false)

  useEffect(() => {
    // Subscribe to updates
    const statusInterval = setInterval(() => {
      setEmpireStatus(autonomousEmpire.getStatus())
      setEmpireStats(autonomousEmpire.getStats())
    }, 5000) // Update every 5 seconds

    return () => clearInterval(statusInterval)
  }, [])

  const handleLaunch = async () => {
    setIsLaunching(true)
    try {
      const success = await autonomousEmpire.launch()
      if (success) {
        soundEngine.vaultOpen()
      }
    } finally {
      setIsLaunching(false)
    }
  }

  const handleShutdown = async () => {
    await autonomousEmpire.shutdown()
  }

  const handleEmergencyShutdown = async () => {
    await autonomousEmpire.emergencyShutdown()
  }

  const handleModeChange = (mode: EmpireStatus['mode']) => {
    autonomousEmpire.setMode(mode)
  }


  const getStatusColor = (status: EmpireStatus) => {
    if (!status.isActive) return 'text-gray-500'
    if (status.healthScore < 50) return 'text-red-500'
    if (status.riskLevel === 'high' || status.riskLevel === 'critical') return 'text-yellow-500'
    return 'text-green-500'
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle size={20} className="text-red-500" />
      case 'high': return <Warning size={20} className="text-yellow-500" />
      case 'medium': return <Warning size={20} className="text-orange-500" />
      default: return <CheckCircle size={20} className="text-green-500" />
    }
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold gold-gradient-text font-orbitron mb-2">🤖 Autonomous Empire</h2>
        <p className="text-gray-500">The self-sufficient domain trading AI that handles everything autonomously</p>
      </div>

      {/* Empire Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="bg-black/60 border border-yellow-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Power size={20} className={getStatusColor(empireStatus)} />
            <span className="text-sm text-gray-400">Status</span>
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(empireStatus)}`}>
            {empireStatus.isActive ? 'ACTIVE' : 'STANDBY'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Mode: {empireStatus.mode.toUpperCase()}
          </div>
        </Card>

        <Card className="bg-black/60 border border-green-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendUp size={20} className="text-green-500" />
            <span className="text-sm text-gray-400">Performance</span>
          </div>
          <div className="text-2xl font-bold text-green-500">
            {empireStatus.performanceScore.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {empireStats.successRate.toFixed(1)}% success rate
          </div>
        </Card>

        <Card className="bg-black/60 border border-red-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            {getRiskIcon(empireStatus.riskLevel)}
            <span className="text-sm text-gray-400">Risk Level</span>
          </div>
          <div className="text-2xl font-bold text-red-500">
            {empireStatus.riskLevel.toUpperCase()}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Risk monitoring active
          </div>
        </Card>

        <Card className="bg-black/60 border border-blue-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pulse size={20} className="text-blue-500" />
            <span className="text-sm text-gray-400">Health</span>
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {empireStatus.healthScore.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            System health monitoring
          </div>
        </Card>
      </div>

      {/* Control Panel */}
      <Card className="bg-black/60 border border-yellow-600/20 p-6">
        <h3 className="text-lg font-semibold text-yellow-500 mb-4">Empire Control</h3>

        {!empireStatus.isActive ? (
          <div className="text-center py-8">
            <Power size={48} className="mx-auto mb-4 text-gray-600" />
            <h4 className="text-xl font-bold text-white mb-2">Empire is in Standby</h4>
            <p className="text-gray-500 mb-6">
              Launch the autonomous empire to begin fully automated domain trading
            </p>
            <Button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold px-8 py-3"
            >
              {isLaunching ? (
                <>
                  <ArrowsClockwise size={20} className="mr-2 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Play size={20} className="mr-2" />
                  Launch Autonomous Empire
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold">Empire Active</div>
                <div className="text-gray-500 text-sm">
                  Uptime: {formatUptime(empireStatus.uptime)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleShutdown}
                  variant="outline"
                  className="border-yellow-600/30 text-yellow-500"
                >
                  <Pause size={18} className="mr-2" />
                  Shutdown
                </Button>
                <Button
                  onClick={handleEmergencyShutdown}
                  variant="outline"
                  className="border-red-600/30 text-red-500"
                >
                  <XCircle size={18} className="mr-2" />
                  Emergency Stop
                </Button>
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <h4 className="text-white font-semibold mb-3">Operating Mode</h4>
              <div className="flex gap-2 flex-wrap">
                {(['conservative', 'balanced', 'aggressive', 'god_mode'] as const).map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    variant={empireStatus.mode === mode ? 'default' : 'outline'}
                    className={empireStatus.mode === mode
                      ? 'bg-yellow-600 text-black'
                      : 'border-yellow-600/30 text-yellow-500 hover:border-yellow-600/50'
                    }
                    size="sm"
                  >
                    {mode.replace('_', ' ').toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Simple Status Display */}
      {empireStatus.isActive && (
        <Card className="bg-black/60 border border-cyan-600/20 p-6">
          <h3 className="text-lg font-semibold text-cyan-500 mb-4">🤖 Autonomous Status</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{empireStatus.totalDecisions.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Decisions Made</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{empireStatus.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{empireStatus.activeWorkflows}</div>
              <div className="text-sm text-gray-500">Active Systems</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{empireStatus.healthScore}%</div>
              <div className="text-sm text-gray-500">System Health</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
