/**
 * API Module Index
 * 
 * This module exports the CANONICAL API clients for all external services.
 * 
 * ARCHITECTURE:
 * - All API clients are singletons that read credentials from MasterConfig
 * - Clients auto-initialize and can be reinit() after config changes
 * - Rate limiting is built into each client
 * 
 * CANONICAL APIS (Use these):
 * - godaddyAPI - GoDaddy domains, auctions, and bidding
 * - namecheapAPI - Namecheap domains and availability
 * - dropCatchAPI - DropCatch backorders and auctions (OAuth2)
 * - sedoAPI - Sedo market data and affiliate links
 * - namebrightAPI - NameBright domains and registration (OAuth2)
 * 
 * DEPRECATED (for backwards compatibility only):
 * - createGoDaddyClient - Old factory pattern, use godaddyAPI instead
 * - createNamecheapClient - Old factory pattern, use namecheapAPI instead
 */

// ==================== CANONICAL APIS ====================

// GoDaddy - Auctions, Domains, Bidding
export { godaddyAPI, type GoDaddyDomain, type GoDaddyAuction, type GoDaddyBidResult } from './godaddyReal'

// Namecheap - Domains, Availability
export { namecheapAPI, NamecheapAPI, type NamecheapDomain, type NamecheapPurchaseResult } from './namecheapReal'

// DropCatch - Backorders, Auctions (OAuth2)
export { 
  dropCatchAPI, 
  createDropCatchClient,
  type DropCatchConfig, 
  type DropCatchDomain, 
  type BackorderResult, 
  type AuctionBidResult,
  type DropTimeInfo 
} from './dropcatch'

// Sedo - Market Data, Affiliate Links
export { 
  sedoAPI, 
  getSedoAPI,
  generateSedoAffiliateLink,
  generateSedoDomainLink,
  type SedoConfig, 
  type SedoDomain, 
  type SedoSearchResult 
} from './sedo'

// NameBright - Domains, Registration, DNS (OAuth2)
export {
  namebrightAPI,
  createNameBrightClient,
  type NameBrightConfig,
  type DomainAvailability as NameBrightAvailability,
  type DomainInfo as NameBrightDomainInfo,
  type RegisterResult as NameBrightRegisterResult,
  type DnsRecord as NameBrightDnsRecord,
} from './namebright'

// ExpiredDomains - Via Apify scraping (factory pattern)
export { ExpiredDomainsAPI, createExpiredDomainsClient } from './expiredDomains'

// ==================== LEGACY/DEPRECATED ====================

// Old factory patterns - deprecated, use singleton APIs above
export { GoDaddyAPI, createGoDaddyClient } from './godaddy'
export { createNamecheapClient } from './namecheapReal'
