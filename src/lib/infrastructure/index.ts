/**
 * Infrastructure Module Index
 * Production-grade systems for enterprise domain flipping
 * December 2025
 */

// Queue & Job Management
export { queueService, type Job, type JobType, type JobPriority, type JobStatus, type QueueStats } from './QueueService'

// Safety Controls
export { killSwitches, type KillSwitchType, type KillSwitchState, type KillSwitchConfig } from './KillSwitches'
export { spendGuards, type SpendLimits, type SpendCheckResult, type SpendTransaction, type KellyResult } from './SpendGuards'

// Observability
export { auditLog, type AuditEntry, type AuditEventType, type AuditQuery, type AuditStats } from './AuditLog'
export { metrics, type KPIs, type MetricValue, type AlertRule, type Alert } from './Metrics'

// Resilience
export { circuitBreaker, withCircuitBreaker, type CircuitState, type CircuitStats, type CircuitConfig } from './CircuitBreaker'
