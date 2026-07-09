# Project Memory: OrbitanOS

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows pilot
> tenants to genuinely run parts of their daily operations through OrbitanOS, gather
> feedback, validate assumptions, and establish the foundation for future growth of the
> Orbitan ecosystem.
>
> **Build Philosophy:** Build less. Validate more.
>
> Last updated: 2026-07-09 (Day 40 of 60-day MVP window)

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
12. **Nexus Integration Hub Strategy (2026-07-07):** Xero + Stripe are MVP must-haves. The Hub-and-Spoke pattern is ALREADY implemented via `FinanceSyncQueue` (async broker) + `FinanceMapping` (sync state registry) + `AccountMapping` (Chart of Accounts) + `financeController` (Xero payload builder) + `walletEngine` (procurement debit + governance threshold). **No new `NexusIntegrationHub` entity was created** — that would duplicate existing infrastructure. Finance events flow: OrbitanOS → `FinanceSyncQueue` (pending) → `financeController` (payload builder + Shield gate) → External API (Xero/Stripe). All entries are governance-gated via `shieldInterceptor` and logged to `AuditLog`.
13. **Orbit Nexus Knowledge Hub Established (2026-07-07):** Created `src/docs/knowledge-hub/` directory as the single source of truth for the Orbit ecosystem. Contains: `master-vision.md` (ecosystem vision, product distinction, org architecture), `golden-ui-ux-standard.md` (non-negotiable design & accessibility standards), `mvp-roadmap.md` (sprint plan, scope, build philosophy), `pilot-tenants.md` (pilot tenant registry), and `decision-records/` directory with 6 initial ADRs documenting: (0001) Registry-Driven Architecture, (0002) Wallet-Native Ledger, (0003) Shield Governance Interceptor, (0004) Dynamic Workspace Routing, (0005) Manifest-Driven Navigation, (0006) Orbit Nexus Intelligence Platform. Future ADRs follow the template in `README.md`. These documents are "RAG-ready" for future Orbit Nexus Knowledge Hub UI + AI Memory capabilities.
14. **Delegated Integration Hub (2026-07-07):** Created `IntegrationCredential` entity — per-tenant OAuth credential vault for external services (Xero, QuickBooks, etc.). Stores access/refresh tokens with strict tenant isolation (admin-only create/update/delete; tenant_admin read own). Backend functions write tokens via service role after OAuth callback. Replaces need to scatter OAuth tokens across Tenant or FinanceMapping entities. ADR 0007 documents this decision. **PaymentAudit entity was NOT created** — WalletTransaction (immutable financial ledger) + AuditLog (governance trail) already cover payment auditing. Creating a duplicate entity would violate "no duplicate systems" principle. **Billing Router deferred** — platform-level Stripe (single account) is sufficient for MVP subscription billing; per-tenant Stripe Connect is post-MVP marketplace concern.
15. **Orbit Naming Standards (2026-07-08):** Formalised the "Orbit" prefix for shared platform services vs "Orbitan" for the company/master brand. Hierarchy: Orbitan (company) → OrbitanOS/AquaOrbit/ChefOrbit (operating systems) → Orbit Core/Nexus/Shield/Connect/Builder/Wallet/Rewards/Marketplace/Flow/Insight/ID/Notify (shared platform services). Mirrors Microsoft (365 + Defender/Entra/Intune), Google (Workspace + Gemini/Drive/Meet), Apple (Apple + iCloud/Wallet/Health). ADR 0008 documents this decision. Customer-facing branding: "OrbitanOS by Orbitan, powered by Orbit Core, Orbit Nexus, Orbit Shield, Orbit Connect, Orbit Builder."
16. **Orbit Core Boundary (2026-07-08):** Established Orbit Core as an immutable foundational layer. Core entities (Tenant, Company, Client, Outlet, Employee, Invitation, AccessRequest, AuditLog, GovernancePolicy, GovernanceOverride, ActivationRegistry, PlatformManifest, SubscriptionPolicy, OrbitanWallet, WalletTransaction, IntegrationCredential, SystemSettings) must NEVER have product-specific fields added. Future products (AquaOrbit, ChefOrbit) add their own module entities that reference Core via `tenant_id`/`outlet_id`/`employee_id` — they do NOT modify Core entity schemas. Core entity schema changes require an ADR. ADR 0009 documents this decision. **No refactoring needed** — current entities already follow this pattern; this ADR formalises it as a binding constraint.
17. **Independent Deployability / Interface-First Constraint (2026-07-08):** All cross-module communication between OrbitanOS and Orbit Nexus uses `base44.functions.invoke()` exclusively. No direct imports of Nexus code into OrbitanOS frontend or backend. This ensures each product can be independently built, deployed, and exported as a standalone application — even if Nexus code is removed, OrbitanOS still compiles. Graceful degradation: catch cross-module call failures and show "feature temporarily unavailable" without crashing. ADR 0010 documents this decision. **No refactoring needed** — existing code already follows this pattern (financeController → shieldInterceptor via invoke, integrationSync → xeroOAuth via invoke, frontend → financeController via invoke). This ADR formalises the existing pattern as a binding architectural constraint.

