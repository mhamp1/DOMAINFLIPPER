/**
 * ProductionBrain.ts — THE PRODUCTION AUTONOMOUS ENGINE v2025.∞
 * Fully automated, hands-off domain flipping with enterprise-grade safety
 * 
 * Features:
 * - DRY_RUN mode for safe testing
 * - Kill switches for emergency stops
 * - Spend guards and Kelly sizing
 * - Circuit breakers for API resilience
 * - Full audit trail and compliance
 * - ML-driven decisioning with calibration
 * - Automated negotiation
 * - Job queue for reliable execution
 * 
 * December 2025 — The Empire is production-ready
 */

import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { valuationEngine } from '@/lib/ai/valuationEngine'
import { realDomainScanner, type ScannedDomain } from '@/lib/scanner/RealDomainScanner'
import { realSniper } from '@/lib/buy/RealSniper'
import { marketplaceLister } from '@/lib/marketplace/autoList'
import { godScoreEngine } from '@/lib/valuation/GodScore'
import { masterConfig } from '@/lib/config/MasterConfig'
import { empireSettings } from '@/lib/config/EmpireSettings'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { namecheapAPI } from '@/lib/api/namecheapReal'
import type { Domain } from '@/types/domain'

// Infrastructure imports
import { queueService, type Job, type JobType } from '@/lib/infrastructure/QueueService'
import { killSwitches, type KillSwitchType } from '@/lib/infrastructure/KillSwitches'
import { spendGuards, type SpendCheckResult } from '@/lib/infrastructure/SpendGuards'
import { auditLog } from '@/lib/infrastructure/AuditLog'
import { circuitBreaker } from '@/lib/infrastructure/CircuitBreaker'
import { metrics, type KPIs } from '@/lib/infrastructure/Metrics'

// Compliance & ML imports
import { complianceEngine, type ComplianceCheckResult } from '@/lib/compliance/ComplianceEngine'
import { featureStore, type DomainFeatures, type ValuationPrediction } from '@/lib/ml/FeatureStore'
import { negotiationBot, type NegotiationSession } from '@/lib/negotiation/NegotiationBot'

// Sales automation imports
import { automatedSaleFlow } from '@/lib/sales/AutomatedSaleFlow'
import { saleMonitor } from '@/lib/sales/SaleMonitor'
import { autoSeller } from '@/lib/empire/AutoSeller'

// ==================== TYPES ====================

export interface ProductionConfig {
  // Mode
  dryRun: boolean
  requireHumanApproval: boolean
  humanApprovalThreshold: number  // USD above which human approval required
  
  // Scanning
  scanIntervalMs: number
  maxDomainsPerScan: number
  scanSources: ('godaddy' | 'namecheap' | 'dropcatch' | 'expireddomains')[]
  
  // Acquisition
  minGodScore: number
  minROI: number
  minConfidence: number
  maxPricePerDomain: number
  enabledTLDs: string[]
  
  // Listing
  autoListEnabled: boolean
  listPriceMultiplier: number
  marketplaces: string[]
  
  // Risk
  maxPortfolioRisk: number
  stopLossPercent: number
  kellySizingEnabled: boolean
  
  // Compliance
  complianceEnabled: boolean
  minSafetyScore: number
  strictCompliance: boolean
  
  // Negotiation
  negotiationEnabled: boolean
  autoAcceptAbove: number
  
  // Logging
  verboseLogging: boolean
}

export interface BrainState {
  isRunning: boolean
  isPaused: boolean
  isDryRun: boolean
  mode: 'production' | 'dry_run' | 'stopped'
  
  // Stats
  cyclesCompleted: number
  domainsScanned: number
  domainsEvaluated: number
  domainsAcquired: number
  domainsSold: number
  domainsRejected: number
  
  // Financial
  totalCapital: number
  availableCapital: number
  totalSpent: number
  totalRevenue: number
  totalProfit: number
  todaySpent: number
  todayProfit: number
  
  // Performance
  hitRate: number
  winRate: number
  avgROI: number
  avgTimeToSale: number
  
  // Health
  activeKillSwitches: string[]
  circuitsOpen: string[]
  queueDepth: number
  lastError?: string
  lastErrorAt?: Date
  
  // Timestamps
  startedAt?: Date
  lastCycleAt?: Date
  nextCycleAt?: Date
  
