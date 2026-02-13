/**
 * RealDashboard — Complete UI with 7 tabs, all reading from /api/ endpoints.
 * Zero mock data. Every number from Supabase. Every action calls a real API.
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Play, Pause, ShieldCheck, Lightning, ArrowClockwise,
  MagnifyingGlass, CurrencyDollar, ChartLineUp, Gear,
  FolderOpen, ChartBar, ClockCounterClockwise, WarningCircle,
  SignOut
} from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  useApi, apiMutate,
  type PortfolioStats, type ScanResult, type BotLog, type BotState,
  type PipelineSettings, type ReviewQueueItem, type OwnedDomain
} from '@/hooks/useApi'
import { toast } from 'sonner'

type TabKey = 'overview' | 'portfolio' | 'scans' | 'review' | 'logs' | 'analytics' | 'settings'

// ==================== HELPERS ====================

function fmtCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function fmtRoi(spent: number, profit: number): string {
  if (!spent || spent === 0) return '—'
  const pct = (profit / spent) * 100
  if (!isFinite(pct)) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

// ==================== MAIN DASHBOARD ====================

export default function RealDashboard({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useApi<PortfolioStats>('/api/portfolio?type=stats', { pollInterval: 30000 })
  const { data: scansData, loading: scansLoading, refetch: refetchScans } = useApi<{ results: ScanResult[] }>('/api/portfolio?type=scans&limit=100')
  const { data: logsData, refetch: refetchLogs } = useApi<{ logs: BotLog[] }>('/api/portfolio?type=logs&limit=200')
  const { data: settingsData, refetch: refetchSettings } = useApi<PipelineSettings>('/api/settings')
  const { data: reviewData, refetch: refetchReview } = useApi<{ items: ReviewQueueItem[] }>('/api/portfolio?type=review')
  const { data: portfolioData, loading: portfolioLoading, refetch: refetchPortfolio } = useApi<{ domains: OwnedDomain[] }>('/api/portfolio?type=portfolio&limit=500')

  const bot = statsData?.bot
  const portfolio = statsData?.portfolio
  const pendingReviewCount = reviewData?.items?.filter(i => i.status === 'pending_review').length || 0

  // Bot controls
  const handleToggleBot = async () => {
    const action = bot?.enabled ? 'disable' : 'enable'
    const { error } = await apiMutate('/api/bot-state', 'POST', { action })
    if (error) toast.error(`Failed: ${error}`)
    else { toast.success(action === 'enable' ? 'Bot Enabled' : 'Bot Disabled'); refetchStats() }
  }

  const handleToggleDryRun = async () => {
    if (bot?.dry_run) {
      const confirmed = window.confirm('This will enable REAL bidding with REAL money.\n\nThe bot will place actual bids within your spending limits.\n\nAre you sure?')
      if (!confirmed) return
    }
    const { data, error } = await apiMutate<{ dry_run: boolean }>('/api/bot-state', 'POST', { action: 'toggle_dry_run' })
    if (error) toast.error(`Failed: ${error}`)
    else { toast.success(data?.dry_run ? 'DRY RUN Enabled (Safe Mode)' : 'LIVE MODE — Real bids active'); refetchStats() }
  }

  const handleManualScan = async () => {
    toast.info('Triggering scan...')
    const { error } = await apiMutate('/api/cron/scan', 'POST', {})
    if (error) toast.error(`Scan failed: ${error}`)
    else { toast.success('Scan completed'); refetchStats(); refetchScans(); refetchLogs() }
  }

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'scans', label: 'Scans' },
    { key: 'review', label: 'Review', badge: pendingReviewCount },
    { key: 'logs', label: 'Logs' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-yellow-600">Domain Flipper</h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              {bot?.enabled
                ? <span className="text-green-400">{bot.dry_run ? 'Active (DRY RUN)' : 'Active (LIVE)'}</span>
                : <span className="text-zinc-500">Bot Inactive</span>}
              {bot?.last_scan_at && <span className="ml-2 text-zinc-600">Scanned {timeAgo(bot.last_scan_at)}</span>}
              {bot?.last_error && <span className="ml-2 text-red-400">Error: {bot.last_error.slice(0, 60)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleManualScan} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
              <ArrowClockwise size={14} className="mr-1" /> Scan Now
            </Button>
            <Button variant="outline" size="sm" onClick={handleToggleDryRun}
              className={bot?.dry_run ? 'border-yellow-600 text-yellow-500 text-xs' : 'border-red-600 text-red-500 text-xs'}>
              <ShieldCheck size={14} className="mr-1" /> {bot?.dry_run ? 'DRY RUN' : 'LIVE'}
            </Button>
            <Button size="sm" onClick={handleToggleBot}
              className={bot?.enabled ? 'bg-red-600 hover:bg-red-700 text-white text-xs' : 'bg-green-600 hover:bg-green-700 text-white text-xs'}>
              {bot?.enabled ? <><Pause size={14} className="mr-1" /> Stop</> : <><Play size={14} className="mr-1" /> Start</>}
            </Button>
            {onLogout && (
              <Button variant="outline" size="sm" onClick={onLogout} className="border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs">
                <SignOut size={14} className="mr-1" /> Logout
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1 sm:gap-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`py-3 px-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key ? 'border-yellow-600 text-yellow-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}>
              {t.label}
              {t.badge ? <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded-full">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'overview' && <OverviewTab portfolio={portfolio} bot={bot} loading={statsLoading} refetchStats={refetchStats} />}
        {activeTab === 'portfolio' && <PortfolioTab domains={portfolioData?.domains || []} loading={portfolioLoading} onRefresh={refetchPortfolio} />}
        {activeTab === 'scans' && <ScansTab results={scansData?.results || []} loading={scansLoading} onRefresh={refetchScans} />}
        {activeTab === 'review' && <ReviewTab items={reviewData?.items || []} onRefresh={refetchReview} />}
        {activeTab === 'logs' && <LogsTab logs={logsData?.logs || []} onRefresh={refetchLogs} />}
        {activeTab === 'analytics' && <AnalyticsTab portfolio={portfolio} bot={bot} domains={portfolioData?.domains || []} />}
        {activeTab === 'settings' && <SettingsTab settings={settingsData} onSave={refetchSettings} />}
      </div>
    </div>
  )
}

// ==================== OVERVIEW ====================

function OverviewTab({ portfolio: p, bot: b, loading, refetchStats }: { portfolio: PortfolioStats['portfolio'] | undefined; bot: BotState | undefined; loading: boolean; refetchStats: () => void }) {
  if (loading) return <div className="text-center py-12 text-zinc-500">Loading...</div>
  const pp = p || { totalSpent: 0, totalCurrentValue: 0, totalRevenue: 0, totalProfit: 0, activeCount: 0, soldCount: 0, totalCount: 0 }
  const bb = b || { total_scans: 0, total_bids: 0, spend_today: 0, domains_found_today: 0, scans_today: 0, bids_today: 0, total_spend: 0, total_domains_acquired: 0 } as BotState

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Portfolio Value" value={fmtCurrency(pp.totalCurrentValue)} sub={`${fmtCurrency(pp.totalSpent)} invested`} color="text-yellow-500" />
        <StatCard label="Profit" value={fmtCurrency(pp.totalProfit)} sub={fmtRoi(pp.totalSpent, pp.totalProfit)} color={pp.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'} />
        <StatCard label="Domains" value={String(pp.activeCount)} sub={`${pp.soldCount} sold`} color="text-blue-400" />
        <StatCard label="Today" value={`${bb.scans_today || 0} scans`} sub={`${bb.bids_today || 0} bids, ${fmtCurrency(bb.spend_today || 0)} spent`} color="text-purple-400" />
        <StatCard label="Lifetime" value={`${bb.total_bids || 0} bids`} sub={`${bb.total_scans || 0} scans, ${fmtCurrency(bb.total_spend || 0)}`} color="text-zinc-400" />
      </div>

      {/* Autonomous Phase Status */}
      <PhaseCard bot={bb} refetchStats={refetchStats} />

      {pp.totalCount === 0 && (bb.total_scans || 0) === 0 && (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <MagnifyingGlass size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400">No activity yet. Enable the bot to start scanning every 15 minutes.</p>
        </Card>
      )}
    </div>
  )
}

