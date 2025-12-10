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

// Thought stream for visible reasoning
import { thoughtStream } from '@/lib/autonomy/ThoughtStream'

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
      thoughtStream.think('warning', 'Acquisitions blocked by kill switch', [
        'Global acquisition pause is active',
        'Waiting for manual reset',
      ])
      this.speak('⚠️ Acquisitions paused by kill switch')
      return
    }

    const correlationId = `cycle_${Date.now()}`

    // Start thinking session for this cycle
    thoughtStream.startThinking(`Scan Cycle #${this.state.cyclesCompleted + 1}`)

    try {
      this.state.mood = 'scanning'
      this.state.cyclesCompleted++
      this.state.lastCycleAt = new Date()
      this.state.nextCycleAt = new Date(Date.now() + this.config.scanIntervalMs)

      // Update capital
      this.state.availableCapital = empireSettings.getAvailableCapital()
      this.state.todaySpent = spendGuards.getTodaySpent()

      thoughtStream.think('observation', 'Checking financial status', [
        `Available Capital: $${this.state.availableCapital.toLocaleString()}`,
        `Today's Spent: $${this.state.todaySpent.toLocaleString()}`,
        `Mode: ${this.config.dryRun ? 'DRY RUN' : 'PRODUCTION'}`,
      ])

      // Check available budget
      const remaining = spendGuards.getRemainingBudget()
      if (remaining.daily < this.config.maxPricePerDomain * 0.5) {
        thoughtStream.think('warning', 'Budget constraint detected', [
          `Daily remaining: $${remaining.daily.toLocaleString()}`,
          `Below threshold for acquisitions`,
          'Pausing until budget resets',
        ])
        this.speak('💸 Daily budget nearly exhausted')
        this.state.mood = 'cautious'
        thoughtStream.concludeThinking('Budget exhausted - waiting for reset')
        return
      }

      // Scan for opportunities
      thoughtStream.think('action', 'Initiating marketplace scan', [
        `Sources: ${this.config.scanSources.join(', ')}`,
        `Looking for undervalued domains...`,
      ])

      auditLog.logScan('started', { 
        sources: this.config.scanSources,
        correlationId,
      })

      const scanStartTime = Date.now()
      const scanResult = await this.scan(correlationId)
      const scanDuration = Date.now() - scanStartTime
      
      auditLog.logScan('completed', {
        sources: this.config.scanSources,
        domainsFound: scanResult.length,
        duration: scanDuration,
        correlationId,
      })

      thoughtStream.think('result', `Scan completed in ${(scanDuration / 1000).toFixed(1)}s`, [
        `Domains found: ${scanResult.length}`,
        `Sources checked: ${this.config.scanSources.length}`,
      ])

      metrics.increment('domains_scanned', scanResult.length)
      this.state.domainsScanned += scanResult.length

      if (scanResult.length === 0) {
        thoughtStream.think('observation', 'No viable opportunities detected', [
          'Markets may be quiet or highly competitive',
          'Will retry next cycle',
        ])
        this.speak('👁️ No opportunities this cycle')
        thoughtStream.concludeThinking('No opportunities found - cycle complete')
        return
      }

      thoughtStream.think('opportunity', `Found ${scanResult.length} potential candidates`, [
        'Beginning evaluation phase...',
        'Applying valuation model and compliance checks',
      ])
      this.speak(`🔍 Found ${scanResult.length} candidates`)
      this.state.mood = 'hunting'

      // Evaluate each candidate
      const candidates = await this.evaluateCandidates(scanResult, correlationId)
      
      if (candidates.length > 0) {
        const topCandidate = candidates[0]
        const roi = topCandidate ? (topCandidate.valuation.value / topCandidate.price * 100) : 0
        thoughtStream.think('analysis', `${candidates.length} candidates passed evaluation`, [
          `Approval rate: ${((candidates.length / scanResult.length) * 100).toFixed(1)}%`,
          `Top candidate: ${topCandidate?.domain || 'N/A'}`,
          `Best ROI: ${roi.toFixed(1)}%`,
        ])
      } else {
        thoughtStream.think('evaluation', 'All candidates filtered out', [
          'None met ROI or compliance thresholds',
          'Maintaining high standards',
        ])
      }

      // Process acquisition decisions
      const acquired = await this.processAcquisitions(candidates)

      if (acquired > 0) {
        this.state.mood = 'triumphant'
        thoughtStream.think('decision', `SUCCESS: Acquired ${acquired} domain(s)`, [
          'Domains added to portfolio',
          'Initiating marketplace listing...',
        ])
        this.speak(`✅ Acquired ${acquired} domain(s)`)
      }

      // Update metrics
      this.updateMetrics()
      
      thoughtStream.concludeThinking(`Cycle complete: Scanned ${scanResult.length}, Acquired ${acquired}`)

    } catch (error: any) {
      this.state.lastError = error.message
      this.state.lastErrorAt = new Date()
      this.state.mood = 'cautious'
      
      thoughtStream.think('warning', `Cycle error: ${error.message}`, [
        'Will retry next cycle',
        'Checking API health...',
      ])
      
      this.speak(`❌ Error: ${error.message}`)
      logger.error('BRAIN', 'Cycle failed', error)
      
      thoughtStream.concludeThinking(`Error occurred: ${error.message}`)
      
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
        logger.warn('BRAIN', `Evaluation failed: ${domain.domain}: ${error.message}`)
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

    // Start detailed evaluation thinking
    thoughtStream.think('analysis', `Evaluating: ${domainName}`, [
      `Source: ${scanned.source}`,
      `Initial Price: $${scanned.price?.toLocaleString() || 'Unknown'}`,
    ], { domain: domainName })

    // 1. TLD check
    const tld = '.' + domainName.split('.').pop()?.toLowerCase()
    if (!this.config.enabledTLDs.includes(tld)) {
      thoughtStream.think('evaluation', `Skipping ${domainName}`, [
        `TLD "${tld}" is not in enabled list`,
        `Enabled TLDs: ${this.config.enabledTLDs.join(', ')}`,
      ], { domain: domainName })
      return this.createSkipCandidate(scanned, correlationId, `TLD ${tld} not enabled`)
    }

    // 2. Check availability and get real price
    const availability = await this.checkAvailability(domainName)
    if (!availability.available) {
      thoughtStream.think('observation', `${domainName} not available`, [
        'Domain is already registered or reserved',
      ], { domain: domainName })
      return this.createSkipCandidate(scanned, correlationId, 'Not available')
    }

    const price = availability.price

    // 3. Compliance check
    thoughtStream.think('analysis', `Running compliance checks on ${domainName}`, [
      'Checking trademark conflicts...',
      'Checking brand impersonation...',
      'Checking UDRP risk...',
    ], { domain: domainName })

    const compliance = await complianceEngine.check(domainName, correlationId)
    if (!compliance.passed && this.config.complianceEnabled) {
      thoughtStream.think('warning', `Compliance FAILED for ${domainName}`, [
        `Risk Level: ${compliance.riskLevel}`,
        `Blocked by: ${compliance.blockedBy?.join(', ')}`,
        'Too risky for acquisition',
      ], { domain: domainName })
      auditLog.logCompliance(domainName, 'block', {
        checks: Object.fromEntries(compliance.checks.map(c => [c.name, c.passed])),
        riskLevel: compliance.riskLevel,
        reasons: compliance.blockedBy,
        correlationId,
      })
      return this.createSkipCandidate(scanned, correlationId, `Compliance: ${compliance.blockedBy?.join(', ')}`)
    }

    // 4. Extract features and valuate
    thoughtStream.think('calculation', `Extracting features for ${domainName}`, [
      `Length: ${domainName.split('.')[0].length} chars`,
      `TLD: ${tld}`,
      'Analyzing keywords, brandability, search data...',
    ], { domain: domainName })

    const features = await featureStore.extractFeatures(domainName, {
      monthlyTraffic: 0,
      backlinks: 0,
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

    thoughtStream.think('calculation', `Valuation complete for ${domainName}`, [
      `Estimated Value: $${valuation.value.toLocaleString()}`,
      `Purchase Price: $${price.toLocaleString()}`,
      `Expected ROI: ${roi.toFixed(1)}x (${((roi - 1) * 100).toFixed(0)}% profit)`,
      `God Score: ${godScore}/100`,
      `Confidence: ${(valuation.confidence * 100).toFixed(0)}%`,
    ], { domain: domainName, value: valuation.value, roi })

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
      thoughtStream.think('evaluation', `PASS on ${domainName}`, [
        `Reason: ${reasoning}`,
        'Budget constraints prevent acquisition',
      ], { domain: domainName, decision: 'skip' })
    } else if (godScore < this.config.minGodScore) {
      reasoning = `God Score ${godScore} < ${this.config.minGodScore}`
      thoughtStream.think('evaluation', `PASS on ${domainName}`, [
        `God Score: ${godScore} (min: ${this.config.minGodScore})`,
        'Domain quality below threshold',
      ], { domain: domainName, decision: 'skip' })
    } else if (roi < this.config.minROI) {
      reasoning = `ROI ${roi.toFixed(1)}x < ${this.config.minROI}x`
      thoughtStream.think('evaluation', `PASS on ${domainName}`, [
        `ROI: ${roi.toFixed(1)}x (min: ${this.config.minROI}x)`,
        'Profit margin too thin',
      ], { domain: domainName, decision: 'skip' })
    } else if (valuation.confidence < this.config.minConfidence) {
      reasoning = `Confidence ${(valuation.confidence * 100).toFixed(0)}% < ${this.config.minConfidence * 100}%`
      thoughtStream.think('evaluation', `PASS on ${domainName}`, [
        `Confidence: ${(valuation.confidence * 100).toFixed(0)}% (min: ${this.config.minConfidence * 100}%)`,
        'Valuation too uncertain',
      ], { domain: domainName, decision: 'skip' })
    } else if (price > this.config.humanApprovalThreshold && this.config.requireHumanApproval) {
      decision = 'human_review'
      reasoning = `Price $${price} requires human approval`
      thoughtStream.think('strategy', `HUMAN REVIEW needed for ${domainName}`, [
        `Price: $${price.toLocaleString()} exceeds auto-approval threshold`,
        `Estimated Value: $${valuation.value.toLocaleString()}`,
        `ROI: ${roi.toFixed(1)}x`,
        'Awaiting manual approval...',
      ], { domain: domainName, decision: 'human_review' })
    } else {
      decision = 'acquire'
      reasoning = `ROI: ${roi.toFixed(1)}x, Score: ${godScore}, Confidence: ${(valuation.confidence * 100).toFixed(0)}%`
      thoughtStream.think('opportunity', `🎯 ACQUIRE SIGNAL for ${domainName}`, [
        `✓ Price: $${price.toLocaleString()} (within budget)`,
        `✓ ROI: ${roi.toFixed(1)}x (${((roi - 1) * 100).toFixed(0)}% profit potential)`,
        `✓ God Score: ${godScore} (above ${this.config.minGodScore})`,
        `✓ Confidence: ${(valuation.confidence * 100).toFixed(0)}%`,
        `✓ Compliance: PASSED`,
        `→ Recommending acquisition`,
      ], { domain: domainName, decision: 'acquire', roi, godScore })
    }

    // Log valuation
    // Map human_review to 'watch' for audit log compatibility
    const auditDecision: 'acquire' | 'skip' | 'watch' = 
      decision === 'human_review' ? 'watch' : decision
    
    auditLog.logValuation(
      domainName,
      { features, price, source: scanned.source },
      {
        value: valuation.value,
        score: godScore,
        confidence: valuation.confidence,
      },
      {
        made: auditDecision,
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
      const validSource = (['godaddy', 'namecheap', 'dropcatch', 'expireddomains'].includes(candidate.source) 
        ? candidate.source 
        : 'godaddy') as ScannedDomain['source']
      
      const result = await circuitBreaker.execute(
        candidate.source,
        async () => realSniper.snipe({
          domain,
          source: validSource,
          price,
          type: 'registration',
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
        outputs: { errorMessage: error.message },
      })
      logger.warn('BRAIN', `Listing failed: ${domain}: ${error.message}`)
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
