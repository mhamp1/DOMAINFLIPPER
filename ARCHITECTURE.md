# 🏗️ DomainFlipper Architecture

**Last Updated:** December 7, 2025  
**Purpose:** Canonical reference for system architecture and module usage

---

## 📊 System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                    DOMAINFLIPPER PRODUCTION SYSTEM                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    PRODUCTION BRAIN                           │ │
│  │           (src/lib/autonomy/ProductionBrain.ts)              │ │
│  │    • Main execution engine with safety infrastructure        │ │
│  │    • Kill switches, spend guards, circuit breakers           │ │
│  │    • Thought stream for visible reasoning                    │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │                                        │
│      ┌────────────────────┼────────────────────┐                  │
│      │                    │                    │                  │
│  ┌───▼───┐           ┌────▼────┐          ┌────▼────┐            │
│  │SCANNER│           │VALUATION│          │ SNIPER  │            │
│  │ENGINES│           │ ENGINE  │          │ ENGINE  │            │
│  └───┬───┘           └────┬────┘          └────┬────┘            │
│      │                    │                    │                  │
│  GoDaddy API         God Score            realSniper              │
│  Namecheap API       Feature Store        sniperEngine            │
│  DropCatch API       ML Predictions                               │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     SALES AUTOMATION                          │ │
│  │    • SaleMonitor - Polls for inquiries/won auctions          │ │
│  │    • AutomatedSaleFlow - Full sale pipeline                  │ │
│  │    • NegotiationBot - Automated deal-making                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     EXTERNAL INTEGRATIONS                     │ │
│  │    • RealEscrow - Escrow.com API (Basic Auth)                │ │
│  │    • RealDomainTransfer - Domain push/transfer               │ │
│  │    • RealCryptoWallet - HD wallet for crypto payments        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ CANONICAL MODULES (Use These)

### Core Orchestration
| Module | File | Purpose |
|--------|------|---------|
| **ProductionBrain** | `src/lib/autonomy/ProductionBrain.ts` | Main autonomous execution engine |
| **ThoughtStream** | `src/lib/autonomy/ThoughtStream.ts` | Real-time reasoning visualization |
| **EmpireEngine** | `src/lib/autonomy/EmpireEngine.ts` | Empire state management |

### API Clients
| Module | File | Auth Method |
|--------|------|-------------|
| **godaddyAPI** | `src/lib/api/godaddyReal.ts` | SSO Key + Secret |
| **namecheapAPI** | `src/lib/api/namecheapReal.ts` | API Key + IP Whitelist |
| **dropCatchAPI** | `src/lib/api/dropcatch.ts` | OAuth2 Token |
| **sedoAPI** | `src/lib/api/sedo.ts` | Partner ID (affiliate) |
| **namebrightAPI** | `src/lib/api/namebright.ts` | OAuth2 Token |

### Acquisition
| Module | File | Purpose |
|--------|------|---------|
| **realSniper** | `src/lib/buy/RealSniper.ts` | Domain acquisition execution |
| **realDomainScanner** | `src/lib/scanner/RealDomainScanner.ts` | Multi-source scanning |
| **sniperEngine** | `src/lib/auctions/sniperEngine.ts` | Auction timing |

### Sales Pipeline
| Module | File | Purpose |
|--------|------|---------|
| **saleMonitor** | `src/lib/sales/SaleMonitor.ts` | Poll for inquiries/auctions |
| **automatedSaleFlow** | `src/lib/sales/AutomatedSaleFlow.ts` | Full sale orchestration |
| **negotiationBot** | `src/lib/negotiation/NegotiationBot.ts` | Automated negotiations |
| **autoSeller** | `src/lib/empire/AutoSeller.ts` | Auto-listing and pricing |

### Financial
| Module | File | Purpose |
|--------|------|---------|
| **realEscrow** | `src/lib/escrow/RealEscrow.ts` | Escrow.com API |
| **realDomainTransfer** | `src/lib/transfer/RealDomainTransfer.ts` | Domain transfers |
| **realCryptoWallet** | `src/lib/payments/RealCryptoWallet.ts` | Crypto payments |

### Infrastructure
| Module | File | Purpose |
|--------|------|---------|
| **killSwitches** | `src/lib/infrastructure/KillSwitches.ts` | Emergency stops |
| **spendGuards** | `src/lib/infrastructure/SpendGuards.ts` | Budget controls |
| **circuitBreaker** | `src/lib/infrastructure/CircuitBreaker.ts` | API resilience |
| **auditLog** | `src/lib/infrastructure/AuditLog.ts` | Decision audit trail |
| **metrics** | `src/lib/infrastructure/Metrics.ts` | KPIs and monitoring |
| **queueService** | `src/lib/infrastructure/QueueService.ts` | Job queue |

### Intelligence
| Module | File | Purpose |
|--------|------|---------|
| **complianceEngine** | `src/lib/compliance/ComplianceEngine.ts` | Trademark/legal checks |
| **featureStore** | `src/lib/ml/FeatureStore.ts` | ML feature extraction |
| **godScoreEngine** | `src/lib/valuation/GodScore.ts` | Domain scoring |
| **valuationEngine** | `src/lib/ai/valuationEngine.ts` | AI valuation |

