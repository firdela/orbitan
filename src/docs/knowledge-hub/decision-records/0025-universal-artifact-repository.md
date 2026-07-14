# ADR-0025: Universal Document & Compliance Repository (`ArtifactRecord`)

**Status:** Approved
**Date:** 2026-07-14
**Principle:** Regulate & Refine
**Decider:** Muhammad Firdaus Bin Ismail (Founder & Product Owner)
**Supersedes:** Siloed document storage in `AIDocument`, `ComplianceRecord.document_url`, `ExpenseRecord.receipt_url`

---

## Context

As OrbitanOS approaches its production-quality MVP (North Star: 30 July 2026), the platform must be **enterprise-ready by design** — compatible with SOC 2, ISO 27001, and Vanta without major architectural changes.

Prior to this decision, documents and evidence were stored in fragmented, entity-specific fields:

| Entity | Field | Purpose |
|---|---|---|
| `AIDocument` | `content_markdown` | AI-generated SOPs, training modules |
| `ComplianceRecord` | `document_url` | Uploaded compliance permits & certificates |
| `ExpenseRecord` | `receipt_url` | Receipt images for expense claims |
| `AuditLog` | `evidence_urls[]` | Evidence artifacts for audit bundles |

This siloed approach created three structural risks:

1. **SOC 2 Audit Fragmentation:** Generating a compliance audit bundle required joining 4+ entities. At scale (thousands of tenants, millions of records), this is operationally expensive and error-prone.
2. **Governance Inconsistency:** Each entity applied its own review/approval logic. There was no unified "artifact review gate" for the `ShieldInterceptor` to enforce.
3. **RAG Indexing Complexity:** Orbit Nexus could not reliably retrieve historical documents because they were scattered across entities with no common query interface.

---

## Decision

We implement a **single, unified `ArtifactRecord` entity** as the canonical storage for all platform artifacts — compliance permits, operational SOPs, financial receipts, legal contracts, training materials, incident evidence, and facility documents.

### Architectural Properties

- **Single Registry:** All artifacts live in `ArtifactRecord`. Entity-specific fields (`receipt_url`, `document_url`) become soft references (`linked_entity_type` + `linked_entity_id`) pointing to `ArtifactRecord` records.
- **Audit-Bound by Automation:** Every `ArtifactRecord` create/update triggers an entity automation → `auditEngine` → immutable `AuditLog` entry. The `audit_log_id` field on each record provides a tamper-evident chain. This is "Audit by Default" — no developer can accidentally omit the audit trail.
- **Classification-Driven:** `artifact_type` enum drives policy resolution, UI rendering, and audit-bundle filtering without entity proliferation.
- **Metadata-Extensible:** The `metadata` JSON field absorbs artifact-specific data (OCR results, expiry dates, AI confidence) without schema migrations.
- **AI-Native:** `is_ai_generated` + `ai_source` flags allow Orbit Nexus agents (sopGenerator, AIReceipts) to write directly into the same registry, inheriting identical governance and audit rules.

### Audit Strategy: Automation-Driven (Chosen over Service-Layer)

| Approach | Mechanism | Pros | Cons |
|---|---|---|---|
| **Automation-Driven** (chosen) | Entity automation on `ArtifactRecord` → `auditEngine` | Guaranteed auditing; decoupled from UI/backend code; developers cannot bypass | Slightly higher integration complexity |
| Service-Layer-Driven | `ArtifactManager` service writes `AuditLog` explicitly | Simple, immediate | Developers may bypass via raw queries; not enforced at platform level |

**Rationale:** Treating auditing as a platform-level automation enforces "Audit by Default." Even if a future developer adds a new module that creates artifacts, they cannot accidentally omit the audit trail.

---

## Migration Path

Existing records in `AIDocument`, `ComplianceRecord.document_url`, and `ExpenseRecord.receipt_url` will be mapped into `ArtifactRecord`:

| Source | `artifact_type` | `metadata` mapping |
|---|---|---|
| `AIDocument` (sop) | `operational_sop` | `{ content_markdown, model_used, ai_confidence_score }` |
| `AIDocument` (training_module) | `training_material` | `{ content_markdown, model_used, linked_employee_ids }` |
| `ComplianceRecord.document_url` | `compliance_permit` | `{ category, due_date, signature_hash }` |
| `ExpenseRecord.receipt_url` | `financial_receipt` | `{ amount, category, vendor }` |

Migration is low-risk because the current pilot dataset is small. The mapping is one-way: source records are preserved (not deleted) to maintain historical integrity during the transition.

---

## Consequences

**Positive:**
- Single query interface for SOC 2 audit-bundle generation
- Unified `ShieldInterceptor` review gate across all artifact types
- Orbit Nexus RAG indexing simplified to one entity
- New artifact types added via enum extension — no new entities

**Negative:**
- Requires a one-time migration of existing records
- `artifact_type` enum must be curated to avoid sprawl (governance review required for additions)

---

## Cross-References

- [ADR-0001: Registry-Driven Architecture](../0001-registry-driven-architecture.md)
- [ADR-0003: Shield Governance Interceptor](../0003-shield-governance-interceptor.md)
- [ADR-0016: RLS Tenant Isolation Standard](../0016-rls-tenant-isolation-standard.md)
- [ADR-0022: Enterprise Compliance Readiness](../0022-enterprise-compliance-readiness.md)
- `base44/entities/ArtifactRecord.jsonc` — entity schema
- `base44/functions/auditEngine/entry.ts` — audit automation handler
- `src/components/artifacts/ArtifactManager.jsx` — unified upload/review UI
- `src/pages/workspace/ArtifactRegistry.jsx` — registry page

---

## Verification Checklist

- [x] `ArtifactRecord` entity created with tenant-scoped RLS
- [x] `auditEngine` updated to include `ArtifactRecord` in `AUDITABLE_ENTITIES`
- [x] Entity automation registered (create + update → auditEngine)
- [x] `ArtifactManager` component built with upload + review workflow
- [x] `ArtifactRegistry` page created and routed in `App.jsx`
- [x] Module registered in `orbitan-config.js` (`artifacts` module key)
- [ ] Migration script for existing `AIDocument` records (deferred — pilot dataset is small)