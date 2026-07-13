---
title: Orbitan Future Ideas
category: Knowledge
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../Product/ProductRoadmap.md
  - ImprovementLog.md
  - FounderNotes.md
tags:
  - future
  - ideas
  - post-MVP
  - roadmap
  - innovation
---

# Orbitan Future Ideas

## Purpose

Captures every idea for future evaluation. Not all ideas will be implemented — they are recorded here so they are not lost.

## Product Ideas

### Marketplace
- Third-party apps, modules, and industry packs
- Revenue split model (platform commission)
- Per-tenant Stripe Connect for marketplace revenue splitting
- Community-contributed industry packs

### Advanced AI Agents
- Scheduling agent (auto-generate shift rosters)
- Procurement agent (auto-reorder based on burn rate)
- Financial agent (auto-reconciliation, anomaly detection)
- Compliance agent (auto-check compliance requirements)

### White-Labelling
- Custom branding for enterprise customers
- Custom domains (acme.orbitan.app)
- Custom colour schemes and logos

### Multi-Currency / Multi-Region
- Currency conversion and multi-currency wallets
- Regional compliance templates
- Localised UI (multi-language readiness)

### AquaOrbit (Aquarist OS)
- Specialised OS for aquarium/aquascaping businesses
- Built on Orbit Core
- Shares platform services with OrbitanOS

### ChefOrbit (Kitchen OS)
- Specialised OS for commercial kitchens
- Recipe management, production planning, kitchen stations
- Built on Orbit Core

## Architecture Ideas

### MCP Server
- Model Context Protocol for external AI tool integration
- Allow external AI tools to interact with OrbitanOS data
- Enable third-party AI agents to use Orbit services

### Connector SDK
- SDK for third-party developers to build connectors
- Standardised OAuth flow and webhook handling
- Self-service connector registration

### ABAC (Attribute-Based Access Control)
- Fine-grained, policy-based permissions
- Time-based, location-based, risk-score-based access
- For enterprise-tier customers who need attribute-based policies

### Cross-Tenant Pattern Recognition
- Anonymised aggregation of usage patterns across tenants
- Industry benchmarks and best-practice recommendations
- Privacy-preserving insights

## AI Ideas

### RAG Engine
- Index Knowledge Hub Markdown documents for retrieval
- "Why was X designed this way?" queries
- Context-aware development advice

### Autonomous Implementation
- AI autonomously implements low-impact EvolutionProposals (governance_gate severity only)
- Human approval required for medium+ impact

### Scheduled AI Windows
- Disable AI during off-hours for cost savings
- Per-tenant AI scheduling

### Per-Service Kill Switches
- Individual toggles for AIReceipts, SOP Generator, etc.
- Granular AI control beyond the global kill switch

## Enterprise Ideas

### SOC 2 / ISO 27001 Certification
- Formal compliance certification
- Vanta continuous compliance monitoring
- Automated evidence collection

### Access Reviews & Certifications
- Automated periodic access reviews
- AI-assisted access certification campaigns
- Permission change recommendations based on usage

### Risk Intelligence
- Dynamic risk scores for identities, permissions, AI agents
- Anomaly detection (unusual access patterns, off-hours activity)
- Security alerts to administrators

### Just-In-Time (JIT) Access
- Temporary, time-bound access for specific tasks
- Auto-expiring permissions

## Integration Ideas

### Additional Connectors
- QuickBooks, MYOB, Sage
- Slack, Microsoft Teams
- Shopify, WooCommerce
- Google Workspace (Calendar, Drive, Docs)
- WhatsApp Business API

### API/SDK for External Developers
- Public API for third-party integrations
- SDK in multiple languages (JavaScript, Python, Go)
- Webhook system for external event notifications

## Related Documents

- [../Product/ProductRoadmap.md](../Product/ProductRoadmap.md) — Product roadmap
- [ImprovementLog.md](./ImprovementLog.md) — Tracked improvements
- [FounderNotes.md](./FounderNotes.md) — Founder strategic thinking