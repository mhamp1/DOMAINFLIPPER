/**
 * AffiliateEngine.ts — PROFIT FROM EVERY DOMAIN YOU SEE
 * Auto-promote domains via affiliate links, earn on non-buys
 * December 2025 — Never miss a profit opportunity
 */

import { toast } from 'sonner'

// ==================== TYPES ====================

interface AffiliateNetwork {
  id: string
  name: string
  baseUrl: string
  affiliateId: string
  commission: number // percentage or flat fee
  commissionType: 'percentage' | 'flat'
  active: boolean
  priority: number // higher = preferred
}

interface AffiliateClick {
  id: string
  domain: string
  network: string
  url: string
  timestamp: Date
  converted: boolean
  commission?: number
}

interface AffiliatePromotion {
  domain: string
  links: Array<{
    network: string
    url: string
    commission: string
  }>
  promotedAt: Date
  channels: string[]
}

interface AffiliateStats {
  totalClicks: number
  totalConversions: number
  conversionRate: number
  totalCommission: number
  monthlyCommission: number
  topNetworks: Array<{ network: string; conversions: number; commission: number }>
  topDomains: Array<{ domain: string; clicks: number; conversions: number }>
}

// ==================== AFFILIATE ENGINE ====================

export class AffiliateEngine {
  private networks: Map<string, AffiliateNetwork> = new Map()
  private clicks: AffiliateClick[] = []
  private promotions: AffiliatePromotion[] = []

  constructor() {
    this.initializeNetworks()
  }

  /**
   * Initialize default affiliate networks
   */
  private initializeNetworks(): void {
    const defaultNetworks: AffiliateNetwork[] = [
      {
        id: 'godaddy',
        name: 'GoDaddy',
        baseUrl: 'https://www.godaddy.com/domainsearch/find?domainToCheck=',
        affiliateId: import.meta.env.VITE_GODADDY_AFFILIATE_ID || 'domainflipper',
        commission: 15,
        commissionType: 'percentage',
        active: true,
        priority: 100,
      },
      {
        id: 'namecheap',
        name: 'Namecheap',
        baseUrl: 'https://www.namecheap.com/domains/registration/results.aspx?domain=',
        affiliateId: import.meta.env.VITE_NAMECHEAP_AFFILIATE_ID || 'flipper',
        commission: 35,
        commissionType: 'percentage',
        active: true,
        priority: 90,
      },
      {
        id: 'porkbun',
        name: 'Porkbun',
        baseUrl: 'https://porkbun.com/checkout/search?q=',
        affiliateId: import.meta.env.VITE_PORKBUN_AFFILIATE_ID || 'FLIPPER',
        commission: 10,
        commissionType: 'flat',
        active: true,
        priority: 80,
      },
      {
        id: 'dynadot',
        name: 'Dynadot',
        baseUrl: 'https://www.dynadot.com/domain/search.html?domain=',
        affiliateId: import.meta.env.VITE_DYNADOT_AFFILIATE_ID || 'flipper',
        commission: 5,
        commissionType: 'flat',
        active: true,
        priority: 70,
      },
      {
        id: 'cloudflare',
        name: 'Cloudflare',
        baseUrl: 'https://www.cloudflare.com/products/registrar/?domain=',
        affiliateId: import.meta.env.VITE_CLOUDFLARE_AFFILIATE_ID || 'df',
        commission: 0, // At-cost, but drives traffic
        commissionType: 'flat',
        active: true,
        priority: 60,
      },
    ]

    defaultNetworks.forEach(n => this.networks.set(n.id, n))
  }

  // ==================== LINK GENERATION ====================

  /**
   * Generate affiliate links for a domain
   */
  generateAffiliateLinks(domain: string): Array<{ network: string; url: string; commission: string }> {
    const links: Array<{ network: string; url: string; commission: string }> = []

    const sortedNetworks = Array.from(this.networks.values())
      .filter(n => n.active)
      .sort((a, b) => b.priority - a.priority)

    for (const network of sortedNetworks) {
      const url = this.buildAffiliateUrl(domain, network)
      const commission = network.commissionType === 'percentage' 
        ? `${network.commission}%`
        : `$${network.commission}`

      links.push({
        network: network.name,
        url,
        commission,
      })
    }

    return links
  }

  /**
   * Build affiliate URL for a specific network
   */
  private buildAffiliateUrl(domain: string, network: AffiliateNetwork): string {
    const encodedDomain = encodeURIComponent(domain)
    let url = `${network.baseUrl}${encodedDomain}`

    // Add affiliate tracking
    switch (network.id) {
      case 'godaddy':
        url += `&isc=${network.affiliateId}`
        break
      case 'namecheap':
        url += `&aff=${network.affiliateId}`
        break
      case 'porkbun':
        url += `&coupon=${network.affiliateId}`
        break
      case 'dynadot':
        url += `&ref=${network.affiliateId}`
        break
      case 'cloudflare':
        url += `&ref=${network.affiliateId}`
        break
      default:
        url += `&affiliate=${network.affiliateId}`
    }

    return url
  }

