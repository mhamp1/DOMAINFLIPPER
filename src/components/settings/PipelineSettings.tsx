/**
 * PipelineSettings.tsx - UI for configurable pipeline settings
 * Plug-and-play settings component with validation and confirmation
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gear,
  ShieldCheck,
  Lightning,
  Warning,
  CheckCircle,
  XCircle,
  ArrowClockwise,
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  pipelineSettings,
  type PipelineSettings,
  type AllowedTLD,
  type RegistrarProvider,
  type MarketplaceChannel,
} from '@/lib/config/settingsService'
import { toast } from 'sonner'

export function PipelineSettingsPanel() {
  const [settings, setSettings] = useState<PipelineSettings | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDryRunConfirm, setShowDryRunConfirm] = useState(false)
  const [tempDryRunValue, setTempDryRunValue] = useState(true)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      await pipelineSettings.waitForInitialization()
      setSettings(pipelineSettings.getSettings())
    }

    loadSettings()

    // Subscribe to settings changes
    const unsubscribe = pipelineSettings.subscribe(newSettings => {
      setSettings(newSettings)
      setIsDirty(false)
    })

    return unsubscribe
  }, [])

  // Update local state when changing a setting
  const updateSetting = <K extends keyof PipelineSettings>(
    key: K,
    value: PipelineSettings[K]
  ) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setIsDirty(true)
  }

  // Handle DRY_RUN toggle with confirmation
  const handleDryRunToggle = (newValue: boolean) => {
    if (!newValue) {
      // Disabling DRY_RUN requires confirmation
      setTempDryRunValue(newValue)
      setShowDryRunConfirm(true)
    } else {
      // Enabling DRY_RUN is always safe
      updateSetting('dryRun', true)
    }
  }

  const confirmDryRunDisable = () => {
    updateSetting('dryRun', tempDryRunValue)
    setShowDryRunConfirm(false)
  }

  const cancelDryRunDisable = () => {
    setShowDryRunConfirm(false)
    setTempDryRunValue(true)
  }

  // Save settings
  const handleSave = async () => {
    if (!settings || !isDirty) return

    setIsSaving(true)
    try {
      const result = await pipelineSettings.updateSettings(settings)
      
      if (result.success) {
        toast.success('Settings Saved', {
          description: 'Pipeline configuration updated successfully',
        })
        setIsDirty(false)
      } else {
        toast.error('Failed to Save', {
          description: result.error || 'Unknown error',
        })
      }
    } catch (error) {
      toast.error('Save Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = async () => {
    setIsSaving(true)
    try {
      const result = await pipelineSettings.resetToDefaults()
      
      if (result.success) {
        toast.success('Settings Reset', {
          description: 'Restored to safe defaults',
        })
      } else {
        toast.error('Reset Failed', {
          description: result.error || 'Unknown error',
        })
      }
    } catch (error) {
      toast.error('Reset Failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle TLD
  const toggleTLD = (tld: AllowedTLD) => {
    if (!settings) return
    const current = settings.allowedTLDs
    const newTLDs = current.includes(tld)
      ? current.filter(t => t !== tld)
      : [...current, tld]
    
    if (newTLDs.length === 0) {
      toast.error('Invalid Selection', {
        description: 'At least one TLD must be selected',
      })
      return
    }
    
    updateSetting('allowedTLDs', newTLDs)
  }

  // Toggle marketplace
  const toggleMarketplace = (channel: MarketplaceChannel) => {
    if (!settings) return
    const current = settings.marketplaceChannels
    const newChannels = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel]
    
    if (newChannels.length === 0) {
      toast.error('Invalid Selection', {
        description: 'At least one marketplace must be selected',
      })
      return
    }
    
    updateSetting('marketplaceChannels', newChannels)
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold animate-pulse">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gear size={32} className="text-gold" weight="duotone" />
          <div>
            <h2 className="text-2xl font-bold text-white">Pipeline Settings</h2>
            <p className="text-sm text-white/60">Configure runtime knobs and guardrails</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="border-gold text-gold">
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            disabled={isSaving}
            className="gap-2"
          >
            <ArrowClockwise size={16} />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* DRY RUN WARNING */}
      {!settings.dryRun && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Warning size={24} className="text-red-500 flex-shrink-0 mt-0.5" weight="fill" />
            <div>
              <div className="font-bold text-red-500 mb-1">LIVE MODE ACTIVE</div>
              <div className="text-sm text-white/80">
                Real purchases will be made. Ensure sufficient funds and monitor closely.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Core Settings */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold">
              <ShieldCheck size={20} weight="duotone" />
              Safety Controls
            </CardTitle>
            <CardDescription>Core safety and operation mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DRY RUN Toggle */}
            <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
              <div>
                <div className="font-medium text-white">DRY RUN Mode</div>
                <div className="text-xs text-white/60">
                  {settings.dryRun ? 'No real purchases' : 'Live purchases enabled'}
                </div>
              </div>
              <Switch
                checked={settings.dryRun}
                onCheckedChange={handleDryRunToggle}
              />
            </div>

            {/* Registrar Provider */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Registrar Provider
              </label>
              <select
                value={settings.registrarProvider}
                onChange={e => updateSetting('registrarProvider', e.target.value as RegistrarProvider)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="GoDaddy">GoDaddy</option>
                <option value="Namecheap">Namecheap</option>
                <option value="Auto">Auto (Best Price)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Spending Limits */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gold">
              <Lightning size={20} weight="duotone" />
              Spending Limits
            </CardTitle>
            <CardDescription>Budget caps and constraints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily Cap */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Max Spend Per Day: ${settings.maxSpendPerDay}
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={settings.maxSpendPerDay}
                onChange={e => updateSetting('maxSpendPerDay', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>$50</span>
                <span>$1,000</span>
              </div>
            </div>

            {/* Per-Domain Cap */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Max Spend Per Domain: ${settings.maxSpendPerDomain}
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={settings.maxSpendPerDomain}
                onChange={e => updateSetting('maxSpendPerDomain', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>$5</span>
                <span>$100</span>
              </div>
            </div>

            {/* Min Margin */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">
                Min Margin: {settings.minMarginMultiplier.toFixed(1)}x
              </label>
              <input
                type="range"
                min="1.5"
                max="10"
                step="0.5"
                value={settings.minMarginMultiplier}
                onChange={e => updateSetting('minMarginMultiplier', parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-white/40">
                <span>1.5x</span>
                <span>10x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TLD Selection */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-gold">Allowed TLDs</CardTitle>
            <CardDescription>Domain extensions to consider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['.com', '.ai', '.io', '.net', '.org', '.co'].map(tld => (
                <button
                  key={tld}
                  onClick={() => toggleTLD(tld as AllowedTLD)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    settings.allowedTLDs.includes(tld as AllowedTLD)
                      ? 'bg-gold text-black border-gold'
                      : 'bg-black/20 text-white/60 border-white/10 hover:border-gold/50'
                  }`}
                >
                  {tld}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Marketplace Channels */}
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-gold">Marketplace Channels</CardTitle>
            <CardDescription>Where to list acquired domains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Afternic', 'Dan', 'Sedo', 'Flippa', 'GoDaddy'].map(channel => (
                <button
                  key={channel}
                  onClick={() => toggleMarketplace(channel as MarketplaceChannel)}
                  className={`px-3 py-1.5 rounded-lg border transition-all ${
                    settings.marketplaceChannels.includes(channel as MarketplaceChannel)
                      ? 'bg-gold text-black border-gold'
                      : 'bg-black/20 text-white/60 border-white/10 hover:border-gold/50'
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert Webhook */}
        <Card className="bg-black/40 border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-gold">Alert Webhook</CardTitle>
            <CardDescription>Receive notifications for important events</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={settings.alertWebhookUrl || ''}
              onChange={e => updateSetting('alertWebhookUrl', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/30"
            />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-sm text-white/60">
          {settings.lastUpdated && (
            <>Last updated: {new Date(settings.lastUpdated).toLocaleString()}</>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="bg-gold text-black hover:bg-gold/90 px-8"
          size="lg"
        >
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <CheckCircle size={20} className="mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* DRY RUN Confirmation Modal */}
      <AnimatePresence>
        {showDryRunConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelDryRunDisable}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-red-500/20 to-black border border-red-500/50 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-start gap-4 mb-4">
                <Warning size={32} className="text-red-500 flex-shrink-0" weight="fill" />
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Disable DRY RUN Mode?
                  </h3>
                  <p className="text-white/80 text-sm">
                    This will enable <strong>REAL PURCHASES</strong> using real money. The system
                    will start acquiring domains immediately based on the configured settings.
                  </p>
                  <p className="text-white/80 text-sm mt-2">
                    Make sure you have sufficient funds and have reviewed all settings carefully.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={cancelDryRunDisable}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle size={18} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={confirmDryRunDisable}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <CheckCircle size={18} className="mr-2" />
                  Enable Live Mode
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
