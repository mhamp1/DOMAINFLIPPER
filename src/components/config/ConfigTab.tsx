/**
 * ConfigTab.tsx — API Configuration Interface
 * All API keys are saved to localStorage and persist across sessions
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Gear,
  Eye,
  EyeSlash,
  CheckCircle,
  XCircle,
  Rocket,
  Trash,
  FloppyDisk,
  Warning,
  Link,
  Plugs,
  LockKey,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiConfigManager, type APIConfig } from '@/lib/config/APIConfigManager'
import { healthMonitor } from '@/lib/health/HealthMonitor'
import { toast } from 'sonner'

interface APIField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'password'
  helpUrl?: string
}

interface APISection {
  name: string
  configKey: keyof APIConfig
  description: string
  required: boolean
  fields: APIField[]
  helpUrl: string
}

const API_SECTIONS: APISection[] = [
  // ===== FREE OPTIONS FIRST =====
  {
    name: '🆓 Afternic (FREE)',
    configKey: 'afternic',
    description: "GoDaddy's marketplace — FREE API for listing/bidding (no paid upgrade needed)",
    required: false,
    helpUrl: 'https://www.afternic.com/sell-domains',
    fields: [
      { key: 'accountId', label: 'Account ID', placeholder: 'Your Afternic Account ID', type: 'text' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter Afternic API Key', type: 'password' },
    ],
  },
  {
    name: '💰 Namecheap Beast Mode ($99/mo)',
    configKey: 'namecheapBeast',
    description: 'Full auctions API without upgrade — best value for serious flippers',
    required: false,
    helpUrl: 'https://www.namecheap.com/domains/marketplace/beast-mode/',
    fields: [
      { key: 'apiUser', label: 'API Username', placeholder: 'Your Namecheap username', type: 'text' },
      { key: 'apiKey', label: 'Beast Mode API Key', placeholder: 'Enter Beast Mode API Key', type: 'password' },
      { key: 'clientIp', label: 'Whitelisted IP', placeholder: 'Your whitelisted IP address', type: 'text' },
    ],
  },
  // ===== PREMIUM OPTIONS =====
  {
    name: 'GoDaddy',
    configKey: 'godaddy',
    description: 'Domain auctions and registration (requires paid API access)',
    required: false,
    helpUrl: 'https://developer.godaddy.com/keys',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter GoDaddy API Key', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'Enter GoDaddy API Secret', type: 'password' },
    ],
  },
  {
    name: 'Namecheap',
    configKey: 'namecheap',
    description: 'Alternative registrar for sniping',
    required: false,
    helpUrl: 'https://www.namecheap.com/support/api/intro/',
    fields: [
      { key: 'apiUser', label: 'API Username', placeholder: 'Your Namecheap username', type: 'text' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter Namecheap API Key', type: 'password' },
      { key: 'clientIp', label: 'Whitelisted IP', placeholder: 'Your whitelisted IP address', type: 'text' },
    ],
  },
  {
    name: 'Supabase',
    configKey: 'supabase',
    description: 'Database for storing portfolio data',
    required: false,
    helpUrl: 'https://supabase.com/dashboard',
    fields: [
      { key: 'url', label: 'Project URL', placeholder: 'https://xxxx.supabase.co', type: 'text' },
      { key: 'anonKey', label: 'Anon Key', placeholder: 'Enter Supabase Anon Key', type: 'password' },
    ],
  },
  {
    name: 'Twitter/X',
    configKey: 'twitter',
    description: 'Trending topics for lead generation',
    required: false,
    helpUrl: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { key: 'bearerToken', label: 'Bearer Token', placeholder: 'Enter Twitter Bearer Token', type: 'password' },
    ],
  },
  {
    name: 'USPTO',
    configKey: 'uspto',
    description: 'Trademark checking (optional)',
    required: false,
    helpUrl: 'https://developer.uspto.gov/',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter USPTO API Key (optional)', type: 'password' },
    ],
  },
  {
    name: 'Stripe',
    configKey: 'stripe',
    description: 'Auto-funding and payment processing',
    required: false,
    helpUrl: 'https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...', type: 'text' },
      { key: 'secretKey', label: 'Secret Key', placeholder: 'sk_live_...', type: 'password' },
    ],
  },
  {
    name: 'Web3 (ENS/Solana)',
    configKey: 'web3',
    description: 'NFT domain sniping',
    required: false,
    helpUrl: 'https://infura.io/dashboard',
    fields: [
      { key: 'infuraId', label: 'Infura Project ID', placeholder: 'Enter Infura Project ID', type: 'text' },
      { key: 'alchemyKey', label: 'Alchemy API Key', placeholder: 'Enter Alchemy API Key (optional)', type: 'password' },
    ],
  },
]

export default function ConfigTab() {
  const [config, setConfig] = useState<Record<string, Record<string, string>>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [healthStatus, setHealthStatus] = useState(apiConfigManager.getHealthStatus())

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = apiConfigManager.getAll()
    const formattedConfig: Record<string, Record<string, string>> = {}
    
    API_SECTIONS.forEach(section => {
      const sectionConfig = savedConfig[section.configKey] as Record<string, string> | undefined
      formattedConfig[section.configKey] = {}
      
      section.fields.forEach(field => {
        formattedConfig[section.configKey][field.key] = sectionConfig?.[field.key] || ''
      })
    })
    
    setConfig(formattedConfig)
    setHealthStatus(apiConfigManager.getHealthStatus())
  }, [])

  const handleFieldChange = (sectionKey: string, fieldKey: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fieldKey]: value,
      },
    }))
  }

  const togglePasswordVisibility = (sectionKey: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const saveAllConfig = async () => {
    setSaving(true)
    
    try {
      // Save each section
      API_SECTIONS.forEach(section => {
        const sectionConfig = config[section.configKey]
        if (sectionConfig && Object.values(sectionConfig).some(v => v)) {
          // Only save if at least one field has a value
          apiConfigManager.set(section.configKey, sectionConfig as any)
        }
      })
      
      setHealthStatus(apiConfigManager.getHealthStatus())
      
      toast.success('Configuration Saved!', {
        description: 'All API keys have been securely stored',
        duration: 5000,
      })
    } catch (error) {
      toast.error('Save Failed', { description: 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  const saveSectionConfig = (section: APISection) => {
    const sectionConfig = config[section.configKey]
    if (sectionConfig) {
      apiConfigManager.set(section.configKey, sectionConfig as any)
      setHealthStatus(apiConfigManager.getHealthStatus())
    }
  }

  const isConfigured = (sectionKey: keyof APIConfig): boolean => {
    return apiConfigManager.isConfigured(sectionKey)
  }

  return (
    <motion.div
      key="config"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Status Overview */}
      <Card className={`p-6 border ${healthStatus.healthy ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-600/30 bg-yellow-600/5'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {healthStatus.healthy ? (
              <CheckCircle size={32} weight="fill" className="text-green-400" />
            ) : (
              <Warning size={32} weight="fill" className="text-yellow-400" />
            )}
            <div>
              <h3 className={`text-lg font-semibold ${healthStatus.healthy ? 'text-green-400' : 'text-yellow-400'}`}>
                {healthStatus.message}
              </h3>
              <p className="text-sm text-yellow-600/60">
                {healthStatus.healthy 
                  ? 'Bot is ready to make money!' 
                  : 'Configure required APIs to start earning'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={healthStatus.healthy ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-400'}>
            {healthStatus.details.filter(d => d.startsWith('✓')).length} / {API_SECTIONS.length} Configured
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {healthStatus.details.slice(0, 8).map((detail, i) => (
            <div key={i} className={`text-xs px-2 py-1 rounded ${detail.startsWith('✓') ? 'bg-green-500/10 text-green-400' : 'bg-yellow-600/10 text-yellow-600/60'}`}>
              {detail}
            </div>
          ))}
        </div>
      </Card>

      {/* API Sections */}
      {API_SECTIONS.map((section) => (
        <Card key={section.configKey} className="card-obsidian-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConfigured(section.configKey) ? 'bg-green-500/20' : 'bg-yellow-600/20'}`}>
                {isConfigured(section.configKey) ? (
                  <CheckCircle size={24} weight="fill" className="text-green-400" />
                ) : (
                  <Plugs size={24} className="text-yellow-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 flex items-center gap-2">
                  {section.name}
                  {section.required && (
                    <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">Required</Badge>
                  )}
                </h3>
                <p className="text-sm text-yellow-600/60">{section.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={section.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-600/60 hover:text-yellow-500 flex items-center gap-1"
              >
                <Link size={14} /> Get API Key
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePasswordVisibility(section.configKey)}
                className="text-yellow-600/60 hover:text-yellow-600"
              >
                {showPasswords[section.configKey] ? <EyeSlash size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-sm text-yellow-600/70 flex items-center gap-2">
                  {field.type === 'password' && <LockKey size={14} />}
                  {field.label}
                </label>
                <input
                  type={showPasswords[section.configKey] ? 'text' : field.type}
                  value={config[section.configKey]?.[field.key] || ''}
                  onChange={(e) => handleFieldChange(section.configKey, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/20 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={() => saveSectionConfig(section)}
              size="sm"
              className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-600 border border-yellow-600/30"
            >
              <FloppyDisk size={16} className="mr-1" /> Save {section.name}
            </Button>
          </div>
        </Card>
      ))}

      {/* Save All Button */}
      <Button 
        onClick={saveAllConfig}
        disabled={saving}
        className="w-full btn-gold-premium py-4 text-lg font-bold"
      >
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Saving...
          </div>
        ) : (
          <>
            <FloppyDisk size={24} className="mr-2" />
            Save All Configuration
          </>
        )}
      </Button>

      {/* Re-run Setup Wizard */}
      <Card className="card-obsidian-premium p-6">
        <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center gap-2">
          <Rocket size={24} /> Setup Wizard
        </h3>
        <p className="text-sm text-yellow-600/60 mb-4">
          Run the setup wizard again for a guided configuration experience.
        </p>
        <Button 
          variant="outline"
          className="w-full border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10"
          onClick={() => {
            localStorage.removeItem('domainFlipper_setupComplete')
            window.location.reload()
          }}
        >
          <Rocket size={20} className="mr-2" />
          Re-run Setup Wizard
        </Button>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-red-500/5 border border-red-500/30 p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
          <Trash size={24} /> Danger Zone
        </h3>
        <p className="text-sm text-red-400/60 mb-4">
          Clear all saved credentials and settings. This will reset the app to its initial state.
        </p>
        <Button 
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
          onClick={() => {
            if (confirm('Are you sure? This will clear ALL your saved credentials and settings.')) {
              apiConfigManager.clearAll()
              localStorage.clear()
              window.location.reload()
            }
          }}
        >
          <Trash size={20} className="mr-2" />
          Reset All Data
        </Button>
      </Card>
    </motion.div>
  )
}