  // Thoughts (for UI)
  thoughts: string[]
  mood: 'dormant' | 'scanning' | 'hunting' | 'acquiring' | 'listing' | 'negotiating' | 'triumphant' | 'cautious'
}

export interface AcquisitionCandidate {
  domain: string
  source: string
  price: number
  features: DomainFeatures
  valuation: ValuationPrediction
  godScore: number
  compliance: ComplianceCheckResult
  spendCheck: SpendCheckResult
  kellySize?: number
  decision: 'acquire' | 'skip' | 'human_review'
  reasoning: string
  correlationId: string
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: ProductionConfig = {
  // Mode - START IN DRY RUN
  dryRun: true,
  requireHumanApproval: true,
  humanApprovalThreshold: 500,
  
  // Scanning
  scanIntervalMs: 60000,  // 1 minute
  maxDomainsPerScan: 50,
  scanSources: ['godaddy', 'namecheap'],
  
  // Acquisition
  minGodScore: 80,
  minROI: 3,
  minConfidence: 0.6,
  maxPricePerDomain: 200,
  enabledTLDs: ['.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.dev'],
  
  // Listing
  autoListEnabled: true,
  listPriceMultiplier: 5,
  marketplaces: ['godaddy', 'sedo', 'afternic'],
  
  // Risk
  maxPortfolioRisk: 30,
  stopLossPercent: 20,
  kellySizingEnabled: true,
  
  // Compliance
  complianceEnabled: true,
  minSafetyScore: 70,
  strictCompliance: false,
  
  // Negotiation
  negotiationEnabled: true,
  autoAcceptAbove: 500,
  
  // Logging
  verboseLogging: true,
}

// ==================== PRODUCTION BRAIN ====================

class ProductionBrain {
  private config: ProductionConfig
  private state: BrainState
  private mainLoop: ReturnType<typeof setInterval> | null = null
  private listeners: Array<(state: BrainState) => void> = []
  private pendingApprovals: Map<string, AcquisitionCandidate> = new Map()

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
    this.state = this.createInitialState()
    
    // Load persisted config
    this.loadConfig()
    
    // Register job handlers
    this.registerJobHandlers()
    
    // Check if was running
    const wasRunning = localStorage.getItem('productionBrain_running') === 'true'
    if (wasRunning && !this.config.dryRun) {
      setTimeout(() => this.launch(), 2000)
    }
  }

  // ==================== LIFECYCLE ====================

  /**
   * Launch the production brain
   */
  async launch(): Promise<void> {
    if (this.state.isRunning) {
      this.speak('🔥 Brain already running')
      return
    }

    // Pre-flight checks
    if (!this.preflight()) {
      return
    }

    this.state.isRunning = true
    this.state.isPaused = false
    this.state.isDryRun = this.config.dryRun
    this.state.mode = this.config.dryRun ? 'dry_run' : 'production'
    this.state.startedAt = new Date()
    this.state.mood = 'scanning'

    // Load capital settings
    const empireConfig = masterConfig.getEmpire()
    this.state.totalCapital = empireConfig.totalCapital
    this.state.availableCapital = empireSettings.getAvailableCapital()

    localStorage.setItem('productionBrain_running', 'true')

    // Start queue service
    queueService.start()

    // Start automated sale monitoring (monitors ALL marketplaces for buyers)
    if (!this.config.dryRun) {
      await automatedSaleFlow.start()
      await autoSeller.start()
      this.speak('📡 Sale monitoring ACTIVE - watching all marketplaces')
    } else {
      this.speak('🔵 DRY RUN - Sale monitoring disabled')
    }

    // Start main loop
    this.mainLoop = setInterval(() => {
      if (!this.state.isPaused) {
        this.executeCycle()
      }
    }, this.config.scanIntervalMs)

    const modeStr = this.config.dryRun ? 'DRY RUN' : 'PRODUCTION'
    this.speak(`🚀 BRAIN LAUNCHED IN ${modeStr} MODE`)
    
    toast.success(`🧠 Production Brain: ${modeStr}`, {
      description: `Capital: $${this.state.totalCapital.toLocaleString()}`,
      duration: 10000,
    })

    auditLog.log('config_changed', `Brain launched in ${modeStr} mode`, {
      inputs: { 
        mode: this.state.mode,
        config: this.config 
      },
    })

    logger.critical('BRAIN', `Launched in ${modeStr} mode`)
    
    // Execute first cycle
    this.executeCycle()
    this.notifyListeners()
  }

