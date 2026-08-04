# Project Memory: OrbitanOS

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows pilot
> tenants to genuinely run parts of their daily operations through OrbitanOS, gather
> feedback, validate assumptions, and establish the foundation for future growth of the
> Orbitan ecosystem.
>
> **Build Philosophy:** Build less. Validate more.
>
> **Last updated:** 2026-08-04 (Build #28.2G.1 — Repository Consolidation & Auth Hardening)

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
| Role | Scope |
|------|-------|
| `admin` | Platform owner (Orbitan staff). Full access across all tenants. |
| `tenant_admin` | Organisation-level admin. Cross-outlet visibility within their tenant. |
| `client_manager` | Manages client accounts within a tenant. |
| `outlet_manager` | Single-outlet operations manager. |
| `supervisor` | Shift supervisor. Read/write within assigned outlet. |
| `worker` | Frontline employee. Own data + outlet-scoped reads. |

## Core Pages (production paths)
- **Public:** `/` (Landing), `/login`, `/register`, `/forgot-password`, `/reset-password`
- **Auth gateway:** `/auth/gateway`, `/join`, `/welcome`, `/request-access`
- **Onboarding:** `/onboarding` (self-serve org creation wizard)
- **Workspace (generic, scalable):** `/workspace/:tenantId/*` — WorkspaceLayout + WorkspaceDashboard, Inventory, Procurement, HBB, Sales, Tasks, Workforce, Scheduling, Compliance, Reports
- **Platform console:** `/leader-org`
- **Tenant/outlet:** `/company`, `/outlet/*`
- **Platform revenue engine:** `/platform/wallet`, `/platform/marketplace`, `/platform/shield`, `/platform/integrations`
- **Worker portal:** `/worker`

## Core Entities
**Orbit Core (Foundation):** Tenant, Company, Client, Outlet, Employee, Invitation, AccessRequest
**Workforce:** Shift, ClockRecord, PayrollSnapshot, Task
**Operations:** InventoryItem, Supplier, PurchaseOrder, GoodsReceipt, ProductCatalog, Recipe, ReplenishmentAlert
**Finance:** SalesInvoice, DailyReconciliation, FinanceSyncQueue, FinanceMapping, AccountMapping
**Wallet-Native Ledger:** OrbitanWallet, WalletTransaction (immutable), OrbitUsageTracker
**Governance:** GovernancePolicy, GovernanceOverride, AuditLog, ComplianceRecord, FoodSafetyLog, ComplianceSnapshot, ActivationRegistry, SubscriptionPolicy, PlatformManifest
**Platform:** IntegrationCredential, SystemSettings, DashboardLayout, Announcement, IssueLog, AIDocument, DeploymentLog, MarketplaceModule, EvolutionProposal
**Communication:** OrbitInbox, NotificationTemplate, NotificationPreference, SemanticRelationship
**Pilot Ops:** OnboardingChecklist, NexusInsight, NexusCapabilityRegistry, ImportHistory, ArtifactRecord, OperationalMetric, MetricDefinition, AccessRequest, ShiftTradeRequest, StockCount, MaterialCollection, WorkReview, TaskAssignment, DailyReconciliation, ExpenseRecord, Client

## Important Workflows
1. **Manifest-driven provisioning:** `PlatformManifest` → `ManifestHydrator` → `ManifestNav`. Navigation is registry-driven, not hardcoded. `ManifestHydrator` fetches `PlatformManifest` + `SubscriptionPolicy` in parallel, intersects via `allowedModules`, marks locked modules as `isLocked` (Graceful Lockout).
2. **Org provisioning:** Onboarding wizard → `onboardingService` → `ActivationRegistry` blueprint → seeds compliance/tasks/AI docs + creates Tenant/Company/Outlet/Wallet
3. **Worker onboarding:** Invitation/AccessRequest → manager approval → Employee record
4. **Clock-in/out:** `clockController` → ClockRecord → (compliance gate via Shield) → TimesheetManager validation → PayrollSnapshot lock
5. **Procurement (Wallet-Native):** PO create → submit → approve → **Receive** → `walletEngine.debit_procurement_sgd` → WalletTransaction (immutable) + FinanceSyncQueue entry. Governance threshold check → auto-approve or GovernanceOverride request.
6. **Sales & reconciliation:** SalesInvoice → AIReceipts (nexus OCR) → verify → `financeController` → Xero sync
7. **Shield governance:** `shieldInterceptor` evaluates `GovernancePolicy` before sensitive writes → block (Guardian) / notify (Auditor) / GovernanceOverride release valve. Every outcome captured in `AuditLog`.
8. **Replenishment:** `replenishmentEngine` analyses sales × recipe BOM → ReplenishmentAlert → drafts POs
9. **Orbit Nexus routing:** `nexus` gateway routes intelligence requests; `OrbitUsageTracker` meters credits and debits `OrbitanWallet`.
10. **Orbit Inbox (ADR-0053):** Event → `notificationDispatcher` → OrbitInbox (in-app) + SendEmail (email) per recipient preferences.

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
- URL `tenantId` must match the session's `tenant_id` (platform admins excepted). `WorkspaceLayout` enforces this.
- Admin-only actions are protected by server-side role validation (`base44.auth.me()` → `user.role === 'admin'`).
- Public pages must not pull private entity data.
- **RLS `$in` operator:** The Base44 RLS engine does NOT support `$in` in user_condition role checks. Use explicit `$or` blocks instead.

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
- **Accessibility:** WCAG 2.1 AA compliance mandatory (see Golden UI/UX Standard).

## Decisions Already Made
1. **Orbitan = Product, OrbitanOS = Platform.** Pilots are validation only.
2. **Registry-driven architecture:** `ActivationRegistry` + `PlatformManifest` replace hardcoded industry logic.
3. **Wallet-Native ledger:** `OrbitanWallet` + `WalletTransaction` is the master ledger. `ledger_sync_mode: internal` for MVP pilots; `erp_integrated` for future Xero/QuickBooks.
4. **Dynamic Trust governance:** `governance_threshold_sgd` on `ActivationRegistry` (HBB=50, F&B=200, Retail=300, Enterprise=configurable).
5. **Shield modes:** Auditor (notify) for Starter/Growth plans; Guardian (block) for Enterprise only.
6. **One-component-many-industries UI:** ActivationRegistry toggles column visibility / interaction logic — no per-industry UI forks.
7. **Xero integration** via OAuth secrets + backend functions. Per-tenant OAuth.
8. **MVP build philosophy:** Build less, validate more. Marketplace, advanced automations, complex AI agents, white-labelling, enterprise features are POST-MVP.
9. **Dynamic `/workspace/:tenantId/*` routing** — scales to thousands of orgs without route changes.
10. **`WorkspaceLayout` already implements tenant-session access control** — a separate `TenantAuthGuard` component is unnecessary.
11. **Naming Hierarchy:** Orbitan = company/brand. OrbitanOS = flagship product. Orbit = shared services prefix. Orbit Nexus = AI platform (standalone).
12. **Orbit Core:** Foundational services (Auth, Tenancy, Permissions, Audit) reserved as "Orbit Core". Core entities are immutable; product modules use side-car entities.
13. **Independent Deployability:** Interface-First Constraint — all cross-module communication via `base44.functions.invoke()`, no direct imports.
14. **Orbit Core Adapter Pattern:** Platform-agnostic data access layer at `src/lib/orbit-core.js`.
15. **Enterprise compliance readiness:** SOC 2, ISO 27001, Vanta-ready from day one. Formal certification post-MVP.
16. **Orbit Evolution:** Continuous improvement loop (Observe → Understand → Recommend → Approve → Implement → Measure → Learn).
17. **Orbit ID expanded scope:** Identity governance for human + machine + AI agent identities.
18. **Orbit Nexus standalone subscription:** Separate product with Free/Pro/Team/Enterprise plans. MVP bundles AI within OrbitanOS plans; standalone is post-MVP.
19. **No fictional data:** Never create fake companies, brands, outlets, or employees.

## Frozen Foundations v1.0 (2026-07-23)
- **RA-0000** Architecture Governance Framework — FROZEN
- **RA-0004** Platform Services Architecture — FROZEN (Platform vs Domain layering, PCP-001..005)
- **RA-0005** Identity Architecture — FROZEN (Orbit Identity Model, global User vs tenant Employee)
- **Orbitan Frozen Foundations v1.0**, **MVP Charter**, **Build Manifest v1.0** — Published
- **Git tag:** `v1.0-foundation-freeze`
- **Discussion Mode:** OFF. **Build Mode:** ON.
- Build rules: no silent redesign; implementation-first; AFR compliance per merge; docs with code; new architecture via governed ADRs only.

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
- Entity schemas for Tenant, Employee, Outlet, Company, Client (foundational structure).
- The `@/api/base44Client` SDK import pattern.
- Stripe product IDs and pricing (live mode, confirmed).

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
  validation, mobile optimisation, test data, export functions) ✅