## Xero Integration Bridge (2026-07-08)
- **xeroOAuth backend function** created — full OAuth 2.0 authorization code flow: `get_auth_url`, `exchange_code`, `refresh_token`, `get_status`, `disconnect`. Stores tokens in `IntegrationCredential` entity via service role. Gracefully detects missing `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET` and returns `configured: false` status so the UI shows a setup prompt instead of crashing. **Finance team only needs to add the two secrets in dashboard settings, then click "Connect Xero" in the Integration Hub UI.**
- **integrationSync backend function** created — the FinanceSyncQueue consumer. Processes pending entries, resolves IntegrationCredential tokens, auto-refreshes expired tokens via xeroOAuth, POSTs to live Xero API (`https://api.xero.com/api.xro/2.0/Invoices` and `/ManualJournals`), updates source entities with Xero GUIDs, creates FinanceMapping records, writes AuditLog entries.
- **financeController refactored** — `sync_invoice`, `sync_purchase_order`, and `sync_labour_costs` now create FinanceSyncQueue entries (async broker) instead of simulated GUIDs. Live Xero API calls happen in `integrationSync`, not in `financeController`. This decouples the finance workflow from ERP availability — if Xero is down or not connected, entries queue up and sync later.
- **Integration Hub UI** created at `/platform/integrations` — Xero connection card (Connect/Disconnect/Reconnect), Sync Queue dashboard (pending entries + "Sync Now" button), Stripe status card (read-only, platform-managed). Handles OAuth callback redirect automatically (`?code=...&state=tenant_id`).
- **Stripe webhook enhanced** — Added `customer.subscription.updated` event handling for plan upgrades/downgrades. When a customer changes their plan via Stripe portal, the tenant's `subscription_plan` is updated and an AuditLog entry is created. Webhook re-registered for all three events.
- **Future customers:** The entire Xero flow is per-tenant. Each organisation connects their own Xero org. No platform-level Xero account needed. The redirect URI uses the app's deployed origin, so it works for any customer domain automatically.

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

## Sprint 5 Integrity Sweep (2026-07-09)

### walletEngine RBAC Hardening — FIXED
- **Root cause:** The top-level role gate in `walletEngine` only allowed `admin` and `tenant_admin`. When an `outlet_manager` clicked "Receive" on a PurchaseOrder, the ProcurementPage called `walletEngine.debit_procurement_sgd` — which returned 403 Forbidden. This blocked the entire procurement → wallet ledger flow for outlet-level managers.
- **Fix applied (4 surgical edits):**
  1. Added `isOutletManager` to the top-level role gate — outlet managers can now call wallet read actions and `debit_procurement_sgd`.
  2. Added `admin/tenant_admin` guard inside `debit_credits` — AI credit management remains restricted.
  3. Added `admin/tenant_admin` guard inside `earn_points` — points management remains restricted.
  4. Added outlet-scoping check inside `debit_procurement_sgd` — outlet managers can only debit procurement for their OWN outlet (`outlet_id === user.data.outlet_id`), preventing cross-outlet spending.
- **Admin-only actions** (`topup_credits`, `provision_wallet`) already had `!isAdmin` guards — no change needed.

### Shadow Tenant (TEST_LAB_001) Provisioned
- **Purpose:** Destructive testing and governance validation sandbox. Bound to `fnb_standard_ops` governance domain so Shield policies match real F&B pilot tenants.
- **Records created:**
  - Tenant: `6a4eeb6992cc657b66ec24cc` (Orbitan Test Lab, food_beverage, orbitan_growth)
  - Company: `6a4eeb69fc5cc1a0cb338e2b` (Test Lab F&B Co)
  - Outlet: `6a4eeb692e8382bd9ce85611` (Test Lab Outlet)
  - Wallet: `6a4eeb6ccf174e98c6bc1a70` (500 credits, bronze tier)
- **Usage:** Test procurement governance thresholds, GovernanceOverride flows, and Shield block/notify outcomes without polluting pilot tenant data.

