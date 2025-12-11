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
import { masterConfig } from '@/lib/config/MasterConfig'
import { healthMonitor } from '@/lib/health/HealthMonitor'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { realDomainScanner } from '@/lib/scanner/RealDomainScanner'
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

// ==================== API SETUP INSTRUCTIONS ====================
const API_INSTRUCTIONS: Record<string, { steps: string[]; cost: string; priority: string }> = {
  godaddy: {
    priority: '🥇 PRIMARY — Start Here',
    cost: 'Free to create keys, pay per domain purchase',
    steps: [
      '1. Go to https://developer.godaddy.com/keys',
      '2. Log in with your GoDaddy account (create one if needed)',
      '3. Click "Create New API Key"',
      '4. Name it "DomainFlipper" and select "Production"',
      '5. Copy both the API Key and Secret immediately (Secret only shown once!)',
      '6. Paste them below and click Save',
      '⚠️ Keep your GoDaddy account funded for purchases',
    ],
  },
  namecheap: {
    priority: '🥈 SECONDARY — Expand Later',
    cost: 'Free API, requires 20+ domains or $50+ balance',
    steps: [
      '1. Go to https://www.namecheap.com/support/api/intro/',
      '2. Log in to your Namecheap account',
      '3. Enable API access in Profile → Tools → API Access',
      '4. Whitelist your IP address (find yours at whatismyip.com)',
      '5. Copy your API Key from the dashboard',
      '6. Your username is your Namecheap login username',
    ],
  },
  supabase: {
    priority: '💾 DATABASE — For Portfolio Tracking',
    cost: 'Free tier: 500MB database, 2GB bandwidth',
    steps: [
      '1. Go to https://supabase.com and sign up (free)',
      '2. Create a new project (any name)',
      '3. Go to Project Settings → API',
      '4. Copy the "Project URL" (https://xxx.supabase.co)',
      '5. Copy the "anon public" key (NOT service_role!)',
      '6. Paste both below and click Save',
    ],
  },
  google: {
    priority: '📊 INTEL — Google Trends (Expand Later)',
    cost: 'Free tier: 100 requests/day',
    steps: [
      '1. Go to https://console.cloud.google.com',
      '2. Create a new project',
      '3. Enable "Custom Search API"',
      '4. Go to Credentials → Create API Key',
      '5. Restrict key to Custom Search API (recommended)',
      '6. Copy the API key and paste below',
    ],
  },
  twitter: {
    priority: '🐦 INTEL — Trending Topics (Expand Later)',
    cost: 'Free tier: 500k tweets/month read',
    steps: [
      '1. Go to https://developer.twitter.com/en/portal/dashboard',
      '2. Apply for a Developer Account (takes 1-2 days)',
      '3. Create a new App in the Developer Portal',
      '4. Go to "Keys and Tokens"',
      '5. Generate a Bearer Token',
      '6. Copy the Bearer Token and paste below',
    ],
  },
  uspto: {
    priority: '™️ LEGAL — Trademark Check (Optional)',
    cost: 'Free',
    steps: [
      '1. Go to https://developer.uspto.gov/',
      '2. Create a free account',
      '3. Request API access (instant approval)',
      '4. Copy your API key from the dashboard',
      '5. This helps avoid buying trademarked domains',
    ],
  },
}

