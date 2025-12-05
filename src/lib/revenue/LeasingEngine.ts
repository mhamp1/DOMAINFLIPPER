/**
 * LeasingEngine.ts — PASSIVE INCOME EMPIRE
 * Auto-lease domains for $500-$5000/month recurring revenue
 * December 2025 — Make money while you sleep
 */

import { toast } from 'sonner'
import type { Domain } from '@/types/domain'

// ==================== TYPES ====================

interface Lease {
  id: string
  domain: string
  tenantEmail: string
  tenantCompany?: string
  monthlyPrice: number
  startDate: Date
  endDate: Date
  status: 'active' | 'pending' | 'expired' | 'cancelled'
  paymentMethod: 'stripe' | 'crypto' | 'invoice'
  autoRenew: boolean
  nextPaymentDate: Date
  totalCollected: number
  notes?: string
}

interface LeaseApplication {
  id: string
  domain: string
  applicantEmail: string
  applicantCompany: string
  proposedPrice: number
  useCase: string
  duration: number // months
  submittedAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'negotiating'
}

interface LeasePricing {
  domain: string
  suggestedPrice: number
  minPrice: number
  maxPrice: number
  annualDiscount: number // percentage
  factors: {
    domainValue: number
    marketRate: number
    demandScore: number
    competitorPrices: number[]
  }
}

interface LeaseStats {
  totalActiveLeases: number
  monthlyRecurring: number
  annualRecurring: number
  totalCollected: number
  averageLeasePrice: number
  occupancyRate: number // % of leasable domains actually leased
  churnRate: number // % that don't renew
  pendingApplications: number
}

// ==================== LEASING ENGINE ====================

export class LeasingEngine {
  private leases: Map<string, Lease> = new Map()
  private applications: LeaseApplication[] = []
  private leasableDomains: Set<string> = new Set()
  private renewalCheckInterval: ReturnType<typeof setInterval> | null = null

  constructor() {}

  // ==================== LEASE PRICING AI ====================

  /**
   * Calculate optimal lease price for a domain
   */
  calculateLeasePrice(domain: Domain): LeasePricing {
    const estimatedValue = domain.estimatedValue || 1000
    
    // Base lease price: 12% annual yield (1% monthly)
    const annualYield = 0.12
    const baseMonthlyPrice = (estimatedValue * annualYield) / 12

    // Adjustments based on factors
    const factors = {
      domainValue: estimatedValue,
      marketRate: this.getMarketLeaseRate(domain),
      demandScore: this.calculateDemandScore(domain),
      competitorPrices: this.getCompetitorPrices(domain),
    }

    // Demand adjustment
    let demandMultiplier = 1.0
    if (factors.demandScore >= 80) demandMultiplier = 1.5
    else if (factors.demandScore >= 60) demandMultiplier = 1.2
    else if (factors.demandScore < 40) demandMultiplier = 0.8

    // Final pricing
    const suggestedPrice = Math.round(baseMonthlyPrice * demandMultiplier)
    const minPrice = Math.round(suggestedPrice * 0.7)
    const maxPrice = Math.round(suggestedPrice * 1.5)

    return {
      domain: domain.name,
      suggestedPrice,
      minPrice,
      maxPrice,
      annualDiscount: 15, // 15% off for annual commitment
      factors,
    }
  }

  private getMarketLeaseRate(domain: Domain): number {
    // Industry standard lease rates by TLD
    const tld = '.' + domain.name.split('.').pop()
    const rates: Record<string, number> = {
      '.com': 0.12,
      '.ai': 0.15,
      '.io': 0.12,
      '.co': 0.10,
      '.net': 0.08,
      '.org': 0.08,
    }
    return rates[tld] || 0.10
  }

  private calculateDemandScore(domain: Domain): number {
    let score = 50
    const name = domain.name.split('.')[0]

    // Short names bonus
    if (name.length <= 4) score += 30
    else if (name.length <= 6) score += 20
    else if (name.length <= 8) score += 10

    // Tech keywords
    const techWords = ['ai', 'tech', 'cloud', 'data', 'app', 'pro', 'hub', 'lab']
    if (techWords.some(w => name.toLowerCase().includes(w))) score += 15

    // Clean (no hyphens/numbers)
    if (!/[-\d]/.test(name)) score += 10

    return Math.min(100, score)
  }

