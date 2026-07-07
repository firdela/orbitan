# Project Memory: OrbitanOS

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows pilot
> tenants to genuinely run parts of their daily operations through OrbitanOS, gather
> feedback, validate assumptions, and establish the foundation for future growth of the
> Orbitan ecosystem.
>
> **Build Philosophy:** Build less. Validate more.
>
> Last updated: 2026-07-06 (Day 37 of 60-day MVP window)

---

## App Name
- **Product (customer-facing):** Orbitan
- **Platform (underlying OS):** OrbitanOS — "The Workforce Operating System for Modern Organisations"
- **Future ecosystem:** Orbit (holding) → OrbitanOS, Orbit Nexus (AI), AquaOrbit, ChefOrbit, future products

## App Purpose
Build a commercial, scalable, multi-tenant SaaS platform where any organisation — from a single-person HBB to a multi-brand enterprise — can discover Orbitan, create an account, select a plan, configure their org, activate Industry Packs + Modules, and run daily operations through OrbitanOS.

**Pilot tenants are validation environments, not the product's purpose.** Future paying customers are the primary market.

## Target Users
Home-Based Businesses · Startups · SMEs · Multi-Outlet Businesses · Multi-Brand
Organisations · Holding Companies · Enterprise · Regional & Global Operations.

Supported industries: F&B, Retail, Recycling & Sustainability, Education, Logistics,
Construction, Healthcare, Manufacturing, Facilities Management, Events & Activations,
Professional Services, Technology, and future industries.

## User Roles (confirmed)
- `admin` — Platform owner (Orbitan staff / Product Owner)
- `tenant_admin` — Organisation-level admin
- `client_manager` — Brand/client-level manager
- `outlet_manager` — Outlet-level manager
- `supervisor` — Shift supervisor
- `worker` — Frontline employee

