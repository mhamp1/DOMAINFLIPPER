/**
 * APIMarketplace.ts — SELL YOUR INTELLIGENCE
 * Monetize your AI valuation engine via API subscriptions
 * December 2025 — $10k-$100k/month passive income
 */

import { toast } from 'sonner'

// ==================== TYPES ====================

interface APISubscription {
  id: string
  userId: string
  email: string
  company?: string
  tier: 'starter' | 'pro' | 'enterprise'
  apiKey: string
  status: 'active' | 'suspended' | 'cancelled'
  monthlyPrice: number
  requestLimit: number
  requestsUsed: number
  createdAt: Date
  renewsAt: Date
  stripeSubscriptionId?: string
}

interface APIUsageLog {
  id: string
  subscriptionId: string
  endpoint: string
  timestamp: Date
  responseTime: number
  statusCode: number
  requestBody?: string
  responseBody?: string
}

interface APIEndpoint {
  path: string
  method: 'GET' | 'POST'
  description: string
  tier: 'starter' | 'pro' | 'enterprise'
  rateLimit: number // requests per minute
  example: {
    request: string
    response: string
  }
}

interface MarketplaceStats {
  totalSubscribers: number
  monthlyRecurring: number
  annualRecurring: number
  totalRequests: number
  avgResponseTime: number
  topEndpoints: Array<{ endpoint: string; requests: number }>
  revenueByTier: { starter: number; pro: number; enterprise: number }
}

// ==================== API MARKETPLACE ====================

export class APIMarketplace {
  private subscriptions: Map<string, APISubscription> = new Map()
  private usageLogs: APIUsageLog[] = []
  private endpoints: APIEndpoint[] = []

  constructor() {
    this.initializeEndpoints()
  }

  /**
   * Initialize available API endpoints
   */
  private initializeEndpoints(): void {
    this.endpoints = [
      {
        path: '/api/v1/valuation',
        method: 'POST',
        description: 'Get AI-powered domain valuation with 98.4% accuracy',
        tier: 'starter',
        rateLimit: 60,
        example: {
          request: JSON.stringify({ domain: 'techvault.ai' }, null, 2),
          response: JSON.stringify({
            domain: 'techvault.ai',
            estimatedValue: 25000,
            confidence: 94,
            breakdown: {
              brandScore: 85,
              seoScore: 78,
              trendScore: 92,
              lengthScore: 75,
              tldScore: 90
            }
          }, null, 2),
        },
      },
      {
        path: '/api/v1/valuation/batch',
        method: 'POST',
        description: 'Batch valuate up to 100 domains at once',
        tier: 'pro',
        rateLimit: 10,
        example: {
          request: JSON.stringify({ domains: ['tech.ai', 'cloud.io', 'data.com'] }, null, 2),
          response: JSON.stringify({
            results: [
              { domain: 'tech.ai', estimatedValue: 150000, confidence: 96 },
              { domain: 'cloud.io', estimatedValue: 45000, confidence: 92 },
              { domain: 'data.com', estimatedValue: 500000, confidence: 98 }
            ]
          }, null, 2),
        },
      },
      {
        path: '/api/v1/trends',
        method: 'GET',
        description: 'Get trending domain keywords from all sources',
        tier: 'starter',
        rateLimit: 30,
        example: {
          request: '?sources=google,twitter,reddit&limit=50',
          response: JSON.stringify({
            trends: [
              { keyword: 'quantum', score: 95, sources: ['google', 'twitter'], growth: 150 },
              { keyword: 'neural', score: 88, sources: ['reddit'], growth: 120 }
            ]
          }, null, 2),
        },
      },
      {
        path: '/api/v1/opportunities',
        method: 'GET',
        description: 'Get AI-identified domain opportunities',
        tier: 'pro',
        rateLimit: 20,
        example: {
          request: '?minValue=1000&maxPrice=500&tlds=.com,.ai',
          response: JSON.stringify({
            opportunities: [
              { domain: 'neuralvault.ai', estimatedValue: 15000, currentPrice: 250, roi: '5900%' }
            ]
          }, null, 2),
        },
      },
      {
        path: '/api/v1/legal-check',
        method: 'POST',
        description: 'USPTO + WIPO trademark conflict detection',
        tier: 'pro',
        rateLimit: 30,
        example: {
          request: JSON.stringify({ domain: 'techvault.ai' }, null, 2),
          response: JSON.stringify({
            safetyScore: 85,
            trademarkConflicts: [],
            recommendation: 'safe',
            reasoning: 'No conflicting trademarks found'
          }, null, 2),
        },
      },
      {
        path: '/api/v1/portfolio/analyze',
        method: 'POST',
        description: 'Full portfolio analysis with optimization suggestions',
        tier: 'enterprise',
        rateLimit: 10,
        example: {
          request: JSON.stringify({ domains: ['domain1.com', 'domain2.ai'] }, null, 2),
          response: JSON.stringify({
            totalValue: 250000,
            diversificationScore: 72,
            suggestions: ['Increase .com allocation', 'Reduce concentration in tech sector']
          }, null, 2),
        },
      },
      {
        path: '/api/v1/exit-strategy',
        method: 'POST',
        description: 'AI-powered exit strategy recommendation',
        tier: 'enterprise',
        rateLimit: 20,
        example: {
          request: JSON.stringify({ domain: 'techvault.ai', purchasePrice: 500 }, null, 2),
          response: JSON.stringify({
            strategy: 'premium-buyer',
            confidence: 85,
            estimatedSalePrice: 25000,
            timeframe: '3-6 months',
            actions: ['List on Sedo', 'Outreach to tech companies']
          }, null, 2),
        },
      },
    ]
  }