  private getCompetitorPrices(domain: Domain): number[] {
    // Would integrate with marketplace APIs in production
    const basePrice = (domain.estimatedValue || 1000) * 0.01
    return [
      basePrice * 0.8,
      basePrice * 1.0,
      basePrice * 1.2,
    ]
  }

  // ==================== LANDING PAGE GENERATOR ====================

  /**
   * Generate HTML for lease landing page
   */
  generateLeaseLandingPage(domain: Domain, pricing: LeasePricing): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${domain.name} — Available for Lease | DomainFlipper</title>
  <meta name="description" content="Lease ${domain.name} for your business. Premium domain available for monthly rental.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #000;
      color: #D4AF37;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .vault {
      background: rgba(212, 175, 55, 0.03);
      border: 2px solid rgba(212, 175, 55, 0.3);
      border-radius: 2rem;
      padding: 4rem;
      max-width: 600px;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    .badge {
      display: inline-block;
      background: rgba(212, 175, 55, 0.1);
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      color: #D4AF37;
    }
    h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tagline {
      font-size: 1.25rem;
      color: rgba(212, 175, 55, 0.7);
      margin-bottom: 2rem;
    }
    .price-card {
      background: rgba(212, 175, 55, 0.05);
      border: 1px solid rgba(212, 175, 55, 0.2);
      border-radius: 1rem;
      padding: 2rem;
      margin: 2rem 0;
    }
    .price {
      font-size: 3.5rem;
      font-weight: 800;
      color: #D4AF37;
    }
    .price-period {
      font-size: 1.25rem;
      color: rgba(212, 175, 55, 0.7);
    }
    .discount {
      display: inline-block;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
    .features {
      text-align: left;
      margin: 2rem 0;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(212, 175, 55, 0.1);
    }
    .feature-icon {
      width: 24px;
      height: 24px;
      background: rgba(212, 175, 55, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
      color: #000;
      font-weight: 700;
      font-size: 1.125rem;
      padding: 1rem 2.5rem;
      border-radius: 1rem;
      text-decoration: none;
      margin: 0.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 40px rgba(212, 175, 55, 0.3);
    }
    .btn-outline {
      background: transparent;
      border: 2px solid #D4AF37;
      color: #D4AF37;
    }
    .btn-outline:hover {
      background: rgba(212, 175, 55, 0.1);
    }
    .crypto-badge {
      margin-top: 1.5rem;
      font-size: 0.875rem;
      color: rgba(212, 175, 55, 0.6);
    }
    .crypto-badge img {
      height: 20px;
      vertical-align: middle;
      margin: 0 0.25rem;
    }
    footer {
      margin-top: 2rem;
      font-size: 0.875rem;
      color: rgba(212, 175, 55, 0.5);
    }
    footer a {
      color: #D4AF37;
      text-decoration: none;
    }
    @media (max-width: 640px) {
      .vault { padding: 2rem; }
      h1 { font-size: 2rem; }
      .price { font-size: 2.5rem; }
    }
  </style>
</head>
<body>
  <div class="vault">
    <span class="badge">✨ Premium Domain</span>
    <h1>${domain.name}</h1>
    <p class="tagline">is available for lease</p>
    
    <div class="price-card">
      <div class="price">$${pricing.suggestedPrice.toLocaleString()}</div>
      <div class="price-period">per month</div>
      <div class="discount">💰 Save ${pricing.annualDiscount}% with annual lease</div>
    </div>
    
    <div class="features">
      <div class="feature">
        <span class="feature-icon">⚡</span>
        <span>Instant DNS access — go live in minutes</span>
      </div>
      <div class="feature">
        <span class="feature-icon">🔒</span>
        <span>Secure ownership maintained by us</span>
      </div>
      <div class="feature">
        <span class="feature-icon">📈</span>
        <span>Option to purchase at end of lease</span>
      </div>
      <div class="feature">
        <span class="feature-icon">💳</span>
        <span>Simple monthly billing — cancel anytime</span>
      </div>
    </div>
    
    <a href="mailto:lease@domainflipper.ai?subject=Lease%20Inquiry:%20${domain.name}&body=I'm%20interested%20in%20leasing%20${domain.name}." class="btn">
      Start Leasing
    </a>
    <a href="mailto:lease@domainflipper.ai?subject=Purchase%20Inquiry:%20${domain.name}" class="btn btn-outline">
      Make an Offer to Buy
    </a>
    
    <div class="crypto-badge">
      <span>We accept:</span>
      💳 Card • 🪙 ETH • ₿ BTC • 💵 USDC
    </div>
  </div>
  
  <footer>
    Powered by <a href="https://domainflipper.ai">DomainFlipper</a> • 
    <a href="mailto:lease@domainflipper.ai">Contact</a>
  </footer>
</body>
</html>`
  }

  // ==================== LEASE MANAGEMENT ====================

  /**
   * Create a new lease
   */
  async createLease(params: {
    domain: string
    tenantEmail: string
    tenantCompany?: string
    monthlyPrice: number
    durationMonths: number
    paymentMethod: Lease['paymentMethod']
    autoRenew: boolean
  }): Promise<Lease> {
    const now = new Date()
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + params.durationMonths)

    const lease: Lease = {
      id: `lease-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      domain: params.domain,
      tenantEmail: params.tenantEmail,
      tenantCompany: params.tenantCompany,
      monthlyPrice: params.monthlyPrice,
      startDate: now,
      endDate,
      status: 'active',
      paymentMethod: params.paymentMethod,
      autoRenew: params.autoRenew,
      nextPaymentDate: new Date(now.setMonth(now.getMonth() + 1)),
      totalCollected: params.monthlyPrice, // First payment
      notes: '',
    }

    this.leases.set(lease.id, lease)
    this.leasableDomains.delete(params.domain)

    toast.success('💰 LEASE ACTIVATED', {
      description: `${params.domain} → $${params.monthlyPrice}/mo • ${params.durationMonths} months`,
      icon: '🏛️',
    })

    return lease
  }

