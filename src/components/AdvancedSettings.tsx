/**
 * AdvancedSettings.tsx — Advanced Features Configuration
 * December 2025
 * 
 * UI controls for:
 * - Brandability/NLP scoring
 * - Seasonal/recency trends
 * - Channel performance
 * - Outbound suggestions (opt-in with confirmation)
 * - Registrar optimization
 * - Safety guardrails (DRY_RUN with confirmation)
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkle,
  ChartLine,
  Megaphone,
  Lightning,
  Shield,
  CheckCircle,
  Warning,
  Globe,
  Brain,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { masterConfig } from '@/lib/config/MasterConfig'
import { brandabilityScorer } from '@/lib/intelligence/brandabilityScorer'
import { seasonalTrendAnalyzer } from '@/lib/intelligence/seasonalTrendAnalyzer'
import { channelPerformanceTracker } from '@/lib/marketplace/channelPerformanceTracker'
import { outboundBuyerMatcher } from '@/lib/marketplace/outboundBuyerMatcher'
import { registrarOptimizer } from '@/lib/buy/registrarOptimizer'
import { toast } from 'sonner'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  warning?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmationDialog({ isOpen, title, message, warning, onConfirm, onCancel }: ConfirmationDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-yellow-500/50 rounded-lg p-6 max-w-md mx-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <Warning className="w-8 h-8 text-yellow-500" />
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        
        <p className="text-gray-300 mb-4">{message}</p>
        
        {warning && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">
            <p className="text-red-400 text-sm">{warning}</p>
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            className="bg-gray-700 hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
          >
            Confirm
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export function AdvancedSettings() {
  const [settings, setSettings] = useState(() => masterConfig.getAdvancedSettings())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'dry-run' | 'outbound' | null
    action: boolean
  }>({ isOpen: false, type: null, action: false })

  const handleBrandabilityToggle = (enabled: boolean) => {
    masterConfig.updateBrandabilitySettings({ enabled })
    setSettings(masterConfig.getAdvancedSettings())
    brandabilityScorer.updateConfig({ minScore: enabled ? 60 : 0 })
    toast.success(enabled ? 'Brandability Scoring Enabled' : 'Brandability Scoring Disabled')
  }

  const handleSeasonalToggle = (enabled: boolean) => {
    masterConfig.updateSeasonalSettings({ enabled })
    setSettings(masterConfig.getAdvancedSettings())
    toast.success(enabled ? 'Seasonal Analysis Enabled' : 'Seasonal Analysis Disabled')
  }

  const handleChannelToggle = (enabled: boolean) => {
    masterConfig.updateChannelPerformanceSettings({ enabled })
    setSettings(masterConfig.getAdvancedSettings())
    toast.success(enabled ? 'Channel Tracking Enabled' : 'Channel Tracking Disabled')
  }

  const handleOutboundToggle = (enabled: boolean) => {
    if (enabled) {
      // Require confirmation to enable
      setConfirmDialog({ isOpen: true, type: 'outbound', action: true })
    } else {
      masterConfig.updateOutboundSettings({ enabled: false })
      outboundBuyerMatcher.updateConfig({ enabled: false })
      setSettings(masterConfig.getAdvancedSettings())
    }
  }

  const handleDryRunToggle = (enabled: boolean) => {
    if (!enabled) {
      // Require confirmation to disable DRY_RUN
      setConfirmDialog({ isOpen: true, type: 'dry-run', action: false })
    } else {
      masterConfig.updateSafetySettings({ dryRun: true })
      registrarOptimizer.updateSafetyConfig({ dryRun: true })
      setSettings(masterConfig.getAdvancedSettings())
    }
  }

  const handleConfirm = () => {
    if (confirmDialog.type === 'dry-run' && !confirmDialog.action) {
      // Disable DRY_RUN (enable real purchases)
      masterConfig.updateSafetySettings({ dryRun: false })
      registrarOptimizer.updateSafetyConfig({ dryRun: false })
      setSettings(masterConfig.getAdvancedSettings())
    } else if (confirmDialog.type === 'outbound' && confirmDialog.action) {
      // Enable outbound
      masterConfig.updateOutboundSettings({ enabled: true })
      outboundBuyerMatcher.updateConfig({ enabled: true })
      setSettings(masterConfig.getAdvancedSettings())
    }
    setConfirmDialog({ isOpen: false, type: null, action: false })
  }

  const handleCancel = () => {
    setConfirmDialog({ isOpen: false, type: null, action: false })
  }

  const handleBrandabilityMinScore = (value: number[]) => {
    masterConfig.updateBrandabilitySettings({ minScore: value[0] })
    brandabilityScorer.updateConfig({ minScore: value[0] })
    setSettings(masterConfig.getAdvancedSettings())
  }

  const handleSeasonalWindow = (value: number[]) => {
    masterConfig.updateSeasonalSettings({ windowDays: value[0] })
    seasonalTrendAnalyzer.updateConfig({ windowDays: value[0] })
    setSettings(masterConfig.getAdvancedSettings())
  }

  const handleDailyCap = (value: number[]) => {
    masterConfig.updateSafetySettings({ dailyCapUSD: value[0] })
    registrarOptimizer.updateSafetyConfig({ dailyCapUSD: value[0] })
    setSettings(masterConfig.getAdvancedSettings())
  }

  const handlePerDomainCap = (value: number[]) => {
    masterConfig.updateSafetySettings({ perDomainCapUSD: value[0] })
    registrarOptimizer.updateSafetyConfig({ perDomainCapUSD: value[0] })
    setSettings(masterConfig.getAdvancedSettings())
  }

  const handleMinMargin = (value: number[]) => {
    masterConfig.updateSafetySettings({ minMargin: value[0] / 10 })
    registrarOptimizer.updateSafetyConfig({ minMargin: value[0] / 10 })
    setSettings(masterConfig.getAdvancedSettings())
  }

  const handleRegistrarChange = (registrar: 'GoDaddy' | 'Namecheap' | 'DropCatch') => {
    masterConfig.updateRegistrarSettings({ defaultRegistrar: registrar })
    setSettings(masterConfig.getAdvancedSettings())
    toast.success(`Default Registrar: ${registrar}`)
  }

  return (
    <div className="space-y-6">
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.type === 'dry-run' 
            ? '⚠️ Disable DRY_RUN Mode?' 
            : '⚠️ Enable Outbound Suggestions?'
        }
        message={
          confirmDialog.type === 'dry-run'
            ? 'This will enable REAL domain purchases with real money. All safety guardrails will still apply (caps, margins, TLD allowlist).'
            : 'This will enable buyer suggestions. No messages will be sent automatically - you must manually approve each outreach.'
        }
        warning={
          confirmDialog.type === 'dry-run'
            ? '🚨 Real purchases will be made. Make sure your budget and caps are set correctly!'
            : undefined
        }
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Brandability/NLP Scoring */}
      <Card className="bg-gray-900/50 border-purple-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkle className="w-6 h-6 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Brandability Scoring</h3>
              <p className="text-sm text-gray-400">AI-powered domain quality analysis</p>
            </div>
          </div>
          <Switch
            checked={settings.brandability.enabled}
            onCheckedChange={handleBrandabilityToggle}
          />
        </div>

        {settings.brandability.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 mt-4"
          >
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Minimum Score</span>
                <span className="text-white font-mono">{settings.brandability.minScore}</span>
              </div>
              <Slider
                value={[settings.brandability.minScore]}
                onValueChange={handleBrandabilityMinScore}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Profanity Filter</span>
                <Badge variant={settings.brandability.penalizeProfanity ? 'default' : 'secondary'}>
                  {settings.brandability.penalizeProfanity ? 'ON' : 'OFF'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Trademark Filter</span>
                <Badge variant={settings.brandability.penalizeTrademark ? 'default' : 'secondary'}>
                  {settings.brandability.penalizeTrademark ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Seasonal Trends */}
      <Card className="bg-gray-900/50 border-blue-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ChartLine className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Seasonal Trend Analysis</h3>
              <p className="text-sm text-gray-400">Recency-weighted trend scoring</p>
            </div>
          </div>
          <Switch
            checked={settings.seasonal.enabled}
            onCheckedChange={handleSeasonalToggle}
          />
        </div>

        {settings.seasonal.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4 mt-4"
          >
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Analysis Window</span>
                <span className="text-white font-mono">{settings.seasonal.windowDays} days</span>
              </div>
              <Slider
                value={[settings.seasonal.windowDays]}
                onValueChange={handleSeasonalWindow}
                min={7}
                max={90}
                step={7}
                className="w-full"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Spike Filter</span>
              <Badge variant={settings.seasonal.enableSpikeFilter ? 'default' : 'secondary'}>
                {settings.seasonal.enableSpikeFilter ? 'ON' : 'OFF'}
              </Badge>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Channel Performance */}
      <Card className="bg-gray-900/50 border-green-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Channel Performance</h3>
              <p className="text-sm text-gray-400">Track conversion by marketplace</p>
            </div>
          </div>
          <Switch
            checked={settings.channelPerformance.enabled}
            onCheckedChange={handleChannelToggle}
          />
        </div>

        {settings.channelPerformance.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 mt-4"
          >
            {settings.channelPerformance.channels.map((channel) => (
              <div
                key={channel.name}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${channel.enabled ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className="text-white">{channel.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{(channel.commission * 100).toFixed(0)}% fee</span>
                  <span>·</span>
                  <span>Reprice: {channel.repricingCadenceDays}d</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </Card>

      {/* Outbound Suggestions */}
      <Card className="bg-gray-900/50 border-yellow-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-yellow-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Outbound Suggestions</h3>
              <p className="text-sm text-gray-400">Match domains to buyers (opt-in)</p>
            </div>
          </div>
          <Switch
            checked={settings.outbound.enabled}
            onCheckedChange={handleOutboundToggle}
          />
        </div>

        {settings.outbound.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
              <p className="text-yellow-400 text-sm">
                ✓ Manual approval required for all outreach<br />
                ✓ No auto-send - you control everything<br />
                ✓ Export suggestions to CSV
              </p>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Registrar & Safety */}
      <Card className="bg-gray-900/50 border-red-500/30 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-bold text-white">Safety Guardrails</h3>
            <p className="text-sm text-gray-400">Purchase limits and protection</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* DRY_RUN Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded border border-red-500/30">
            <div className="flex items-center gap-3">
              <Warning className="w-5 h-5 text-red-400" />
              <div>
                <span className="text-white font-bold">DRY_RUN Mode</span>
                <p className="text-xs text-gray-400">Disable to make real purchases</p>
              </div>
            </div>
            <Switch
              checked={settings.safety.dryRun}
              onCheckedChange={handleDryRunToggle}
            />
          </div>

          {/* Spending Caps */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Daily Cap</span>
              <span className="text-white font-mono">${settings.safety.dailyCapUSD}</span>
            </div>
            <Slider
              value={[settings.safety.dailyCapUSD]}
              onValueChange={handleDailyCap}
              min={50}
              max={1000}
              step={50}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Per-Domain Cap</span>
              <span className="text-white font-mono">${settings.safety.perDomainCapUSD}</span>
            </div>
            <Slider
              value={[settings.safety.perDomainCapUSD]}
              onValueChange={handlePerDomainCap}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Minimum Margin</span>
              <span className="text-white font-mono">{settings.safety.minMargin.toFixed(1)}x</span>
            </div>
            <Slider
              value={[settings.safety.minMargin * 10]}
              onValueChange={handleMinMargin}
              min={20}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Registrar Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Default Registrar</label>
            <div className="flex gap-2">
              {(['GoDaddy', 'Namecheap', 'DropCatch'] as const).map((reg) => (
                <Button
                  key={reg}
                  onClick={() => handleRegistrarChange(reg)}
                  className={`flex-1 ${
                    settings.registrar.defaultRegistrar === reg
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {reg}
                </Button>
              ))}
            </div>
          </div>

          {/* TLD Allowlist */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Allowed TLDs</label>
            <div className="flex flex-wrap gap-2">
              {settings.safety.allowedTLDs.map((tld) => (
                <Badge key={tld} variant="default">
                  {tld}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Status Summary</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400">Brandability</p>
            <p className="text-white font-bold">{settings.brandability.enabled ? '✓ Active' : '✗ Off'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Seasonal</p>
            <p className="text-white font-bold">{settings.seasonal.enabled ? '✓ Active' : '✗ Off'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Channel Track</p>
            <p className="text-white font-bold">{settings.channelPerformance.enabled ? '✓ Active' : '✗ Off'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Outbound</p>
            <p className="text-white font-bold">{settings.outbound.enabled ? '✓ Active' : '✗ Off'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Mode</p>
            <p className={`font-bold ${settings.safety.dryRun ? 'text-green-400' : 'text-red-400'}`}>
              {settings.safety.dryRun ? 'DRY RUN' : 'LIVE'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Daily Budget</p>
            <p className="text-white font-bold">${settings.safety.dailyCapUSD}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Min Margin</p>
            <p className="text-white font-bold">{settings.safety.minMargin.toFixed(1)}x</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Registrar</p>
            <p className="text-white font-bold">{settings.registrar.defaultRegistrar}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
