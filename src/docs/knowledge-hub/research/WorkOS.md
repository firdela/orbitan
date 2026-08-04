---
title: WorkOS — Competitor Research
category: Research
owner: Product Owner
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - ../product/CompetitorResearch.md
  - Microsoft.md
  - ../architecture/OrbitCore.md
tags:
  - competitor
  - workos
  - identity
  - authentication
  - infrastructure
---

# WorkOS — Competitor Research

## Overview

WorkOS is an identity and authentication infrastructure platform for B2B SaaS applications. It provides enterprise SSO, directory sync, and user management APIs so SaaS companies can serve enterprise customers with standard auth requirements.

## Strengths

- **Enterprise SSO** — SAML, OIDC, OAuth for enterprise authentication
- **Directory Sync** — SCIM provisioning/deprovisioning
- **Developer-focused** — Clean APIs, quick integration
- **Enterprise readiness** — Helps SaaS companies pass enterprise security reviews
- **Admin portal** — Pre-built admin UI for enterprise customers

## Weaknesses

- **Infrastructure only** — No business logic, no operations, no workforce management
- **Not a product** — It's a service for building products, not a product itself
- **No AI** — No intelligence layer
- **No industry packs** — Generic auth infrastructure
- **No multi-product ecosystem** — Single service

## Architecture

- API-first identity infrastructure
- SAML/OIDC bridge for enterprise SSO
- SCIM directory sync
- REST APIs for user management

## AI

- None — WorkOS is identity infrastructure, not an AI platform

## Lessons for Orbit

1. **Enterprise SSO is table stakes** — Enterprise customers expect SSO. Orbitan's Google OAuth is a start; SAML/OIDC needed for enterprise tier.
2. **Directory sync** — SCIM provisioning is important for enterprise (auto-provision/deprovision users from corporate directory).
3. **Developer experience** — Clean APIs and quick integration matter. Orbitan's `OrbitCore` adapter pattern serves a similar purpose.
4. **Admin portal** — Pre-built admin UI for enterprise customers reduces friction. Orbitan's LeaderOrg serves a similar role.

## Orbit Opportunities

- **Full product, not just infrastructure** — Orbitan is a complete Workforce OS, not just auth
- **AI integration** — Orbit Nexus provides intelligence; WorkOS has none
- **Industry packs** — Orbitan is industry-specific; WorkOS is generic
- **Multi-product ecosystem** — Orbit Core shared across OrbitanOS, AquaOrbit, ChefOrbit

## References

- https://workos.com/
- WorkOS SSO documentation
- WorkOS Directory Sync documentation

## Related Documents

- [../product/CompetitorResearch.md](../product/CompetitorResearch.md) — Competitor overview
- [Microsoft.md](./Microsoft.md) — Microsoft (Entra) analysis
- [../architecture/OrbitCore.md](../architecture/OrbitCore.md) — Orbit Core (Orbitan's identity layer)