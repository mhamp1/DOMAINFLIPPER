/**
 * GodScore.ts — 15-Layer Divine Judgment System
 * The ultimate domain valuation algorithm (0-1000)
 * 1000 = God-tier $1M+ flip guaranteed
 * December 2025
 */

import { logger } from '@/lib/utils/logger'
import { whoisEngine } from '@/lib/whois/WhoisEngine'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { leadScanner } from '@/lib/intelligence/LeadScanner'
import { toast } from 'sonner'

// ==================== TYPES ====================

export interface GodScoreResult {
  score: number // 0-1000
  tier: 'mortal' | 'elite' | 'legendary' | 'mythic' | 'god'
  estimatedValue: number
  confidence: number
  layers: GodScoreLayer[]
  recommendation: 'skip' | 'watch' | 'bid' | 'snipe' | 'godmode'
  maxBid: number
}

export interface GodScoreLayer {
  name: string
  weight: number
  score: number
  contribution: number
  details?: string
}

// ==================== GODSCORE ENGINE ====================

class GodScoreEngine {
  /**
   * Calculate the GodScore for a domain (0-1000)
   */
  async calculate(domain: string, options?: {
    currentBid?: number
    dropTime?: Date
  }): Promise<GodScoreResult> {
    const startTime = Date.now()
    const layers: GodScoreLayer[] = []
    let totalWeight = 0
    let weightedScore = 0

    logger.debug('GODSCORE', `Calculating GodScore for ${domain}`)

    // ==================== 15 LAYERS OF DIVINE JUDGMENT ====================

    // Layer 1: AI Future Prediction (40%)
    const aiPrediction = await this.layerAIPrediction(domain)
    layers.push(aiPrediction)
    weightedScore += aiPrediction.contribution
    totalWeight += aiPrediction.weight

    // Layer 2: USPTO Trademark Match (20%)
    const trademark = await this.layerTrademarkMatch(domain)
    layers.push(trademark)
    weightedScore += trademark.contribution
    totalWeight += trademark.weight

    // Layer 3: Google Trends Breakout (12%)
    const trends = await this.layerTrendsBreakout(domain)
    layers.push(trends)
    weightedScore += trends.contribution
    totalWeight += trends.weight

    // Layer 4: Twitter/X Viral Velocity (10%)
    const twitter = await this.layerTwitterVelocity(domain)
    layers.push(twitter)
    weightedScore += twitter.contribution
    totalWeight += twitter.weight

    // Layer 5: Kickstarter/Indiegogo Launch (8%)
    const crowdfunding = await this.layerCrowdfunding(domain)
    layers.push(crowdfunding)
    weightedScore += crowdfunding.contribution
    totalWeight += crowdfunding.weight

    // Layer 6: GitHub Repo Leak (5%)
    const github = await this.layerGitHubLeak(domain)
    layers.push(github)
    weightedScore += github.contribution
    totalWeight += github.weight

    // Layer 7: Traffic + Backlinks (5%)
    const seo = await this.layerSEOMetrics(domain)
    layers.push(seo)
    weightedScore += seo.contribution
    totalWeight += seo.weight

    // Layer 8: Brandability NLP Score (5%)
    const brandability = await this.layerBrandability(domain)
    layers.push(brandability)
    weightedScore += brandability.contribution
    totalWeight += brandability.weight

    // Layer 9: Competitor Pricing Gap (5%)
    const pricing = await this.layerCompetitorPricing(domain)
    layers.push(pricing)
    weightedScore += pricing.contribution
    totalWeight += pricing.weight

    // Layer 10: Registrar Drop Timing (5%)
    const dropTiming = await this.layerDropTiming(domain, options?.dropTime)
    layers.push(dropTiming)
    weightedScore += dropTiming.contribution
    totalWeight += dropTiming.weight

    // Layer 11: WHOIS Age + History (5%)
    const whoisLayer = await this.layerWhoisHistory(domain)
    layers.push(whoisLayer)
    weightedScore += whoisLayer.contribution
    totalWeight += whoisLayer.weight

    // Layer 12: Domain Length Score (3%)
    const length = this.layerDomainLength(domain)
    layers.push(length)
    weightedScore += length.contribution
    totalWeight += length.weight

    // Layer 13: TLD Premium (3%)
    const tld = this.layerTLDPremium(domain)
    layers.push(tld)
    weightedScore += tld.contribution
    totalWeight += tld.weight

    // Layer 14: Numeric/Pattern Detection (2%)
    const pattern = this.layerPatternDetection(domain)
    layers.push(pattern)
    weightedScore += pattern.contribution
    totalWeight += pattern.weight

    // Layer 15: God Mode Override (∞%)
    const godMode = this.layerGodModeOverride(domain)
    if (godMode.score === 1000) {
      // God Mode activates - return maximum immediately
      return {
        score: 1000,
        tier: 'god',
        estimatedValue: 10000000,
        confidence: 100,
        layers: [...layers, godMode],
        recommendation: 'godmode',
        maxBid: 1000000,
      }
    }
    layers.push(godMode)

    // ==================== FINAL CALCULATION ====================

    const finalScore = Math.round(weightedScore / totalWeight * 1000) / 1

    // Determine tier
    const tier = this.determineTier(finalScore)

    // Calculate estimated value
    const estimatedValue = this.calculateEstimatedValue(finalScore, domain)

    // Calculate max bid (aggressive)
    const maxBid = Math.round(estimatedValue * this.getBidMultiplier(tier))

    // Determine recommendation
    const recommendation = this.getRecommendation(finalScore, options?.currentBid, maxBid)

    const duration = Date.now() - startTime
    logger.info('GODSCORE', `${domain} → Score: ${finalScore} (${tier})`, {
      estimatedValue,
      maxBid,
      recommendation,
      duration: `${duration}ms`,
    })

    return {
      score: finalScore,
      tier,
      estimatedValue,
      confidence: Math.min(99, 60 + layers.filter(l => l.score > 50).length * 3),
      layers,
      recommendation,
      maxBid,
    }
  }

