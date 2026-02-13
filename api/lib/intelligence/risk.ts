/**
 * Risk Assessment — real risk factors computed from actual domain data.
 * Zero Math.random(). Every risk is based on a specific, verifiable condition.
 */

export interface RiskFactor {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  mitigatable: boolean
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number // 0-100
  risks: RiskFactor[]
  recommendation: string
  maxBidMultiplier: number // 1.0 = no adjustment, 0.7 = reduce max bid 30%
}

const ILLIQUID_TLDS = new Set(['xyz', 'info', 'biz', 'club', 'online', 'site', 'website', 'space', 'store', 'tech', 'world'])
const HYPE_TERMS = new Set(['metaverse', 'nft', 'web3', 'defi', 'blockchain', 'dao', 'token'])
const EXPENSIVE_RENEWALS: Record<string, number> = {
  ai: 70, io: 50, co: 30, dev: 12, app: 14, com: 10, net: 10, org: 10,
}

export function assessRisk(
  domain: string,
  enrichment: {
    hasActiveTrademark?: boolean
    referringDomains?: number
    trustFlow?: number
    domainAge?: number
  },
  auctionData?: {
    bidCount?: number
    currentPrice?: number
    estimatedValue?: number
  }
): RiskAssessment {
  const risks: RiskFactor[] = []
  const name = domain.split('.')[0].toLowerCase()
  const tld = domain.split('.').pop()?.toLowerCase() || ''

  // RISK 1: Trademark UDRP
  if (enrichment.hasActiveTrademark) {
    risks.push({
      type: 'TRADEMARK_UDRP',
      severity: 'high',
      description: 'Active trademark found — UDRP complaint likely. Trademark holders can seize the domain.',
      mitigatable: false,
    })
  }

  // RISK 2: Spam backlinks (high referring domains but very low trust flow = spam)
  if (enrichment.referringDomains && enrichment.referringDomains > 50 &&
      enrichment.trustFlow !== undefined && enrichment.trustFlow < 10) {
    risks.push({
      type: 'SPAM_BACKLINKS',
      severity: 'medium',
      description: `${enrichment.referringDomains} backlinks but TF only ${enrichment.trustFlow} — likely spam/PBN links, possible Google penalty.`,
      mitigatable: true, // Can disavow bad links
    })
  }

  // RISK 3: Bidding war
  if (auctionData?.bidCount && auctionData.bidCount > 10) {
    risks.push({
      type: 'BIDDING_WAR',
      severity: 'medium',
      description: `${auctionData.bidCount} bids — price likely inflated above fair value.`,
      mitigatable: true, // Set lower max bid
    })
  }

  // RISK 4: Illiquid TLD
  if (ILLIQUID_TLDS.has(tld)) {
    risks.push({
      type: 'ILLIQUID_TLD',
      severity: 'medium',
      description: `.${tld} has very low aftermarket demand — may take 6-12+ months to sell.`,
      mitigatable: false,
    })
  }

  // RISK 5: Hype-dependent value
  if (HYPE_TERMS.has(name) || [...HYPE_TERMS].some(t => name.includes(t))) {
    risks.push({
      type: 'TREND_DEPENDENT',
      severity: 'medium',
      description: `Value tied to "${name}" hype cycle — could decline if market sentiment shifts.`,
      mitigatable: true, // Sell quickly
    })
  }

  // RISK 6: Expensive renewal trap
  const renewalCost = EXPENSIVE_RENEWALS[tld] || 15
  const ev = auctionData?.estimatedValue || 0
  if (renewalCost > 30 && ev < renewalCost * 5) {
    risks.push({
      type: 'RENEWAL_TRAP',
      severity: 'low',
      description: `Annual renewal $${renewalCost} on .${tld} — if unsold within a year, renewals eat profit.`,
      mitigatable: true, // Don't renew
    })
  }

  // RISK 7: Serial dropper (domain age data shows multiple registrations)
  if (enrichment.domainAge !== undefined && enrichment.domainAge < 1 &&
      enrichment.referringDomains !== undefined && enrichment.referringDomains > 20) {
    // Young domain with lots of backlinks = was dropped recently, may be a repeat dropper
    risks.push({
      type: 'RECENT_DROP',
      severity: 'low',
      description: 'Recently dropped domain with existing backlinks — previous owner couldn\'t monetize.',
      mitigatable: false,
    })
  }

  // Calculate overall risk
  const riskScore = risks.reduce((sum, r) =>
    sum + (r.severity === 'high' ? 35 : r.severity === 'medium' ? 20 : 10), 0)

  const overallRisk: RiskAssessment['overallRisk'] =
    riskScore >= 60 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low'

  const maxBidMultiplier =
    overallRisk === 'critical' ? 0 :
    overallRisk === 'high' ? 0 :
    overallRisk === 'medium' ? 0.7 : 1.0

  const recommendation =
    overallRisk === 'critical' ? 'DO NOT BID — multiple high-severity risks' :
    overallRisk === 'high' ? 'MANUAL REVIEW ONLY — significant risks' :
    overallRisk === 'medium' ? 'PROCEED WITH CAUTION — max bid reduced 30%' :
    'LOW RISK — proceed normally'

  return { overallRisk, riskScore, risks, recommendation, maxBidMultiplier }
}