## Core Pages (production paths)
- **Public:** `/` (Landing), `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Auth gateway:** `/auth/gateway`, `/join`, `/welcome`, `/request-access`
- **Onboarding:** `/onboarding` (self-serve org creation wizard)
- **Workspace (generic, scalable):** `/workspace/:tenantId/*` — WorkspaceLayout + WorkspaceDashboard, Inventory, Procurement, HBB, Sales, Tasks, Workforce, Scheduling, Compliance, Reports
- **Platform console:** `/leader-org`
- **Tenant/outlet:** `/company`, `/outlet/*`
- **Platform revenue engine:** `/platform/wallet`, `/platform/marketplace`, `/platform/shield`
- **Worker portal:** `/worker`

## Core Entities
**Org structure:** Tenant, Company, Client, Outlet, Employee
**Workforce:** ClockRecord, Shift, PayrollSnapshot, Invitation, AccessRequest
**Operations:** InventoryItem, PurchaseOrder, GoodsReceipt, Supplier, ProductCatalog, Recipe
**Finance:** SalesInvoice, DailyReconciliation, FinanceMapping, AccountMapping, FinanceSyncQueue
**Wallet-Native Ledger:** OrbitanWallet, WalletTransaction (immutable), OrbitUsageTracker
**Governance:** GovernancePolicy, GovernanceOverride, AuditLog, ActivationRegistry, SubscriptionPolicy, PlatformManifest
**Compliance:** ComplianceRecord, ComplianceSnapshot, FoodSafetyLog, MaterialCollection
**Platform ops:** DashboardLayout, Announcement, IssueLog, ReplenishmentAlert, MarketplaceModule, DeploymentLog, SystemSettings, Task, WorkerFeedback, AIDocument

## Important Workflows
1. **Manifest-driven provisioning:** `PlatformManifest` → `ManifestHydrator` → `ManifestNav`. Navigation is registry-driven, not hardcoded. `ManifestHydrator` fetches `PlatformManifest` + `SubscriptionPolicy` in parallel, intersects via `allowedModules`, marks locked modules as `isLocked` (Graceful Lockout).
2. **Org provisioning:** Onboarding wizard → `onboardingService` → `ActivationRegistry` blueprint → seeds compliance/tasks/AI docs + creates Tenant/Company/Outlet/Wallet
3. **Worker onboarding:** Invitation/AccessRequest → manager approval → Employee record
4. **Clock-in/out:** `clockController` → ClockRecord → (compliance gate via Shield) → TimesheetManager validation → PayrollSnapshot lock
5. **Procurement (Wallet-Native):** PO create → submit → approve → **Receive** → `walletEngine.debit_procurement_sgd` → WalletTransaction (immutable) + FinanceSyncQueue entry. Governance threshold check → auto-approve or GovernanceOverride request.
6. **Sales & reconciliation:** SalesInvoice → AIReceipts (nexus OCR) → verify → `financeController` → Xero sync (simulated until connector authorised)
7. **Shield governance:** `shieldInterceptor` evaluates `GovernancePolicy` before sensitive writes → block (Guardian) / notify (Auditor) / GovernanceOverride release valve. Every outcome captured in `AuditLog`.
8. **Replenishment:** `replenishmentEngine` analyses sales × recipe BOM → ReplenishmentAlert → drafts POs
9. **Orbit Nexus routing:** `nexus` gateway routes intelligence requests; `OrbitUsageTracker` meters credits and debits `OrbitanWallet`.

## Security Rules
- All operational entities use `tenant_id` + role-conditioned RLS
- `admin` bypasses tenant scoping (platform-level)
- `tenant_admin` scoped to `data.tenant_id == user.data.tenant_id`
- `outlet_manager` / `supervisor` further scoped to `data.outlet_id`
- Workers see their own records (`data.employee_id == user.id` or `data.reported_by_id == user.id`)
- SubscriptionPolicy, ActivationRegistry writes are admin-only (commercial sensitivity)
- AccessRequest.create is intentionally open (pre-auth onboarding pipeline)
- AuditLog is immutable after create (update/delete admin-only)
- WalletTransaction: create/update/delete admin-only; reads scoped to tenant role hierarchy
- URL `tenantId` must match the session's `tenant_id` (platform admins excepted). `WorkspaceLayout` enforces this (lines 71–80).
- Admin-only actions are protected by server-side role validation (`base44.auth.me()` → `user.role === 'admin'`).
- Public pages must not pull private entity data.

## Design Rules
- **6-R Principles:** Regulate · Refine · Respond · Renew · Relate · Reach.
- **Aesthetic:** "Titanium White" OS surfaces + "Deep Titanium" dark sidebar rail.
- **Typography:** Sora (heading/display) · Inter (body).
- **Tokens-based design system:** `src/index.css` owns HSL tokens; `tailwind.config.js` maps to classes. No hardcoded hex in JSX.
- **Colours:** Orbit Blue #2563EB primary; industry pack colours (F&B orange, Retail green, Recycling green, etc.); subscription plan colours (Starter blue, Growth emerald, Business violet, Enterprise titanium).
- **Components:** shadcn/ui at `@/components/ui`; lucide-react icons only.
- **Imports:** use `@/` alias, never relative `src/` paths.
- **Responsiveness:** mobile-first; AppShell has collapsible sidebar + mobile overlay.
- **Platform-first:** No hardcoding of pilot tenant names, IDs, or industry logic into platform code. Industry behaviour is registry-driven via `ActivationRegistry`.
- **Configuration over hardcoding:** New industry = add `ActivationRegistry` + `PlatformManifest` records, not new code.

## Decisions Already Made
1. **Orbitan = Product, OrbitanOS = Platform.** Pilots are validation only.
2. **Registry-driven architecture:** `ActivationRegistry` + `PlatformManifest` replace hardcoded industry logic. Adding an industry = add a registry record, not code.
3. **Wallet-Native ledger:** `OrbitanWallet` + `WalletTransaction` is the master ledger. `ledger_sync_mode: internal` for MVP pilots (no ERP push); `erp_integrated` for future Xero/QuickBooks.
4. **Dynamic Trust governance:** `governance_threshold_sgd` on `ActivationRegistry` (HBB=50, F&B=200, Retail=300, Enterprise=configurable). Procurement above threshold → GovernanceOverride required.
5. **Shield modes:** Auditor (notify) for Starter/Growth plans; Guardian (block) for Enterprise only.
6. **One-component-many-industries UI:** ActivationRegistry toggles column visibility / interaction logic — no per-industry UI forks.
7. **Xero integration is simulated** until the OAuth connector is authorised. `financeController` has the payload builders ready; swap in `connectors.getWorkspaceConnection('xero')` when live.
8. **MVP build philosophy:** Build less, validate more. Marketplace, advanced automations, complex AI agents, white-labelling, enterprise features are POST-MVP.
9. **Founder & Product Owner:** Muhammad Firdaus Bin Ismail. Pilot tenants associated with him and Hamka Ariffin. Final corporate ownership TBD (Orbitan Pte Ltd / LLC / Fetch Innovation / new holding). OrbitanOS remains architecturally independent from any future corporate arrangement.
10. **Dynamic `/workspace/:tenantId/*` routing** — scales to thousands of orgs without route changes.
11. **`WorkspaceLayout` already implements tenant-session access control** — a separate `TenantAuthGuard` component is unnecessary (overbuilding).

## Things Not To Change
- The Orbitan vs OrbitanOS separation.
- The `PlatformManifest`-driven navigation architecture.
- The wallet-native ledgering model (`OrbitanWallet` → `WalletTransaction`).
- Dynamic `/workspace/:tenantId/` routing.
- Existing RLS policies on operational entities.
- The 6-role model (admin, tenant_admin, client_manager, outlet_manager, supervisor, worker).
- Shield's Auditor/Guardian mode distinction.
- Token-based theming in `src/index.css` + `tailwind.config.js`.
- Auth page flows (Login → OTP → verify → token → redirect; never shortcut).

## JoinGateway Redemption Flow (2026-07-06)
- **Deep-link auto-detection:** `/join?code=LBT-NBR-001` auto-fills and auto-validates the code on mount via `useEffect`.
- **Invite code passthrough:** JoinGateway passes `invite_code` + `role` URL params to `/request-access`.
- **AccessRequest entity:** Has `invite_code` field to track which invitation initiated the request.
- **RequestAccess:** Reads `invite_code` and `role` from URL; pre-selects role from invitation; stores `invite_code` on the AccessRequest record.
- **AccessRequestQueue approval:** If the AccessRequest has an `invite_code`, the original Invitation is marked `redeemed` (status → redeemed, use_count incremented, redeemed_by_email/date set) instead of generating a duplicate invitation.
- **Result:** No duplicate invitations when a worker uses a pre-issued code. Full chain: Manager issues code → Worker enters code → AccessRequest created with `invite_code` → Manager approves → Original Invitation redeemed → Employee gains access.

## MVP Scope (Phase 1)
**Pilot tenants:** Taqueria Pte Ltd (F&B) · Renewed Resources Pte Ltd (Recycling) ·
Renewed Fashion (Retail — planning) · Home-Based Businesses (Izaliqa Bakes).

**Required MVP modules:**
1. Employee Management (directory, roles, invitations, org/brand/outlet assignment)
2. Attendance & Shifts (clock in/out, breaks, shifts, timesheets)
3. Inventory Management (stock, replenishment, counts, low-stock alerts, adjustments)
4. Procurement (suppliers, POs, receiving, cost calculations)
5. Sales & Invoicing (invoice creation, receipt upload, daily reconciliation, payment tracking)
6. Finance Integration (Xero, export, reconciliation support)
7. Home-Based Business Pack (customer orders, inventory, procurement, production planning, expense tracking, sales invoicing, delivery tracking)
8. AIReceipts MVP (upload, OCR extraction, auto-categorisation, supplier detection, daily reconciliation support, Xero preparation)

**Explicitly OUT of MVP scope:** Marketplace · Advanced Automations · Complex AI
Agents · White Labelling · Enterprise Features · Excessive Customisation.

## MVP Roadmap
- Sprint 1 — Foundation (auth, multi-tenancy, roles, org structure) ✅
- Sprint 2 — Workforce (employees, attendance, clock, shifts) ✅
- Sprint 3 — Operations (inventory, procurement, suppliers, POs) ✅
- Sprint 4 — Financial Workflows (sales, AIReceipts, reconciliation, Xero) ✅
- Sprint 5 — Pilot Preparation (dashboards, reports, bug fixes, permissions
  validation, mobile optimisation, test data, export functions) ← **current**

## Known Bugs / Gaps (as of 2026-07-06)
1. ~~**ProcurementPage hardcoded tenant**~~ ✅ FIXED — now uses `useAuth()` to resolve `tenant_id` and `outlet_id` from the authenticated user profile. Also added error handling (try/catch + toast) on PO creation.
2. ~~**DEMO_SUPPLIERS = []**~~ ✅ FIXED — Supplier dropdown now loads from `base44.entities.Supplier.list()`. Selecting a supplier stores both `supplier_id` and `supplier_name`. Preferred suppliers show a ★ marker.
3. ~~**Tenant1/2/3 duplicate pages**~~ ✅ FIXED — all 28 orphaned files deleted (zero imports confirmed). Generic `/workspace/:tenantId/*` routes are the sole path.
4. **Xero connector not authorised** — all finance sync is simulated. Deferred to post-MVP per Product Owner decision.
5. ~~**No HBB-specific pack pages**~~ ✅ FIXED — `HBBPage.jsx` created at `/outlet/hbb` and `/workspace/:tenantId/hbb`. Combines Customer Orders (via SalesInvoice) + Production Planning (via Task with `module_context: 'hbb_production'`). Minimal MVP scope; no delivery tracking.
6. **No payment integration** — subscription billing not yet wired (Stripe available in SG region). Deferred to post-MVP per Product Owner decision.
7. **`AccessRequestQueue.jsx`** creates `Invitation` records without Shield evaluation (subscription employee-limit check is bypassed for invitation-driven onboarding).
8. **`ProcurementPage.jsx`** renders its own hardcoded `NAV` inside `AppShell`, duplicating the `WorkspaceLayout` manifest navigation. Nesting issue, not security risk — deferred to avoid page redesign.
9. **`DEMO_TENANTS` fallback** in `WorkspaceLayout` (line 87) hardcodes pilot tenant IDs. Harmless now that all pilot tenants exist in DB, but should be removed once confirmed no edge cases rely on it.

## Audit Findings — Sprint 5 (Session 2026-07-06)

### Phase A: Security & Governance Audit
**CRITICAL — Fixed:**
- `ProcurementPage.jsx` was creating Purchase Orders and updating statuses **directly via SDK**, completely bypassing the `shieldInterceptor`. — **Fixed:** Wired `ShieldGuard.check()` into PO creation and status transitions. Blocked actions now surface the `GovernanceOverrideModal`.
- PO "Approve" button was visible to ALL users regardless of role. — **Fixed:** Now restricted to `admin`, `tenant_admin`, `outlet_manager` only.

### Phase B: Manifest Scoping Audit — RESOLVED
- `ManifestHydrator` architecture is sound: fetches `PlatformManifest` + `SubscriptionPolicy` in parallel, intersects via `allowedModules`, marks locked modules as `isLocked` (Graceful Lockout).
- **Resolved:** All 4 `PlatformManifest` records exist in the database: `core_ops_v1`, `fnb_ops_v1`, `retail_ops_v1`, `recycling_ops_v1`.
- **Resolved:** All 4 pilot tenants have `manifest_key` set and resolve with `source: 'manifest'` (not fallback):
  - Taqueria (fnb_ops_v1 / Enterprise) — 8 nav items, all unlocked
  - Renewed Resources (recycling_ops_v1 / Business) — 8 nav items, policy-scoped
  - Renewed Fashion (retail_ops_v1 / Starter) — 8 nav items, policy-scoped
  - Izaliqa Bakes (fnb_ops_v1 / Starter) — 8 nav items, policy-scoped
- **Resolved:** Duplicate inline fallback navigation removed from `WorkspaceLayout.jsx`. The `useManifestHydration` hook now always delegates to `hydrateManifest()`, making `ManifestHydrator.js` `FALLBACK_NAV` the single safety net.

## Future Features (POST-MVP — do not build now)
- Orbit Nexus as standalone subscription product (RAG, agentic AI, AI services).
- Orbit Marketplace (module marketplace).
- Advanced AI agents (autonomous inventory/procurement/finance agents).
- White-labelling and enterprise customisation.
- AquaOrbit (Aquarist OS) · ChefOrbit (Kitchen OS) — ecosystem products.
- Multi-country / multi-currency expansion beyond SGD default.
- Advanced automations marketplace.

## Client Preferences
- **Product Owner:** Muhammad Firdaus Bin Ismail (Founder).
- **Strategic preference:** Scalability-first, platform-thinking, configuration over hardcoding. Challenge assumptions. Propose alternatives. Do not overbuild.
- **Co-founder:** Hamka Ariffin (pilot tenant association).
- **Communication:** Product terms only for non-technical contexts. Direct and practical.
- **Build style:** Minimal changes, preserve working features, don't overbuild.
- **Debugging:** Diagnose root cause first, fix only the confirmed issue.
- **Planning:** Separate must-have from later. Simplest reliable Base44 structure.
- **Verification:** Every button, form, route tested before claiming done.
- **Language:** Match user's language (English).
- **Timezone:** Asia/Singapore (UTC+8).

## Prompt History (key decisions log)
- Initial ecosystem architecture established and tenant isolation verified.
- Project Memory committed as the single source of truth for all future development.
- **Wallet-Native architecture adopted:** Replaced hardcoded ERP integration with immutable WalletTransaction ledger + FinanceSyncQueue async reconciliation bridge.
- **Dynamic Trust governance:** `governance_threshold_sgd` added to ActivationRegistry (replaces fixed thresholds). Industry-specific: HBB=50, F&B=200, Retail=300.
- **Procurement → Wallet wiring (2026-07-06):** ProcurementPage "Receive" button now persists PO status + calls `walletEngine.debit_procurement_sgd`. Governance threshold check creates GovernanceOverride if exceeded.
- **ProcurementPage data loading (2026-07-06):** Added useEffect to load POs from database on mount.
- **Client-readiness sprint (2026-07-06):** (1) Fixed multi-tenancy violation in ProcurementPage. (2) Wired Supplier dropdown to real Supplier entity. (3) Added error handling + loading states. (4) Deleted 28 orphaned tenant1/2/3 page files. (5) Built HBBPage. (6) Deferred Stripe + Xero to post-MVP.
- **Manifest migration complete (2026-07-06):** All 4 pilot tenants now resolve navigation from `PlatformManifest` DB records. Duplicate inline fallback nav removed from `WorkspaceLayout.jsx`. `ManifestHydrator.js` is the single source of truth.
- **HBB Industry Pack provisioned (2026-07-07):** Created `hbb` ActivationRegistry + `hbb_ops_v1` PlatformManifest. SGD 50 governance threshold. `ChefHat` icon added to ManifestNav. Transition-ready to F&B/Retail pack when HBB scales to physical premises.

## MVP Timeline Status
- **Start:** 30 May 2026
- **Today:** 6 July 2026 (Day 37)
- **Target end:** ~30 July 2026 (Day 60)
- **Remaining:** ~3 weeks
- **Status:** Architecture is strong. Core operational modules largely exist. Biggest remaining risk is the dead-code files from the pre-manifest era (see audit below), NOT missing features.

## HBB Industry Pack Provisioned (2026-07-07)
- **ActivationRegistry `hbb` pack** created: `governance_domain: 'hbb_standard_ops'`, `governance_threshold_sgd: 50` (per Master Vision — HBB-specific). AI governance trust level = `low` (agent requires approval for all writes). Trust pillars configured: Food Safety (30%), Shield Governance (30%), Audit Integrity (20%), Production Velocity (20%).
- **PlatformManifest `hbb_ops_v1`** created: Navigation blueprint with HBB-specific labels — "Customer Orders" (sales), "Production Planner" (hbb), "Ingredients & Stock" (inventory), "Suppliers & Purchases" (procurement). Uses `ChefHat` icon for Production Planner (added to `ManifestNav.jsx` ICON_MAP).
- **Transition Path:** When an HBB tenant (e.g. Izaliqa Bakes) grows to a physical premises, update their `manifest_key` from `hbb_ops_v1` to `fnb_ops_v1` or `retail_ops_v1`. Core entities (InventoryItem, SalesInvoice, Task, Supplier) are shared across packs — zero data migration required.
- **Industry field:** Set to `other` on the ActivationRegistry (HBB is a business model, not an industry). The actual industry — e.g. `food_beverage` for a home bakery — is set on the Tenant entity.

## Dead Code Audit (2026-07-06)
Files that exist but are **not imported anywhere** — leftovers from the pre-manifest hardcoded navigation era:
- `src/lib/tenant-nav.js` — OLD hardcoded `T1_NAV`, `T2_NAV`, `T3_NAV` per-tenant arrays. Superseded by `ManifestHydrator`. Safe to delete.
- `src/lib/orbitan-plans.js` — Superseded by `orbitan-config.js` + `SubscriptionPolicy` entity. Safe to delete.
- `src/lib/ai/AIOrchestrator.js` — Never wired into any page. Future use only. Safe to delete or keep for future.
- `src/lib/adapters/ModuleDataAdapter.js` — Not imported by any live page. Safe to delete.
- `src/lib/registry/subscription-registry.js` — Superseded by `SubscriptionPolicy` entity. Safe to delete.

Files only imported by other dead files (transitively dead):
- `src/lib/orbitan-nav.js` — Only imported by `AIStudio.jsx`. Contains `MODULE_REGISTRY`. Partially live.