  /**
   * Pre-flight checks before launch
   */
  private preflight(): boolean {
    // Check kill switches
    if (!killSwitches.isFullyOperational()) {
      const active = killSwitches.getActiveSwitches()
      this.speak(`⚠️ Kill switches active: ${active.map(s => s.type).join(', ')}`)
      toast.warning('Kill Switches Active', {
        description: 'Reset kill switches before launching',
      })
      return false
    }

    // Check API configuration
    if (!masterConfig.hasAnyAPIConfigured()) {
      this.speak('⚠️ No APIs configured')
      toast.error('No APIs Configured', {
        description: 'Configure at least one registrar API',
      })
      return false
    }

    // Check capital
    if (this.state.availableCapital < 10) {
      this.speak('⚠️ Insufficient capital')
      toast.warning('Low Capital', {
        description: 'Add more capital before launching',
      })
      return false
    }

    return true
  }

  /**
   * Stop the brain
   */
  stop(): void {
    this.state.isRunning = false
    this.state.isPaused = true
    this.state.mode = 'stopped'
    this.state.mood = 'dormant'

    if (this.mainLoop) {
      clearInterval(this.mainLoop)
      this.mainLoop = null
    }

    // Stop all services
    queueService.stop()
    automatedSaleFlow.stop()
    autoSeller.stop()
    saleMonitor.stop()
    
    localStorage.setItem('productionBrain_running', 'false')

    this.speak('🛑 Brain stopped')
    toast.warning('🛑 Production Brain Stopped')
    
    auditLog.log('config_changed', 'Brain stopped', {})
    this.notifyListeners()
  }

  /**
   * Pause/resume
   */
  pause(): void {
    this.state.isPaused = true
    this.state.mood = 'dormant'
    queueService.pause()
    this.speak('⏸️ Brain paused')
    this.notifyListeners()
  }

  resume(): void {
    this.state.isPaused = false
    this.state.mood = 'scanning'
    queueService.resume()
    this.speak('▶️ Brain resumed')
    this.notifyListeners()
  }

  // ==================== MAIN CYCLE ====================

  /**
   * Execute one complete cycle
   */
  private async executeCycle(): Promise<void> {
    if (!this.state.isRunning || this.state.isPaused) return

    // Check kill switches
    if (!killSwitches.canAcquire()) {
      this.speak('⚠️ Acquisitions paused by kill switch')
      return
    }

    const correlationId = `cycle_${Date.now()}`

    try {
      this.state.mood = 'scanning'
      this.state.cyclesCompleted++
      this.state.lastCycleAt = new Date()
      this.state.nextCycleAt = new Date(Date.now() + this.config.scanIntervalMs)

      // Update capital
      this.state.availableCapital = empireSettings.getAvailableCapital()
      this.state.todaySpent = spendGuards.getTodaySpent()

      // Check available budget
      const remaining = spendGuards.getRemainingBudget()
      if (remaining.daily < this.config.maxPricePerDomain * 0.5) {
        this.speak('💸 Daily budget nearly exhausted')
        this.state.mood = 'cautious'
        return
      }

      // Scan for opportunities
      auditLog.logScan('started', { 
        sources: this.config.scanSources,
        correlationId,
      })

      const scanStartTime = Date.now()
      const scanResult = await this.scan(correlationId)
      
      auditLog.logScan('completed', {
        sources: this.config.scanSources,
        domainsFound: scanResult.length,
        duration: Date.now() - scanStartTime,
        correlationId,
      })

      metrics.increment('domains_scanned', scanResult.length)
      this.state.domainsScanned += scanResult.length

      if (scanResult.length === 0) {
        this.speak('👁️ No opportunities this cycle')
        return
      }

      this.speak(`🔍 Found ${scanResult.length} candidates`)
      this.state.mood = 'hunting'

      // Evaluate each candidate
      const candidates = await this.evaluateCandidates(scanResult, correlationId)
      
      // Process acquisition decisions
      const acquired = await this.processAcquisitions(candidates)

      if (acquired > 0) {
        this.state.mood = 'triumphant'
        this.speak(`✅ Acquired ${acquired} domain(s)`)
      }

      // Update metrics
      this.updateMetrics()

    } catch (error: any) {
      this.state.lastError = error.message
      this.state.lastErrorAt = new Date()
      this.state.mood = 'cautious'
      
      this.speak(`❌ Error: ${error.message}`)
      logger.error('BRAIN', 'Cycle failed', error)
      
      // Check for repeated failures
      metrics.increment('api_calls')
      // Don't increment api_success since we failed
    }

    this.notifyListeners()
  }

