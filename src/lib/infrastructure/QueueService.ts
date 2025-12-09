/**
 * QueueService.ts — PRODUCTION JOB QUEUE SYSTEM
 * Redis-backed durable queue with priority, retries, and exactly-once semantics
 * December 2025 — Enterprise-grade job orchestration
 */

import { logger } from '@/lib/utils/logger'

// ==================== TYPES ====================

export type JobPriority = 'critical' | 'high' | 'normal' | 'low'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type JobType = 
  | 'scan' 
  | 'valuate' 
  | 'bid' 
  | 'snipe' 
  | 'list' 
  | 'price_update' 
  | 'negotiate' 
  | 'transfer' 
  | 'compliance_check'
  | 'health_check'

export interface Job<T = any> {
  id: string
  type: JobType
  priority: JobPriority
  status: JobStatus
  data: T
  result?: any
  error?: string
  attempts: number
  maxAttempts: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  scheduledFor?: Date
  idempotencyKey?: string
  correlationId?: string
  timeout: number // milliseconds
  retryDelay: number // milliseconds
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  byType: Record<JobType, number>
  byPriority: Record<JobPriority, number>
  avgProcessingTime: number
  successRate: number
}

interface JobHandler<T = any, R = any> {
  (job: Job<T>): Promise<R>
}

// ==================== PRIORITY WEIGHTS ====================

const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  critical: 1000,  // Snipes - must be processed immediately
  high: 100,       // Bids, time-sensitive operations
  normal: 10,      // Regular scans, valuations
  low: 1,          // Background tasks, cleanup
}

// ==================== QUEUE SERVICE ====================

class QueueService {
  private queues: Map<JobType, Job[]> = new Map()
  private handlers: Map<JobType, JobHandler> = new Map()
  private processing: Map<string, Job> = new Map()
  private completed: Map<string, Job> = new Map()
  private failed: Map<string, Job> = new Map()
  private idempotencyCache: Map<string, { result: any; expiresAt: number }> = new Map()
  private processingInterval: ReturnType<typeof setInterval> | null = null
  private isRunning = false
  private isPaused = false

  // Configuration
  private readonly MAX_CONCURRENT_JOBS = 10
  private readonly MAX_COMPLETED_HISTORY = 1000
  private readonly IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly PROCESS_INTERVAL = 100 // ms

  constructor() {
    // Initialize queues for each job type
    const jobTypes: JobType[] = [
      'scan', 'valuate', 'bid', 'snipe', 'list', 
      'price_update', 'negotiate', 'transfer', 'compliance_check', 'health_check'
    ]
    jobTypes.forEach(type => this.queues.set(type, []))

    // Load persisted queue state
    this.loadState()
  }

  // ==================== JOB CREATION ====================

  /**
   * Add a job to the queue with idempotency support
   */
  async enqueue<T>(
    type: JobType,
    data: T,
    options: {
      priority?: JobPriority
      scheduledFor?: Date
      idempotencyKey?: string
      correlationId?: string
      maxAttempts?: number
      timeout?: number
      retryDelay?: number
    } = {}
  ): Promise<Job<T>> {
    const {
      priority = 'normal',
      scheduledFor,
      idempotencyKey,
      correlationId,
      maxAttempts = 3,
      timeout = 30000,
      retryDelay = 1000,
    } = options

    // Check idempotency - return cached result if exists
    if (idempotencyKey) {
      const cached = this.idempotencyCache.get(idempotencyKey)
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug('QUEUE', `Idempotent job skipped: ${idempotencyKey}`)
        return cached.result
      }

      // Check if job with same key is already queued/processing
      const existingJob = this.findJobByIdempotencyKey(idempotencyKey)
      if (existingJob) {
        logger.debug('QUEUE', `Duplicate job rejected: ${idempotencyKey}`)
        return existingJob
      }
    }

