# ADR-0039: Customer Communications & Information Governance Policy

**Date:** 2026-07-19
**Status:** Accepted
**Impacted Modules:** Orbit Nexus, Support & Customer Success, AI Agents, Public Communication Channels

## Context
Orbitan is transitioning into a multi-tenant commercial SaaS platform. To maintain enterprise trust, we must decouple "Transparency" from "Confidentiality." As we enable Orbit Nexus AI agents and migrate to a native Support/Success module, we need a formalized policy to prevent the accidental exposure of proprietary intellectual property, tenant data, and internal strategy to pilot tenants or external customers.

## Decision
Orbitan adopts a "Privacy-First" communication governance policy:
1. **Separation of Knowledge:** Orbit Nexus responses must be gated by tenant membership, role-based access control (RBAC), and document classification (Public, Internal, Confidential, Restricted).
2. **Support Dogfooding:** We will migrate internal customer support to a native OrbitanOS module. This validates our own platform as an enterprise tool and ensures all support interactions are audit-logged natively.
3. **Governance-by-Design:** All AI-generated communications must be checked against the governance domain of the requesting tenant. Internal implementation details (e.g., ADRs, source code, internal roadmap) are strictly categorized as "Internal/Restricted" and excluded from RAG indexes accessible to pilot tenants.

## Trade-offs
- **Pros:** Increases enterprise trust; minimizes legal/IP risk; provides high-fidelity internal testing (dogfooding).
- **Cons:** Increased engineering effort for classification-aware RAG gating; potential for higher initial "false negative" rates in AI responses if classifications are too strict.

## Implementation Guidance
- **Classification Schema:** All documentation in `src/docs/knowledge-hub/` must be categorized by classification level.
- **Agent Guardrails:** Every `nexus` tool call must resolve the `user.role` and `tenant_id` context against the `DocumentClassification` metadata before returning content.

## Landing Page CTA Governance Alignment (2026-07-19 Update)

To comply with the Public Communications & Information Governance standard, all public-facing calls-to-action on the Orbitan landing page now follow a strict availability-based routing model:

### OrbitanOS (Pilot Programme Active)
- **Free / Starter / Growth / Business plans:** CTA = "Request Pilot Access" → routes to `/request-access` (governed pilot intake workflow, NOT direct checkout).
- **Enterprise plan:** CTA = "Enterprise Pilot Access" → routes to `/request-access` with enterprise-tier governance review.

### Orbit Nexus (In Active Development)
- **Free / Pro / Team plans:** CTA = "Join the Waitlist" → routes to `/request-access` (waitlist collection only; no active checkout triggers).
- **Enterprise plan:** CTA = "Enterprise Pilot Access" → routes to `/request-access` for managed enterprise pilot enrolment.

### Footer Governance & Support Links
The landing page footer now includes:
- **Governance** → `/governance-log` (public-facing governance transparency)
- **Customer Support** → `/request-access` (consolidated intake until native Support module ships per ADR-0039 §2)

### Rationale
This prevents premature checkout triggers for products not yet generally available, ensures all prospective customer intake flows through a governed review process, and aligns public communications with the MVP Pilot Stage Communication directive. The separation between "Request Pilot Access" (active product) and "Join the Waitlist" (in-development product) gives visitors accurate expectations from first interaction.

## Cross-References
- [ADR-0029: Autonomous Governance Thresholds for Agentic AI](./0029-autonomous-governance-thresholds-for-agentic-ai.md)
- [ADR-0038: GitHub-First Platform Independence Engineering Standards](./0038-github-first-platform-independence-engineering-standards.md)
- [MVP Pilot Stage Communication Directive](../master-vision.md)