  // ==================== AUTO-PROMOTION ====================

  /**
   * Auto-promote a domain across channels
   */
  async promoteAutomatically(domain: string, channels: ('twitter' | 'telegram' | 'newsletter')[] = ['twitter', 'telegram']): Promise<AffiliatePromotion> {
    const links = this.generateAffiliateLinks(domain)
    const primaryLink = links[0] // Highest priority network

    const promotion: AffiliatePromotion = {
      domain,
      links,
      promotedAt: new Date(),
      channels: [],
    }

    // Twitter promotion
    if (channels.includes('twitter') && import.meta.env.VITE_TWITTER_ENABLED === 'true') {
      await this.postToTwitter(domain, primaryLink.url)
      promotion.channels.push('twitter')
    }

    // Telegram promotion
    if (channels.includes('telegram') && import.meta.env.VITE_TELEGRAM_BOT_TOKEN) {
      await this.postToTelegram(domain, primaryLink.url)
      promotion.channels.push('telegram')
    }

    this.promotions.push(promotion)

    if (promotion.channels.length > 0) {
      toast.info('💸 DOMAIN PROMOTED', {
        description: `${domain} → earning affiliate commissions`,
        icon: '📣',
      })
    }

    return promotion
  }

  /**
   * Post domain alert to Twitter
   */
  private async postToTwitter(domain: string, affiliateUrl: string): Promise<boolean> {
    try {
      const tweet = this.generateTweet(domain, affiliateUrl)
      
      // Would use Twitter API v2 in production
      // await axios.post('https://api.twitter.com/2/tweets', { text: tweet }, {
      //   headers: { Authorization: `Bearer ${import.meta.env.VITE_TWITTER_BEARER_TOKEN}` }
      // })

      console.log('Twitter post:', tweet)
      return true
    } catch (error) {
      console.warn('Twitter post error:', error)
      return false
    }
  }

  /**
   * Post domain alert to Telegram
   */
  private async postToTelegram(domain: string, affiliateUrl: string): Promise<boolean> {
    try {
      const message = this.generateTelegramMessage(domain, affiliateUrl)
      
      // Would use Telegram Bot API in production
      // await axios.post(`https://api.telegram.org/bot${import.meta.env.VITE_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      //   chat_id: import.meta.env.VITE_TELEGRAM_CHANNEL_ID,
      //   text: message,
      //   parse_mode: 'Markdown'
      // })

      console.log('Telegram post:', message)
      return true
    } catch (error) {
      console.warn('Telegram post error:', error)
      return false
    }
  }

  /**
   * Generate tweet for domain promotion
   */
  private generateTweet(domain: string, affiliateUrl: string): string {
    const templates = [
      `🔥 Hot domain alert: ${domain} just became available!\n\n💎 Premium brandable domain\n📈 High potential value\n\nGrab it now 👇\n${affiliateUrl}\n\n#domains #startup #branding`,
      `🚨 Domain drop: ${domain}\n\n✨ Rare opportunity\n💰 Great for startups\n\nRegister before someone else does:\n${affiliateUrl}\n\n#domainname #entrepreneur`,
      `💡 ${domain} is available!\n\nPerfect for:\n→ Startups\n→ Products\n→ Brands\n\nClaim it: ${affiliateUrl}\n\n#domain #business`,
    ]

    return templates[Math.floor(Math.random() * templates.length)]
  }

  /**
   * Generate Telegram message for domain promotion
   */
  private generateTelegramMessage(domain: string, affiliateUrl: string): string {
    return `🔥 *Domain Alert*\n\n` +
      `*${domain}* is available!\n\n` +
      `💎 Premium brandable name\n` +
      `📈 High investment potential\n` +
      `⚡ Limited availability\n\n` +
      `[Register Now](${affiliateUrl})`
  }

  // ==================== TRACKING ====================

