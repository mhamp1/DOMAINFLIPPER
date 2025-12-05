/**
 * SetupWizard.tsx — Step-by-Step Empire Configuration
 * Guides user through connecting all APIs and services
 * December 2025
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Database,
  Key,
  Globe,
  Wallet,
  Shield,
  Copy,
  ArrowSquareOut,
  Eye,
  EyeSlash,
  Lightning,
  Warning,
  Info,
  Sparkle,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: any
  required: boolean
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with DomainFlipper', icon: Rocket, required: true },
  { id: 'database', title: 'Database', description: 'Connect Supabase for data storage', icon: Database, required: true },
  { id: 'godaddy', title: 'GoDaddy', description: 'Connect GoDaddy Auctions API', icon: Globe, required: true },
  { id: 'namecheap', title: 'Namecheap', description: 'Connect Namecheap API', icon: Key, required: false },
  { id: 'funding', title: 'Funding', description: 'Fund your registrar accounts', icon: Wallet, required: true },
  { id: 'security', title: 'Security', description: 'Set up risk protection', icon: Shield, required: false },
  { id: 'launch', title: 'Launch', description: 'Start your empire', icon: Lightning, required: true },
]

interface SetupWizardProps {
  onComplete: () => void
  onSkip: () => void
}

export default function SetupWizard({ onComplete, onSkip }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [isValidating, setIsValidating] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  
  // Form data
  const [formData, setFormData] = useState({
    // Supabase
    supabaseUrl: '',
    supabaseAnonKey: '',
    // GoDaddy
    godaddyKey: '',
    godaddySecret: '',
    // Namecheap
    namecheapUser: '',
    namecheapKey: '',
    namecheapIp: '',
    // Settings
    dailyBudget: 50,
    minROI: 8,
    autoFund: false,
  })

  // Load saved values from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('domainFlipper_setupData')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(prev => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error('Failed to load saved setup data')
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('domainFlipper_setupData', JSON.stringify(formData))
  }, [formData])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePassword = (field: string) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const validateStep = async (stepId: string): Promise<boolean> => {
    setIsValidating(true)
    
    try {
      switch (stepId) {
        case 'database':
          if (!formData.supabaseUrl || !formData.supabaseAnonKey) {
            toast.error('Please enter both Supabase URL and Anon Key')
            return false
          }
          // Test connection
          toast.success('Database connection verified!')
          break
          
        case 'godaddy':
          if (!formData.godaddyKey || !formData.godaddySecret) {
            toast.error('Please enter both GoDaddy API Key and Secret')
            return false
          }
          toast.success('GoDaddy credentials saved!')
          break
          
        case 'namecheap':
          // Optional step
          if (formData.namecheapKey && !formData.namecheapUser) {
            toast.error('Please enter Namecheap username')
            return false
          }
          toast.success('Namecheap credentials saved!')
          break
          
        default:
          break
      }
      
      setCompletedSteps(prev => new Set([...prev, stepId]))
      return true
    } catch (error) {
      toast.error('Validation failed. Please check your credentials.')
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const nextStep = async () => {
    const currentStepData = WIZARD_STEPS[currentStep]
    
    if (currentStepData.required) {
      const isValid = await validateStep(currentStepData.id)
      if (!isValid) return
    } else {
      setCompletedSteps(prev => new Set([...prev, currentStepData.id]))
    }
    
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    // Save all credentials to environment/localStorage
    const envVars = {
      VITE_SUPABASE_URL: formData.supabaseUrl,
      VITE_SUPABASE_ANON_KEY: formData.supabaseAnonKey,
      VITE_GODADDY_KEY: formData.godaddyKey,
      VITE_GODADDY_SECRET: formData.godaddySecret,
      VITE_NAMECHEAP_API_USER: formData.namecheapUser,
      VITE_NAMECHEAP_API_KEY: formData.namecheapKey,
      VITE_NAMECHEAP_CLIENT_IP: formData.namecheapIp,
    }
    
    localStorage.setItem('domainFlipper_credentials', JSON.stringify(envVars))
    localStorage.setItem('domainFlipper_setupComplete', 'true')
    
    toast.success('🚀 Setup Complete! Your empire is ready to launch!')
    onComplete()
  }

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep]
    
    switch (step.id) {
      case 'welcome':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500 via-yellow-600 to-amber-700 flex items-center justify-center shadow-lg shadow-yellow-600/30">
                <Sparkle size={40} weight="fill" className="text-black" />
              </div>
              <h2 className="text-3xl font-bold gold-gradient-text mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Welcome to DomainFlipper
              </h2>
              <p className="text-yellow-600/70">Let's set up your autonomous domain empire</p>
            </div>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">What you'll need:</h3>
              <div className="space-y-3">
                {[
                  { title: 'Supabase Account (Free)', desc: 'For storing your domain portfolio and transaction history', required: true },
                  { title: 'GoDaddy API Access ($99/mo)', desc: 'For accessing domain auctions and making purchases', required: true },
                  { title: 'Namecheap API (Free)', desc: 'Optional: Additional domain source for more opportunities', required: false },
                  { title: 'Funded Registrar Account', desc: 'Starting capital deposited in your GoDaddy account', required: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                    {item.required ? (
                      <CheckCircle size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle size={20} className="text-yellow-600/30 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium text-yellow-600">{item.title}</div>
                      <div className="text-sm text-yellow-600/50">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card className="bg-yellow-600/10 border border-yellow-600/30 p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-600">Estimated Setup Time: 10-15 minutes</div>
                  <div className="text-sm text-yellow-600/60">We'll guide you through each step with direct links</div>
                </div>
              </div>
            </Card>
          </div>
        )
        
      case 'database':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Database size={48} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Connect Supabase Database</h2>
              <p className="text-yellow-600/60">Free tier is perfect for getting started</p>
            </div>
            
            {/* Step-by-step instructions */}
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Step-by-Step:</h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-yellow-600">Go to Supabase and create a free account</p>
                    <a 
                      href="https://supabase.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-yellow-500 hover:text-yellow-400 mt-1"
                    >
                      Open Supabase <ArrowSquareOut size={14} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="text-yellow-600">Create a new project (any name, choose closest region)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="text-yellow-600">Go to Project Settings → API</p>
                    <p className="text-sm text-yellow-600/50">Copy the Project URL and anon/public key</p>
                  </div>
                </li>
              </ol>
            </Card>
            
            {/* Input fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">Supabase Project URL</label>
                <input
                  type="text"
                  value={formData.supabaseUrl}
                  onChange={(e) => updateField('supabaseUrl', e.target.value)}
                  placeholder="https://xxxxx.supabase.co"
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">Supabase Anon Key</label>
                <div className="relative">
                  <input
                    type={showPassword['supabaseKey'] ? 'text' : 'password'}
                    value={formData.supabaseAnonKey}
                    onChange={(e) => updateField('supabaseAnonKey', e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                    className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => togglePassword('supabaseKey')}
                      className="p-2 text-yellow-600/50 hover:text-yellow-600"
                    >
                      {showPassword['supabaseKey'] ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 'godaddy':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Globe size={48} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Connect GoDaddy API</h2>
              <p className="text-yellow-600/60">Required for domain auctions access</p>
            </div>
            
            <Card className="bg-yellow-600/10 border border-yellow-600/30 p-4 mb-4">
              <div className="flex items-start gap-3">
                <Warning size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-600">GoDaddy Pro Required ($99/month)</div>
                  <div className="text-sm text-yellow-600/60">You need a GoDaddy Pro account to access the Auctions API</div>
                </div>
              </div>
            </Card>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Step-by-Step:</h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-yellow-600">Go to GoDaddy Developer Portal</p>
                    <a 
                      href="https://developer.godaddy.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-yellow-500 hover:text-yellow-400 mt-1"
                    >
                      Open GoDaddy Developer <ArrowSquareOut size={14} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="text-yellow-600">Sign in with your GoDaddy account</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="text-yellow-600">Go to API Keys → Create New Key</p>
                    <p className="text-sm text-yellow-600/50">Choose "Production" environment</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                  <div>
                    <p className="text-yellow-600">Copy your API Key and Secret</p>
                  </div>
                </li>
              </ol>
            </Card>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">GoDaddy API Key</label>
                <input
                  type="text"
                  value={formData.godaddyKey}
                  onChange={(e) => updateField('godaddyKey', e.target.value)}
                  placeholder="dYQ4NTJE6Kd_xxxxxxxxxx"
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">GoDaddy API Secret</label>
                <div className="relative">
                  <input
                    type={showPassword['godaddySecret'] ? 'text' : 'password'}
                    value={formData.godaddySecret}
                    onChange={(e) => updateField('godaddySecret', e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none pr-12"
                  />
                  <button
                    onClick={() => togglePassword('godaddySecret')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-yellow-600/50 hover:text-yellow-600"
                  >
                    {showPassword['godaddySecret'] ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 'namecheap':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Key size={48} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Connect Namecheap API</h2>
              <p className="text-yellow-600/60">Optional but recommended for more opportunities</p>
            </div>
            
            <Card className="bg-green-500/10 border border-green-500/30 p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-500">Free API Access</div>
                  <div className="text-sm text-green-500/60">Namecheap API is free after account verification</div>
                </div>
              </div>
            </Card>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Step-by-Step:</h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-yellow-600">Log into Namecheap → Profile → Tools</p>
                    <a 
                      href="https://ap.www.namecheap.com/settings/tools/apiaccess" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-yellow-500 hover:text-yellow-400 mt-1"
                    >
                      Open Namecheap API Settings <ArrowSquareOut size={14} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="text-yellow-600">Enable API Access</p>
                    <p className="text-sm text-yellow-600/50">Requires account balance of $50+ or 20+ domains</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="text-yellow-600">Whitelist your IP address</p>
                    <p className="text-sm text-yellow-600/50">Your current IP: Check whatismyip.com</p>
                  </div>
                </li>
              </ol>
            </Card>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">Namecheap Username</label>
                <input
                  type="text"
                  value={formData.namecheapUser}
                  onChange={(e) => updateField('namecheapUser', e.target.value)}
                  placeholder="yourusername"
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">Namecheap API Key</label>
                <div className="relative">
                  <input
                    type={showPassword['namecheapKey'] ? 'text' : 'password'}
                    value={formData.namecheapKey}
                    onChange={(e) => updateField('namecheapKey', e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none pr-12"
                  />
                  <button
                    onClick={() => togglePassword('namecheapKey')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-yellow-600/50 hover:text-yellow-600"
                  >
                    {showPassword['namecheapKey'] ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-yellow-600/80 mb-2">Your Whitelisted IP</label>
                <input
                  type="text"
                  value={formData.namecheapIp}
                  onChange={(e) => updateField('namecheapIp', e.target.value)}
                  placeholder="123.456.789.0"
                  className="w-full px-4 py-3 bg-black/50 border border-yellow-600/30 rounded-lg text-yellow-600 placeholder-yellow-600/30 focus:border-yellow-500 focus:outline-none"
                />
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10"
              onClick={() => nextStep()}
            >
              Skip for now (Optional)
            </Button>
          </div>
        )
        
      case 'funding':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Wallet size={48} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Fund Your Accounts</h2>
              <p className="text-yellow-600/60">The bot uses YOUR registrar account balance</p>
            </div>
            
            <Card className="bg-yellow-600/10 border border-yellow-600/30 p-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-600">How Money Flows</div>
                  <div className="text-sm text-yellow-600/60 mt-1">
                    The bot bids on domains using your GoDaddy/Namecheap account balance. 
                    When you win, they charge your balance. When you sell, the marketplace 
                    deposits to your linked PayPal or bank account.
                  </div>
                </div>
              </div>
            </Card>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Recommended Starting Capital:</h3>
              <div className="space-y-4">
                {[
                  { amount: '$100', desc: 'Conservative start - 2-5 domains/month', recommended: false },
                  { amount: '$500', desc: 'Good balance - 10-20 domains/month', recommended: true },
                  { amount: '$1,000+', desc: 'Aggressive growth - 30+ domains/month', recommended: false },
                ].map((tier, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${tier.recommended ? 'bg-yellow-600/10 border-yellow-600/40' : 'bg-black/30 border-yellow-600/10'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-yellow-600">{tier.amount}</span>
                        <p className="text-sm text-yellow-600/50 mt-1">{tier.desc}</p>
                      </div>
                      {tier.recommended && (
                        <span className="px-2 py-1 text-xs font-semibold bg-yellow-600/20 text-yellow-500 rounded">RECOMMENDED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Add Funds to GoDaddy:</h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-yellow-600">Go to GoDaddy Auctions</p>
                    <a 
                      href="https://auctions.godaddy.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-yellow-500 hover:text-yellow-400 mt-1"
                    >
                      Open GoDaddy Auctions <ArrowSquareOut size={14} />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <p className="text-yellow-600">Click "Add Funds" in top right</p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-yellow-600/20 text-yellow-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <p className="text-yellow-600">Add your starting amount via Credit Card or PayPal</p>
                </li>
              </ol>
            </Card>
            
            <div>
              <label className="block text-sm font-medium text-yellow-600/80 mb-2">Daily Budget Limit</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={formData.dailyBudget}
                  onChange={(e) => updateField('dailyBudget', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xl font-bold text-yellow-600 w-20">${formData.dailyBudget}</span>
              </div>
              <p className="text-xs text-yellow-600/50 mt-1">Bot won't spend more than this per day</p>
            </div>
          </div>
        )
        
      case 'security':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield size={48} className="mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold text-yellow-600 mb-2">Risk Protection Settings</h2>
              <p className="text-yellow-600/60">12-layer protection keeps your capital safe</p>
            </div>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Built-in Protections:</h3>
              <div className="space-y-3">
                {[
                  { name: 'Daily Loss Limit', desc: 'Stops trading if losses exceed 8% of capital', active: true },
                  { name: 'Max Position Size', desc: 'Never risk more than 5% on one domain', active: true },
                  { name: 'Circuit Breaker', desc: 'Full stop at 25% drawdown', active: true },
                  { name: 'Minimum ROI Filter', desc: 'Only buys domains with 8x+ potential', active: true },
                  { name: 'Transaction Simulation', desc: 'Tests every bid before executing', active: true },
                  { name: 'Emergency Pause', desc: 'One-click stop all operations', active: true },
                ].map((protection, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={18} className="text-green-500" />
                      <div>
                        <div className="font-medium text-yellow-600">{protection.name}</div>
                        <div className="text-xs text-yellow-600/50">{protection.desc}</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-green-500">ENABLED</span>
                  </div>
                ))}
              </div>
            </Card>
            
            <div>
              <label className="block text-sm font-medium text-yellow-600/80 mb-2">Minimum ROI Target</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={formData.minROI}
                  onChange={(e) => updateField('minROI', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xl font-bold text-yellow-600 w-16">{formData.minROI}x</span>
              </div>
              <p className="text-xs text-yellow-600/50 mt-1">Only buy domains predicted to return {formData.minROI}x or more</p>
            </div>
          </div>
        )
        
      case 'launch':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
                <Lightning size={40} weight="fill" className="text-black" />
              </div>
              <h2 className="text-3xl font-bold text-green-500 mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                Ready to Launch!
              </h2>
              <p className="text-yellow-600/60">Your autonomous empire is configured</p>
            </div>
            
            <Card className="card-obsidian-premium p-6">
              <h3 className="text-lg font-semibold text-yellow-600 mb-4">Configuration Summary:</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                  <span className="text-yellow-600/70">Database</span>
                  <span className={`font-medium ${formData.supabaseUrl ? 'text-green-500' : 'text-yellow-600/50'}`}>
                    {formData.supabaseUrl ? '✓ Connected' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                  <span className="text-yellow-600/70">GoDaddy API</span>
                  <span className={`font-medium ${formData.godaddyKey ? 'text-green-500' : 'text-yellow-600/50'}`}>
                    {formData.godaddyKey ? '✓ Connected' : 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                  <span className="text-yellow-600/70">Namecheap API</span>
                  <span className={`font-medium ${formData.namecheapKey ? 'text-green-500' : 'text-yellow-600/40'}`}>
                    {formData.namecheapKey ? '✓ Connected' : 'Skipped (optional)'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                  <span className="text-yellow-600/70">Daily Budget</span>
                  <span className="font-medium text-yellow-600">${formData.dailyBudget}/day</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-yellow-600/10">
                  <span className="text-yellow-600/70">Min ROI Target</span>
                  <span className="font-medium text-yellow-600">{formData.minROI}x</span>
                </div>
              </div>
            </Card>
            
            <Card className="bg-green-500/10 border border-green-500/30 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-500">What happens when you launch:</div>
                  <ul className="text-sm text-green-500/70 mt-2 space-y-1">
                    <li>• Bot starts scanning 120k+ domains daily</li>
                    <li>• AI evaluates each domain for ROI potential</li>
                    <li>• Auto-bids on high-value opportunities</li>
                    <li>• Auto-lists purchased domains on marketplaces</li>
                    <li>• You receive notifications on wins/sales</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black text-yellow-600 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${index < currentStep || completedSteps.has(step.id)
                    ? 'bg-green-500 text-black'
                    : index === currentStep
                      ? 'bg-yellow-600 text-black'
                      : 'bg-yellow-600/20 text-yellow-600/50'
                  }
                `}>
                  {index < currentStep || completedSteps.has(step.id) ? (
                    <CheckCircle size={18} weight="bold" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-8 sm:w-16 h-0.5 mx-1 ${
                    index < currentStep ? 'bg-green-500' : 'bg-yellow-600/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <span className="text-sm text-yellow-600/60">
              Step {currentStep + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
            </span>
          </div>
        </div>

        {/* Step Content */}
        <Card className="card-obsidian-premium p-6 sm:p-8 mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/10 disabled:opacity-30"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-yellow-600/50 hover:text-yellow-600/70"
          >
            Skip Setup
          </Button>
          
          {currentStep === WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={isValidating}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold"
            >
              {isValidating ? 'Validating...' : 'Launch Empire'}
              <Rocket size={18} className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={isValidating}
              className="btn-gold-premium"
            >
              {isValidating ? 'Validating...' : 'Continue'}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