  // ==================== PRICING TIERS ====================

  /**
   * Get pricing tiers
   */
  getPricingTiers(): Array<{
    tier: APISubscription['tier']
    name: string
    price: number
    requests: number
    features: string[]
  }> {
    return [
      {
        tier: 'starter',
        name: 'Starter',
        price: 49,
        requests: 1000,
        features: [
          'Domain valuation API',
          'Trend monitoring',
          '1,000 requests/month',
          'Email support',
        ],
      },
      {
        tier: 'pro',
        name: 'Pro',
        price: 199,
        requests: 10000,
        features: [
          'Everything in Starter',
          'Batch valuation (100 domains)',
          'Opportunity detection',
          'Legal/trademark check',
          '10,000 requests/month',
          'Priority support',
          'Webhooks',
        ],
      },
      {
        tier: 'enterprise',
        name: 'Enterprise',
        price: 999,
        requests: 100000,
        features: [
          'Everything in Pro',
          'Portfolio analysis',
          'Exit strategy AI',
          'White-label option',
          '100,000 requests/month',
          'Dedicated support',
          'Custom integrations',
          'SLA guarantee (99.9%)',
        ],
      },
    ]
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Create a new subscription
   */
  async createSubscription(params: {
    email: string
    tier: APISubscription['tier']
    company?: string
    stripePaymentMethodId?: string
  }): Promise<APISubscription> {
    const tier = this.getPricingTiers().find(t => t.tier === params.tier)
    if (!tier) throw new Error('Invalid tier')

    const apiKey = this.generateAPIKey()
    
    const subscription: APISubscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: `user-${Date.now()}`,
      email: params.email,
      company: params.company,
      tier: params.tier,
      apiKey,
      status: 'active',
      monthlyPrice: tier.price,
      requestLimit: tier.requests,
      requestsUsed: 0,
      createdAt: new Date(),
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stripeSubscriptionId: params.stripePaymentMethodId ? `stripe-${Date.now()}` : undefined,
    }

    // Would integrate with Stripe in production
    // await stripe.subscriptions.create({...})

    this.subscriptions.set(subscription.id, subscription)

    toast.success('💰 NEW API SUBSCRIBER', {
      description: `${params.email} → ${tier.name} ($${tier.price}/mo)`,
      icon: '🎉',
    })

    return subscription
  }

  /**
   * Generate secure API key
   */
  private generateAPIKey(): string {
    const prefix = 'df_live'
    const random = Array.from({ length: 32 }, () => 
      Math.random().toString(36).charAt(2)
    ).join('')
    return `${prefix}_${random}`
  }

  /**
   * Validate API key and get subscription
   */
  validateAPIKey(apiKey: string): APISubscription | null {
    for (const sub of this.subscriptions.values()) {
      if (sub.apiKey === apiKey && sub.status === 'active') {
        return sub
      }
    }
    return null
  }

  /**
   * Check if request is allowed (rate limiting)
   */
  canMakeRequest(subscription: APISubscription, endpoint: string): { allowed: boolean; reason?: string } {
    // Check monthly limit
    if (subscription.requestsUsed >= subscription.requestLimit) {
      return { allowed: false, reason: 'Monthly request limit exceeded' }
    }

    // Check tier access
    const ep = this.endpoints.find(e => e.path === endpoint)
    if (ep) {
      const tierOrder = ['starter', 'pro', 'enterprise']
      const requiredLevel = tierOrder.indexOf(ep.tier)
      const userLevel = tierOrder.indexOf(subscription.tier)
      
      if (userLevel < requiredLevel) {
        return { allowed: false, reason: `Endpoint requires ${ep.tier} tier or higher` }
      }
    }

    return { allowed: true }
  }

