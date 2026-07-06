# Orbit — Project Memory

> Living strategic memory for the Orbit ecosystem. Review before making changes.
> Do not contradict recorded decisions unless the Product Owner explicitly revises them.
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
1. Home-Based Businesses (e.g. Izaliqa Bakes)
2. Startups
3. SMEs
4. Multi-Outlet Businesses
5. Multi-Brand Organisations
6. Holding Companies
7. Enterprise / Regional / Global Operations

Supported industries: F&B, Retail, Recycling & Sustainability, Education, Logistics, Construction, Healthcare, Manufacturing, Facilities Management, Events & Activations, Professional Services, Technology, and future industries.

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
- **Workspace (generic, scalable):** `/workspace/:tenantId/*` — WorkspaceLayout + WorkspaceDashboard, Inventory, Procurement, Sales, Tasks, Workforce, Scheduling, Compliance, Reports
- **Platform console:** `/leader-org`
- **Tenant/outlet:** `/company`, `/outlet/*`
- **Platform revenue engine:** `/platform/wallet`, `/platform/marketplace`, `/platform/shield`
- **Worker portal:** `/worker`

### ⚠️ Legacy / duplicate pages (flagged for cleanup)
`src/pages/tenant1/FnB*`, `src/pages/tenant2/T2*`, `src/pages/tenant3/T3*` — per-tenant hardcoded pages that violate the scalability principle. Should be retired in favour of the generic `/workspace/:tenantId/*` routes once feature parity is confirmed.

## Core Entities (confirmed)
**Org structure:** Tenant, Company, Client, Outlet, Employee
**Workforce:** ClockRecord, Shift, PayrollSnapshot, Invitation, AccessRequest
**Operations:** InventoryItem, PurchaseOrder, GoodsReceipt, Supplier, ProductCatalog, Recipe
**Finance:** SalesInvoice, DailyReconciliation, FinanceMapping, AccountMapping, FinanceSyncQueue
**Wallet-Native Ledger:** OrbitanWallet, WalletTransaction (immutable), OrbitUsageTracker
**Governance:** GovernancePolicy, GovernanceOverride, AuditLog, ActivationRegistry, SubscriptionPolicy, PlatformManifest
**Compliance:** ComplianceRecord, ComplianceSnapshot, FoodSafetyLog, MaterialCollection
**Platform ops:** DashboardLayout, Announcement, IssueLog, ReplenishmentAlert, MarketplaceModule, DeploymentLog, SystemSettings, Task, WorkerFeedback, AIDocument

## Important Workflows
1. **Org provisioning:** Onboarding wizard → onboardingService → ActivationRegistry blueprint → seeds compliance/tasks/AI docs + creates Tenant/Company/Outlet/Wallet
2. **Worker onboarding:** Invitation/AccessRequest → manager approval → Employee record
3. **Clock-in/out:** clockController → ClockRecord → (compliance gate via Shield) → TimesheetManager validation → PayrollSnapshot lock
4. **Procurement (Wallet-Native):** PO create → submit → approve → **Receive** → walletEngine.debit_procurement_sgd → WalletTransaction (immutable) + FinanceSyncQueue entry. Governance threshold check → auto-approve or GovernanceOverride request.
5. **Sales & reconciliation:** SalesInvoice → AIReceipts (nexus OCR) → verify → financeController → Xero sync (simulated until connector authorised)
6. **Shield governance:** shieldInterceptor evaluates GovernancePolicy before sensitive writes → block (Guardian) / notify (Auditor) / GovernanceOverride release valve
7. **Replenishment:** replenishmentEngine analyses sales × recipe BOM → ReplenishmentAlert → drafts POs

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

## Design Rules
- **Tokens-based design system:** `src/index.css` owns HSL tokens; `tailwind.config.js` maps to classes. No hardcoded hex in JSX.
- **Fonts:** Sora (heading/display), Inter (body)
- **Colours:** Orbit Blue #2563EB primary; industry pack colours (F&B orange, Retail green, Recycling green, etc.); subscription plan colours (Starter blue, Growth emerald, Business violet, Enterprise titanium)
- **Components:** shadcn/ui at `@/components/ui`; lucide-react icons only
- **Imports:** use `@/` alias, never relative `src/` paths
- **Responsiveness:** mobile-first; AppShell has collapsible sidebar + mobile overlay

