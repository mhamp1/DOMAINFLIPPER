/**
 * Operating Cost Tracker — Full business P&L
 * Tracks every dollar in AND out so the bot knows TRUE profitability.
 */

export interface OperatingCosts {
  estibot_monthly: number; namebio_monthly: number; apify_monthly: number
  godaddy_auctions_yearly: number; godaddy_ddc_yearly: number
  vercel_monthly: number; other_monthly: number
  ai_spend_today: number; ai_spend_month: number; domain_renewals_month: number
}

export interface BusinessPL {
  flipRevenue: number; parkingRevenue: number; totalRevenue: number
  domainPurchases: number; domainRenewals: number; aiCosts: number; subscriptionCosts: number; totalCosts: number
  grossProfit: number; netProfit: number; profitMargin: number; dailyBurnRate: number
  costPerDomainAcquired: number; costPerDomainSold: number
  isNetProfitable: boolean
}

export function getOperatingCostsFromEnv(): OperatingCosts {
  const env = (k: string, d: string = '0') => parseFloat(process.env[k] || d)
  return {
    estibot_monthly: env('COST_ESTIBOT_MONTHLY'), namebio_monthly: env('COST_NAMEBIO_MONTHLY'),
    apify_monthly: env('COST_APIFY_MONTHLY'), godaddy_auctions_yearly: env('COST_GD_AUCTIONS_YEARLY', '4.99'),
    godaddy_ddc_yearly: env('COST_GD_DDC_YEARLY'), vercel_monthly: env('COST_VERCEL_MONTHLY', '20'),
    other_monthly: env('COST_OTHER_MONTHLY'), ai_spend_today: 0, ai_spend_month: 0, domain_renewals_month: 0,
  }
}

export function getDailyOperatingCost(costs: OperatingCosts): number {
  const monthlyFixed = costs.estibot_monthly + costs.namebio_monthly + costs.apify_monthly + costs.vercel_monthly + costs.other_monthly + (costs.godaddy_auctions_yearly / 12) + (costs.godaddy_ddc_yearly / 12)
  return Math.round((monthlyFixed / 30 + costs.ai_spend_today) * 100) / 100
}

export function calculatePL(
  revenue: { flips: number; parking: number },
  costs: { purchases: number; renewals: number; ai: number; subscriptions: number },
  meta: { domainsAcquired: number; domainsSold: number; periodDays: number },
): BusinessPL {
  const totalRevenue = revenue.flips + revenue.parking
  const totalCosts = costs.purchases + costs.renewals + costs.ai + costs.subscriptions
  const grossProfit = totalRevenue - costs.purchases
  const netProfit = totalRevenue - totalCosts
  const profitMargin = totalRevenue > 0 ? Math.round(netProfit / totalRevenue * 100) : 0
  const dailyBurnRate = meta.periodDays > 0 ? Math.round(totalCosts / meta.periodDays * 100) / 100 : 0
  return {
    flipRevenue: revenue.flips, parkingRevenue: revenue.parking, totalRevenue,
    domainPurchases: costs.purchases, domainRenewals: costs.renewals, aiCosts: costs.ai, subscriptionCosts: costs.subscriptions, totalCosts,
    grossProfit, netProfit, profitMargin, dailyBurnRate,
    costPerDomainAcquired: meta.domainsAcquired > 0 ? Math.round(totalCosts / meta.domainsAcquired * 100) / 100 : 0,
    costPerDomainSold: meta.domainsSold > 0 ? Math.round(totalCosts / meta.domainsSold * 100) / 100 : 0,
    isNetProfitable: netProfit > 0,
  }
}