  /**
   * Process lease renewal
   */
  async processRenewal(leaseId: string): Promise<boolean> {
    const lease = this.leases.get(leaseId)
    if (!lease || lease.status !== 'active') return false

    // Simulate payment processing
    const paymentSuccess = Math.random() > 0.05 // 95% success rate

    if (paymentSuccess) {
      lease.totalCollected += lease.monthlyPrice
      lease.nextPaymentDate = new Date(lease.nextPaymentDate)
      lease.nextPaymentDate.setMonth(lease.nextPaymentDate.getMonth() + 1)

      toast.success('💳 LEASE PAYMENT RECEIVED', {
        description: `${lease.domain} → +$${lease.monthlyPrice}`,
        icon: '✅',
      })

      return true
    } else {
      // Send late notice
      await this.sendLateNotice(lease)
      return false
    }
  }

  /**
   * Send late payment notice
   */
  private async sendLateNotice(lease: Lease): Promise<void> {
    // Would send actual email in production
    toast.warning('⚠️ LATE PAYMENT', {
      description: `${lease.domain} — Payment failed, notice sent`,
      icon: '📧',
    })
  }

  /**
   * Cancel a lease
   */
  async cancelLease(leaseId: string, reason?: string): Promise<void> {
    const lease = this.leases.get(leaseId)
    if (!lease) return

    lease.status = 'cancelled'
    lease.notes = reason || 'Cancelled'
    this.leasableDomains.add(lease.domain)

    toast.info('Lease cancelled', {
      description: `${lease.domain} is now available again`,
    })
  }

  // ==================== LEASE APPLICATION ====================

  /**
   * Submit lease application
   */
  async submitApplication(params: {
    domain: string
    applicantEmail: string
    applicantCompany: string
    proposedPrice: number
    useCase: string
    duration: number
  }): Promise<LeaseApplication> {
    const application: LeaseApplication = {
      id: `app-${Date.now()}`,
      ...params,
      submittedAt: new Date(),
      status: 'pending',
    }

    this.applications.push(application)

    toast.info('📋 NEW LEASE APPLICATION', {
      description: `${params.domain} — $${params.proposedPrice}/mo proposal`,
    })

    return application
  }

