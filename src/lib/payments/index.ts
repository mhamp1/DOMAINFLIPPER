/**
 * Payments Module Index
 * 
 * CANONICAL EXPORT: Only realCryptoWallet should be used for crypto payment operations.
 * The RealCryptoWallet class handles HD wallet generation and balance monitoring.
 * 
 * DEPRECATED FILES (not exported):
 * - CryptoPayments.ts - Old mock implementation, do not use
 * - provider.ts - Provider pattern unused, do not use
 */

export { 
  realCryptoWallet, 
  type WalletConfig, 
  type CryptoAddress, 
  type PaymentRequest, 
  type BalanceCheck 
} from './RealCryptoWallet'