## Decisions Already Made
1. **Orbitan = Product, OrbitanOS = Platform.** Pilots are validation only.
2. **Registry-driven architecture:** ActivationRegistry + PlatformManifest replace hardcoded industry logic. Adding an industry = add a registry record, not code.
3. **Wallet-Native ledger:** OrbitanWallet + WalletTransaction is the master ledger. `ledger_sync_mode: internal` for MVP pilots (no ERP push); `erp_integrated` for future Xero/QuickBooks.
4. **Dynamic Trust governance:** `governance_threshold_sgd` on ActivationRegistry (HBB=50, F&B=200, Retail=300, Enterprise=configurable). Procurement above threshold → GovernanceOverride required.
5. **Shield modes:** Auditor (notify) for Starter/Growth plans; Guardian (block) for Enterprise only.
6. **One-component-many-industries UI:** ActivationRegistry toggles column visibility / interaction logic — no per-industry UI forks.
7. **Xero integration is simulated** until the OAuth connector is authorised. financeController has the payload builders ready; swap in `connectors.getWorkspaceConnection('xero')` when live.
8. **MVP build philosophy:** Build less, validate more. Marketplace, advanced automations, complex AI agents, white-labelling, enterprise features are POST-MVP.
9. **Founder & Product Owner:** Muhammad Firdaus Bin Ismail. Pilot tenants associated with him and Hamka Ariffin. Final corporate ownership TBD (Orbitan Pte Ltd / LLC / Fetch Innovation / new holding).

## Things Not To Change
- The 6-role model (admin, tenant_admin, client_manager, outlet_manager, supervisor, worker)
- The Wallet-Native ledger architecture (WalletTransaction immutability)
- The Registry-driven provisioning model (ActivationRegistry + PlatformManifest)
- Shield's Auditor/Guardian mode distinction
- The `/workspace/:tenantId/*` generic routing pattern (this IS the scalable path)
- Token-based theming in `src/index.css` + `tailwind.config.js`
- Auth page flows (Login → OTP → verify → token → redirect; never shortcut)

## Known Bugs / Gaps (as of 2026-07-06)
1. **ProcurementPage hardcoded tenant:** `tenant_id: "tenant_taqueria"`, `outlet_id: "outlet_nb"` in PO creation — must use authenticated user's tenant/outlet context.
2. **DEMO_SUPPLIERS = [] / DEMO_ITEMS = []** in ProcurementPage — Supplier select dropdown is empty; needs to load from Supplier entity.
3. **Tenant1/2/3 duplicate pages** — architectural violation; need migration plan to generic workspace routes.
4. **Xero connector not authorised** — all finance sync is simulated.
5. **No HBB-specific pack pages** — CustomerProfile + ProductCatalog entities exist but no HBB order/production workflow UI.
6. **No payment integration** — subscription billing not yet wired (Stripe available in SG region).

## Future Features (POST-MVP — do not build now)
- Orbit Marketplace (module marketplace)
- Advanced AI agents (autonomous inventory/procurement/finance agents)
- White-labelling
- Enterprise custom integrations
- AquaOrbit, ChefOrbit (separate products, shared platform services)
- Multi-country / multi-currency expansion beyond SGD default
- Advanced automations marketplace

## Client Preferences
- **Communication:** Product terms only for non-technical contexts. Direct and practical.
- **Build style:** Minimal changes, preserve working features, don't overbuild.
- **Debugging:** Diagnose root cause first, fix only the confirmed issue.
- **Planning:** Separate must-have from later. Simplest reliable Base44 structure.
- **Verification:** Every button, form, route tested before claiming done.
- **Language:** Match user's language (English).
- **Timezone:** Asia/Singapore (UTC+8)

## Prompt History (key decisions log)
- **Wallet-Native architecture adopted:** Replaced hardcoded ERP integration with immutable WalletTransaction ledger + FinanceSyncQueue async reconciliation bridge.
- **Dynamic Trust governance:** governance_threshold_sgd added to ActivationRegistry (replaces fixed thresholds). Industry-specific: HBB=50, F&B=200, Retail=300.
- **Procurement → Wallet wiring (2026-07-06):** ProcurementPage "Receive" button now persists PO status + calls walletEngine.debit_procurement_sgd. Governance threshold check creates GovernanceOverride if exceeded. Toast feedback for auto-approve vs pending-approval.
- **ProcurementPage data loading (2026-07-06):** Added useEffect to load POs from database on mount (was previously empty).

## MVP Timeline Status
- **Start:** 30 May 2026
- **Today:** 6 July 2026 (Day 37)
- **Target end:** ~30 July 2026 (Day 60)
- **Remaining:** ~3 weeks
- **Status:** Architecture is strong and over-engineered relative to MVP scope. Core operational modules largely exist. Biggest risk is duplicate tenant-specific pages + placeholder data blocking client-readiness, NOT missing features.