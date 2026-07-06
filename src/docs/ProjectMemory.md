# Project Memory: OrbitanOS

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows pilot
> tenants to genuinely run parts of their daily operations through OrbitanOS, gather
> feedback, validate assumptions, and establish the foundation for future growth of the
> Orbit ecosystem.
>
> **Build Philosophy:** Build less. Validate more.

---

## App Name
OrbitanOS — the Workforce Operating System that powers Orbitan (the customer-facing product).

## App Purpose
A commercial, scalable, multi-tenant SaaS platform. OrbitanOS is the platform; Orbitan is
the product. Pilot tenants (Renewed Resources, Taqueria Pte Ltd, Izaliqa Bakes) are
validation environments — **not** the final limitation of the platform. Future customers
are the primary market.

## Target Users
Home-Based Businesses · Startups · SMEs · Multi-Outlet Businesses · Multi-Brand
Organisations · Holding Companies · Enterprise · Regional & Global Operations.

Supported industries include (non-exhaustive): Food & Beverage, Retail, Recycling &
Sustainability, Education, Logistics, Construction, Healthcare, Manufacturing, Facilities
Management, Events & Activations, Professional Services, Technology.

## User Roles
`admin` (platform owner) · `tenant_admin` · `client_manager` · `outlet_manager` ·
`supervisor` · `worker`.

## Core Pages
- `/` — Public landing page (marketing + onboarding gateway).
- `/auth/gateway` — Intelligent entry hub (login / join / request access / create org).
- `/onboarding` — Self-serve organisation installation wizard.
- `/workspace/:tenantId/*` — Dynamic, tenant-scoped workspace (single entry for every
  customer — pilot or future).
- `/leader-org` — Platform owner console.

## Core Entities
Tenant · Company · Client · Outlet · Employee · Invitation · AccessRequest ·
OrbitanWallet · WalletTransaction · ActivationRegistry · PlatformManifest ·
SubscriptionPolicy · GovernancePolicy · GovernanceOverride · AuditLog ·
DashboardLayout · OrbitUsageTracker · IssueLog · Announcement.

Module entities: InventoryItem · PurchaseOrder · GoodsReceipt · SalesInvoice ·
DailyReconciliation · ClockRecord · Shift · PayrollSnapshot · ComplianceRecord ·
AIDocument · Task · Supplier · ProductCatalog · Recipe · MaterialCollection ·
FoodSafetyLog · FinanceSyncQueue · FinanceMapping · AccountMapping ·
ReplenishmentAlert · MarketplaceModule · DeploymentLog · CustomerProfile ·
WorkerFeedback · ComplianceSnapshot · SystemSettings.

## Important Workflows
- **Manifest-driven provisioning:** `PlatformManifest` → `ManifestHydrator` →
  `ManifestNav`. Navigation is registry-driven, not hardcoded.
- **Activation pipeline:** `ActivationRegistry` seeder pipelines +
  `onboardingService` provision organisations.
- **Wallet-native ledgering:** All financial movements flow through
  `OrbitanWallet` → `WalletTransaction` (immutable). `financeController` bridges to
  `FinanceSyncQueue` for ERP integration.
- **Shield governance:** `shieldInterceptor` evaluates `GovernancePolicy` before
  sensitive actions. `GovernanceOverride` is the release valve. Every outcome is
  captured in `AuditLog`.
- **Dynamic Trust thresholds:** `ActivationRegistry.governance_threshold_sgd` drives
  procurement approval gates per industry.
- **Orbit Nexus routing:** `nexus` gateway routes intelligence requests;
  `OrbitUsageTracker` meters credits and debits `OrbitanWallet`.

## Security Rules
- **Tenant isolation is the fundamental constraint.** Every entity carries
  `tenant_id`; RLS policies enforce `data.tenant_id === {{user.data.tenant_id}}`.
- URL `tenantId` must match the session's `tenant_id` (platform admins excepted).
  `WorkspaceLayout` enforces this (lines 71–80).
- Admin-only actions are protected by server-side role validation
  (`base44.auth.me()` → `user.role === 'admin'`).
- Public pages must not pull private entity data.
- `AuditLog` is immutable — no updates or deletes except by platform admin.

## Design Rules
- **6-R Principles:** Regulate · Refine · Respond · Renew · Relate · Reach.
- **Aesthetic:** "Titanium White" OS surfaces + "Deep Titanium" dark sidebar rail.
- **Typography:** Sora (heading/display) · Inter (body).
- **Platform-first:** No hardcoding of pilot tenant names, IDs, or industry logic
  into platform code. Industry behaviour is registry-driven via `ActivationRegistry`.
- **Configuration over hardcoding:** New industry = add `ActivationRegistry` +
  `PlatformManifest` records, not new code.

## Decisions Already Made
- Routing is dynamic `/workspace/:tenantId/*` — scales to thousands of orgs without
  route changes.
- Navigation is rendered via `PlatformManifest` (UI registry), not static arrays.
- Financial governance thresholds are registry-driven
  (`ActivationRegistry.governance_threshold_sgd`).
- RLS is tenant-scoped by default across all operational entities.
- `Orbitan` (product) vs `OrbitanOS` (platform) distinction is strictly enforced.
- `WorkspaceLayout` already implements tenant-session access control — a separate
  `TenantAuthGuard` component is unnecessary (overbuilding).
