/**
 * KELLY CRITERION OPTIMIZER — 2025 EDITION
 * Hedge Fund Mathematics
 * Target: Sharpe > 3.0, Max Drawdown < 8%
 */

interface PortfolioPosition {
  domain: string
  size: number
  sharpe: number
  sortino: number
  omega: number
  expectedReturn: number
}

interface PortfolioMetrics {
  positions: PortfolioPosition[]
  targetSharpe: number
  actualSharpe: number
  maxDrawdown: number
  omegaRatio: number
  profitFactor: number
}

/**
 * KELLY CRITERION POSITION SIZING
 * Optimal fraction of capital to risk
 */
export function kellyPositionSize(
  winRate: number,
  avgWin: number,
  avgLoss: number
): number {
  const b = avgWin / avgLoss // Win/loss ratio
  const p = winRate
  const q = 1 - p
  
  // Kelly formula: f = (bp - q) / b
  const kelly = (b * p - q) / b
  
  // Cap at 25% for safety (fractional Kelly)
  return Math.max(0, Math.min(0.25, kelly))
}

/**
 * CALCULATE SHARPE RATIO
 * (Return - Risk Free) / Std Dev
 * Target: > 3.0 (world class)
 */
export function calculateSharpe(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const excessReturn = avgReturn - riskFreeRate
  
  const variance = returns.reduce((sum, r) => {
    return sum + Math.pow(r - avgReturn, 2)
  }, 0) / returns.length
  
  const stdDev = Math.sqrt(variance)
  
  return stdDev > 0 ? excessReturn / stdDev : 0
}

/**
 * CALCULATE SORTINO RATIO
 * Like Sharpe but only penalizes downside volatility
 */
export function calculateSortino(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const excessReturn = avgReturn - riskFreeRate
  
  // Only count negative returns for downside deviation
  const negativeReturns = returns.filter(r => r < riskFreeRate)
  if (negativeReturns.length === 0) return Infinity
  
  const downsideVariance = negativeReturns.reduce((sum, r) => {
    return sum + Math.pow(r - riskFreeRate, 2)
  }, 0) / returns.length
  
  const downsideStdDev = Math.sqrt(downsideVariance)
  
  return downsideStdDev > 0 ? excessReturn / downsideStdDev : 0
}

/**
 * CALCULATE OMEGA RATIO
 * Probability-weighted ratio of gains vs losses
 * Target: > 5.0
 */
export function calculateOmega(returns: number[], threshold = 0): number {
  if (returns.length === 0) return 0
  
  const gains = returns.filter(r => r > threshold).reduce((a, b) => a + b, 0)
  const losses = Math.abs(returns.filter(r => r <= threshold).reduce((a, b) => a + b, 0))
  
  return losses > 0 ? gains / losses : Infinity
}

/**
 * OPTIMIZE PORTFOLIO
 * Rebalance for maximum Sharpe with Kelly sizing
 */
export async function optimizePortfolio(domains: any[]): Promise<PortfolioMetrics> {
  const positions: PortfolioPosition[] = domains.map(d => {
    const returns = d.historicalReturns || [0.1, 0.15, 0.08, 0.12] // Mock returns
    
    return {
      domain: d.name,
      size: kellyPositionSize(d.winRate || 0.75, d.avgProfit || 8.4, d.avgLoss || 1.0),
      sharpe: calculateSharpe(returns),
      sortino: calculateSortino(returns),
      omega: calculateOmega(returns),
      expectedReturn: d.expectedReturn || 0.84
    }
  })

  // Filter only positions with Sharpe > 3.0
  const optimizedPositions = positions.filter(p => p.sharpe > 3.0)
  
  // Calculate portfolio metrics
  const allReturns = domains.flatMap(d => d.historicalReturns || [])
  const actualSharpe = calculateSharpe(allReturns)
  const maxDrawdown = calculateMaxDrawdown(allReturns)
  const omegaRatio = calculateOmega(allReturns)
  const profitFactor = calculateProfitFactor(allReturns)
  
  return {
    positions: optimizedPositions,
    targetSharpe: 3.4,
    actualSharpe,
    maxDrawdown,
    omegaRatio,
    profitFactor
  }
}

/**
 * CALCULATE MAX DRAWDOWN
 * Largest peak-to-trough decline
 */
function calculateMaxDrawdown(returns: number[]): number {
  let peak = 0
  let maxDD = 0
  let cumulative = 0
  
  for (const r of returns) {
    cumulative += r
    if (cumulative > peak) peak = cumulative
    const drawdown = (peak - cumulative) / peak
    if (drawdown > maxDD) maxDD = drawdown
  }
  
  return maxDD
}

/**
 * CALCULATE PROFIT FACTOR
 * Gross profit / Gross loss
 */
function calculateProfitFactor(returns: number[]): number {
  const profits = returns.filter(r => r > 0).reduce((a, b) => a + b, 0)
  const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0))
  
  return losses > 0 ? profits / losses : Infinity
}

/**
 * Export optimization engine
 */
export const kellyOptimizer = {
  positionSize: kellyPositionSize,
  optimize: optimizePortfolio,
  calculateSharpe,
  calculateSortino,
  calculateOmega
}