  /**
   * Track affiliate click
   */
  trackClick(domain: string, networkId: string): AffiliateClick {
    const network = this.networks.get(networkId)
    if (!network) throw new Error(`Unknown network: ${networkId}`)

    const click: AffiliateClick = {
      id: `click-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      domain,
      network: network.name,
      url: this.buildAffiliateUrl(domain, network),
      timestamp: new Date(),
      converted: false,
    }

    this.clicks.push(click)
    return click
  }

  /**
   * Record conversion (callback from affiliate network)
   */
  recordConversion(clickId: string, commission: number): void {
    const click = this.clicks.find(c => c.id === clickId)
    if (click) {
      click.converted = true
      click.commission = commission

      toast.success('💰 AFFILIATE CONVERSION', {
        description: `${click.domain} → +$${commission} commission`,
        icon: '🎉',
      })
    }
  }

  // ==================== DOMAIN PARKING ADS ====================

  /**
   * Generate parking page with affiliate ads
   */
  generateParkingPage(domain: string): string {
    const links = this.generateAffiliateLinks(domain)

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${domain} — Premium Domain for Sale</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: linear-gradient(180deg, #000 0%, #0a0a0a 100%);
      color: #D4AF37;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .container {
      max-width: 800px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.3);
      padding: 0.5rem 1.5rem;
      border-radius: 2rem;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 800;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #D4AF37, #F4D03F, #D4AF37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 3s ease-in-out infinite;
    }
    @keyframes shimmer {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.2); }
    }
    .tagline {
      font-size: 1.5rem;
      color: rgba(212, 175, 55, 0.7);
      margin-bottom: 3rem;
    }
    .cta-primary {
      display: inline-block;
      background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
      color: #000;
      font-weight: 700;
      font-size: 1.25rem;
      padding: 1.25rem 3rem;
      border-radius: 1rem;
      text-decoration: none;
      margin-bottom: 2rem;
      transition: all 0.3s;
    }
    .cta-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 60px rgba(212, 175, 55, 0.4);
    }
    .alternatives {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(212, 175, 55, 0.2);
    }
    .alternatives h3 {
      font-size: 1rem;
      color: rgba(212, 175, 55, 0.6);
      margin-bottom: 1rem;
    }
    .alt-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
    }
    .alt-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(212, 175, 55, 0.1);
      border: 1px solid rgba(212, 175, 55, 0.2);
      color: #D4AF37;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      text-decoration: none;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    .alt-link:hover {
      background: rgba(212, 175, 55, 0.2);
      border-color: rgba(212, 175, 55, 0.4);
    }
    footer {
      position: fixed;
      bottom: 2rem;
      font-size: 0.75rem;
      color: rgba(212, 175, 55, 0.4);
    }
    footer a { color: rgba(212, 175, 55, 0.6); text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">✨ Premium Domain Available</div>
    <h1>${domain}</h1>
    <p class="tagline">This domain is for sale</p>
    
    <a href="mailto:domains@domainflipper.ai?subject=Inquiry: ${domain}" class="cta-primary">
      Make an Offer
    </a>
    
    <div class="alternatives">
      <h3>Looking for similar domains? Try these registrars:</h3>
      <div class="alt-links">
        ${links.map(l => `<a href="${l.url}" target="_blank" class="alt-link">${l.network}</a>`).join('\n        ')}
      </div>
    </div>
  </div>
  
  <footer>
    Powered by <a href="https://domainflipper.ai">DomainFlipper</a>
  </footer>

  <script>
    // Track affiliate clicks
    document.querySelectorAll('.alt-link').forEach(link => {
      link.addEventListener('click', () => {
        // Would send tracking event in production
        console.log('Affiliate click:', link.textContent);
      });
    });
  </script>
</body>
</html>`
  }

  // ==================== STATS ====================

  /**
   * Get affiliate statistics
   */
  getStats(): AffiliateStats {
    const conversions = this.clicks.filter(c => c.converted)
    const totalCommission = conversions.reduce((sum, c) => sum + (c.commission || 0), 0)

    // Group by network
    const networkStats = new Map<string, { conversions: number; commission: number }>()
    conversions.forEach(c => {
      const existing = networkStats.get(c.network) || { conversions: 0, commission: 0 }
      existing.conversions++
      existing.commission += c.commission || 0
      networkStats.set(c.network, existing)
    })

    // Group by domain
    const domainStats = new Map<string, { clicks: number; conversions: number }>()
    this.clicks.forEach(c => {
      const existing = domainStats.get(c.domain) || { clicks: 0, conversions: 0 }
      existing.clicks++
      if (c.converted) existing.conversions++
      domainStats.set(c.domain, existing)
    })

    // Monthly commission (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthlyCommission = conversions
      .filter(c => c.timestamp >= thirtyDaysAgo)
      .reduce((sum, c) => sum + (c.commission || 0), 0)

    return {
      totalClicks: this.clicks.length,
      totalConversions: conversions.length,
      conversionRate: this.clicks.length > 0 ? (conversions.length / this.clicks.length) * 100 : 0,
      totalCommission,
      monthlyCommission,
      topNetworks: Array.from(networkStats.entries())
        .map(([network, stats]) => ({ network, ...stats }))
        .sort((a, b) => b.commission - a.commission)
        .slice(0, 5),
      topDomains: Array.from(domainStats.entries())
        .map(([domain, stats]) => ({ domain, ...stats }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 10),
    }
  }

  /**
   * Add or update affiliate network
   */
  setNetwork(network: AffiliateNetwork): void {
    this.networks.set(network.id, network)
  }

  /**
   * Get all promotions
   */
  getPromotions(): AffiliatePromotion[] {
    return [...this.promotions]
  }
}

// Export singleton
export const affiliateEngine = new AffiliateEngine()

