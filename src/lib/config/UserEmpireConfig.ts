/**
 * UserEmpireConfig.ts — YOU CONTROL EVERYTHING
 * Zustand store with persistence — Never loses your settings
 * December 27, 2025
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// All 10 strategies
export const ALL_STRATEGIES = [
  { id: 'brandable', name: 'Brandable Names', desc: 'Premium brandable domain names' },
  { id: 'crypto', name: 'Crypto Keywords', desc: 'Bitcoin, DeFi, Web3 related' },
  { id: 'ai', name: 'AI & Tech', desc: 'AI, ML, neural, quantum domains' },
  { id: 'lll', name: 'LLL/NNN Domains', desc: '3-letter and 3-number premium' },
  { id: 'geo-service', name: 'Geo + Service', desc: 'City + service combinations' },
  { id: 'traffic', name: 'Traffic Domains', desc: 'Domains with existing traffic' },
  { id: 'trending', name: 'Trend Rider', desc: 'Google Trends & social signals' },
  { id: 'typo', name: 'Typo Sniper', desc: 'Common misspellings of brands' },
  { id: 'one-word', name: 'One-Word Premium', desc: 'Single dictionary words' },
  { id: 'expiring', name: 'Expiring Auctions', desc: 'GoDaddy auction sniper' },
]

interface EmpireConfig {
  // Capital & Budget
  capital: number
  dailyBudgetPercent: number
  minROI: number
  
  // Risk Level
  riskLevel: 'conservative' | 'balanced' | 'aggressive' | 'god'
  
  // Automation
  autoFund: boolean
  autoCompound: boolean
  autoList: boolean
  autoBid: boolean
  
  // Strategies
  activeStrategies: string[]
  
  // State
  emergencyPaused: boolean
  botRunning: boolean
  launchTime: number | null
  
  // Tracked Stats (REAL - no mocks)
  totalProfit: number
  totalSpent: number
  domainsAcquired: number
  domainsSold: number
  
  // Actions
  setCapital: (amount: number) => void
  setDailyBudget: (percent: number) => void
  setMinROI: (roi: number) => void
  setRiskLevel: (level: EmpireConfig['riskLevel']) => void
  toggleStrategy: (id: string) => void
  enableAllStrategies: () => void
  disableAllStrategies: () => void
  toggleAutoFund: () => void
  toggleAutoCompound: () => void
  toggleAutoList: () => void
  toggleAutoBid: () => void
  emergencyPause: () => void
  resume: () => void
  startBot: () => void
  stopBot: () => void
  
  // Stats tracking
  recordPurchase: (amount: number) => void
  recordSale: (salePrice: number, cost: number) => void
  
  // Calculated
  getDailyBudget: () => number
  getAvailableCapital: () => number
  getUptime: () => number
}

export const useEmpireConfig = create<EmpireConfig>()(
  persist(
    (set, get) => ({
      // Initial values
      capital: 500,
      dailyBudgetPercent: 10,
      minROI: 5,
      riskLevel: 'god',
      autoFund: false,
      autoCompound: true,
      autoList: true,
      autoBid: true,
      activeStrategies: ALL_STRATEGIES.map(s => s.id), // All ON by default
      emergencyPaused: false,
      botRunning: false,
      launchTime: null,
      totalProfit: 0,
      totalSpent: 0,
      domainsAcquired: 0,
      domainsSold: 0,

      // Actions
      setCapital: (amount) => set({ capital: Math.max(0, amount) }),
      
      setDailyBudget: (percent) => set({ dailyBudgetPercent: Math.min(100, Math.max(1, percent)) }),
      
      setMinROI: (roi) => set({ minROI: Math.max(1, roi) }),
      
      setRiskLevel: (level) => set({ riskLevel: level }),
      
      toggleStrategy: (id) => set((state) => ({
        activeStrategies: state.activeStrategies.includes(id)
          ? state.activeStrategies.filter(s => s !== id)
          : [...state.activeStrategies, id]
      })),
      
      enableAllStrategies: () => set({ activeStrategies: ALL_STRATEGIES.map(s => s.id) }),
      
      disableAllStrategies: () => set({ activeStrategies: [] }),
      
      toggleAutoFund: () => set((state) => ({ autoFund: !state.autoFund })),
      
      toggleAutoCompound: () => set((state) => ({ autoCompound: !state.autoCompound })),
      
      toggleAutoList: () => set((state) => ({ autoList: !state.autoList })),
      
      toggleAutoBid: () => set((state) => ({ autoBid: !state.autoBid })),
      
      emergencyPause: () => set({ emergencyPaused: true, botRunning: false }),
      
      resume: () => set({ emergencyPaused: false }),
      
      startBot: () => set({ 
        botRunning: true, 
        emergencyPaused: false,
        launchTime: Date.now() 
      }),
      
      stopBot: () => set({ botRunning: false }),
      
      recordPurchase: (amount) => set((state) => ({
        totalSpent: state.totalSpent + amount,
        domainsAcquired: state.domainsAcquired + 1,
      })),
      
      recordSale: (salePrice, cost) => set((state) => ({
        totalProfit: state.totalProfit + (salePrice - cost),
        domainsSold: state.domainsSold + 1,
      })),
      
      getDailyBudget: () => {
        const state = get()
        return (state.capital * state.dailyBudgetPercent) / 100
      },
      
      getAvailableCapital: () => {
        const state = get()
        return state.capital - state.totalSpent + state.totalProfit
      },
      
      getUptime: () => {
        const state = get()
        if (!state.launchTime || !state.botRunning) return 0
        return Date.now() - state.launchTime
      },
    }),
    {
      name: 'domainflipper-empire-config',
    }
  )
)

// Helper to get uptime formatted
export function formatUptime(ms: number): string {
  if (ms <= 0) return '00:00:00'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  }
  
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