  // ==================== SCANNING ====================

  /**
   * Scan for domain opportunities
   */
  private async scan(correlationId: string): Promise<ScannedDomain[]> {
    const config = masterConfig.getEmpire()
    const maxPrice = Math.min(
      config.dailyBudget,
      this.state.availableCapital,
      this.config.maxPricePerDomain
    )

    // Use circuit breaker for scanner
    return circuitBreaker.execute('scanner', async () => {
      const result = await realDomainScanner.scan({
        maxPrice,
        maxResults: this.config.maxDomainsPerScan,
      })
      return result.domains
    }, () => [])  // Empty array as fallback
  }

  // ==================== EVALUATION ====================

  /**
   * Evaluate candidates for acquisition
   */
  private async evaluateCandidates(
    domains: ScannedDomain[],
    correlationId: string
  ): Promise<AcquisitionCandidate[]> {
    const candidates: AcquisitionCandidate[] = []

    for (const domain of domains) {
      try {
        this.state.domainsEvaluated++
        const candidate = await this.evaluateOne(domain, correlationId)
        
        if (candidate.decision !== 'skip') {
          candidates.push(candidate)
        } else {
          this.state.domainsRejected++
        }

        metrics.increment('domains_filtered')
      } catch (error: any) {
        logger.warn('BRAIN', `Evaluation failed: ${domain.domain}`, { error: error.message })
        this.state.domainsRejected++
      }
    }

    // Sort by expected ROI
    candidates.sort((a, b) => {
      const roiA = a.valuation.value / a.price
      const roiB = b.valuation.value / b.price
      return roiB - roiA
    })

    return candidates
  }

  /**
   * Evaluate a single domain
   */
  private async evaluateOne(
    scanned: ScannedDomain,
    correlationId: string
  ): Promise<AcquisitionCandidate> {
    const domainName = scanned.domain

    // 1. TLD check
    const tld = '.' + domainName.split('.').pop()?.toLowerCase()
    if (!this.config.enabledTLDs.includes(tld)) {
      return this.createSkipCandidate(scanned, correlationId, `TLD ${tld} not enabled`)
    }

    // 2. Check availability and get real price
    const availability = await this.checkAvailability(domainName)
    if (!availability.available) {
      return this.createSkipCandidate(scanned, correlationId, 'Not available')
    }

    const price = availability.price

    // 3. Compliance check
    const compliance = await complianceEngine.check(domainName, correlationId)
    if (!compliance.passed && this.config.complianceEnabled) {
      auditLog.logCompliance(domainName, 'block', {
        checks: Object.fromEntries(compliance.checks.map(c => [c.name, c.passed])),
        riskLevel: compliance.riskLevel,
        reasons: compliance.blockedBy,
        correlationId,
      })
      return this.createSkipCandidate(scanned, correlationId, `Compliance: ${compliance.blockedBy?.join(', ')}`)
    }

    // 4. Extract features and valuate
    const features = await featureStore.extractFeatures(domainName, {
      monthlyTraffic: scanned.traffic,
      backlinks: scanned.backlinks,
    })

    const valuation = featureStore.predict(features)

    // 5. God Score
    const godScoreResult = await godScoreEngine.calculate(domainName)
    const godScore = godScoreResult.score

    // 6. Spend check
    const spendCheck = spendGuards.checkSpend(domainName, price)

    // 7. Calculate ROI
    const roi = valuation.calibratedValue 
      ? valuation.calibratedValue / price
      : valuation.value / price

    // 8. Kelly sizing (if enabled)
    let kellySize: number | undefined
    if (this.config.kellySizingEnabled) {
      const kelly = spendGuards.calculateKellySize(valuation.value, price)
      kellySize = kelly.recommendedBet
    }

    // 9. Make decision
    let decision: 'acquire' | 'skip' | 'human_review' = 'skip'
    let reasoning = ''

    if (!spendCheck.allowed) {
      reasoning = spendCheck.reason || 'Spend check failed'
    } else if (godScore < this.config.minGodScore) {
      reasoning = `God Score ${godScore} < ${this.config.minGodScore}`
    } else if (roi < this.config.minROI) {
      reasoning = `ROI ${roi.toFixed(1)}x < ${this.config.minROI}x`
    } else if (valuation.confidence < this.config.minConfidence) {
      reasoning = `Confidence ${(valuation.confidence * 100).toFixed(0)}% < ${this.config.minConfidence * 100}%`
    } else if (price > this.config.humanApprovalThreshold && this.config.requireHumanApproval) {
      decision = 'human_review'
      reasoning = `Price $${price} requires human approval`
    } else {
      decision = 'acquire'
      reasoning = `ROI: ${roi.toFixed(1)}x, Score: ${godScore}, Confidence: ${(valuation.confidence * 100).toFixed(0)}%`
    }

    // Log valuation
    auditLog.logValuation(
      domainName,
      { features, price, source: scanned.source },
      {
        value: valuation.value,
        score: godScore,
        confidence: valuation.confidence,
      },
      {
        made: decision,
        reasoning,
        thresholds: {
          minGodScore: this.config.minGodScore,
          minROI: this.config.minROI,
          minConfidence: this.config.minConfidence,
        },
      },
      correlationId
    )

    return {
      domain: domainName,
      source: scanned.source,
      price,
      features,
      valuation,
      godScore,
      compliance,
      spendCheck,
      kellySize,
      decision,
      reasoning,
      correlationId,
    }
  }

