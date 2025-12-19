/**
 * Transfer Module Index
 * 
 * CANONICAL EXPORT: Only realDomainTransfer should be used for all transfer operations.
 * The RealDomainTransfer class handles actual domain transfers via registrar APIs.
 * 
 * DEPRECATED FILES (not exported):
 * - DomainTransfer.ts - Old mock implementation, do not use
 * - transferService.ts - Unused service pattern, do not use
 */

export { realDomainTransfer, type TransferRequest, type TransferResult } from './RealDomainTransfer'