- **Post-MVP:** Financial Reconciliation & Audit Readiness, Enterprise Hardening,
  Orbit Nexus standalone, Marketplace, white-labelling.

## MVP Timeline Status
- **Start:** 30 May 2026
- **MVP Target end:** ~30 July 2026 (Day 60)
- **Current:** August 2026 — Post-MVP hardening phase (Build #28.2G.1)
- **Status:** Architecture frozen. Core operational modules complete. Ecosystem
  architecture formalised (ADRs 0001–0066). Stripe billing aligned. Domain
  migration to orbitan.net complete. Repository consolidation complete.
  Authentication hardening in progress.

## Brand Identity v1.0 LOCKED (2026-08-04)
- **52 founder-approved assets registered:** 26 Orbitan (mark series 16–4096px, PWA icons 192/512, apple-touch-icon 180, favicon set 16/32/48/ico) + 26 Orbit Nexus (same structure). All assets on Base44 CDN, registered in `asset-manifest.json` and `LOGO_ASSETS` in `orbitan-identity.js`.
- **Identity config expanded:** `LOGO_ASSETS` keys: `mark`, `mark3D`, `loaderMark`, `markSm`, `markXs`, `appIcon192`, `appIcon512`, `appleTouchIcon`, `favicon16`, `favicon32`, `favicon48`, `nexusLogo`, `nexusMarkSm`, `nexusAppIcon192`, `nexusAppIcon512`. Internal `ORBITAN` and `ORBIT_NEXUS` constant maps eliminate CDN URL duplication.
- **PWA manifest complete:** 5 icons (SVG any + android-chrome-192 any + android-chrome-512 any + android-chrome-192 maskable + android-chrome-512 maskable). Both maskable icons are founder-approved purpose-built compositions.
- **Favicon set complete:** SVG (Orbit Ring) + .ico + 16×16 PNG + 32×32 PNG + 48×48 PNG in `index.html`.
- **Apple touch icon correct:** 180×180 founder-approved composition.
- **CDN hardcodes eliminated:** `WelcomeGateway.jsx` (3 instances), `Landing.jsx` (1 instance). Zero remaining hardcoded CDN URLs in component code.
- **Brand Identity frozen:** `src/docs/knowledge-hub/foundations/BrandIdentityV1.md` — lock declaration alongside RA-0000/RA-0004/RA-0005.
- **Social banner:** Founder-approved 1200×630 banner registered (`orbitan-social-banner`). Wired as `og:image` / `twitter:image` in `index.html` with descriptive alt text. `LOGO_ASSETS.socialBanner` key added to identity config.
- **Orbit Nexus brand isolation:** Nexus assets registered and isolated. Nexus favicon set available for Nexus standalone product when it ships.

## Production-Repair Build: Experience Architecture Corrections (2026-08-04)
- **Experience Architecture retained:** `src/docs/knowledge-hub/design/Orbitan-Experience-Architecture.md` — canonical 24-section design document. Claims corrected: WCAG 2.2 criteria reclassified as "target standard, partially implemented, requiring full platform audit" (not "verified"). Component 50-line rule qualified as target. Hardcoded colour and Lucide-only claims qualified.
- **Brand asset registry corrected:** `public/brand/README.md` + `public/brand/asset-manifest.json` — all assets classified as `approved`, `approved_interim`, or `pending_source`. AI social banner reclassified as "removed from production metadata." OrbitanLoader hardcoding documented as resolved.
- **SVG favicon retained:** `public/favicon.svg` — original Orbit Ring brand element. NOT a redraw of the Orbitan 3D logo.
- **AI social banner removed:** Previous AI-generated 1200×630 social banner removed from `index.html` production metadata (`og:image`, `twitter:image`). Incorrect symbol geometry and non-standard typography. No approved social banner exists — metadata intentionally omitted.
- **manifest.json corrected:** Removed incorrect `purpose: "maskable"` declarations — ordinary CDN raster PNGs do not respect the maskable safe zone. Only `purpose: "any"` icons remain. Proper maskable icons pending source artwork.
- **OrbitanLoader fixed:** Added `loaderMark` key to `LOGO_ASSETS` in `orbitan-identity.js`. `OrbitanLoader.jsx` no longer hardcodes CDN URL — uses `LOGO_ASSETS.loaderMark`.
- **Apple touch icon:** Documented as approved_interim fallback — not specifically composed or sized for 180×180 iOS requirement.
- **Cross-references retained:** DesignPrinciples.md, Accessibility.md, ResponsiveStandards.md, BrandGuidelines.md link to canonical Experience Architecture.
- **WCAG standard:** Target standard updated from WCAG 2.1 AA to WCAG 2.2 AA. Structural foundations exist (semantic HTML, token-based theming, reduced-motion, focus rings, keyboard operability). Full platform-wide audit not completed. Each criterion classified as "partially implemented."
- **GitHub repository:** `https://github.com/firdela/orbitan` — correctly documented as public (not private).
- **Limitation documented:** No vector (SVG) master of the Orbitan 3D mark exists. All approved masters are raster PNGs on the Base44 CDN. Vector reconstruction is pending. No fake SVG masters created from raster images.

## Build #28.2G.1 — Post-Validation Cleanup (2026-08-04)
- **VAL-01 Resolved:** `jsconfig.json` metadata property changed from unsupported `"//"` key to formal `"_metadata"` object. JSON parser compatibility confirmed.
- **Legacy ADR Migration:** Migrated `0011-orbit-naming-migration.md` and `0012-knowledge-hub-init.md` from the legacy `src/docs/decision-records/` directory into the canonical `src/docs/knowledge-hub/decision-records/`. Both files preserved with historical status notes and cross-references to superseding ADRs (0008, 0013, 0014). Legacy directory deleted.
- **Canonical decision-record location confirmed:** `src/docs/knowledge-hub/decision-records/` is the single source of truth for all ADRs and Reference Architectures.

## Build #28.2G.1 — Repository Consolidation & Auth Hardening (2026-08-04)
- **Documentation Consolidation:** Migrated 63 unique documents from the legacy
  `src/docs/knowledge/` directory into the canonical `src/docs/knowledge-hub/`
  with subdirectories: `product/`, `architecture/`, `design/`, `development/`,
  `knowledge/`, `research/`, `legal/`. Deleted the obsolete `knowledge/` directory.
- **Project Memory Merge:** Merged `ProjectMemory.md` into `PROJECT_MEMORY.md`
  (canonical). Deleted duplicate.
- **Pre-foundation Docs Removed:** Deleted `api-contracts.md`, `architecture-manifest.md`,
  `entity-migration.md` — all superseded by Knowledge Hub ADRs and frozen foundations.
- **Dead Code Cleanup:** Verified all 6 dead code files (`tenant-nav.js`,
  `orbitan-plans.js`, `AIOrchestrator.js`, `ModuleDataAdapter.js`,
  `subscription-registry.js`, `orbitan-nav.js`) were already deleted in prior sessions.
- **Configuration Fixes:** `package.json` name updated from `base44-app` to `orbitan`.
  `base44/config.jsonc` name updated from `New App` to `OrbitanOS`.
- **Authentication Hardening:**
  - `AuthContext.jsx`: Session expiry now captures return URL in sessionStorage
    before redirecting to login, preventing loss of intended destination.
  - `Login.jsx`: Parses `next`/`returnUrl` params and sessionStorage for
    post-login return. Added user-friendly error messages for rate-limiting,
    disabled accounts, network failures. OAuth providers preserve return URL.
  - `Register.jsx`: Added user-friendly error messages for duplicate accounts,
    rate-limiting, weak passwords, network failures. OTP verification now
    preserves return URL. Added specific OTP error messages (expired, invalid,
    rate-limited).
  - `ResetPassword.jsx`: Added specific error messages for expired/invalid
    tokens, rate-limiting, weak passwords, network failures. Added recovery
    action button on missing-token state.
  - Accessibility: Added `role="alert"` and `aria-live="assertive"` to all
    auth error message containers for screen reader compatibility.

## Xero Integration Bridge
- **xeroOAuth backend function** — full OAuth 2.0 authorization code flow with
  AES-GCM token encryption (Build #28.2B). Stores tokens in `IntegrationCredential`
  entity. OAuthTransaction entity prevents replay attacks.
- **integrationSync backend function** — FinanceSyncQueue consumer. Processes
  pending entries, auto-refreshes expired tokens, POSTs to live Xero API.
- **financeController** — creates FinanceSyncQueue entries (async broker).
- **Integration Hub UI** at `/platform/integrations` — Xero connection card,
  Sync Queue dashboard, Stripe status card.
- **Per-tenant OAuth:** Each organisation connects their own Xero org.
- **Canonical URLs:** All Xero redirect URIs use `orbitan.net` (Build #28.2F.2).

## Orbitan Free Tier
- `orbitan_free` plan per Master Vision — "Remove barriers to entry."
- S$0, 3 employees, basic attendance/tasks/training, 1 outlet, no AI/integrations/packs.
- No Stripe product (not checkoutable). Routes to `/onboarding`.

## Client Preferences
- **Founder & Product Owner:** Muhammad Firdaus Bin Ismail
- **Co-founder:** Hamka Ariffin (pilot tenant association)
- **Strategic preference:** Scalability-first, platform-thinking, configuration over hardcoding.
- **Communication:** Product terms only for non-technical contexts. Direct and practical.
- **Build style:** Minimal changes, preserve working features, don't overbuild.
- **Debugging:** Diagnose root cause first, fix only the confirmed issue.
- **Planning:** Separate must-have from later. Simplest reliable Base44 structure.
- **Verification:** Every button, form, route tested before claiming done.
- **Language:** English
- **Timezone:** Asia/Singapore (UTC+8)
- **Currency:** SGD default

## Known Risks
- **R-001 (Medium):** RLS `$in` operator not supported by Base44 engine. Must use `$or` blocks.
- **R-002 (Medium):** Task self-reference uses `full_name` instead of `user.id`. Must fix before enterprise.
- **R-003 (Low):** Duplicate routes (`/outlet/*` and `/workspace/:tenantId/*`). Deprecate `/outlet/*`.
- **R-004 (Low):** Manifest fallback not monitored. Add logging when triggered.
- **R-005 (Low→Medium):** Platform dependency on Base44. Mitigated by OrbitCore adapter pattern.
- **R-006 (Medium):** AI cost overrun. Mitigated by kill switch + OrbitUsageTracker + wallet gating.
- **R-007 (High for enterprise):** Compliance certification not yet achieved. Architecture is ready.
- **R-008 (Low):** Pilot tenant data leakage. Mitigated by dynamic routing and registry-driven architecture.
- **Token encryption at rest:** Pending KMS integration.
- **Idempotency for invoice generation:** Pending implementation.

## Future Features (Post-MVP)
- Orbit Marketplace (apps & extensions)
- Advanced AI Agents (scheduling, procurement, financial)
- White-labelling and enterprise customisation
- AquaOrbit (Aquarist OS) · ChefOrbit (Kitchen OS) — ecosystem products
- Multi-country / multi-currency expansion beyond SGD default
- Advanced automations marketplace
- Orbit Nexus as standalone subscription product (RAG, agentic AI, AI services)
- MCP Server for external AI tool integration
- Vanta/SOC2 compliance certification
- Cross-tenant pattern recognition (anonymised)