  private createSkipCandidate(
    scanned: ScannedDomain,
    correlationId: string,
    reasoning: string
  ): AcquisitionCandidate {
    return {
      domain: scanned.domain,
      source: scanned.source,
      price: scanned.price,
      features: {} as DomainFeatures,
      valuation: { value: 0, confidence: 0, confidenceInterval: { low: 0, high: 0 }, factors: [], comparables: [] },
      godScore: 0,
      compliance: { domain: scanned.domain, passed: false, riskScore: 100, riskLevel: 'critical', checks: [], warnings: [], recommendations: [], estimatedLegalRisk: 0 },
      spendCheck: { allowed: false, warnings: [], riskLevel: 'critical' },
      decision: 'skip',
      reasoning,
      correlationId,
    }
  }

  // ==================== ACQUISITION ====================

  /**
   * Process acquisition decisions
   */
  private async processAcquisitions(candidates: AcquisitionCandidate[]): Promise<number> {
    let acquired = 0

    for (const candidate of candidates) {
      if (candidate.decision === 'skip') continue

      if (candidate.decision === 'human_review') {
        // Store for human approval
        this.pendingApprovals.set(candidate.domain, candidate)
        this.speak(`⏳ Awaiting approval: ${candidate.domain} @ $${candidate.price}`)
        continue
      }

      // Acquire
      const success = await this.acquireDomain(candidate)
      if (success) {
        acquired++
        this.state.domainsAcquired++
      }
    }

    return acquired
  }

  /**
   * Acquire a single domain
   */
  private async acquireDomain(candidate: AcquisitionCandidate): Promise<boolean> {
    const { domain, price, valuation, correlationId } = candidate

    // DRY RUN mode - simulate only
    if (this.config.dryRun) {
      this.speak(`🔵 [DRY RUN] Would acquire: ${domain} @ $${price}`)
      
      auditLog.logBuy('attempted', domain, {
        price,
        registrar: candidate.source,
        correlationId,
      })

      auditLog.logBuy('success', domain, {
        price,
        registrar: candidate.source,
        reason: 'DRY RUN - simulated',
        correlationId,
      })

      metrics.increment('bids_placed')
      metrics.increment('bids_won')
      metrics.histogram('acquisition_cost', price)

      return true
    }

    // PRODUCTION mode - real acquisition
    this.state.mood = 'acquiring'

    try {
      // Record spend attempt
      spendGuards.recordSpend({
        domain,
        amount: price,
        type: 'buy',
        timestamp: new Date(),
        registrar: candidate.source,
        approved: true,
      })

      auditLog.logBuy('attempted', domain, {
        price,
        registrar: candidate.source,
        correlationId,
      })

      // Execute through circuit breaker
      const result = await circuitBreaker.execute(
        candidate.source,
        async () => realSniper.snipe({
          domain,
          source: candidate.source,
          price,
          type: 'buy_now',
          available: true,
        }, price)
      )

      if (result.success) {
        auditLog.logBuy('success', domain, {
          price: result.price,
          registrar: candidate.source,
          correlationId,
        })

        metrics.increment('bids_placed')
        metrics.increment('bids_won')
        metrics.histogram('acquisition_cost', result.price)

        this.speak(`💰 ACQUIRED: ${domain} @ $${result.price}`)

        // Auto-list if enabled
        if (this.config.autoListEnabled) {
          await this.listDomain(domain, valuation.value, correlationId)
        }

        return true
      } else {
        auditLog.logBuy('failed', domain, {
          price,
          registrar: candidate.source,
          reason: result.message,
          correlationId,
        })

        metrics.increment('bids_placed')
        this.speak(`❌ Failed: ${domain} - ${result.message}`)
        return false
      }
    } catch (error: any) {
      auditLog.logBuy('failed', domain, {
        price,
        registrar: candidate.source,
        reason: error.message,
        correlationId,
      })

      logger.error('BRAIN', `Acquisition failed: ${domain}`, error)
      return false
    }
  }

