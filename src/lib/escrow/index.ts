/**
 * Escrow Module Index
 * 
 * CANONICAL EXPORT: Only realEscrow should be used for all escrow operations.
 * The RealEscrow class connects to Escrow.com's actual API.
 * 
 * DEPRECATED FILES (not exported):
 * - EscrowAutomation.ts - Old mock implementation, do not use
 * - provider.ts - Provider pattern unused, do not use
 */

export { realEscrow, type EscrowTransaction, type CreateEscrowOptions, type EscrowConfig } from './RealEscrow'