- Ownership structure is undetermined (Orbitan Pte Ltd / LLC / Fetch Innovation Pte
  Ltd / holding company). OrbitanOS remains architecturally independent from any
  future corporate arrangement.

## Things Not To Change
- The Orbitan vs OrbitanOS separation.
- The `PlatformManifest`-driven navigation architecture.
- The wallet-native ledgering model (`OrbitanWallet` → `WalletTransaction`).
- Dynamic `/workspace/:tenantId/` routing.
- Existing RLS policies on operational entities.

## MVP Scope (Phase 1)
**Pilot tenants:** Taqueria Pte Ltd (F&B) · Renewed Resources Pte Ltd (Recycling) ·
Renewed Fashion (Retail — planning) · Home-Based Businesses (Izaliqa Bakes).

**Required MVP modules:**
1. Employee Management (directory, roles, invitations, org/brand/outlet assignment)
2. Attendance & Shifts (clock in/out, breaks, shifts, timesheets)
3. Inventory Management (stock, replenishment, counts, low-stock alerts, adjustments)
4. Procurement (suppliers, POs, receiving, cost calculations)
5. Sales & Invoicing (invoice creation, receipt upload, daily reconciliation, payment
   tracking)
6. Finance Integration (Xero, export, reconciliation support)
7. Home-Based Business Pack (customer orders, inventory, procurement, production
   planning, expense tracking, sales invoicing, delivery tracking)
8. AIReceipts MVP (upload, OCR extraction, auto-categorisation, supplier detection,
   daily reconciliation support, Xero preparation)

**Explicitly OUT of MVP scope:** Marketplace · Advanced Automations · Complex AI
Agents · White Labelling · Enterprise Features · Excessive Customisation.

## MVP Roadmap
- Sprint 1 — Foundation (auth, multi-tenancy, roles, org structure) ✅
- Sprint 2 — Workforce (employees, attendance, clock, shifts) ✅
- Sprint 3 — Operations (inventory, procurement, suppliers, POs) ✅
- Sprint 4 — Financial Workflows (sales, AIReceipts, reconciliation, Xero) ✅
- Sprint 5 — Pilot Preparation (dashboards, reports, bug fixes, permissions
  validation, mobile optimisation, test data, export functions) ← **current**

## Known Bugs
- _(none confirmed this session)_

## Audit Findings — Sprint 5 (Session 2026-07-06)

### Phase A: Security & Governance Audit
**CRITICAL — Fixed:**
- `ProcurementPage.jsx` was creating Purchase Orders and updating statuses **directly via
  SDK**, completely bypassing the `shieldInterceptor`. Governance policies were defined
  but never enforced. — **Fixed:** Wired `ShieldGuard.check()` into PO creation and
  status transitions (`received`, `approved`). Blocked actions now surface the
  `GovernanceOverrideModal` for manager override workflow.
- PO "Approve" button was visible to ALL users regardless of role. — **Fixed:** Now
  restricted to `admin`, `tenant_admin`, `outlet_manager` only.

**Identified — Not yet fixed:**
- `AccessRequestQueue.jsx` creates `Invitation` records without Shield evaluation
  (subscription employee-limit check is bypassed for invitation-driven onboarding).
- `ProcurementPage.jsx` renders its own hardcoded `NAV` inside `AppShell`, duplicating
  the `WorkspaceLayout` manifest navigation. This is a nesting issue but not a security
  risk — deferred to avoid page redesign.
- `DEMO_TENANTS` fallback in `WorkspaceLayout` (line 87) hardcodes pilot tenant IDs.
  Documented as legacy; should be removed once all pilot tenants have DB records.

### Phase B: Manifest Scoping Audit
- `ManifestHydrator` architecture is sound: fetches `PlatformManifest` +
  `SubscriptionPolicy` in parallel, intersects via `allowedModules`, marks locked modules
  as `isLocked` (Graceful Lockout).
- **Gap:** No `PlatformManifest` records exist in the database yet. All tenants fall back
  to the hardcoded `FALLBACK_NAV`, which shows every module to every tenant. HBB tenants
  see Procurement, Scheduling, etc.
- **Next step:** Seed `PlatformManifest` records for `core_ops_v1` (standard) and
  `hbb_ops_v1` (lite) manifests so the hydrator can actually scope the UI.

## Future Features
- Orbit Nexus as standalone subscription product (RAG, agentic AI, AI services).
- Marketplace for module/pack distribution.
- AquaOrbit (Aquarist OS) · ChefOrbit (Kitchen OS) — ecosystem products.
- White-labelling and enterprise customisation.
- Multi-country / multi-currency expansion.

## Client Preferences
- **Product Owner:** Muhammad Firdaus Bin Ismail (Founder).
- **Strategic preference:** Scalability-first, platform-thinking, configuration over
  hardcoding. Challenge assumptions. Propose alternatives. Do not overbuild.
- **Co-founder:** Hamka Ariffin (pilot tenant association).

## Prompt History
- Initial ecosystem architecture established and tenant isolation verified.
- Project Memory committed as the single source of truth for all future development.