/**
 * Advanced Analytics Dashboard
 * Real-time charts and reporting for domain trading
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChartBar,
  TrendUp,
  Download,
  ArrowsClockwise,
  Pulse,
  CurrencyDollar,
  Target,
  Lightning,
} from '@phosphor-icons/react'
import { advancedAnalytics, type ChartData } from '@/lib/analytics/advancedAnalytics'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type Timeframe = '1h' | '24h' | '7d' | '30d' | '90d'
type MetricType = 'revenue' | 'domains_acquired' | 'roi' | 'gem_found' | 'legendary_found'

export function AdvancedAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d')
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('revenue')
  const [performanceData, setPerformanceData] = useState(advancedAnalytics.getPerformanceMetrics())
  const [miningData, setMiningData] = useState(advancedAnalytics.getMiningAnalytics())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [timeframe])

  const loadData = async () => {
    setIsLoading(true)
    try {
      setPerformanceData(advancedAnalytics.getPerformanceMetrics())
      setMiningData(advancedAnalytics.getMiningAnalytics())
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const data = advancedAnalytics.exportData(format)
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `domainflipper-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const renderSimpleChart = (data: ChartData, height: number = 200) => {
    if (!data.labels.length || !data.datasets[0]?.data.length) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <ChartBar size={48} className="mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        </div>
      )
    }

    const maxValue = Math.max(...data.datasets[0].data)
    const chartHeight = height - 40 // Account for labels

    return (
      <div className="space-y-4" style={{ height }}>
        <div className="flex items-end justify-between h-full pb-8">
          {data.labels.map((label, index) => {
            const value = data.datasets[0].data[index] || 0
            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0

            return (
              <div key={label} className="flex flex-col items-center flex-1 max-w-16">
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-8 bg-gradient-to-t from-yellow-600 to-amber-500 rounded-t min-h-2"
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top">
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const metricOptions = [
    { value: 'revenue', label: 'Revenue', icon: CurrencyDollar },
    { value: 'domains_acquired', label: 'Domains Acquired', icon: Target },
    { value: 'roi', label: 'ROI', icon: TrendUp },
    { value: 'gem_found', label: 'Gems Found', icon: Lightning },
    { value: 'legendary_found', label: 'Legendary Found', icon: Pulse },
  ] as const

  const timeframeOptions: { value: Timeframe; label: string }[] = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-yellow-500 font-orbitron">Advanced Analytics</h2>
          <p className="text-gray-500">Real-time performance insights and trends</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            disabled={isLoading}
            variant="outline"
            className="border-yellow-600/30 text-yellow-500"
          >
            <ArrowsClockwise size={18} className={isLoading ? 'animate-spin mr-2' : 'mr-2'} />
            Refresh
          </Button>

          <Button
            onClick={() => exportData('json')}
            variant="outline"
            className="border-yellow-600/30 text-yellow-500"
          >
            <Download size={18} className="mr-2" />
            Export JSON
          </Button>

          <Button
            onClick={() => exportData('csv')}
            variant="outline"
            className="border-yellow-600/30 text-yellow-500"
          >
            <Download size={18} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Timeframe:</span>
          <div className="flex bg-black/30 rounded-lg p-1">
            {timeframeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                  timeframe === option.value
                    ? 'bg-yellow-600 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Metric:</span>
          <div className="flex bg-black/30 rounded-lg p-1">
            {metricOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedMetric(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-all flex items-center gap-1 ${
                  selectedMetric === option.value
                    ? 'bg-yellow-600 text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <option.icon size={14} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/60 border border-yellow-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollar size={20} className="text-green-500" />
            <span className="text-sm text-gray-400">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(performanceData.totalRevenue)}
          </div>
        </Card>

        <Card className="bg-black/60 border border-yellow-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={20} className="text-blue-500" />
            <span className="text-sm text-gray-400">Domains Acquired</span>
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {performanceData.totalDomains.toLocaleString()}
          </div>
        </Card>

        <Card className="bg-black/60 border border-yellow-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendUp size={20} className="text-purple-500" />
            <span className="text-sm text-gray-400">Avg ROI</span>
          </div>
          <div className="text-2xl font-bold text-purple-500">
            {performanceData.avgROI.toFixed(1)}%
          </div>
        </Card>

        <Card className="bg-black/60 border border-yellow-600/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Pulse size={20} className="text-yellow-500" />
            <span className="text-sm text-gray-400">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-yellow-500">
            {performanceData.successRate.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Metric Chart */}
        <Card className="bg-black/60 border border-yellow-600/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-yellow-500">
              {metricOptions.find(m => m.value === selectedMetric)?.label} Trend
            </h3>
            <Badge className="bg-yellow-600/20 text-yellow-500">
              {timeframeOptions.find(t => t.value === timeframe)?.label}
            </Badge>
          </div>
          {renderSimpleChart(advancedAnalytics.getChartData(selectedMetric, timeframe))}
        </Card>

        {/* Mining Performance */}
        <Card className="bg-black/60 border border-yellow-600/20 p-6">
          <h3 className="text-lg font-semibold text-purple-500 mb-4">Mining Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Mined</span>
              <span className="text-white font-bold">{miningData.totalMined.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Gems Found</span>
              <span className="text-yellow-500 font-bold">{miningData.gemsFound}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Legendary</span>
              <span className="text-purple-500 font-bold">{miningData.legendaryFound}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Mining ROI</span>
              <span className="text-green-500 font-bold">{miningData.avgRoi.toFixed(1)}x</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Performance */}
      <Card className="bg-black/60 border border-yellow-600/20 p-6">
        <h3 className="text-lg font-semibold text-cyan-500 mb-4">Top Performing Categories</h3>
        <div className="space-y-3">
          {performanceData.topCategories.length > 0 ? (
            performanceData.topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-black font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white capitalize">{category.category}</div>
                    <div className="text-sm text-gray-400">{category.count} domains</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-bold">{formatCurrency(category.revenue)}</div>
                  <div className="text-sm text-gray-400">revenue</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBar size={48} className="mx-auto mb-2 opacity-50" />
              <p>No category data available yet</p>
            </div>
          )}
        </div>
      </Card>

      {/* Miner Performance Table */}
      <Card className="bg-black/60 border border-yellow-600/20 p-6">
        <h3 className="text-lg font-semibold text-orange-500 mb-4">Miner Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-yellow-600/20">
                <th className="text-left py-2 text-gray-400">Miner</th>
                <th className="text-right py-2 text-gray-400">Domains</th>
                <th className="text-right py-2 text-gray-400">Gems</th>
                <th className="text-right py-2 text-gray-400">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {miningData.minerPerformance.map((miner) => (
                <tr key={miner.miner} className="border-b border-yellow-600/10">
                  <td className="py-3 text-white capitalize">{miner.miner.replace('_', ' ')}</td>
                  <td className="py-3 text-right text-gray-300">{miner.domains}</td>
                  <td className="py-3 text-right text-yellow-500">{miner.gems}</td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      (miner.gems / miner.domains * 100) > 5
                        ? 'bg-green-500/20 text-green-400'
                        : (miner.gems / miner.domains * 100) > 2
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}>
                      {(miner.gems / miner.domains * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