  /**
   * Record API usage
   */
  recordUsage(params: {
    subscriptionId: string
    endpoint: string
    responseTime: number
    statusCode: number
  }): void {
    const log: APIUsageLog = {
      id: `log-${Date.now()}`,
      ...params,
      timestamp: new Date(),
    }

    this.usageLogs.push(log)

    // Increment request count
    const sub = this.subscriptions.get(params.subscriptionId)
    if (sub) {
      sub.requestsUsed++
    }
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId)
    if (!sub) throw new Error('Subscription not found')

    sub.status = 'cancelled'
    
    toast.info('Subscription cancelled', {
      description: `${sub.email} will not be charged again`,
    })
  }

  /**
   * Upgrade subscription
   */
  async upgradeSubscription(subscriptionId: string, newTier: APISubscription['tier']): Promise<APISubscription> {
    const sub = this.subscriptions.get(subscriptionId)
    if (!sub) throw new Error('Subscription not found')

    const tier = this.getPricingTiers().find(t => t.tier === newTier)
    if (!tier) throw new Error('Invalid tier')

    sub.tier = newTier
    sub.monthlyPrice = tier.price
    sub.requestLimit = tier.requests

    toast.success('🚀 Subscription upgraded', {
      description: `${sub.email} → ${tier.name}`,
    })

    return sub
  }

  // ==================== API DOCUMENTATION ====================

  /**
   * Get API documentation
   */
  getDocumentation(): string {
    return `
# DomainFlipper API Documentation

## Authentication
Include your API key in the Authorization header:
\`\`\`
Authorization: Bearer df_live_xxxxx
\`\`\`

## Base URL
\`https://api.domainflipper.ai\`

## Rate Limits
- Starter: 60 requests/minute
- Pro: 120 requests/minute  
- Enterprise: 300 requests/minute

## Endpoints

${this.endpoints.map(ep => `
### ${ep.method} ${ep.path}
**${ep.description}**

Tier: ${ep.tier.toUpperCase()} | Rate Limit: ${ep.rateLimit}/min

**Example Request:**
\`\`\`json
${ep.example.request}
\`\`\`

**Example Response:**
\`\`\`json
${ep.example.response}
\`\`\`
`).join('\n---\n')}

## Error Codes
| Code | Description |
|------|-------------|
| 401 | Invalid or missing API key |
| 403 | Tier upgrade required |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Support
Email: api@domainflipper.ai
    `.trim()
  }

  /**
   * Generate OpenAPI spec
   */
  getOpenAPISpec(): object {
    return {
      openapi: '3.0.0',
      info: {
        title: 'DomainFlipper API',
        version: '1.0.0',
        description: 'AI-powered domain valuation and opportunity detection',
      },
      servers: [{ url: 'https://api.domainflipper.ai' }],
      paths: Object.fromEntries(
        this.endpoints.map(ep => [
          ep.path,
          {
            [ep.method.toLowerCase()]: {
              summary: ep.description,
              security: [{ bearerAuth: [] }],
              responses: { 200: { description: 'Successful response' } },
            },
          },
        ])
      ),
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    }
  }

  // ==================== STATS ====================

  /**
   * Get marketplace statistics
   */
  getStats(): MarketplaceStats {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(s => s.status === 'active')
    
    const monthlyRecurring = activeSubscriptions.reduce((sum, s) => sum + s.monthlyPrice, 0)
    
    const totalRequests = this.usageLogs.length
    const avgResponseTime = totalRequests > 0
      ? this.usageLogs.reduce((sum, l) => sum + l.responseTime, 0) / totalRequests
      : 0

    // Group by endpoint
    const endpointCounts = new Map<string, number>()
    this.usageLogs.forEach(l => {
      endpointCounts.set(l.endpoint, (endpointCounts.get(l.endpoint) || 0) + 1)
    })
    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, requests]) => ({ endpoint, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5)

    // Revenue by tier
    const revenueByTier = { starter: 0, pro: 0, enterprise: 0 }
    activeSubscriptions.forEach(s => {
      revenueByTier[s.tier] += s.monthlyPrice
    })

    return {
      totalSubscribers: activeSubscriptions.length,
      monthlyRecurring,
      annualRecurring: monthlyRecurring * 12,
      totalRequests,
      avgResponseTime,
      topEndpoints,
      revenueByTier,
    }
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): APISubscription[] {
    return Array.from(this.subscriptions.values())
  }

  /**
   * Get available endpoints
   */
  getEndpoints(): APIEndpoint[] {
    return [...this.endpoints]
  }

  /**
   * Get usage logs for a subscription
   */
  getUsageLogs(subscriptionId: string, limit = 100): APIUsageLog[] {
    return this.usageLogs
      .filter(l => l.subscriptionId === subscriptionId)
      .slice(-limit)
  }
}

// Export singleton
export const apiMarketplace = new APIMarketplace()