---

## ⚠️ DEPRECATED MODULES (Do Not Use)

These files exist for backwards compatibility but should NOT be used in new code:

### Deprecated Brains
| File | Replacement |
|------|-------------|
| `src/lib/autonomy/AutonomousBrain.ts` | Use `ProductionBrain` |
| `src/lib/empire/EmpireBrain.ts` | Use `ProductionBrain` + `EmpireEngine` |

### Deprecated Escrow/Transfer
| File | Replacement |
|------|-------------|
| `src/lib/escrow/EscrowAutomation.ts` | Use `realEscrow` |
| `src/lib/escrow/provider.ts` | Use `realEscrow` |
| `src/lib/transfer/DomainTransfer.ts` | Use `realDomainTransfer` |
| `src/lib/payments/CryptoPayments.ts` | Use `realCryptoWallet` |
| `src/lib/payments/provider.ts` | Use `realCryptoWallet` |

### Deprecated APIs
| File | Replacement |
|------|-------------|
| `src/lib/api/godaddy.ts` | Use `godaddyAPI` from `godaddyReal.ts` |
| `src/lib/api/namecheap.ts` | Use `namecheapAPI` from `namecheapReal.ts` |

### Deprecated Snipers
| File | Replacement |
|------|-------------|
| `src/lib/sniper/godSniper.ts` | Use `realSniper` |
| `src/lib/multiSniper/MultiRegistrarSniper.ts` | Use `realSniper` |
| `src/lib/auctions/dropCatchSniper.ts` | Use `dropCatchAPI` directly |

---

## 🔄 Data Flow

### Acquisition Flow
```
1. ProductionBrain.executeCycle()
   ↓
2. RealDomainScanner.scan() → Get opportunities from GoDaddy/Namecheap/DropCatch
   ↓
3. FeatureStore.extractFeatures() → Extract ML features
   ↓
4. FeatureStore.predict() → Get valuation prediction
   ↓
5. GodScoreEngine.calculate() → Get domain score
   ↓
6. ComplianceEngine.check() → Verify legal safety
   ↓
7. SpendGuards.checkSpend() → Verify budget
   ↓
8. Decision: ACQUIRE / SKIP / HUMAN_REVIEW
   ↓
9. RealSniper.snipe() → Execute purchase (if ACQUIRE)
   ↓
10. MarketplaceLister.listOnAllMarketplaces() → List for sale
```

### Sale Flow
```
1. SaleMonitor polls marketplaces for inquiries
   ↓
2. AutomatedSaleFlow.handleInquiry() → New sale initiated
   ↓
3. NegotiationBot.startSession() → Begin negotiation
   ↓
4. NegotiationBot.processOffer() → Counter/Accept/Reject
   ↓
5. RealEscrow.createTransaction() → Create escrow
   ↓
6. (Buyer pays into escrow)
   ↓
7. RealDomainTransfer.initiateTransfer() → Push domain
   ↓
8. RealEscrow.markAsShipped() → Mark transferred
   ↓
9. (Escrow releases funds)
   ↓
10. EmpireSettings.recordSale() → Record P&L
```

---

## 🛡️ Safety Systems

### Kill Switches
- `global` - Stop all operations
- `acquisitions` - Stop buying
- `listings` - Stop listing
- `transfers` - Stop transfers
- `negotiations` - Stop negotiations

### Spend Guards
- Daily budget limits
- Per-domain caps
- Kelly criterion sizing
- Stop-loss triggers

### Circuit Breakers
- Per-API failure thresholds
- Automatic recovery
- Fallback behavior

---

## 📁 Module Index Files

Each major module has an `index.ts` that exports canonical implementations:

- `src/lib/autonomy/index.ts` - Brain exports
- `src/lib/api/index.ts` - API client exports
- `src/lib/sales/index.ts` - Sale flow exports
- `src/lib/escrow/index.ts` - Escrow exports
- `src/lib/transfer/index.ts` - Transfer exports
- `src/lib/payments/index.ts` - Payment exports
- `src/lib/infrastructure/index.ts` - Infrastructure exports
- `src/lib/compliance/index.ts` - Compliance exports
- `src/lib/ml/index.ts` - ML exports
- `src/lib/negotiation/index.ts` - Negotiation exports

---

## 🚀 Quick Reference

```typescript
// CORRECT - Use canonical imports
import { productionBrain } from '@/lib/autonomy'
import { godaddyAPI } from '@/lib/api/godaddyReal'
import { realEscrow } from '@/lib/escrow'
import { realDomainTransfer } from '@/lib/transfer'
import { automatedSaleFlow, saleMonitor } from '@/lib/sales'
import { negotiationBot } from '@/lib/negotiation'

// WRONG - Don't use deprecated imports
import { autonomousBrain } from '@/lib/autonomy/AutonomousBrain' // ❌
import { createGoDaddyClient } from '@/lib/api/godaddy' // ❌
import { escrowAutomation } from '@/lib/escrow/EscrowAutomation' // ❌
```

---

**This architecture ensures a single, cohesive system with clear separation of concerns.**