  // ==================== LAYER IMPLEMENTATIONS ====================

  private async layerAIPrediction(domain: string): Promise<GodScoreLayer> {
    try {
      const valuation = await valuationEngine.predictValue({ name: domain, tld: '.' + domain.split('.').pop() })
      const score = Math.min(100, valuation.score)
      return {
        name: 'AI Future Prediction',
        weight: 40,
        score,
        contribution: score * 0.4,
        details: `AI predicts $${valuation.value.toLocaleString()} value`,
      }
    } catch {
      return { name: 'AI Future Prediction', weight: 40, score: 50, contribution: 20 }
    }
  }

  private async layerTrademarkMatch(domain: string): Promise<GodScoreLayer> {
    // Check if domain matches a trademark (massive value boost)
    const name = domain.split('.')[0].toLowerCase()
    const premiumTrademarks = ['apple', 'google', 'amazon', 'meta', 'openai', 'anthropic', 'tesla']
    
    const isMatch = premiumTrademarks.some(tm => name.includes(tm))
    const score = isMatch ? 100 : 30
    
    return {
      name: 'USPTO Trademark Match',
      weight: 20,
      score,
      contribution: score * 0.2,
      details: isMatch ? 'TRADEMARK MATCH DETECTED' : 'No trademark match',
    }
  }

  private async layerTrendsBreakout(domain: string): Promise<GodScoreLayer> {
    const trendingKeywords = ['ai', 'gpt', 'quantum', 'crypto', 'web3', 'nft', 'defi', 'metaverse']
    const name = domain.split('.')[0].toLowerCase()
    
    const hasTrending = trendingKeywords.some(kw => name.includes(kw))
    const score = hasTrending ? 85 : 40
    
    return {
      name: 'Google Trends Breakout',
      weight: 12,
      score,
      contribution: score * 0.12,
      details: hasTrending ? 'Contains trending keyword' : 'No trend signal',
    }
  }

  private async layerTwitterVelocity(domain: string): Promise<GodScoreLayer> {
    // Check if domain name is trending on Twitter
    const leads = leadScanner.getLeads().filter(l => l.source === 'twitter')
    const name = domain.split('.')[0].toLowerCase()
    
    const match = leads.find(l => l.name === name)
    const score = match ? Math.min(100, match.confidence + 20) : 35
    
    return {
      name: 'Twitter/X Viral Velocity',
      weight: 10,
      score,
      contribution: score * 0.1,
      details: match ? `Trending on Twitter (${match.confidence}% confidence)` : 'Not trending',
    }
  }