  // ==================== LISTING ====================

  /**
   * List a domain for sale
   */
  private async listDomain(
    domain: string,
    estimatedValue: number,
    correlationId: string
  ): Promise<void> {
    if (!killSwitches.canList()) {
      this.speak(`⚠️ Listing paused: ${domain}`)
      return
    }

    const listPrice = Math.round(estimatedValue * this.config.listPriceMultiplier)
    this.state.mood = 'listing'

    try {
      auditLog.log('list_attempted', `Listing ${domain}`, {
        domain,
        correlationId,
        inputs: { price: listPrice, marketplaces: this.config.marketplaces },
      })

      if (this.config.dryRun) {
        this.speak(`🔵 [DRY RUN] Would list: ${domain} @ $${listPrice}`)
        return
      }

      await circuitBreaker.execute('marketplace', async () => {
        return marketplaceLister.listOnAllMarketplaces(domain, listPrice)
      })

      auditLog.log('list_success', `Listed ${domain}`, {
        domain,
        correlationId,
        outputs: { price: listPrice },
      })

      this.speak(`📋 Listed: ${domain} @ $${listPrice.toLocaleString()}`)
    } catch (error: any) {
      auditLog.log('list_failed', `Failed to list ${domain}`, {
        domain,
        correlationId,
        outputs: { error: error.message },
      })
      logger.warn('BRAIN', `Listing failed: ${domain}`, { error: error.message })
    }
  }

  // ==================== AVAILABILITY CHECK ====================

  private async checkAvailability(domain: string): Promise<{ available: boolean; price: number; registrar: string }> {
    // Check GoDaddy
    if (masterConfig.isGoDaddyConfigured()) {
      try {
        const result = await circuitBreaker.execute('godaddy', async () => {
          return godaddyAPI.checkAvailability(domain)
        })
        if (result?.available) {
          return { available: true, price: result.price || 12, registrar: 'GoDaddy' }
        }
      } catch (e) {
        // Continue to next registrar
      }
    }

    // Check Namecheap
    if (masterConfig.isNamecheapConfigured()) {
      try {
        const results = await circuitBreaker.execute('namecheap', async () => {
          return namecheapAPI.checkAvailability([domain])
        })
        if (results?.[0]?.available) {
          return { available: true, price: results[0].price || 10, registrar: 'Namecheap' }
        }
      } catch (e) {
        // Continue
      }
    }

    return { available: false, price: 0, registrar: '' }
  }

  // ==================== JOB HANDLERS ====================

  private registerJobHandlers(): void {
    queueService.registerHandler('scan', async (job: Job) => {
      const result = await this.scan(job.correlationId || '')
      return { domainsFound: result.length }
    })

    queueService.registerHandler('valuate', async (job: Job<{ domain: string }>) => {
      const features = await featureStore.extractFeatures(job.data.domain)
      return featureStore.predict(features)
    })

    queueService.registerHandler('compliance_check', async (job: Job<{ domain: string }>) => {
      return complianceEngine.check(job.data.domain, job.correlationId)
    })

    queueService.registerHandler('list', async (job: Job<{ domain: string; price: number }>) => {
      return marketplaceLister.listOnAllMarketplaces(job.data.domain, job.data.price)
    })
  }

  // ==================== HUMAN APPROVAL ====================