const API_SECTIONS: APISection[] = [
  // ===== PRIMARY — GoDaddy FIRST =====
  {
    name: '🥇 GoDaddy (PRIMARY)',
    configKey: 'godaddy',
    description: 'Your main domain source — auctions, purchases, and account balance',
    required: true,
    helpUrl: 'https://developer.godaddy.com/keys',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'e.g., abcd1234...', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'e.g., xyz789...', type: 'password' },
    ],
  },
  // ===== DATABASE =====
  {
    name: '💾 Supabase (Database)',
    configKey: 'supabase',
    description: 'Free database for storing your portfolio and flip history',
    required: false,
    helpUrl: 'https://supabase.com/dashboard',
    fields: [
      { key: 'url', label: 'Project URL', placeholder: 'https://xxxx.supabase.co', type: 'text' },
      { key: 'anonKey', label: 'Anon Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', type: 'password' },
    ],
  },
  // ===== SECONDARY — Expand Later =====
  {
    name: '🥈 Namecheap (Secondary)',
    configKey: 'namecheap',
    description: 'Alternative registrar — add after you build GoDaddy profits',
    required: false,
    helpUrl: 'https://www.namecheap.com/support/api/intro/',
    fields: [
      { key: 'apiUser', label: 'API Username', placeholder: 'Your Namecheap username', type: 'text' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter Namecheap API Key', type: 'password' },
      { key: 'clientIp', label: 'Whitelisted IP', placeholder: 'Your IP (find at whatismyip.com)', type: 'text' },
    ],
  },
  // ===== INTELLIGENCE APIs — Future Expansion =====
  {
    name: '📊 Google (Trends Intel)',
    configKey: 'google',
    description: 'Spot trending keywords before they explode — add when profitable',
    required: false,
    helpUrl: 'https://console.cloud.google.com',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter Google API Key', type: 'password' },
    ],
  },
  {
    name: '🐦 Twitter/X (Viral Intel)',
    configKey: 'twitter',
    description: 'Find viral trends and snipe related domains — add when profitable',
    required: false,
    helpUrl: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { key: 'bearerToken', label: 'Bearer Token', placeholder: 'Enter Twitter Bearer Token', type: 'password' },
    ],
  },
  {
    name: '™️ USPTO (Trademark Check)',
    configKey: 'uspto',
    description: 'Avoid buying trademarked domains — optional but recommended',
    required: false,
    helpUrl: 'https://developer.uspto.gov/',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter USPTO API Key', type: 'password' },
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
  
  // Empire Settings State - Auto-saves on change via MasterConfig
  const empireData = masterConfig.getEmpire()
  const [capital, setCapitalState] = useState(empireData.totalCapital)
  const [minROI, setMinROIState] = useState(empireData.minROI)
  const [dailyBudget, setDailyBudgetState] = useState(empireData.dailyBudget)
  const [allStrategies, setAllStrategies] = useState(empireData.allStrategiesActive)
  
  // Auto-save handlers - saves to MasterConfig (single source of truth)
  const setCapital = (value: number) => {
    setCapitalState(value)
    masterConfig.setCapital(value)
  }
  
  const setMinROI = (value: number) => {
    setMinROIState(value)
    masterConfig.setMinROI(value)
  }
  
  const setDailyBudget = (value: number) => {
    setDailyBudgetState(value)
    masterConfig.setDailyBudget(value)
  }

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
    
    // Load empire settings from MasterConfig (single source of truth)
    const empireData = masterConfig.getEmpire()
    setCapitalState(empireData.totalCapital)
    setMinROIState(empireData.minROI)
    setDailyBudgetState(empireData.dailyBudget)
    setAllStrategies(empireData.allStrategiesActive)
    
    // Load ALL 9 APIs from MasterConfig (single source of truth)
    const gdConfig = masterConfig.getGoDaddy()
    const ncConfig = masterConfig.getNamecheap()
    const sbConfig = masterConfig.getSupabase()
    const googleConfig = masterConfig.getGoogle()
    const twitterConfig = masterConfig.getTwitter()
    const usptoConfig = masterConfig.getUSPTO()
    const stripeConfig = masterConfig.getStripe()
    const infuraConfig = masterConfig.getInfura()
    const alchemyConfig = masterConfig.getAlchemy()
    
    setConfig(prev => ({
      ...prev,
      godaddy: {
        apiKey: gdConfig.apiKey || '',
        apiSecret: gdConfig.apiSecret || '',
      },
      namecheap: {
        apiUser: ncConfig.apiUser || '',
        apiKey: ncConfig.apiKey || '',
        clientIp: ncConfig.clientIp || '',
      },
      supabase: {
        url: sbConfig.url || '',
        anonKey: sbConfig.anonKey || '',
      },
      google: {
        apiKey: googleConfig.apiKey || '',
      },
      twitter: {
        bearerToken: twitterConfig.bearerToken || '',
      },
      uspto: {
        apiKey: usptoConfig.apiKey || '',
      },
      stripe: {
        publishableKey: stripeConfig.publishableKey || '',
        secretKey: stripeConfig.secretKey || '',
      },
      infura: {
        projectId: infuraConfig.projectId || '',
        mainnetUrl: infuraConfig.mainnetUrl || '',
      },
      alchemy: {
        apiKey: alchemyConfig.apiKey || '',
        ethMainnet: alchemyConfig.ethMainnet || '',
        solanaMainnet: alchemyConfig.solanaMainnet || '',
        nftApi: alchemyConfig.nftApi || '',
      },
    }))
  }, [])
  
  const saveEmpireSettings = () => {
    toast.success('Empire Settings Confirmed!', { 
      description: `Capital: $${capital} | Min ROI: ${minROI}x | Daily Budget: $${dailyBudget}` 
    })
  }

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
      // Save GoDaddy to MasterConfig (single source of truth)
      const gdConfig = config['godaddy']
      if (gdConfig?.apiKey && gdConfig?.apiSecret) {
        masterConfig.setGoDaddy(gdConfig.apiKey, gdConfig.apiSecret)
      }
      
      // Save Namecheap to MasterConfig
      const ncConfig = config['namecheap']
      if (ncConfig?.apiUser && ncConfig?.apiKey) {
        masterConfig.setNamecheap(ncConfig.apiUser, ncConfig.apiKey, ncConfig.clientIp || '')
      }
      
      // Save Supabase to MasterConfig
      const sbConfig = config['supabase']
      if (sbConfig?.url && sbConfig?.anonKey) {
        masterConfig.setSupabase(sbConfig.url, sbConfig.anonKey)
      }
      
      // Save intelligence APIs to MasterConfig
      const googleConfig = config['google']
      if (googleConfig?.apiKey) masterConfig.setGoogle(googleConfig.apiKey)
      
      const twitterConfig = config['twitter']
      if (twitterConfig?.bearerToken) masterConfig.setTwitter(twitterConfig.bearerToken)
      
      const usptoConfig = config['uspto']
      if (usptoConfig?.apiKey) masterConfig.setUSPTO(usptoConfig.apiKey)
      
      // Save Stripe to MasterConfig
      const stripeConfig = config['stripe']
      if (stripeConfig?.publishableKey && stripeConfig?.secretKey) {
        masterConfig.setStripe(stripeConfig.publishableKey, stripeConfig.secretKey)
      }
      
      // Save Infura to MasterConfig
      const infuraConfig = config['infura']
      if (infuraConfig?.projectId) {
        masterConfig.setInfura(infuraConfig.projectId, infuraConfig.mainnetUrl || '')
      }
      
      // Save Alchemy to MasterConfig
      const alchemyConfig = config['alchemy']
      if (alchemyConfig?.apiKey) {
        masterConfig.setAlchemy(
          alchemyConfig.apiKey,
          alchemyConfig.ethMainnet || '',
          alchemyConfig.solanaMainnet || '',
          alchemyConfig.nftApi || ''
        )
      }
      
      // Also save to legacy APIConfigManager for compatibility
      API_SECTIONS.forEach(section => {
        const sectionConfig = config[section.configKey]
        if (sectionConfig && Object.values(sectionConfig).some(v => v)) {
          apiConfigManager.set(section.configKey, sectionConfig as any)
        }
      })
      
      // CRITICAL: Reinitialize API clients with new credentials
      godaddyAPI.reinit()
      namecheapAPI.reinit()
      realDomainScanner.reinit()
      
      setHealthStatus(apiConfigManager.getHealthStatus())
      
      // Verify APIs are now configured
      const gdReady = godaddyAPI.isReady()
      const ncReady = namecheapAPI.isReady()
      
      console.log('✅ APIS SAVED:', { gdReady, ncReady, gdConfig, ncConfig })
      
      toast.success('Configuration Saved!', {
        description: `APIs initialized: GoDaddy ${gdReady ? '✓' : '✗'} | Namecheap ${ncReady ? '✓' : '✗'}`,
        duration: 5000,
      })
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Save Failed', { description: 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  const saveSectionConfig = (section: APISection) => {
    const sectionConfig = config[section.configKey]
    if (sectionConfig) {
      // Save to MasterConfig first (single source of truth)
      if (section.configKey === 'godaddy') {
        masterConfig.setGoDaddy(sectionConfig.apiKey || '', sectionConfig.apiSecret || '')
        godaddyAPI.reinit()
        toast.success('GoDaddy API Saved', { 
          description: godaddyAPI.isReady() ? '✓ Connected and ready' : '✗ Check your credentials' 
        })
      } else if (section.configKey === 'namecheap' || section.configKey === 'namecheapBeast') {
        masterConfig.setNamecheap(sectionConfig.apiUser || '', sectionConfig.apiKey || '', sectionConfig.clientIp || '')
        namecheapAPI.reinit()
        toast.success('Namecheap API Saved', { 
          description: namecheapAPI.isReady() ? '✓ Connected and ready' : '✗ Check your credentials' 
        })
      } else if (section.configKey === 'supabase') {
        masterConfig.setSupabase(sectionConfig.url || '', sectionConfig.anonKey || '')
        toast.success('Supabase Saved', { 
          description: masterConfig.isSupabaseConfigured() ? '✓ Database connected' : '✗ Check your credentials' 
        })
      } else if (section.configKey === 'google') {
        masterConfig.setGoogle(sectionConfig.apiKey || '')
      } else if (section.configKey === 'twitter') {
        masterConfig.setTwitter(sectionConfig.bearerToken || '')
      } else if (section.configKey === 'uspto') {
        masterConfig.setUSPTO(sectionConfig.apiKey || '')
      }
      
      // Also save to legacy APIConfigManager
      apiConfigManager.set(section.configKey, sectionConfig as any)
      
      realDomainScanner.reinit()
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

      {/* ===== EMPIRE SETTINGS (Capital, ROI, Strategies) ===== */}
      <Card className="card-obsidian-premium p-6 border-2 border-yellow-500/30">
        <h3 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2">
          💰 Empire Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Capital */}
          <div className="space-y-2">
            <label className="text-sm text-yellow-600/70 font-medium">Starting Capital ($)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={100}
              step={100}
              className="w-full px-4 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-yellow-500 text-lg font-bold focus:outline-none focus:border-yellow-500"
            />
            <p className="text-xs text-yellow-600/50">Your initial investment</p>
          </div>
          
          {/* Min ROI */}
          <div className="space-y-2">
            <label className="text-sm text-yellow-600/70 font-medium">Minimum ROI (x)</label>
            <input
              type="number"
              value={minROI}
              onChange={(e) => setMinROI(Number(e.target.value))}
              min={2}
              max={50}
              step={1}
              className="w-full px-4 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-yellow-500 text-lg font-bold focus:outline-none focus:border-yellow-500"
            />
            <p className="text-xs text-yellow-600/50">Only buy {minROI}x+ return domains</p>
          </div>
          
          {/* Daily Budget */}
          <div className="space-y-2">
            <label className="text-sm text-yellow-600/70 font-medium">Daily Budget ($)</label>
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              min={10}
              step={10}
              className="w-full px-4 py-3 bg-black/50 border border-yellow-500/30 rounded-lg text-yellow-500 text-lg font-bold focus:outline-none focus:border-yellow-500"
            />
            <p className="text-xs text-yellow-600/50">Max spend per day</p>
          </div>
        </div>
        
        {/* All Strategies Toggle */}
        <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-yellow-600/20 mb-4">
          <div>
            <p className="text-yellow-600 font-medium">Enable ALL Strategies</p>
            <p className="text-xs text-yellow-600/50">Run all strategies simultaneously for maximum profit</p>
          </div>
          <button
            onClick={() => {
              setAllStrategies(!allStrategies)
            }}
            className={`w-14 h-7 rounded-full transition-all duration-300 ${allStrategies ? 'bg-green-500' : 'bg-yellow-600/30'}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 ${allStrategies ? 'translate-x-7' : 'translate-x-0.5'}`} />
          </button>
        </div>
        
        <Button onClick={saveEmpireSettings} className="w-full btn-gold-premium py-3">
          <FloppyDisk size={20} className="mr-2" /> Save Empire Settings
        </Button>
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

          {/* Setup Instructions */}
          {API_INSTRUCTIONS[section.configKey] && (
            <div className="mb-4 p-3 bg-black/30 rounded-lg border border-yellow-600/10">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-yellow-600/20 text-yellow-500 border-0">
                  {API_INSTRUCTIONS[section.configKey].priority}
                </Badge>
                <span className="text-xs text-yellow-600/50">
                  Cost: {API_INSTRUCTIONS[section.configKey].cost}
                </span>
              </div>
              <details className="text-xs text-yellow-600/70">
                <summary className="cursor-pointer hover:text-yellow-500 font-medium">
                  📖 Click for step-by-step setup instructions
                </summary>
                <ul className="mt-2 space-y-1 pl-4">
                  {API_INSTRUCTIONS[section.configKey].steps.map((step, i) => (
                    <li key={i} className={step.startsWith('⚠️') ? 'text-yellow-400' : ''}>
                      {step}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

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

      {/* Pipeline Settings */}
      <Card className="bg-gold/5 border border-gold/20 p-6">
        <h3 className="text-lg font-semibold text-gold mb-4 flex items-center gap-2">
          <Gear size={24} weight="fill" /> Pipeline Settings
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Configure runtime knobs for the autonomous pipeline (DRY_RUN, spending limits, TLDs, marketplaces).
        </p>
        <div className="space-y-2 mb-4 p-3 bg-black/20 rounded-lg border border-gold/10">
          <div className="text-xs text-white/50">
            <div className="font-medium text-gold mb-1.5">Current Settings:</div>
            <div className="grid grid-cols-2 gap-1">
              <div>• DRY_RUN: <span className="text-green-400">ON</span></div>
              <div>• Daily Cap: <span className="text-gold">$200</span></div>
              <div>• Per-Domain: <span className="text-gold">$20</span></div>
              <div>• Min Margin: <span className="text-gold">3.0x</span></div>
            </div>
            <div className="mt-1">• TLDs: .com, .ai, .io</div>
            <div>• Marketplaces: Afternic, Dan</div>
          </div>
        </div>
        <div className="text-xs text-white/40 mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
          <strong>Note:</strong> Full settings UI is available. To access it, see docs/PIPELINE_SETTINGS.md or use the PipelineSettings component directly.
        </div>
      </Card>

      {/* Language Settings */}
      <Card className="bg-black/60 border border-cyan-500/20 p-6">
        <LanguageSelector />
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

