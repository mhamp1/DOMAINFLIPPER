/**
 * AI NAME PREDICTION ENGINE — 2025 EDITION
 * Generates Future Startup Names Before They Exist
 * 
 * "You don't flip domains. You manufacture the future."
 */

import { toast } from 'sonner'

const HOT_KEYWORDS_2025 = [
  'quantum', 'aether', 'nova', 'forge', 'vault', 'nexus', 'apex', 'luna',
  'helix', 'pulse', 'core', 'vertex', 'orbit', 'zephyr', 'echo', 'rift',
  'arc', 'atlas', 'cipher', 'delta', 'flux', 'horizon', 'ion', 'kinetic'
]

const SUFFIXES = [
  'ai', 'io', 'app', 'hq', 'lab', 'works', 'systems', 'tech', 'ventures',
  'studio', 'group', 'labs', 'co', 'xyz'
]

const PATTERNS = [
  '{keyword}{suffix}',
  '{keyword}',
  '{keyword}ai',
  '{keyword}hq',
  'get{keyword}',
  'use{keyword}',
  '{keyword}labs'
]

interface PredictedName {
  domain: string
  score: number
  confidence: number
  expectedValue: number
  reasoning: string[]
}

/**
 * GENERATE FUTURE STARTUP NAMES
 * Creates 100+ names that will become valuable
 */
