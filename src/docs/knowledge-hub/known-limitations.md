# OrbitanOS — Known Limitations (Honest)

> Updated 2026-07-25. Only lists actual limitations. No fabricated capabilities.

## Predictive intelligence
- Demand/revenue/waste/labour/inventory/purchasing/production forecasting:
  **scaffolded contracts, NOT operational.** Requires pilot operational
  history (no pilot tenant live yet). No accuracy percentages claimed.

## Xero live sync
- Multi-tenant architecture complete; **live authorisation + sync pending
  XERO_CLIENT_ID/SECRET.** Internal flow tested; external sync not yet
  verified against a live Xero tenant.

## Orbit Nexus LLM synthesis
- Daily briefing + copilot narrative depend on LLM integration availability at
  runtime. **Deterministic fallback always works** (numbers are computed
  regardless). Narrative quality may degrade if LLM is unavailable.

## Testing coverage
- Structural RLS + engine deploy verification complete. **Full per-role /
  per-tenant live workflow regression is deferred to Build #15** (requires
  real pilot tenants; User records cannot be created in-app — onboarding
  required).

## Accessibility
- Baseline semantic primitives (Radix), labelled controls, focus-visible.
- **Full WCAG 2.1 audit deferred to #15.** No accessibility certification
  claimed.

## Mobile
- Responsive layouts on pilot-critical pages. **Full device matrix**
  (small/large phone, tablet p/l) **deferred to #15.**

## Performance
- Bounded-query architecture verified on the pilot-critical path. **Live
  profiling under real load deferred to #15.**

## Security
- RLS, Shield, sanitization, audit verified structurally. **Penetration
  testing deferred post-MVP.** No security certification claimed.

## Backup / disaster recovery
- Data export exists (`exportData` function). **Automated platform-managed
  backup is the platform's responsibility** (documented honestly). No custom
  DR site claimed.

## Nexus capability registry
- `nexusIntelligence` / `nexusCopilot` are direct-invoked handlers; registering
  them in the `NexusCapabilityRegistry` for credit billing is deferred.

## Insight → Notification dispatch
- NexusInsight records persist with lifecycle; **notification dedup/cooldown
  dispatch to the Notification entity is deferred.**

## Weekly executive briefing
- Daily briefing covers the pilot-critical need; **weekly aggregation
  deferred to a future package.**

## Demo data
- No demo data mixed into pilot reporting. Demo tenants are clearly marked.