  /**
   * Auto-approve applications meeting criteria
   */
  async autoApproveApplications(): Promise<void> {
    for (const app of this.applications) {
      if (app.status !== 'pending') continue

      // Auto-approve if price is at or above minimum
      const domain: Domain = { name: app.domain, estimatedValue: 10000 } as Domain
      const pricing = this.calculateLeasePrice(domain)

      if (app.proposedPrice >= pricing.minPrice) {
        app.status = 'approved'
        
        // Create the lease
        await this.createLease({
          domain: app.domain,
          tenantEmail: app.applicantEmail,
          tenantCompany: app.applicantCompany,
          monthlyPrice: app.proposedPrice,
          durationMonths: app.duration,
          paymentMethod: 'stripe',
          autoRenew: true,
        })
      } else if (app.proposedPrice >= pricing.minPrice * 0.8) {
        // Counter-offer
        app.status = 'negotiating'
        toast.info('💬 COUNTER-OFFER SENT', {
          description: `${app.domain} — suggested $${pricing.suggestedPrice}/mo`,
        })
      }
    }
  }

  // ==================== AUTO-RENEWAL MONITORING ====================

  /**
   * Start automatic renewal monitoring
   */
  startAutoRenewalMonitoring(): void {
    if (this.renewalCheckInterval) return

    this.renewalCheckInterval = setInterval(async () => {
      const now = new Date()

      for (const lease of this.leases.values()) {
        if (lease.status !== 'active') continue

        // Check if payment is due
        if (lease.nextPaymentDate <= now) {
          if (lease.autoRenew) {
            await this.processRenewal(lease.id)
          } else {
            // Check if past end date
            if (lease.endDate <= now) {
              lease.status = 'expired'
              this.leasableDomains.add(lease.domain)
              toast.info('📆 LEASE EXPIRED', {
                description: `${lease.domain} — now available for new lease`,
              })
            }
          }
        }
      }
    }, 60 * 60 * 1000) // Check every hour

    toast.success('🔄 LEASE MONITOR ACTIVE', {
      description: 'Auto-processing renewals and expirations',
    })
  }

  /**
   * Stop monitoring
   */
  stopAutoRenewalMonitoring(): void {
    if (this.renewalCheckInterval) {
      clearInterval(this.renewalCheckInterval)
      this.renewalCheckInterval = null
    }
  }

  // ==================== STATS ====================

  /**
   * Get leasing statistics
   */
  getStats(): LeaseStats {
    const activeLeases = Array.from(this.leases.values()).filter(l => l.status === 'active')
    const totalLeasable = this.leasableDomains.size + activeLeases.length

    const monthlyRecurring = activeLeases.reduce((sum, l) => sum + l.monthlyPrice, 0)
    const totalCollected = Array.from(this.leases.values()).reduce((sum, l) => sum + l.totalCollected, 0)

    return {
      totalActiveLeases: activeLeases.length,
      monthlyRecurring,
      annualRecurring: monthlyRecurring * 12,
      totalCollected,
      averageLeasePrice: activeLeases.length > 0 
        ? monthlyRecurring / activeLeases.length 
        : 0,
      occupancyRate: totalLeasable > 0 
        ? (activeLeases.length / totalLeasable) * 100 
        : 0,
      churnRate: 5, // Placeholder - would calculate from historical data
      pendingApplications: this.applications.filter(a => a.status === 'pending').length,
    }
  }

  /**
   * Mark domain as leasable
   */
  markAsLeasable(domain: string): void {
    this.leasableDomains.add(domain)
  }

  /**
   * Get all active leases
   */
  getActiveLeases(): Lease[] {
    return Array.from(this.leases.values()).filter(l => l.status === 'active')
  }

  /**
   * Get pending applications
   */
  getPendingApplications(): LeaseApplication[] {
    return this.applications.filter(a => a.status === 'pending')
  }
}

// Export singleton
export const leasingEngine = new LeasingEngine()

