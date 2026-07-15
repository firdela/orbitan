# ADR-0026: Customer Digital Sovereignty & Sovereignty-by-Design

**Status:** Approved
**Date:** 2026-07-15
**Author:** Muhammad Firdaus Bin Ismail (Product Owner)
**Decisions:** Product Owner
**Supersedes:** —
**Related:** ADR-0016 (RLS Tenant Isolation), ADR-0025 (Universal Artifact Engine), SecurityCompliance.md, GoldenUIUX.md

---

## Context

OrbitanOS is evolving from a pilot-validated multi-tenant platform into a commercial SaaS serving thousands of organisations across industries. As we onboard real operational data — recipes, financial records, compliance documents, AI-derived insights — the platform must guarantee that **every tenant owns, controls, and is protected in their digital footprint**.

Privacy and tenant isolation are no longer sufficient as passive policies. They must be **proactive architectural mandates** embedded into every module, entity, and workflow. This is especially critical for intellectual property such as recipes, where a leaked formula directly undermines a customer's competitive advantage.

## Decision

We adopt **"Customer Digital Sovereignty"** as a foundational product principle, implemented through the **Sovereignty-by-Design** engineering standard. Every new module must satisfy the **Data Sovereignty Checklist** before release.

### 1. The Proactive Sovereignty Mandate

- **Default Deny:** All organisational data is `PRIVATE_BY_DEFAULT`. No platform-wide visibility (including Orbit Nexus AI training) is permitted without explicit `TENANT_CONSENT`.
- **Governance-first UI:** Security controls (watermark settings, export logging, IP classification) are first-class UI features rendered where the asset is managed — not buried in admin settings.
- **Audit-Driven Trust:** The `AuditLog` serves the tenant, not just developers. Every significant asset interaction is auditable, providing customers with compliance evidence.

### 2. Data Sovereignty Checklist (mandatory gate)

Every module/entity MUST verify before release:

1. **Tenant Isolation** — Is the entity strictly bound by `tenant_id` at the RLS level?
2. **Least Privilege** — Does `ModuleAccessPolicy` define `view`, `create`, `edit`, `approve`, `publish`, and `export` permissions?
3. **AI Boundary** — Is the module's data tagged `TENANT_RESTRICTED` or `IP_PROTECTED` in Orbit Nexus RAG scoping?
4. **Auditability** — Does every data interaction trigger an `AuditLog` event via `auditEngine`?
5. **Export Sovereignty** — Can the customer export their assets in a vendor-neutral format without platform dependency?
6. **IP Protection** — Are sensitive assets using the "Controlled View" pattern (watermarking, copy restrictions, download controls)?
7. **Platform Portability** — Is the module's logic independent of any specific pilot tenant?

### 3. Sovereign Watermarking Standard

For proprietary/confidential assets (starting with recipes), we implement a **multi-layered identity-bound watermark**:

- **Layer A (Foreground UI):** Low-opacity tiled overlay with user identity + timestamp, `pointer-events: none`, prevents clean screenshots.
- **Layer B (Server-Side Export):** Watermark burned into exported PDFs/images via `exportData` — client-side stripping impossible.
- **Layer C (Steganographic Metadata):** `TenantID` + `AuditLogID` embedded in document metadata for forensic origin tracing.

The watermark is **subtle but traceable** — it must not ruin UX but must be forensically identifiable.

### 4. Sovereignty-by-Design Workflow

All future modules follow this flow:

1. **Isolation Review** — RLS `tenant_id` binding verified.
2. **AI Scoping** — Data marked `IP_PROTECTED` where applicable.
3. **Governance Layer** — `ModuleAccessPolicy` defines granular permissions; configurable by tenant, not hardcoded.
4. **Audit Trail** — Every export/print/access mapped to user + timestamp in `AuditLog`.
5. **Data Portability** — Vendor-neutral export (JSON/CSV) available without UI dependency.

## Consequences

### Benefits
- **Commercial advantage:** Enterprise customers demand sovereignty. Building it into the DNA eliminates privacy rework at scale.
- **Developer simplicity:** The checklist becomes the default way of working — security is not an afterthought.
- **Orbit Nexus resilience:** AI trained to distinguish proprietary vs communal data becomes a safer, more reliable partner.
- **Compliance readiness:** SOC 2 / ISO 27001 evidence is generated organically through `AuditLog`.

### Trade-offs
- **Implementation overhead:** Every module carries a sovereignty verification step. Mitigated by standardising the pattern (this ADR).
- **UX friction:** Watermarks and export gates add minor friction. Mitigated by "subtle but traceable" design and the Sovereign Asset trust badge.

### Risks
- **False sense of security:** No software fully prevents photographing a screen. We minimise exposure and provide controls, but do not promise absolute prevention.
- **Performance:** Server-side watermarking adds export latency. Acceptable for export-gated actions.

## Verification

- Recipe entity upgraded to Sovereign Asset Container with `intellectual_property_level`, `content_protection`, `version`, `status`, `artifact_record_id`.
- `calculateRecipeCost` Live COGS engine implemented with audit logging.
- `SovereignWatermark` component provides Layer A overlay.
- `SovereignAssetBadge` provides the trust-signal UI.
- Export-gated actions route through `exportData` with `AuditLog` records (Layer B/C — roadmap).

## First Implementation

The **Recipe Manager** is the first module built under this standard. It serves as the reference implementation for all future Sovereign Asset Containers.