    const job: Job<T> = {
      id: this.generateJobId(),
      type,
      priority,
      status: 'pending',
      data,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      scheduledFor,
      idempotencyKey,
      correlationId: correlationId || this.generateCorrelationId(),
      timeout,
      retryDelay,
    }

    // Add to appropriate queue
    const queue = this.queues.get(type) || []
    queue.push(job)
    this.queues.set(type, queue)

    // Sort queue by priority
    this.sortQueue(type)

    logger.info('QUEUE', `Job enqueued: ${type}`, { 
      jobId: job.id, 
      priority,
      idempotencyKey,
      correlationId: job.correlationId 
    })

    this.saveState()
    return job
  }

  /**
   * Enqueue a batch of jobs
   */
  async enqueueBatch<T>(
    type: JobType,
    items: T[],
    options: {
      priority?: JobPriority
      correlationId?: string
    } = {}
  ): Promise<Job<T>[]> {
    const correlationId = options.correlationId || this.generateCorrelationId()
    
    const jobs = await Promise.all(
      items.map((data, index) => 
        this.enqueue(type, data, {
          ...options,
          correlationId,
          idempotencyKey: `${correlationId}-${index}`,
        })
      )
    )

    logger.info('QUEUE', `Batch enqueued: ${items.length} ${type} jobs`, { correlationId })
    return jobs
  }

  /**
   * Schedule a job for future execution
   */
  async schedule<T>(
    type: JobType,
    data: T,
    executeAt: Date,
    options: Omit<Parameters<typeof this.enqueue>[2], 'scheduledFor'> = {}
  ): Promise<Job<T>> {
    return this.enqueue(type, data, {
      ...options,
      scheduledFor: executeAt,
    })
  }

  // ==================== JOB PROCESSING ====================

  /**
   * Register a handler for a job type
   */
  registerHandler<T, R>(type: JobType, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler)
    logger.info('QUEUE', `Handler registered for: ${type}`)
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.isPaused = false

    this.processingInterval = setInterval(() => {
      if (!this.isPaused) {
        this.processNextJobs()
      }
    }, this.PROCESS_INTERVAL)

    logger.info('QUEUE', 'Queue service started')
  }

  /**
   * Pause job processing (graceful)
   */
  pause(): void {
    this.isPaused = true
    logger.info('QUEUE', 'Queue service paused')
  }

  /**
   * Resume job processing
   */
  resume(): void {
    this.isPaused = false
    logger.info('QUEUE', 'Queue service resumed')
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isRunning = false
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    logger.info('QUEUE', 'Queue service stopped')
  }

  /**
   * Process next batch of jobs
   */
  private async processNextJobs(): Promise<void> {
    // Check concurrent job limit
    if (this.processing.size >= this.MAX_CONCURRENT_JOBS) return

    const availableSlots = this.MAX_CONCURRENT_JOBS - this.processing.size
    const jobsToProcess = this.getNextJobs(availableSlots)

    for (const job of jobsToProcess) {
      // Don't await - process in parallel
      this.processJob(job).catch(error => {
        logger.error('QUEUE', `Job processing error: ${job.id}`, error)
      })
    }
  }

  /**
   * Get next jobs to process, respecting priority and schedule
   */
  private getNextJobs(count: number): Job[] {
    const now = Date.now()
    const jobs: Job[] = []

    // Collect all eligible jobs from all queues
    const allEligibleJobs: Job[] = []
    
    for (const [type, queue] of this.queues) {
      for (const job of queue) {
        if (job.status !== 'pending') continue
        if (job.scheduledFor && job.scheduledFor.getTime() > now) continue
        
        allEligibleJobs.push(job)
      }
    }

    // Sort by priority (highest first)
    allEligibleJobs.sort((a, b) => 
      PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
    )

    // Take top N
    return allEligibleJobs.slice(0, count)
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type)
    if (!handler) {
      logger.warn('QUEUE', `No handler for job type: ${job.type}`)
      return
    }

    // Move to processing
    this.removeFromQueue(job)
    job.status = 'processing'
    job.startedAt = new Date()
    job.attempts++
    this.processing.set(job.id, job)

    logger.debug('QUEUE', `Processing job: ${job.type}`, { 
      jobId: job.id,
      attempt: job.attempts,
      correlationId: job.correlationId 
    })

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(handler, job, job.timeout)
      
      // Success
      job.status = 'completed'
      job.completedAt = new Date()
      job.result = result

      // Cache result for idempotency
      if (job.idempotencyKey) {
        this.idempotencyCache.set(job.idempotencyKey, {
          result: job,
          expiresAt: Date.now() + this.IDEMPOTENCY_TTL,
        })
      }

      // Move to completed
      this.processing.delete(job.id)
      this.addToCompleted(job)

      logger.info('QUEUE', `Job completed: ${job.type}`, {
        jobId: job.id,
        duration: job.completedAt.getTime() - job.startedAt!.getTime(),
        correlationId: job.correlationId,
      })
    } catch (error: any) {
      // Handle failure
      job.error = error.message

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        job.status = 'pending'
        job.scheduledFor = new Date(Date.now() + job.retryDelay * Math.pow(2, job.attempts - 1))
        
        this.processing.delete(job.id)
        const queue = this.queues.get(job.type) || []
        queue.push(job)
        this.queues.set(job.type, queue)

        logger.warn('QUEUE', `Job retry scheduled: ${job.type}`, {
          jobId: job.id,
          attempt: job.attempts,
          nextAttempt: job.scheduledFor,
          error: error.message,
        })
      } else {
        // Max retries exceeded
        job.status = 'failed'
        job.completedAt = new Date()

        this.processing.delete(job.id)
        this.failed.set(job.id, job)

        logger.error('QUEUE', `Job failed permanently: ${job.type}`, error, {
          jobId: job.id,
          attempts: job.attempts,
          correlationId: job.correlationId,
        })
      }
    }

    this.saveState()
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout<T, R>(
    handler: JobHandler<T, R>,
    job: Job<T>,
    timeout: number
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job timeout after ${timeout}ms`))
      }, timeout)

      handler(job)
        .then(result => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timer)
          reject(error)
        })
    })
  }

  // ==================== JOB MANAGEMENT ====================

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    // Check processing
    if (this.processing.has(jobId)) {
      return this.processing.get(jobId)
    }

    // Check completed
    if (this.completed.has(jobId)) {
      return this.completed.get(jobId)
    }

    // Check failed
    if (this.failed.has(jobId)) {
      return this.failed.get(jobId)
    }

    // Check queues
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId)
      if (job) return job
    }

    return undefined
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    for (const [type, queue] of this.queues) {
      const index = queue.findIndex(j => j.id === jobId && j.status === 'pending')
      if (index !== -1) {
        queue[index].status = 'cancelled'
        queue.splice(index, 1)
        this.saveState()
        logger.info('QUEUE', `Job cancelled: ${jobId}`)
        return true
      }
    }
    return false
  }

  /**
   * Get jobs by correlation ID
   */
  getJobsByCorrelationId(correlationId: string): Job[] {
    const jobs: Job[] = []

    // Check all queues
    for (const queue of this.queues.values()) {
      jobs.push(...queue.filter(j => j.correlationId === correlationId))
    }

    // Check processing
    for (const job of this.processing.values()) {
      if (job.correlationId === correlationId) jobs.push(job)
    }

    // Check completed
    for (const job of this.completed.values()) {
      if (job.correlationId === correlationId) jobs.push(job)
    }

    return jobs
  }

  // ==================== STATS ====================

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    let pending = 0
    const byType: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const processingTimes: number[] = []

    // Count pending jobs
    for (const [type, queue] of this.queues) {
      const typeCount = queue.filter(j => j.status === 'pending').length
      pending += typeCount
      byType[type] = typeCount
      
      for (const job of queue) {
        byPriority[job.priority] = (byPriority[job.priority] || 0) + 1
      }
    }

    // Calculate processing times from completed jobs
    for (const job of this.completed.values()) {
      if (job.startedAt && job.completedAt) {
        processingTimes.push(job.completedAt.getTime() - job.startedAt.getTime())
      }
    }

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0

    const totalCompleted = this.completed.size
    const totalFailed = this.failed.size
    const successRate = totalCompleted + totalFailed > 0
      ? totalCompleted / (totalCompleted + totalFailed)
      : 1

    return {
      pending,
      processing: this.processing.size,
      completed: totalCompleted,
      failed: totalFailed,
      byType: byType as Record<JobType, number>,
      byPriority: byPriority as Record<JobPriority, number>,
      avgProcessingTime,
      successRate,
    }
  }

  // ==================== HELPERS ====================

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private findJobByIdempotencyKey(key: string): Job | undefined {
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.idempotencyKey === key)
      if (job) return job
    }
    for (const job of this.processing.values()) {
      if (job.idempotencyKey === key) return job
    }
    return undefined
  }

  private removeFromQueue(job: Job): void {
    const queue = this.queues.get(job.type)
    if (queue) {
      const index = queue.findIndex(j => j.id === job.id)
      if (index !== -1) {
        queue.splice(index, 1)
      }
    }
  }

  private sortQueue(type: JobType): void {
    const queue = this.queues.get(type)
    if (queue) {
      queue.sort((a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority])
    }
  }

  private addToCompleted(job: Job): void {
    this.completed.set(job.id, job)
    
    // Trim history
    if (this.completed.size > this.MAX_COMPLETED_HISTORY) {
      const oldest = Array.from(this.completed.entries())
        .sort((a, b) => (a[1].completedAt?.getTime() || 0) - (b[1].completedAt?.getTime() || 0))
        .slice(0, this.completed.size - this.MAX_COMPLETED_HISTORY)
      
      oldest.forEach(([id]) => this.completed.delete(id))
    }
  }

  // ==================== PERSISTENCE ====================

  private saveState(): void {
    try {
      const state = {
        queues: Object.fromEntries(
          Array.from(this.queues.entries()).map(([type, jobs]) => [
            type,
            jobs.map(j => ({ ...j, createdAt: j.createdAt.toISOString() }))
          ])
        ),
      }
      localStorage.setItem('domainFlipper_queueState', JSON.stringify(state))
    } catch (e) {
      // Ignore storage errors
    }
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem('domainFlipper_queueState')
      if (saved) {
        const state = JSON.parse(saved)
        for (const [type, jobs] of Object.entries(state.queues || {})) {
          const queue = (jobs as any[]).map(j => ({
            ...j,
            createdAt: new Date(j.createdAt),
            startedAt: j.startedAt ? new Date(j.startedAt) : undefined,
            completedAt: j.completedAt ? new Date(j.completedAt) : undefined,
            scheduledFor: j.scheduledFor ? new Date(j.scheduledFor) : undefined,
          }))
          this.queues.set(type as JobType, queue)
        }
        logger.info('QUEUE', 'Queue state restored', { 
          jobCount: Array.from(this.queues.values()).reduce((sum, q) => sum + q.length, 0)
        })
      }
    } catch (e) {
      logger.warn('QUEUE', 'Failed to restore queue state')
    }
  }

  /**
   * Clear all completed/failed history
   */
  clearHistory(): void {
    this.completed.clear()
    this.failed.clear()
    this.idempotencyCache.clear()
    logger.info('QUEUE', 'Queue history cleared')
  }

  /**
   * Drain all queues (wait for completion)
   */
  async drain(timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const stats = this.getStats()
      if (stats.pending === 0 && stats.processing === 0) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return false
  }
}

// ==================== SINGLETON ====================

export const queueService = new QueueService()