function PhaseCard({ bot, refetchStats }: { bot: BotState; refetchStats: () => void }) {
  const phase = bot.operating_phase || 'observe'
  const phaseLocked = bot.phase_locked || false

  const phaseConfig: Record<string, { label: string; color: string; bgColor: string; description: string; limits: string }> = {
    observe: {
      label: 'OBSERVE',
      color: 'text-blue-400',
      bgColor: 'bg-blue-950 border-blue-800/50',
      description: 'Bot is logging picks without spending. It will auto-promote to Cautious when pick quality is proven (7+ days, 40+ picks, AI quality >= 70).',
      limits: '$0/day — logging only',
    },
    cautious: {
      label: 'CAUTIOUS',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-950/50 border-yellow-800/50',
      description: 'Bot is buying conservatively. It will auto-promote to Scale after 30+ days with at least 1 profitable sale and revenue >= 30% of costs.',
      limits: '$40/day max (2 closeouts + 1 registration)',
    },
    scale: {
      label: 'SCALE',
      color: 'text-green-400',
      bgColor: 'bg-green-950/50 border-green-800/50',
      description: 'Bot is running at full capacity. It will auto-demote if 30-day losses exceed $500 or 60 days pass with no sales.',
      limits: '$90/day max (4 closeouts + 3 registrations)',
    },
  }

  const cfg = phaseConfig[phase] || phaseConfig.observe

  const handleToggleLock = async () => {
    const { error } = await apiMutate('/api/bot-state', 'POST', { action: 'set_phase_lock', phase_locked: !phaseLocked })
    if (error) toast.error(`Failed: ${error}`)
    else { toast.success(phaseLocked ? 'Phase unlocked — bot manages itself' : 'Phase locked — manual control'); refetchStats() }
  }

  const handleSetPhase = async (newPhase: string) => {
    if (newPhase !== 'observe' && !confirm(`Switch to ${newPhase}? The bot will start spending money.`)) return
    const { error } = await apiMutate('/api/bot-state', 'POST', { action: 'set_phase', operating_phase: newPhase })
    if (error) toast.error(`Failed: ${error}`)
    else { toast.success(`Phase set to ${newPhase}`); refetchStats() }
  }

  return (
    <Card className={`border p-4 ${cfg.bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400">Bot Phase</h3>
        <span className={`px-2 py-1 rounded text-xs font-bold ${cfg.color} bg-black/30`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-1">{cfg.description}</p>
      <p className="text-[11px] text-zinc-600 mb-3">Spend limit: {cfg.limits}</p>
      {bot.phase_change_reason && (
        <p className="text-[11px] text-zinc-600 mb-3">
          Last change: {bot.phase_change_reason}
          {bot.phase_changed_at && ` (${timeAgo(bot.phase_changed_at)})`}
        </p>
      )}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
          <input
            type="checkbox"
            checked={phaseLocked}
            onChange={handleToggleLock}
            className="rounded border-zinc-700"
          />
          Lock phase (manual control)
        </label>
      </div>
      {phaseLocked && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['observe', 'cautious', 'scale'] as const).map(p => (
            <button
              key={p}
              onClick={() => handleSetPhase(p)}
              className={`text-xs py-1.5 px-2 rounded border transition-colors ${
                phase === p ? 'border-blue-500 bg-blue-950/30 text-blue-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>
    </Card>
  )
}

// ==================== PORTFOLIO ====================

function PortfolioTab({ domains, loading, onRefresh }: { domains: OwnedDomain[]; loading: boolean; onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'price' | 'value'>('date')

  const filtered = useMemo(() => {
    let list = [...domains]
    if (filter !== 'all') list = list.filter(d => d.status === filter)
    if (search) list = list.filter(d => d.domain.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'price') list.sort((a, b) => b.purchase_price - a.purchase_price)
    else if (sort === 'value') list.sort((a, b) => (b.current_value || 0) - (a.current_value || 0))
    else list.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
    return list
  }, [domains, filter, search, sort])

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading portfolio...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {['all', 'owned', 'listed', 'sold'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-zinc-200 w-48" />
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300">
          <option value="date">Newest</option>
          <option value="price">Price</option>
          <option value="value">Value</option>
        </select>
        <Button variant="outline" size="sm" onClick={onRefresh} className="border-zinc-700 text-zinc-400 text-xs ml-auto">
          <ArrowClockwise size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <FolderOpen size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">{domains.length === 0 ? 'No domains in portfolio yet.' : 'No domains match your filters.'}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 px-2">Domain</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Bought</th>
                <th className="text-right py-2 px-2">Listed</th>
                <th className="text-right py-2 px-2">Sold</th>
                <th className="text-right py-2 px-2">P/L</th>
                <th className="text-right py-2 px-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const profit = d.sale_price ? d.sale_price - d.purchase_price : null
                return (
                  <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                    <td className="py-2 px-2 font-mono text-zinc-200">{d.domain}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        d.status === 'sold' ? 'bg-green-900 text-green-400' :
                        d.status === 'listed' ? 'bg-yellow-900 text-yellow-400' :
                        'bg-blue-900 text-blue-400'
                      }`}>{d.status}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-300">{fmtCurrency(d.purchase_price)}</td>
                    <td className="py-2 px-2 text-right text-zinc-400">{d.listed ? fmtCurrency(d.current_value) : '—'}</td>
                    <td className="py-2 px-2 text-right text-zinc-400">{d.sale_price ? fmtCurrency(d.sale_price) : '—'}</td>
                    <td className={`py-2 px-2 text-right font-medium ${profit === null ? 'text-zinc-600' : profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profit === null ? '—' : `${profit >= 0 ? '+' : ''}${fmtCurrency(profit)}`}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-600">{timeAgo(d.purchase_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-zinc-600">{filtered.length} of {domains.length} domains</p>
    </div>
  )
}

// ==================== SCANS ====================

function ScansTab({ results, loading, onRefresh }: { results: ScanResult[]; loading: boolean; onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  if (loading) return <div className="text-center py-12 text-zinc-500">Loading scans...</div>

  const filtered = filter === 'all' ? results : results.filter(r => r.decision === filter || (filter === 'would_bid' && r.decision === 'dry_run_would_bid'))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {['all', 'bid', 'would_bid', 'review', 'skip'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              {f === 'would_bid' ? 'Would Bid' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="border-zinc-700 text-zinc-400 text-xs">
          <ArrowClockwise size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <p className="text-zinc-500">No scan results{filter !== 'all' ? ` matching "${filter}"` : ''}.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map(r => (
            <Card key={r.id} className="bg-zinc-950 border-zinc-800 p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-zinc-200 text-sm truncate">{r.domain}</span>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${
                    r.decision === 'bid' ? 'bg-green-900 text-green-400' :
                    r.decision === 'dry_run_would_bid' ? 'bg-yellow-900 text-yellow-400' :
                    r.decision === 'review' ? 'bg-orange-900 text-orange-400' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>{r.decision === 'dry_run_would_bid' ? 'WOULD BID' : r.decision.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className={`font-bold ${r.total_score >= 70 ? 'text-green-400' : r.total_score >= 50 ? 'text-yellow-400' : 'text-zinc-500'}`}>{r.total_score}pts</span>
                  <span className="text-zinc-400">${r.current_price}</span>
                  <span className="text-green-400">${r.estimated_value}</span>
                  <span className="text-yellow-400">{r.roi_multiple ? `${r.roi_multiple.toFixed(1)}x` : '—'}</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 mt-1 truncate">{r.reasoning || r.decision_reason}</p>
              <div className="flex gap-2 mt-1.5">
                <ScoreBar label="Len" value={r.length_score} max={15} />
                <ScoreBar label="TLD" value={r.tld_score} max={15} />
                <ScoreBar label="Key" value={r.keyword_score} max={15} />
                <ScoreBar label="Brand" value={r.brandability_score} max={15} />
                <ScoreBar label="BL" value={r.trend_score} max={15} />
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-600">{filtered.length} results</p>
    </div>
  )
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between text-[9px] text-zinc-600"><span>{label}</span><span>{value}/{max}</span></div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-zinc-600'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ==================== REVIEW QUEUE ====================

function ReviewTab({ items, onRefresh }: { items: ReviewQueueItem[]; onRefresh: () => void }) {
  const handleAction = async (id: string, action: 'approve_review' | 'reject_review') => {
    const { error } = await apiMutate('/api/bot-state', 'POST', { action, reviewId: id })
    if (error) toast.error(`Failed: ${error}`)
    else { toast.success(action === 'approve_review' ? 'Approved' : 'Rejected'); onRefresh() }
  }

  const pending = items.filter(i => i.status === 'pending_review')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-300">Review Queue <span className="text-sm text-zinc-500">({pending.length} pending)</span></h3>
        <Button variant="outline" size="sm" onClick={onRefresh} className="border-zinc-700 text-zinc-400 text-xs">
          <ArrowClockwise size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {pending.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <WarningCircle size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No domains pending review.</p>
        </Card>
      ) : pending.map(item => (
        <Card key={item.id} className="bg-zinc-950 border-zinc-800 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono font-bold text-zinc-200">{item.domain}</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-400">REVIEW</span>
              <p className="text-xs text-zinc-400 mt-1">{item.reason}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-zinc-500">
                <span>Score: <b className="text-zinc-300">{item.total_score}</b></span>
                <span>Price: <b className="text-zinc-300">{fmtCurrency(item.current_price)}</b></span>
                <span>Est: <b className="text-green-400">{fmtCurrency(item.estimated_value)}</b></span>
                <span>Bid: <b className="text-yellow-400">{fmtCurrency(item.recommended_bid)}</b></span>
              </div>
              {item.auction_end_time && <p className="text-[10px] text-red-400 mt-1">Ends: {new Date(item.auction_end_time).toLocaleString()}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => handleAction(item.id, 'approve_review')} className="bg-green-600 hover:bg-green-700 text-white text-xs">Approve</Button>
              <Button size="sm" variant="outline" onClick={() => handleAction(item.id, 'reject_review')} className="border-red-600 text-red-400 text-xs">Reject</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ==================== LOGS ====================

function LogsTab({ logs, onRefresh }: { logs: BotLog[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  const typeColor: Record<string, string> = {
    scan_started: 'text-blue-400', scan_completed: 'text-green-400', scan_error: 'text-red-400',
    bid_placed: 'text-yellow-400', bid_error: 'text-red-400', bot_enabled: 'text-green-400',
    bot_disabled: 'text-zinc-400', spend_limit_reached: 'text-orange-400',
    warning: 'text-yellow-400', error: 'text-red-400', info: 'text-zinc-400',
  }
  const filtered = filter === 'all' ? logs : logs.filter(l => {
    if (filter === 'critical') return ['scan_error', 'bid_error', 'error', 'bid_placed'].includes(l.event_type)
    if (filter === 'warning') return ['warning', 'spend_limit_reached'].includes(l.event_type)
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {['all', 'critical', 'warning'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-full ${filter === f ? 'bg-yellow-600 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} className="border-zinc-700 text-zinc-400 text-xs">
          <ArrowClockwise size={12} className="mr-1" /> Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <ClockCounterClockwise size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No activity logged yet.</p>
        </Card>
      ) : (
        <div className="space-y-0.5 font-mono text-[11px]">
          {filtered.slice(0, 200).map(l => (
            <div key={l.id} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-zinc-900/50">
              <span className="text-zinc-700 shrink-0 w-14">{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className={`shrink-0 w-20 truncate ${typeColor[l.event_type] || 'text-zinc-500'}`}>{l.event_type}</span>
              <span className="text-zinc-400 flex-1 truncate">{l.message}</span>
              {l.domain && <span className="text-yellow-600 shrink-0">{l.domain}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== ANALYTICS ====================

function AnalyticsTab({ portfolio: p, bot: b, domains }: { portfolio: PortfolioStats['portfolio'] | undefined; bot: BotState | undefined; domains: OwnedDomain[] }) {
  const pp = p || { totalSpent: 0, totalCurrentValue: 0, totalRevenue: 0, totalProfit: 0, activeCount: 0, soldCount: 0, totalCount: 0 }
  const sold = domains.filter(d => d.sold && d.sale_price)
  const avgDaysToSell = sold.length > 0
    ? Math.round(sold.reduce((s, d) => s + (d.sale_price ? (new Date(d.sale_price ? d.purchase_date : '').getTime()) : 0), 0) / sold.length / 86400000)
    : 0

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-300">Analytics</h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Invested" value={fmtCurrency(pp.totalSpent)} sub={`${pp.totalCount} domains`} color="text-zinc-300" />
        <StatCard label="Total Revenue" value={fmtCurrency(pp.totalRevenue)} sub={`${pp.soldCount} sold`} color="text-green-400" />
        <StatCard label="Net Profit" value={fmtCurrency(pp.totalProfit)} sub={fmtRoi(pp.totalSpent, pp.totalProfit)} color={pp.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatCard label="Win Rate" value={pp.soldCount > 0 ? `${Math.round((sold.filter(d => (d.sale_price || 0) > d.purchase_price).length / sold.length) * 100)}%` : '—'} sub={`${sold.length} flips completed`} color="text-yellow-400" />
      </div>

      {sold.length > 0 ? (
        <Card className="bg-zinc-950 border-zinc-800 p-5">
          <h4 className="text-sm font-semibold text-zinc-400 mb-3">Top Flips</h4>
          <div className="space-y-2">
            {sold.sort((a, c) => ((c.sale_price || 0) - c.purchase_price) - ((a.sale_price || 0) - a.purchase_price)).slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-200">{d.domain}</span>
                <div className="flex gap-4 text-zinc-400">
                  <span>Bought: {fmtCurrency(d.purchase_price)}</span>
                  <span>Sold: {fmtCurrency(d.sale_price || 0)}</span>
                  <span className="text-green-400 font-bold">+{fmtCurrency((d.sale_price || 0) - d.purchase_price)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="bg-zinc-950 border-zinc-800 p-8 text-center">
          <ChartBar size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No completed flips yet. Analytics will populate as domains sell.</p>
        </Card>
      )}

      {/* TLD Breakdown */}
      {domains.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800 p-5">
          <h4 className="text-sm font-semibold text-zinc-400 mb-3">By TLD</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(domains.reduce<Record<string, { count: number; spent: number; revenue: number }>>((acc, d) => {
              const tld = d.tld || d.domain.split('.').pop() || '?'
              if (!acc[tld]) acc[tld] = { count: 0, spent: 0, revenue: 0 }
              acc[tld].count++
              acc[tld].spent += d.purchase_price
              if (d.sale_price) acc[tld].revenue += d.sale_price
              return acc
            }, {})).sort(([, a], [, b]) => b.count - a.count).map(([tld, s]) => (
              <div key={tld} className="flex items-center justify-between">
                <span className="text-zinc-300 font-mono">.{tld}</span>
                <span className="text-zinc-500">{s.count} domains, {fmtCurrency(s.spent)} spent, {fmtCurrency(s.revenue)} revenue</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ==================== SETTINGS ====================

function SettingsTab({ settings, onSave }: { settings: PipelineSettings | null; onSave: () => void }) {
  const [form, setForm] = useState<Partial<PipelineSettings>>(settings || {})
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await apiMutate('/api/settings', 'PUT', form as Record<string, unknown>)
    setSaving(false)
    if (error) toast.error(`Save failed: ${error}`)
    else { toast.success('Settings saved'); onSave() }
  }

  const handleTestWebhook = async () => {
    const { error } = await apiMutate('/api/settings', 'POST', { action: 'test_webhook' })
    if (error) toast.error(`Webhook test failed: ${error}`)
    else toast.success('Test notification sent — check your Discord/Slack')
  }

  const s = settings
  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-zinc-300">Pipeline Settings</h3>

      <Card className="bg-zinc-950 border-zinc-800 p-5 space-y-4">
        <h4 className="text-sm font-medium text-zinc-400">Budget & Limits</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Daily Budget ($)" type="number" value={form.max_spend_per_day ?? s?.max_spend_per_day ?? 200}
            onChange={v => setForm(f => ({ ...f, max_spend_per_day: Number(v) }))} />
          <Field label="Per-Domain Cap ($)" type="number" value={form.max_spend_per_domain ?? s?.max_spend_per_domain ?? 20}
            onChange={v => setForm(f => ({ ...f, max_spend_per_domain: Number(v) }))} />
          <Field label="Min ROI (x)" type="number" step="0.5" value={form.min_margin_multiplier ?? s?.min_margin_multiplier ?? 3.0}
            onChange={v => setForm(f => ({ ...f, min_margin_multiplier: Number(v) }))} />
        </div>

        <h4 className="text-sm font-medium text-zinc-400 pt-2">Domain Filters</h4>
        <Field label="Allowed TLDs (comma-separated)" type="text"
          value={(form.allowed_tlds ?? s?.allowed_tlds ?? ['.com', '.ai', '.io']).join(', ')}
          onChange={v => setForm(f => ({ ...f, allowed_tlds: String(v).split(',').map(t => t.trim()) }))} />
        <Field label="Registrar" type="select" options={['GoDaddy', 'Namecheap', 'Auto']}
          value={form.registrar_provider ?? s?.registrar_provider ?? 'GoDaddy'}
          onChange={v => setForm(f => ({ ...f, registrar_provider: String(v) }))} />

        <h4 className="text-sm font-medium text-zinc-400 pt-2">Notifications</h4>
        <Field label="Discord/Slack Webhook URL" type="text"
          value={form.notification_webhook ?? s?.notification_webhook ?? ''}
          onChange={v => setForm(f => ({ ...f, notification_webhook: String(v) || null }))} />
        <Button variant="outline" size="sm" onClick={handleTestWebhook} className="border-zinc-700 text-zinc-400 text-xs">
          Test Notification
        </Button>

        <div className="pt-3">
          <Button onClick={handleSave} disabled={saving} className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-sm">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, type, value, onChange, step, options }: {
  label: string; type: string; value: string | number; onChange: (v: string | number) => void; step?: string; options?: string[]
}) {
  return (
    <div>
      <label className="block text-[11px] text-zinc-500 mb-1">{label}</label>
      {type === 'select' && options ? (
        <select className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 text-sm"
          value={String(value)} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} step={step} className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-200 text-sm"
          value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} />
      )}
    </div>
  )
}