### Backend Function Role-Logic Audit — COMPLETE
- `walletEngine` — **Fixed** (see above). Uses `user.role` correctly; was missing `outlet_manager` from allowed roles.
- `financeController` — **Clean.** Uses `user.role` with `['admin', 'tenant_admin', 'outlet_manager']` allowed roles.
- `shieldInterceptor` — **Clean.** Admin bypass via `user.role === 'admin'`. Tenant scoping via `user.data?.tenant_id`. Domain-aware resolution from `Tenant.governance_domain`.
- `clockController` — **Clean.** Uses `user.role` for manager/supervisor checks. Tenant/outlet scoping via `user.data?.tenant_id` / `user.data?.outlet_id`.
- `onboardingService` — **Clean.** Uses `user.role === 'admin'` for admin-only actions. Self-serve provisioning is open to all authenticated users with plan restriction.
- `auditEngine` — **Clean.** System automation function (no `auth.me()`). Uses `base44.asServiceRole` throughout, triggered by entity events.
- **Conclusion:** No `user.data?.role` vulnerability found. All functions use `user.role` from the authenticated session as the source of truth for authorization.

## Known Bugs / Gaps (as of 2026-07-07)
1. ~~**ProcurementPage hardcoded tenant**~~ ✅ FIXED — now uses `useAuth()` to resolve `tenant_id` and `outlet_id` from the authenticated user profile. Also added error handling (try/catch + toast) on PO creation.
2. ~~**DEMO_SUPPLIERS = []**~~ ✅ FIXED — Supplier dropdown now loads from `base44.entities.Supplier.list()`. Selecting a supplier stores both `supplier_id` and `supplier_name`. Preferred suppliers show a ★ marker.
3. ~~**Tenant1/2/3 duplicate pages**~~ ✅ FIXED — all 28 orphaned files deleted (zero imports confirmed). Generic `/workspace/:tenantId/*` routes are the sole path.
4. **Xero integration — ACTIVATING (2026-07-07):** Escalated to MVP must-have by Product Owner. Xero is NOT a supported Base44 connector, so integration uses OAuth secrets (XERO_CLIENT_ID, XERO_CLIENT_SECRET) + backend function. The `financeController` already has the Xero payload builder (`buildXeroInvoicePayload`) and simulated sync — will swap to live API calls once secrets are set. Finance team signs into their own Xero account (per-tenant OAuth).
5. ~~**No HBB-specific pack pages**~~ ✅ FIXED — `HBBPage.jsx` created at `/outlet/hbb` and `/workspace/:tenantId/hbb`. Combines Customer Orders (via SalesInvoice) + Production Planning (via Task with `module_context: 'hbb_production'`). Minimal MVP scope; no delivery tracking.
6. ~~**No payment integration**~~ ✅ FIXED — Stripe checkout is now LIVE (Live Mode). Three subscription products in Stripe: OrbitanOS Starter (S$49/mo), OrbitanOS Growth (S$149/mo), OrbitanOS Business (S$399/mo). Starter is free (no checkout), Enterprise is contact-sales. `stripeCheckout` backend function creates Checkout Sessions for Growth + Business. `stripeWebhook` handles `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`. Checkout page at `/checkout` shows Growth + Business with correct pricing matching Stripe. Test card: 4242 4242 4242 4242.
7. ~~**`AccessRequestQueue.jsx` Shield bypass**~~ ✅ FIXED (2026-07-07) — `ShieldGuard.check()` now called before approval logic. Checks subscription employee limits via `shieldInterceptor`. If blocked, throws error → `onError` toast notifies manager. Subscription limit bypass is no longer possible.
8. ~~**`ProcurementPage.jsx`** renders its own hardcoded `NAV` inside `AppShell`~~ ✅ FIXED (2026-07-07) — Removed the `<AppShell>` wrapper and hardcoded `NAV` array from `ProcurementPage.jsx`. Page now renders as a bare fragment inside `WorkspaceLayout`'s `<Outlet />`, using the manifest-driven sidebar exclusively. Unused icon imports (Home, Users, Calendar, FileText, CheckSquare, BarChart2, Shield, Layers, Building2, Package, ChevronDown, format) cleaned up. No business logic changed.
9. ~~**`DEMO_TENANTS` fallback**~~ ✅ FIXED (2026-07-07) — Removed `DEMO_TENANTS` import and fallback from `WorkspaceLayout.jsx`. Tenant resolution is now purely DB-driven (`tenantRecord || null`). All pilot tenants confirmed in DB.

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
- **Finance-First Integration Audit (2026-07-07):** Audited `FinanceSyncQueue`, `FinanceMapping`, `AccountMapping`, `financeController`, `walletEngine`. Finding: Integration Hub infrastructure is ALREADY BUILT and aligned with the Hub-and-Spoke strategy. `FinanceSyncQueue.erp_target` enum includes `xero`, `quickbooks`, `myob`, `manual_export`. `financeController` has `buildXeroInvoicePayload()` + simulated sync with clear TODO for live API swap. `walletEngine.debit_procurement_sgd` already creates FinanceSyncQueue entries, WalletTransaction ledger entries, GovernanceOverride requests (when above threshold), and AuditLog entries. No schema changes needed. No new entity needed. Only missing piece: actual external service connections (Stripe via payment provider + Xero via OAuth secrets).
- **Sprint 5 Cleanup (2026-07-07):** (1) Removed `DEMO_TENANTS` fallback from `WorkspaceLayout.jsx` — tenant resolution is now purely DB-driven. (2) Fixed `AccessRequestQueue.jsx` Shield bypass — `ShieldGuard.check()` now evaluates subscription employee limits before invitation creation; blocked approvals surface a destructive toast. (3) Re-enabled `complianceAlertEngine` scheduled automation — function tested healthy (`success: true`), automation had been auto-disabled after 5 stale failures from an earlier version. (4) Confirmed dead code purge from prior sessions — `tenant-nav.js`, `orbitan-plans.js`, `AIOrchestrator.js`, `ModuleDataAdapter.js`, `subscription-registry.js` all already deleted.
- **Orbit Nexus Knowledge Hub (2026-07-07):** Established the "brain" behind Orbitan's evolution. Created `src/docs/knowledge-hub/` with master vision, golden UI/UX standard, MVP roadmap, pilot tenant registry, and 6 Architecture Decision Records (ADRs). ADRs document the "why" behind: registry-driven architecture, wallet-native ledger, Shield governance interceptor, dynamic workspace routing, manifest-driven navigation, and Orbit Nexus intelligence platform. ADR template included in README.md for future decisions. Feedback system already well-built (IssueLog entity + ReportIssueModal + nexusFeedbackAnalyst).
- **Orbit Ecosystem Architecture Formalised (2026-07-08):** Three new ADRs added to the Knowledge Hub: (0008) Orbit Naming Standards — "Orbit" prefix for platform services, "Orbitan" for master brand/company. (0009) Orbit Core Boundary — Core entities are immutable; product modules use side-car entities. (0010) Independent Deployability — Interface-First constraint: all cross-module communication via `base44.functions.invoke()`, no direct imports. Master Vision updated with full platform service hierarchy (Orbit Core, Nexus, Shield, Connect, Builder, Wallet, Rewards, Marketplace, Flow, Insight, ID, Notify). README updated with ADRs 0007-0010 in the directory listing. No code refactoring was needed — these ADRs formalise patterns the codebase already follows.
- **Orbit Naming Architecture Locked + Stripe Aligned (2026-07-09):** ADR-0013 created — formally locks the three-tier naming hierarchy (Orbitan = company, OrbitanOS = OS products, Orbit = shared services) as the permanent brand standard. Stripe products confirmed renamed in dashboard: "OrbitanOS Starter" (S$49), "OrbitanOS Growth" (S$149), "OrbitanOS Business" (S$399). **Fixed pricing mismatch in `Checkout.jsx`** — Growth was S$79 (now S$149), Business was S$299 (now S$399) to match Stripe products. **Fixed `stripeCheckout` backend `PLAN_NAMES`** — was "Orbitan Growth/Business" (now "OrbitanOS Growth/Business"). **Fixed stale Stripe Price IDs** — old price IDs (`price_1TqW4x...`) were invalid after Stripe product rename; updated to `price_1TqdJoDap39FEFGJwNccaO12` (Growth) and `price_1TqdJoDap39FEFGJDYVJYLDR` (Business). Both tested and returning live Stripe checkout URLs. Checkout feature lists updated to match Stripe product descriptions. Landing page pricing already correct (renders dynamically from `orbitan-config.js`). All verification passed — see ADR-0013 verification table.

## MVP Timeline Status
- **Start:** 30 May 2026
- **Today:** 9 July 2026 (Day 40)
- **Target end:** ~30 July 2026 (Day 60)
- **Remaining:** ~3 weeks
- **Status:** Architecture is strong. Core operational modules largely exist. Ecosystem architecture formalised (ADRs 0008-0013). Stripe billing fully aligned with OrbitanOS naming. Biggest remaining focus is Sprint 5: pilot preparation, dashboards, bug fixes, permissions validation, mobile optimisation.

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