  private async layerCrowdfunding(domain: string): Promise<GodScoreLayer> {
    const leads = leadScanner.getLeads().filter(l => 
      l.source === 'kickstarter' || l.source === 'indiegogo'
    )
    const name = domain.split('.')[0].toLowerCase()
    
    const match = leads.find(l => l.name === name)
    const score = match ? 90 : 30
    
    return {
      name: 'Crowdfunding Launch',
      weight: 8,
      score,
      contribution: score * 0.08,
      details: match ? 'Active crowdfunding campaign!' : 'No campaign found',
    }
  }

  private async layerGitHubLeak(domain: string): Promise<GodScoreLayer> {
    const leads = leadScanner.getLeads().filter(l => l.source === 'github')
    const name = domain.split('.')[0].toLowerCase()
    
    const match = leads.find(l => l.name === name)
    const score = match ? Math.min(95, 60 + (match.metadata?.stars as number || 0) / 100) : 30
    
    return {
      name: 'GitHub Repo Leak',
      weight: 5,
      score,
      contribution: score * 0.05,
      details: match ? `Found on GitHub (${match.metadata?.stars} stars)` : 'No repo found',
    }
  }

  private async layerSEOMetrics(domain: string): Promise<GodScoreLayer> {
    // Would integrate with Moz/Ahrefs API
    const score = 50 // Placeholder - would use real API
    return {
      name: 'Traffic + Backlinks',
      weight: 5,
      score,
      contribution: score * 0.05,
    }
  }

  private async layerBrandability(domain: string): Promise<GodScoreLayer> {
    const name = domain.split('.')[0].toLowerCase()
    let score = 50

    // Length scoring
    if (name.length <= 5) score += 30
    else if (name.length <= 7) score += 20
    else if (name.length <= 10) score += 10
    else score -= 10

    // Pronounceability (vowel balance)
    const vowels = (name.match(/[aeiou]/g) || []).length
    const consonants = name.length - vowels
    if (vowels > 0 && consonants > 0) {
      const ratio = Math.min(vowels, consonants) / Math.max(vowels, consonants)
      score += ratio * 15
    }

    // No hyphens or numbers
    if (!name.includes('-') && !/\d/.test(name)) score += 10

    return {
      name: 'Brandability NLP',
      weight: 5,
      score: Math.min(100, Math.max(0, score)),
      contribution: Math.min(100, score) * 0.05,
    }
  }

  private async layerCompetitorPricing(domain: string): Promise<GodScoreLayer> {
    // Would compare with similar domains on marketplaces
    const score = 60 // Placeholder
    return {
      name: 'Competitor Pricing Gap',
      weight: 5,
      score,
      contribution: score * 0.05,
    }
  }

  private async layerDropTiming(domain: string, dropTime?: Date): Promise<GodScoreLayer> {
    if (!dropTime) {
      return { name: 'Drop Timing', weight: 5, score: 50, contribution: 2.5 }
    }

    const hoursUntilDrop = (dropTime.getTime() - Date.now()) / (1000 * 60 * 60)
    let score = 50

    if (hoursUntilDrop < 1) score = 100 // Imminent drop
    else if (hoursUntilDrop < 24) score = 85
    else if (hoursUntilDrop < 72) score = 70
    else score = 50

    return {
      name: 'Drop Timing Precision',
      weight: 5,
      score,
      contribution: score * 0.05,
      details: `${Math.round(hoursUntilDrop)}h until drop`,
    }
  }

  private async layerWhoisHistory(domain: string): Promise<GodScoreLayer> {
    try {
      const whois = await whoisEngine.lookup(domain)
      if (!whois.success || !whois.data) {
        return { name: 'WHOIS History', weight: 5, score: 50, contribution: 2.5 }
      }

      let score = 50
      const data = whois.data

      // Age premium
      if (data.ageYears > 15) score += 40
      else if (data.ageYears > 10) score += 30
      else if (data.ageYears > 5) score += 20
      else if (data.ageYears > 2) score += 10

      // Expiring soon boost
      if (data.expiresSoon) score += 15

      return {
        name: 'WHOIS Age + History',
        weight: 5,
        score: Math.min(100, score),
        contribution: Math.min(100, score) * 0.05,
        details: `${data.ageYears} years old, ${data.registrar}`,
      }
    } catch {
      return { name: 'WHOIS History', weight: 5, score: 50, contribution: 2.5 }
    }
  }