  /**
   * Approve a pending acquisition
   */
  async approveAcquisition(domain: string): Promise<boolean> {
    const candidate = this.pendingApprovals.get(domain)
    if (!candidate) return false

    candidate.decision = 'acquire'
    this.pendingApprovals.delete(domain)

    const success = await this.acquireDomain(candidate)
    
    auditLog.log('human_override', `Approved: ${domain}`, {
      domain,
      actor: 'human',
      inputs: { price: candidate.price },
      correlationId: candidate.correlationId,
    })

    return success
  }

  /**
   * Reject a pending acquisition
   */
  rejectAcquisition(domain: string): void {
    const candidate = this.pendingApprovals.get(domain)
    if (!candidate) return

    this.pendingApprovals.delete(domain)
    
    auditLog.log('human_override', `Rejected: ${domain}`, {
      domain,
      actor: 'human',
      correlationId: candidate.correlationId,
    })

    this.speak(`❌ Rejected: ${domain}`)
  }

  getPendingApprovals(): AcquisitionCandidate[] {
    return Array.from(this.pendingApprovals.values())
  }

  // ==================== METRICS & STATE ====================

  private updateMetrics(): void {
    const stats = queueService.getStats()
    this.state.queueDepth = stats.pending
    this.state.hitRate = this.state.domainsEvaluated > 0
      ? (this.state.domainsAcquired / this.state.domainsEvaluated) * 100
      : 0

    // Update kill switch and circuit status
    this.state.activeKillSwitches = killSwitches.getActiveSwitches().map(s => s.type)
    this.state.circuitsOpen = circuitBreaker.getOpenCircuits()

    // Update metrics service
    metrics.gauge('queue_depth', stats.pending)
    metrics.gauge('active_negotiations', negotiationBot.getActiveSessions().length)
  }

  getState(): BrainState {
    return { ...this.state }
  }

  getKPIs(): KPIs {
    return metrics.calculateKPIs()
  }

  // ==================== CONFIGURATION ====================

  setConfig(config: Partial<ProductionConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
    
    auditLog.log('config_changed', 'Config updated', {
      inputs: config,
    })
    
    logger.info('BRAIN', 'Config updated', config)
    this.notifyListeners()
  }

  getConfig(): ProductionConfig {
    return { ...this.config }
  }

  /**
   * Enable/disable dry run mode
   */
  setDryRun(enabled: boolean): void {
    this.config.dryRun = enabled
    this.state.isDryRun = enabled
    this.state.mode = enabled ? 'dry_run' : 'production'
    this.saveConfig()
    
    toast.info(enabled ? '🔵 DRY RUN Enabled' : '🟢 PRODUCTION Mode')
    this.speak(enabled ? '🔵 Switched to DRY RUN' : '🟢 Switched to PRODUCTION')
    
    this.notifyListeners()
  }

  // ==================== COMMUNICATION ====================

  private speak(message: string): void {
    const timestamped = `[${new Date().toLocaleTimeString()}] ${message}`
    this.state.thoughts.unshift(timestamped)
    if (this.state.thoughts.length > 100) this.state.thoughts.pop()
    
    if (this.config.verboseLogging) {
      logger.info('BRAIN', message)
    }
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(listener: (state: BrainState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.getState()))
  }

  // ==================== PERSISTENCE ====================

  private createInitialState(): BrainState {
    return {
      isRunning: false,
      isPaused: true,
      isDryRun: true,
      mode: 'stopped',
      cyclesCompleted: 0,
      domainsScanned: 0,
      domainsEvaluated: 0,
      domainsAcquired: 0,
      domainsSold: 0,
      domainsRejected: 0,
      totalCapital: 500,
      availableCapital: 500,
      totalSpent: 0,
      totalRevenue: 0,
      totalProfit: 0,
      todaySpent: 0,
      todayProfit: 0,
      hitRate: 0,
      winRate: 0,
      avgROI: 0,
      avgTimeToSale: 0,
      activeKillSwitches: [],
      circuitsOpen: [],
      queueDepth: 0,
      thoughts: [],
      mood: 'dormant',
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('productionBrain_config', JSON.stringify(this.config))
    } catch (e) {
      // Ignore
    }
  }

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('productionBrain_config')
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
      }
    } catch (e) {
      // Ignore
    }
  }
}

// ==================== SINGLETON ====================

export const productionBrain = new ProductionBrain()