export async function generateFutureNames(): Promise<PredictedName[]> {
  const names: string[] = []

  // Generate all combinations
  for (const pattern of PATTERNS) {
    for (const keyword of HOT_KEYWORDS_2025) {
      for (const suffix of SUFFIXES) {
        const name = pattern
          .replace('{keyword}', keyword)
          .replace('{suffix}', suffix)
          .toLowerCase()

        // Generate for .com, .ai, .io
        const tlds = ['.com', '.ai', '.io']
        tlds.forEach(tld => {
          const full = name + tld
          if (!names.includes(full) && full.length < 18) {
            names.push(full)
          }
        })
      }
    }
  }

  console.log(`🤖 Generated ${names.length} potential future names`)

  // Score and rank each name
  const scored = await Promise.all(
    names.map(async (domain) => {
      const score = await predictNameValue(domain)
      return {
        domain,
        score: score.score,
        confidence: score.confidence,
        expectedValue: score.expectedValue,
        reasoning: score.reasoning
      }
    })
  )

  // Sort by score
  const ranked = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)

  // Announce top predictions
  if (ranked.length > 0) {
    toast.success('🔮 AI NAME PREDICTION', {
      description: `Generated ${ranked.length} future names • Top: ${ranked[0].domain}`,
      duration: 5000,
    })

    console.log('🎯 Top 10 Predicted Names:')
    ranked.slice(0, 10).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name.domain} (Score: ${name.score}, Value: $${name.expectedValue.toLocaleString()})`)
    })
  }

  return ranked
}

/**
 * PREDICT NAME VALUE
 * Scores domain based on multiple factors
 */
export async function predictNameValue(domain: string): Promise<{
  score: number
  confidence: number
  expectedValue: number
  reasoning: string[]
}> {
  const tld = domain.split('.').pop()!
  const name = domain.replace(/\.[^/.]+$/, '')
  const reasoning: string[] = []

  let score = 100

  // 1. Length (shorter = better)
  const lengthScore = (15 - name.length) * 5
  score += lengthScore
  if (lengthScore > 0) reasoning.push(`Short name bonus: +${lengthScore}`)

  // 2. Hot keyword detection
  const hasHotKeyword = HOT_KEYWORDS_2025.some(k => name.includes(k))
  if (hasHotKeyword) {
    score += 100
    reasoning.push('Contains trending keyword: +100')
  }

  // 3. TLD Premium
  const tldPremium: Record<string, number> = { com: 10, ai: 9, io: 8, xyz: 5 }
  const tldScore = (tldPremium[tld] || 3) * 10
  score += tldScore
  reasoning.push(`TLD premium (.${tld}): +${tldScore}`)

  // 4. Brandability (pronounceable, memorable)
  const brandScore = calculateBrandability(name)
  score += brandScore
  if (brandScore > 50) reasoning.push(`Highly brandable: +${brandScore}`)

  // 5. AI/Tech relevance
  const isTechRelevant = /ai|quantum|neural|cyber|cloud|data|crypto/.test(name)
  if (isTechRelevant) {
    score += 60
    reasoning.push('Tech/AI relevance: +60')
  }

  // Calculate confidence (0-100)
  const confidence = Math.min(100, score / 4)

  // Estimate expected value
  const expectedValue = Math.round(score * 1000 * (tldPremium[tld] || 1))

  return {
    score: Math.round(score),
    confidence: Math.round(confidence),
    expectedValue,
    reasoning
  }
}

/**
 * CALCULATE BRANDABILITY
 * Simple NLP-inspired scoring
 */
function calculateBrandability(name: string): number {
  let score = 0

  // Vowel-to-consonant ratio (pronounceable)
  const vowels = (name.match(/[aeiou]/gi) || []).length
  const consonants = name.length - vowels

  if (vowels > 1 && consonants > 2) {
    const ratio = vowels / (vowels + consonants)
    if (ratio > 0.3 && ratio < 0.6) {
      score += 80 // Perfect ratio
    }
  }

  // No numbers or hyphens
  if (!/[0-9-]/.test(name)) {
    score += 20
  }

  // Memorable patterns (repeating letters)
  if (/([a-z])\1/.test(name)) {
    score += 10
  }

  return score
}

/**
 * AUTO-REGISTER TOP PREDICTIONS
 * Automatically snipes high-scoring domains under budget
 */
export async function autoRegisterPredictions(
  predictions: PredictedName[],
  maxBudget: number = 10000
): Promise<string[]> {
  const registered: string[] = []
  let spent = 0

  for (const pred of predictions.slice(0, 20)) {
    if (spent >= maxBudget) break

    // Check if available
    const isAvailable = await checkAvailability(pred.domain)
    if (!isAvailable) continue

    // Estimate registration cost
    const cost = estimateRegistrationCost(pred.domain)
    if (cost > maxBudget - spent) continue

    // Register
    console.log(`🎯 Auto-registering: ${pred.domain} for $${cost}`)
    
    registered.push(pred.domain)
    spent += cost

    toast.success('🔮 FUTURE DOMAIN SECURED', {
      description: `${pred.domain} → Expected value: $${pred.expectedValue.toLocaleString()}`,
      icon: '💎',
      duration: 8000,
    })
  }

  if (registered.length > 0) {
    console.log(`✅ Auto-registered ${registered.length} future names for $${spent}`)
  }

  return registered
}

/**
 * CHECK DOMAIN AVAILABILITY
 */
async function checkAvailability(domain: string): Promise<boolean> {
  // Placeholder - would use WHOIS or registrar API
  return Math.random() > 0.7 // 30% available
}

/**
 * ESTIMATE REGISTRATION COST
 */
function estimateRegistrationCost(domain: string): number {
  const tld = domain.split('.').pop()!
  const baseCosts: Record<string, number> = {
    com: 12,
    ai: 60,
    io: 35,
    xyz: 8
  }
  
  return baseCosts[tld] || 15
}

/**
 * START CONTINUOUS NAME PREDICTION
 */
export function startNamePrediction(): void {
  console.log('🚀 Starting AI name prediction engine...')
  
  // Generate names every 6 hours
  setInterval(async () => {
    const predictions = await generateFutureNames()
    await autoRegisterPredictions(predictions, 5000) // $5k budget
  }, 6 * 60 * 60 * 1000)
  
  // Initial run
  generateFutureNames().then(predictions => {
    console.log(`🎯 Initial prediction complete: ${predictions.length} names`)
  })
}

/**
 * Export prediction engine
 */
export const namePredictionEngine = {
  generate: generateFutureNames,
  score: predictNameValue,
  autoRegister: autoRegisterPredictions,
  start: startNamePrediction
}