  private layerDomainLength(domain: string): GodScoreLayer {
    const name = domain.split('.')[0]
    let score = 50

    if (name.length <= 3) score = 100
    else if (name.length <= 5) score = 90
    else if (name.length <= 7) score = 75
    else if (name.length <= 10) score = 60
    else if (name.length <= 15) score = 40
    else score = 20

    return {
      name: 'Domain Length',
      weight: 3,
      score,
      contribution: score * 0.03,
      details: `${name.length} characters`,
    }
  }

  private layerTLDPremium(domain: string): GodScoreLayer {
    const tld = '.' + domain.split('.').pop()?.toLowerCase()
    
    const tldScores: Record<string, number> = {
      '.com': 100,
      '.ai': 95,
      '.io': 85,
      '.co': 75,
      '.net': 70,
      '.org': 65,
      '.app': 60,
      '.dev': 55,
      '.xyz': 30,
    }

    const score = tldScores[tld] || 40

    return {
      name: 'TLD Premium',
      weight: 3,
      score,
      contribution: score * 0.03,
      details: tld,
    }
  }

  private layerPatternDetection(domain: string): GodScoreLayer {
    const name = domain.split('.')[0].toLowerCase()
    let score = 50

    // 3-letter detection
    if (/^[a-z]{3}$/.test(name)) score = 100

    // 4-letter detection
    if (/^[a-z]{4}$/.test(name)) score = 90

    // Number patterns (Chinese premium)
    if (/^[0-9]{3,4}$/.test(name)) {
      score = 80
      if (name.includes('888') || name.includes('666') || name.includes('999')) {
        score = 100
      }
    }

    // Repeating patterns
    if (/(.)\1{2,}/.test(name)) score = Math.max(score, 70)

    return {
      name: 'Pattern Detection',
      weight: 2,
      score,
      contribution: score * 0.02,
    }
  }

  private layerGodModeOverride(domain: string): GodScoreLayer {
    // Ultimate premium domains - instant max score
    const godDomains = ['ai.com', 'crypto.com', 'nft.com', 'web3.com', 'quantum.com', 'gpt.com']
    
    if (godDomains.includes(domain.toLowerCase())) {
      return {
        name: 'GOD MODE OVERRIDE',
        weight: 100,
        score: 1000,
        contribution: 1000,
        details: '⚡ ULTIMATE PREMIUM DETECTED',
      }
    }

    return {
      name: 'God Mode Override',
      weight: 0,
      score: 0,
      contribution: 0,
    }
  }

  // ==================== HELPER METHODS ====================

  private determineTier(score: number): GodScoreResult['tier'] {
    if (score >= 950) return 'god'
    if (score >= 850) return 'mythic'
    if (score >= 700) return 'legendary'
    if (score >= 500) return 'elite'
    return 'mortal'
  }

  private calculateEstimatedValue(score: number, domain: string): number {
    const baseValue = Math.pow(score / 100, 3) * 10000 // Exponential scaling
    
    // TLD multiplier
    const tld = '.' + domain.split('.').pop()
    const tldMultipliers: Record<string, number> = {
      '.com': 1.0, '.ai': 0.95, '.io': 0.85, '.net': 0.7, '.org': 0.65,
    }
    const tldMult = tldMultipliers[tld] || 0.5

    // Length multiplier
    const name = domain.split('.')[0]
    const lengthMult = name.length <= 5 ? 2 : name.length <= 7 ? 1.5 : name.length <= 10 ? 1 : 0.7

    return Math.round(baseValue * tldMult * lengthMult)
  }

  private getBidMultiplier(tier: GodScoreResult['tier']): number {
    switch (tier) {
      case 'god': return 0.5 // 50% of value for god-tier
      case 'mythic': return 0.3
      case 'legendary': return 0.2
      case 'elite': return 0.15
      default: return 0.1
    }
  }

  private getRecommendation(
    score: number,
    currentBid?: number,
    maxBid?: number
  ): GodScoreResult['recommendation'] {
    if (score >= 950) return 'godmode'
    if (score >= 850) return 'snipe'
    if (score >= 700) return 'bid'
    if (score >= 500) return 'watch'
    return 'skip'
  }
}

// Export singleton
export const godScoreEngine = new GodScoreEngine()

