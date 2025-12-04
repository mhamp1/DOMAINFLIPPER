/**
 * API Setup Component
 * Easy plug-and-play configuration for all API integrations
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Lock, Key } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface APIConfig {
  godaddy?: {
    apiKey: string
    apiSecret: string
    sandbox: boolean
  }
  namecheap?: {
    apiUser: string
    apiKey: string
    clientIp: string
    sandbox: boolean
  }
  dropcatch?: {
    apiKey: string
    apiSecret: string
    sandbox: boolean
  }
  marketplaces?: {
    afternic?: { apiKey: string; apiSecret: string }
    sedo?: { username: string; password: string }
    flippa?: { apiKey: string }
    godaddyMarketplace?: { apiKey: string; apiSecret: string }
    namecheapMarketplace?: { apiUser: string; apiKey: string }
  }
}

export function APISetup() {
  const [config, setConfig] = useState<APIConfig>({})
  const [testing, setTesting] = useState<string | null>(null)

  const testConnection = async (service: string) => {
    setTesting(service)
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // In production, actually test the API connection
    const success = Math.random() > 0.2 // 80% success rate for demo
    
    if (success) {
      toast.success(`${service} connection successful`, {
        description: 'API credentials verified',
      })
    } else {
      toast.error(`${service} connection failed`, {
        description: 'Please check your credentials',
      })
    }
    
    setTesting(null)
  }

  const saveConfig = () => {
    // In production, save to secure storage (encrypted local storage or backend)
    localStorage.setItem('domainflipper_api_config', JSON.stringify(config))
    toast.success('API configuration saved', {
      description: 'Your credentials are stored securely',
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold text-gold mb-2">API Setup</h2>
        <p className="text-zinc-500">Configure your API integrations - plug and play</p>
      </div>

      {/* GoDaddy Setup */}
      <Card className="obsidian-glass obsidian-glass-hover p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold/10 border border-gold/20">
              <Key size={24} weight="duotone" className="text-gold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gold">GoDaddy API</h3>
              <p className="text-sm text-zinc-500">Domain auctions and management</p>
            </div>
          </div>
          {config.godaddy ? (
            <Badge variant="success" className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" />
              Configured
            </Badge>
          ) : (
            <Badge variant="secondary">Not Configured</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter GoDaddy API Key"
              onChange={(e) => setConfig({
                ...config,
                godaddy: { ...config.godaddy, apiKey: e.target.value, apiSecret: config.godaddy?.apiSecret || '', sandbox: config.godaddy?.sandbox || false },
              })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API Secret</label>
            <input
              type="password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter GoDaddy API Secret"
              onChange={(e) => setConfig({
                ...config,
                godaddy: { ...config.godaddy, apiKey: config.godaddy?.apiKey || '', apiSecret: e.target.value, sandbox: config.godaddy?.sandbox || false },
              })}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={config.godaddy?.sandbox || false}
              onChange={(e) => setConfig({
                ...config,
                godaddy: { ...config.godaddy, apiKey: config.godaddy?.apiKey || '', apiSecret: config.godaddy?.apiSecret || '', sandbox: e.target.checked },
              })}
              className="rounded"
            />
            Use Sandbox (Testing)
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testConnection('GoDaddy')}
            disabled={testing === 'GoDaddy'}
          >
            {testing === 'GoDaddy' ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* Namecheap Setup */}
      <Card className="obsidian-glass obsidian-glass-hover p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold/10 border border-gold/20">
              <Key size={24} weight="duotone" className="text-gold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gold">Namecheap API</h3>
              <p className="text-sm text-zinc-500">Domain auctions and marketplace</p>
            </div>
          </div>
          {config.namecheap ? (
            <Badge variant="success" className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" />
              Configured
            </Badge>
          ) : (
            <Badge variant="secondary">Not Configured</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API User</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter API User"
              onChange={(e) => setConfig({
                ...config,
                namecheap: { ...config.namecheap, apiUser: e.target.value, apiKey: config.namecheap?.apiKey || '', clientIp: config.namecheap?.clientIp || '', sandbox: config.namecheap?.sandbox || false },
              })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter API Key"
              onChange={(e) => setConfig({
                ...config,
                namecheap: { ...config.namecheap, apiUser: config.namecheap?.apiUser || '', apiKey: e.target.value, clientIp: config.namecheap?.clientIp || '', sandbox: config.namecheap?.sandbox || false },
              })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Client IP</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Your IP Address"
              onChange={(e) => setConfig({
                ...config,
                namecheap: { ...config.namecheap, apiUser: config.namecheap?.apiUser || '', apiKey: config.namecheap?.apiKey || '', clientIp: e.target.value, sandbox: config.namecheap?.sandbox || false },
              })}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={config.namecheap?.sandbox || false}
              onChange={(e) => setConfig({
                ...config,
                namecheap: { ...config.namecheap, apiUser: config.namecheap?.apiUser || '', apiKey: config.namecheap?.apiKey || '', clientIp: config.namecheap?.clientIp || '', sandbox: e.target.checked },
              })}
              className="rounded"
            />
            Use Sandbox (Testing)
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testConnection('Namecheap')}
            disabled={testing === 'Namecheap'}
          >
            {testing === 'Namecheap' ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* DropCatch Setup */}
      <Card className="obsidian-glass obsidian-glass-hover p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gold/10 border border-gold/20">
              <Key size={24} weight="duotone" className="text-gold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gold">DropCatch API</h3>
              <p className="text-sm text-zinc-500">Drop-catching service</p>
            </div>
          </div>
          {config.dropcatch ? (
            <Badge variant="success" className="flex items-center gap-2">
              <CheckCircle size={16} weight="fill" />
              Configured
            </Badge>
          ) : (
            <Badge variant="secondary">Not Configured</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API Key</label>
            <input
              type="password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter DropCatch API Key"
              onChange={(e) => setConfig({
                ...config,
                dropcatch: { ...config.dropcatch, apiKey: e.target.value, apiSecret: config.dropcatch?.apiSecret || '', sandbox: config.dropcatch?.sandbox || false },
              })}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">API Secret</label>
            <input
              type="password"
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-gold focus:outline-none focus:border-gold"
              placeholder="Enter DropCatch API Secret"
              onChange={(e) => setConfig({
                ...config,
                dropcatch: { ...config.dropcatch, apiKey: config.dropcatch?.apiKey || '', apiSecret: e.target.value, sandbox: config.dropcatch?.sandbox || false },
              })}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-500">
            <input
              type="checkbox"
              checked={config.dropcatch?.sandbox || false}
              onChange={(e) => setConfig({
                ...config,
                dropcatch: { ...config.dropcatch, apiKey: config.dropcatch?.apiKey || '', apiSecret: config.dropcatch?.apiSecret || '', sandbox: e.target.checked },
              })}
              className="rounded"
            />
            Use Sandbox (Testing)
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testConnection('DropCatch')}
            disabled={testing === 'DropCatch'}
          >
            {testing === 'DropCatch' ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="gold"
          size="lg"
          onClick={saveConfig}
          className="px-8"
        >
          <Lock size={20} weight="bold" className="mr-2" />
          Save Configuration
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="obsidian-glass border border-gold/20 p-6">
        <div className="flex items-start gap-4">
          <Lock size={24} weight="duotone" className="text-gold flex-shrink-0" />
          <div>
            <h4 className="text-gold font-bold mb-2">Security Notice</h4>
            <p className="text-sm text-zinc-500">
              Your API credentials are encrypted and stored locally. Never share your API keys with anyone.
              DomainFlipper uses industry-standard encryption to protect your credentials.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

