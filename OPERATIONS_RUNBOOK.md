# DomainFlipper Operations Runbook
## Production Operations Guide — December 2025

---

## 1. System Overview

DomainFlipper is a fully autonomous domain flipping system with enterprise-grade safety controls.

### Core Components
- **ProductionBrain**: Main orchestrator (supports DRY_RUN mode)
- **QueueService**: Job orchestration with priorities
- **KillSwitches**: Emergency stop controls
- **SpendGuards**: Financial safety limits
- **CircuitBreaker**: API resilience
- **ComplianceEngine**: Legal risk mitigation
- **NegotiationBot**: Automated deal-making
- **FeatureStore**: ML feature management

---

## 2. Startup Checklist

### Pre-Launch Verification
```
1. ☐ DRY_RUN=true initially
2. ☐ Daily budget set appropriately
3. ☐ Per-domain cap configured
4. ☐ Kill switches reset (all disabled)
5. ☐ API credentials verified
6. ☐ Compliance engine enabled
7. ☐ Circuit breakers closed
8. ☐ Audit logging active
```

### First-Time Launch
1. Start with `dryRun: true`
2. Monitor for 24-48 hours
3. Review audit logs for decision quality
4. Verify compliance checks working
5. Gradually lower human approval threshold
6. Switch to production when confident

---

## 3. Kill Switch Operations

### Global Emergency Stop
```typescript
// EMERGENCY STOP - halts ALL operations
killSwitches.emergencyStop('Reason for stop', 'your-name')
```

### Targeted Pauses
```typescript
// Pause acquisitions only
killSwitches.trigger('acquisitions', 'Testing listing system')

// Pause specific registrar
killSwitches.trigger('registrar_godaddy', 'API maintenance')

// Pause high-value operations
killSwitches.trigger('high_value', 'Manual review needed')
```

### Reset Procedures
```typescript
// Reset single switch (respects cooldown)
killSwitches.reset('acquisitions')

// Force reset all (requires confirmation)
killSwitches.resetAll(true)
```

---

## 4. Spend Guard Management

### Setting Limits
```typescript
spendGuards.setLimits({
  dailyBudget: 100,        // Max spend per day
  perDomainCap: 50,        // Max per single domain
  maxPortfolioRisk: 30,    // Max % of capital at risk
  cumulativeLossCap: -200, // Stop-loss threshold
})
```

### Monitoring
```typescript
// Check remaining budget
const remaining = spendGuards.getRemainingBudget()
console.log(`Daily: $${remaining.daily}, Weekly: $${remaining.weekly}`)

// Check for anomalies
const { anomalies, severity } = spendGuards.detectAnomalies()
```

---

## 5. Circuit Breaker Management

### Check Circuit Status
```typescript
// Get all circuit states
const stats = circuitBreaker.getAllStats()

// Check specific API
const isAvailable = circuitBreaker.isAvailable('godaddy')
```

### Manual Reset
```typescript
// Reset after API recovery
circuitBreaker.reset('godaddy')

// Trip for maintenance
circuitBreaker.trip('namecheap', 'Scheduled maintenance')
```

---

## 6. Common Issues & Resolution

### Issue: High API Error Rate
**Symptoms**: Circuit breakers opening frequently
**Resolution**:
1. Check API credential validity
2. Verify IP whitelist (Namecheap)
3. Check rate limit usage: `rateLimiter.getUsage('godaddy')`
4. Review circuit breaker logs

### Issue: Compliance Blocking Too Many Domains
**Symptoms**: Low acquisition rate, many compliance blocks
**Resolution**:
1. Review blocked domains in audit log
2. Adjust `minSafetyScore` if too strict
3. Check for false positives in brand detection
4. Update custom blocklist if needed

### Issue: Valuations Seem Inaccurate
**Symptoms**: ROI not matching expectations
**Resolution**:
1. Check calibration metrics: `featureStore.getCalibrationMetrics()`
2. Add recent sale data for calibration
3. Review feature extraction completeness
4. Consider adjusting `minConfidence` threshold

### Issue: Queue Backlog Growing
**Symptoms**: `queueDepth` metric increasing
**Resolution**:
1. Check for stuck jobs in processing
2. Verify external API availability
3. Increase worker throughput if needed
4. Clear stale jobs if necessary

### Issue: Spend Anomaly Alert
**Symptoms**: Automatic acquisition pause
**Resolution**:
1. Review recent transactions in audit log
2. Check for API or data poisoning
3. Verify pricing data accuracy
4. Reset after manual review

---

## 7. Monitoring Dashboards

### Key Metrics to Watch
| Metric | Healthy Range | Alert Threshold |
|--------|--------------|-----------------|
| API Success Rate | >95% | <90% |
| Queue Depth | <50 | >100 |
| Hit Rate | >5% | <1% |
| Win Rate | >30% | <10% |
| Avg API Latency | <2000ms | >5000ms |
| Daily Spend | Within budget | >90% budget |

### Alert Priorities
1. **Critical**: Kill switches, spend anomalies, API outages
2. **Warning**: High latency, low success rates, queue backlog
3. **Info**: Normal operational events

---

## 8. Backup & Recovery

### Data Persistence
- Configuration: localStorage (browser) + Supabase
- Audit logs: Supabase (immutable)
- Queue state: localStorage + Supabase
- Calibration data: Supabase

### Recovery Procedures
1. **Config corruption**: `masterConfig.forceRefreshCredentials()`
2. **Queue corruption**: `queueService.clearHistory()`
3. **Audit log issues**: Export before clearing
4. **Full reset**: Clear localStorage, reload app

---

## 9. Maintenance Windows

### Daily Tasks
- Review audit log for anomalies
- Check KPI dashboard
- Verify no stuck negotiations

### Weekly Tasks
- Review calibration accuracy
- Update blocklist if needed
- Check compliance false positive rate
- Review circuit breaker history

### Monthly Tasks
- Full audit log export
- Performance trend analysis
- Strategy effectiveness review
- API cost optimization

---

## 10. Contact & Escalation

### Automated Alerts
- Critical: Immediate notification
- Warning: Daily digest
- Info: Weekly summary

### Manual Escalation
1. Check system status dashboard
2. Review recent audit entries
3. Check kill switch state
4. Contact support if needed

---

## Appendix: Quick Commands

```typescript
// Check system health
productionBrain.getState()

// Get KPIs
productionBrain.getKPIs()

// Emergency stop
killSwitches.emergencyStop('reason')

// Enable dry run
productionBrain.setDryRun(true)

// Check budget
spendGuards.getRemainingBudget()

// View pending approvals
productionBrain.getPendingApprovals()

// Export audit log
auditLog.exportJSON()
```

---

*Last updated: December 2025*
