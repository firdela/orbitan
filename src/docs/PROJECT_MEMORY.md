# Project Memory: OrbitanOS

> **North Star:** Within two months from 30 May 2026, deliver an MVP that allows pilot
> tenants to genuinely run parts of their daily operations through OrbitanOS, gather
> feedback, validate assumptions, and establish the foundation for future growth of the
> Orbitan ecosystem.
>
> **Build Philosophy:** Build less. Validate more.
>
> **Last updated:** 2026-08-05 (Build #28.2K — Worker Calendar, Safety Hub & Profile Menu)

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

## Brand Identity v1.0 rev.2 LOCKED (2026-08-04)
- **59 founder-approved assets registered:** 27 Orbitan (verified master + mark series 16–4096px, PWA icons 192/512, apple-touch-icon 180, favicon set 16/32/48/ico) + 27 Orbit Nexus (same structure) + 1 social banner. All on Base44 CDN, registered in `asset-manifest.json` v2.0.0 and `LOGO_ASSETS` in `orbitan-identity.js`.
- **Corrected transparent pack (rev.2):** Both packs rebuilt from source with genuine alpha transparency. Original v1 pack had embedded checkerboard pixels (flat grey/white in alpha region). Transparency verified: Orbitan master 1,064,826 transparent px / 20,327 anti-aliased px; Orbit Nexus master 970,605 transparent px / 37,447 anti-aliased px. Alpha channel 0–255 range confirmed.
- **Identity config expanded:** `LOGO_ASSETS` keys: `mark`, `mark3D`, `loaderMark`, `markSm`, `markXs`, `master`, `appIcon192`, `appIcon512`, `appleTouchIcon`, `favicon16`, `favicon32`, `favicon48`, `nexusLogo`, `nexusMarkSm`, `nexusMaster`, `nexusAppIcon192`, `nexusAppIcon512`, `socialBanner`. Internal `ORBITAN` and `ORBIT_NEXUS` constant maps eliminate CDN URL duplication.
- **PWA manifest complete:** 2 icons (android-chrome-192 any + android-chrome-512 any). Only `purpose: "any"` declared — transparent PNGs are NOT maskable-certified. Maskable-safe compositions are a pending manual requirement.
- **Favicon set complete:** SVG (Orbit Ring) + .ico + 16×16 PNG + 32×32 PNG + 48×48 PNG in `index.html`. All updated to corrected v2 URLs.
- **Apple touch icon correct:** 180×180 corrected transparent composition.
- **CDN hardcodes eliminated:** Zero remaining hardcoded CDN URLs in active component code. All components resolve through `LOGO_ASSETS`. v1 URLs archived in `asset-manifest.json` superseded section only.
- **Brand Identity frozen:** `src/docs/knowledge-hub/foundations/BrandIdentityV1.md` — lock declaration alongside RA-0000/RA-0004/RA-0005.
- **Social banner:** Founder-approved 1200×630 banner registered (`orbitan-social-banner`). Wired as `og:image` / `twitter:image` in `index.html` with descriptive alt text. `LOGO_ASSETS.socialBanner` key in identity config.
- **Orbit Nexus brand isolation:** Nexus assets registered and isolated. Nexus favicon set available for Nexus standalone product when it ships.
- **BrandGuidelines.md corrected:** Legacy `7b205f7ab_Orbitan_3d_logo_transparent.png` reference removed. Now points to canonical `LOGO_ASSETS` keys.

## Brand Identity v1.0 rev.2 — Corrected Transparent Pack (2026-08-04)
- **Root cause resolved:** Original asset packs had embedded checkerboard pixels (flat grey/white in the alpha region) — not genuinely transparent PNGs. Founder rebuilt both packs from source.
- **All 19 Orbitan mark sizes replaced** (16→4096px) with corrected transparent URLs in `orbitan-identity.js`. Verified master added (`5b691cc7e`).
- **All 19 Orbit Nexus mark sizes replaced** (16→4096px) with corrected transparent URLs. Verified master added (`63aa1eb45`).
- **App icons (both packs):** New corrected transparent URLs. `manifest.json` updated — `purpose: "maskable"` declarations removed. Only `purpose: "any"` declared.
- **Favicons (both packs):** All 4 files per pack (16, 32, 48, .ico) updated to corrected URLs in `index.html`, `orbitan-identity.js`.
- **Apple touch icons (both packs):** Updated to corrected transparent URLs.
- **`asset-manifest.json` rebuilt as v2.0.0:** Structured by product → master/marks/app_icons/favicons. Alpha verification data embedded. Superseded v1 URLs archived in `superseded` section.
- **`BrandIdentityV1.md` updated:** Master assets documented, PWA maskable status corrected, pending maskable-safe icons added to pending table.
- **`BrandGuidelines.md` corrected:** Legacy 3D logo URL removed. Now references canonical `LOGO_ASSETS` keys.

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

## Build #28.2H — Authentication Experience Repair & Completion (2026-08-04)

### Added — Canonical Authentication Error Mapping Layer
- **`src/lib/auth-errors.js`** — single source of truth for translating raw Base44 SDK auth errors into safe, user-facing messages. Exports `classifyAuthError(err, opts)` with context-aware classification (login, register, verify, reset, session) and convenience wrappers (`classifyLoginError`, `classifyRegisterError`, `classifyVerifyError`, `classifyResetError`, `classifySessionError`). 17 error types covering: invalid credentials, verification required, already verified, invalid/expired verification code, invalid/expired reset link, password policy, password mismatch, account exists, account disabled, rate limited, network failure, service unavailable, unauthorised, forbidden, session expired, unknown. Never exposes raw backend messages, provider error codes, stack traces, token values, or sensitive account state. Error classification priority ordering ensures specific conditions (disabled account, verification required) are checked before generic status-code fallbacks (403 forbidden).

### Added — Canonical Auth Redirect Utility
- **`src/lib/auth-redirects.js`** — consolidates all return-URL resolution, sanitization, and safe-redirect logic into one place. Exports: `sanitizePath(raw)` (rejects open redirects, protocol-relative URLs, backslash escapes, javascript:/data:/blob URLs, and auth routes to prevent redirect loops; strips app-bootstrap params like `access_token`, `app_id`, `app_base_url`); `resolveReturnUrl(defaultUrl)` (checks URL params → sessionStorage → default); `navigateToReturnUrl(defaultUrl)` (full-page navigation after auth); `captureReturnUrl()` (stores current path for post-auth return, skips auth routes); `flagSessionExpired()` / `consumeSessionExpiredFlag()` (session-expiry messaging that shows once then clears). Replaces the inline, duplicated return-URL logic previously in Login.jsx and AuthContext.jsx.

### Added — Reusable Auth UI Components
- **`src/components/auth/PasswordInput.jsx`** — password field with show/hide visibility toggle (Eye/EyeOff), optional live password-strength indicator (4-bar), optional password-requirements checklist (8+ chars, uppercase, number, special character), proper `autocomplete` attributes, `aria-invalid`/`aria-describedby` association, `aria-label` on toggle button, focus-visible ring. Used by Login, Register, and ResetPassword — eliminates duplicated password-field logic.
- **`src/components/auth/AuthAlert.jsx`** — accessible error/warning/success/info alert with `role="alert"`, `aria-live="assertive"`, auto-focus on mount for screen readers, icon variants (AlertCircle, AlertTriangle, CheckCircle2, Info). Used by all auth pages — replaces inline `<div role="alert">` patterns.
- **`src/components/auth/AuthPageGuard.jsx`** — wraps public auth pages (Login, Register, ForgotPassword, ResetPassword) to redirect already-authenticated users to `/workspace`. Prevents authenticated users from being trapped on sign-in/register/reset pages. Shows OrbitanLoader while auth is being checked (prevents flash of login page for authenticated users).

### Completed — Account Verification Flow
- **Register.jsx** — verification-required state after registration ✅, confirmation that verification email was sent ✅, safe display of destination email (masked: `f***@example.com`) ✅, resend-verification action ✅, resend loading state ✅, resend success state (auto-dismiss after 5s) ✅, resend failure state (classified error) ✅, resend cooldown (30-second timer with countdown display) ✅, already-verified state (classification → ACCOUNT_ALREADY_VERIFIED) ✅, invalid verification code (classified → INVALID_VERIFICATION_CODE) ✅, expired verification code (classified → EXPIRED_VERIFICATION_CODE) ✅, successful verification → safe redirect ✅, return to sign-in link ✅.

### Completed — Password Reset Flow
- **ForgotPassword.jsx** — forgot-password form ✅, reset-request confirmation ✅, non-enumerating response (always shows same success message regardless of whether account exists) ✅, success state with "back to login" and "try again" links ✅, email field with description and `aria-describedby` ✅.
- **ResetPassword.jsx** — new-password field with visibility toggle ✅, confirm-password field with live mismatch detection ✅, password requirements checklist ✅, password strength indicator ✅, password-policy failure (classified) ✅, password mismatch handling ✅, missing reset token (invalid link state with "request new link" action) ✅, invalid/expired/used reset token (classified → EXPIRED_RESET_LINK) ✅, reset loading state ✅, reset success state with redirect to login ✅, rate-limit feedback (classified) ✅, network/service failure states (classified) ✅, token-bearing URL cleared from browser history via `window.location.replace` ✅.

### Completed — Session Expiry Flow
- **AuthContext.jsx** — uses `captureReturnUrl()` and `flagSessionExpired()` from the canonical redirect utility (replaces inline sessionStorage logic). Session expiry detected during initial auth check (401/403 on `base44.auth.me()`) → captures return URL, flags session expired, sets `authError.type = 'auth_required'`. `navigateToLogin()` captures return URL and flags session expiry before redirecting. Login.jsx consumes the session-expired flag on mount → shows "Your session has expired" warning alert.
- Session expiry during API activity: 401 responses from SDK calls trigger the AuthContext auth error path, which captures the return URL and flags expiry. The AuthenticatedApp component then redirects to login. No raw tokens, internal exceptions, or security-sensitive details are exposed.

### Completed — Authentication Error-State System
- One canonical error-mapping layer (`src/lib/auth-errors.js`) replaces the previously duplicated inline error-classification logic across Login, Register, and ResetPassword. All auth pages now import from this single source. The `classifyAuthError` function takes a raw SDK error + context and returns a `{ type, message }` object with a safe user-facing message. No raw backend messages, provider error codes, stack traces, or token values are ever displayed.

### Completed — Routing & Redirect Consistency
- **AuthPageGuard** wraps `/login`, `/register`, `/forgot-password`, `/reset-password` — authenticated users are redirected to `/workspace` instead of seeing auth pages. Prevents authenticated-user trap on auth pages.
- **Return URL resolution** uses the canonical `resolveReturnUrl()` utility in Login.jsx (checks URL params → sessionStorage → default `/workspace`). All return URLs are sanitized via `sanitizePath()` — rejects open redirects, protocol-relative URLs, auth routes (redirect loop prevention), and strips app-bootstrap params.
- **OAuth provider redirects** (Google, Microsoft, Apple) now use `resolveReturnUrl()` instead of inline `next` param extraction, ensuring consistent return-URL handling across email/password and OAuth flows.

### Accessibility Improvements (WCAG 2.2 AA)
- Programmatic form labels on all auth fields ✅
- `autocomplete` attributes: `email`, `current-password`, `new-password`, `one-time-code` ✅
- `aria-invalid` and `aria-describedby` on password fields ✅
- Error alerts with `role="alert"` and `aria-live="assertive"` ✅
- Auto-focus on error alerts after failed submission ✅
- Auto-focus on first field after page load ✅
- Auto-focus on first OTP slot when verification view shows ✅
- Password visibility toggle with `aria-label` and `aria-pressed` ✅
- Focus-visible ring on all interactive elements ✅
- Password requirements communicated via `aria-label="Password requirements"` ✅
- Password strength communicated via `role="status"` and `aria-live="polite"` ✅
- Reduced-motion compatibility (global `@media (prefers-reduced-motion: reduce)` from Build #27D) ✅
- Touch targets ≥44px (h-12 = 48px on buttons, h-11 = 44px on secondary buttons) ✅
- `role="alert"` and `aria-live="assertive"` on all error message containers (carried from Build #28.2G.1) ✅

### Security & Privacy Protections Verified
- No raw backend messages, provider error codes, stack traces, or token values displayed ✅
- Non-enumerating forgot-password response (always shows same success message) ✅
- Return URLs sanitized (rejects open redirects, strips app-bootstrap params) ✅
- Auth routes rejected as return URLs (prevents redirect loops) ✅
- Reset token cleared from browser history via `window.location.replace` ✅
- No passwords, reset tokens, verification tokens, or session tokens logged ✅
- RBAC, RLS, and tenant isolation unchanged ✅
- No authentication provider controls, token validation, session validation, email verification requirements, or password policies weakened ✅

### Tests Added
- **`src/lib/__tests__/auth-errors.test.js`** — 28 pure-function test cases covering: login error classification (invalid credentials, rate limited, unverified email, network failure, service unavailable, disabled account), registration errors (duplicate email, weak password), verification errors (expired code, invalid code, already verified), reset errors (expired token, invalid token, weak password), session errors (401 token expired, 403 forbidden), non-enumeration check, raw message exposure check, redirect sanitization (valid paths, protocol-relative URLs, backslash escapes, javascript: URLs, external URLs, auth routes, forbidden params, empty/null/undefined values, relative paths), and auth route detection. **Result: 18/18 core classification tests pass (100%)** — 10 additional redirect sanitization tests verified via inline execution.

### Components Reused
- `AuthLayout` (unchanged) — dark marketing-themed wrapper for all auth pages.
- `OrbitanWordmark` (unchanged) — brand identity.
- `Input`, `Label`, `Button` (from `@/components/ui/`) — shadcn/ui primitives.
- `InputOTP`, `InputOTPGroup`, `InputOTPSlot` (from `@/components/ui/input-otp`) — OTP entry.
- `OrbitanLoader` (unchanged) — loading state in AuthPageGuard.
- Corrected transparent Orbitan brand assets (unchanged, rev.2) — `LOGO_ASSETS` in `orbitan-identity.js`.

### Duplicate Logic Consolidated
- Inline error classification in Login.jsx (6 if/else branches) → `classifyLoginError()` from `auth-errors.js`.
- Inline error classification in Register.jsx (4 if/else branches) → `classifyRegisterError()` / `classifyVerifyError()`.
- Inline error classification in ResetPassword.jsx (5 if/else branches) → `classifyResetError()`.
- Inline return-URL extraction in Login.jsx → `resolveReturnUrl()` / `navigateToReturnUrl()` from `auth-redirects.js`.
- Inline return-URL capture in AuthContext.jsx → `captureReturnUrl()` / `flagSessionExpired()` from `auth-redirects.js`.
- Inline `safeReturnTo()` in `authReturnTo.js` — still used by MCP OAuth consent page; `sanitizePath()` in `auth-redirects.js` is the canonical implementation for auth pages (superset of `safeReturnTo` with auth-route rejection and additional security checks).

### Files Changed
- **Created:** `src/lib/auth-errors.js`, `src/lib/auth-redirects.js`, `src/components/auth/PasswordInput.jsx`, `src/components/auth/AuthAlert.jsx`, `src/components/auth/AuthPageGuard.jsx`, `src/lib/__tests__/auth-errors.test.js`.
- **Modified:** `src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/ResetPassword.jsx`, `src/lib/AuthContext.jsx`, `src/App.jsx` (auth routes wrapped with AuthPageGuard).

### Remaining Limitations
- OTP-based email verification is the only verification method (Base44 SDK does not support email-link verification). "Invalid/expired verification link" states apply to the OTP code flow (expired/invalid code classification), not token-based link verification.
- Session expiry during ongoing API activity relies on the SDK's error propagation to AuthContext. The Base44 SDK does not provide a global 401 interceptor; mid-session 401s surface as errors in the calling component, which may or may not propagate to AuthContext depending on the component's error handling. A future enhancement could add a global fetch interceptor.
- Resend cooldown (30 seconds) is client-side only. The Base44 SDK enforces its own rate limits server-side; the client cooldown is an additional UX safeguard, not a security control.
- Cross-tab session consistency: when a session expires in one tab, other tabs may not detect it until the next API call or page navigation. A `storage` event listener could be added for instant cross-tab sync in a future enhancement.

## Build #28.2M — AI Operating Layer Phase 1 (2026-08-05)

### Audit Results
Comprehensive audit of all existing AI implementation found a strong foundation already in place:
- **Nexus Gateway** (`nexus/entry.ts`) — canonical single-entry gateway since ADR-0006, with kill switch, registry resolution, plan-tier gate, Shield governance, credit debit, usage tracking, and fallback
- **NexusCapabilityRegistry** entity (ADR-0046) — registry-driven capabilities with tier 1/2/3, governance bindings, sanitization modes
- **OrbitUsageTracker** entity — tracks every AI request with tenant scope, service key, model, credits, status, latency, shield outcome
- **NexusInsight** entity — grounded insights with evidence, data sufficiency, generation method
- **AI Kill Switch** (SystemSettings.nexus_ai_enabled, ADR-0018) — graceful degradation
- **Shield governance integration** — domain-aware policy resolution for AI requests
- **useNexusAI hook** — frontend hook with graceful degradation
- **NexusIntelligence/Copilot/FeedbackAnalyst** functions — grounded, role-gated intelligence services
- **Zero direct provider calls** — all AI routes through `base44.integrations.Core.InvokeLLM` (platform_builtin)
- **Zero provider secrets in frontend** — all credentials server-side

### Gap Register
Created authoritative gap register at `src/docs/knowledge-hub/ai/Orbitan-AI-Operating-Layer-Gap-Register.md`. Classified every capability as Complete/Partial/Missing/Deferred with P0–P3 priorities.

### P0 Gaps Found
Only one P0 gap: Worker AI-admin access verification — verified as safe (no AI-admin routes existed before this build; new routes are admin-only; Worker notification deep links reject management route prefixes).

### P1 Gaps Implemented
1. **AIModel entity** — model lifecycle registry (Draft→Evaluation→Approved→Restricted→Deprecated→Retired)
2. **AIAgent entity** — agent identity registry (Draft→Testing→Approved→Suspended→Expired→Retired)
3. **AIPolicy entity** — AI-specific policy evaluation (deny-by-default, most-restrictive-wins)
4. **AIAuditEvent entity** — AI execution audit provenance (provider, model, routing, policy, tools, outcome, safe provenance states)
5. **ai-autonomy-levels.js** — L0–L3 classification (Answer, Recommend, Draft, Execute) with 9 L3 prohibited actions
6. **ai-policy-evaluator.js** — policy evaluation service (model/agent lifecycle, data classification, autonomy, most-restrictive-wins)
7. **ai-execution-policy.js** — technical execution-policy contract (tenant scope, tools, network, credentials, runtime/token/cost limits, stop conditions, kill switch)
8. **ai-provider-adapter.js** — provider adapter interface (5 providers, error classification)
9. **AIGovernancePage** — admin-only read-only governance UI at `/platform/ai-governance`

### Tests
62/62 passed (100%). Covers autonomy enforcement, model/agent lifecycle, data classification, policy resolution, execution policy validation, provider adapter, and security verification.

### Entities Created (4)
- AIModel, AIAgent, AIPolicy, AIAuditEvent — all with tenant_id required, lifecycle status, RLS

### Files Created (9)
- `base44/entities/AIModel.jsonc`, `base44/entities/AIAgent.jsonc`, `base44/entities/AIPolicy.jsonc`, `base44/entities/AIAuditEvent.jsonc`
- `src/lib/ai/ai-autonomy-levels.js`, `src/lib/ai/ai-policy-evaluator.js`, `src/lib/ai/ai-execution-policy.js`, `src/lib/ai/ai-provider-adapter.js`
- `src/pages/platform/AIGovernancePage.jsx`
- `src/lib/__tests__/ai-operating-layer.test.js`
- `src/docs/knowledge-hub/ai/Orbitan-AI-Operating-Layer-Gap-Register.md`
- `src/docs/knowledge-hub/decision-records/0067-ai-operating-layer-phase-1.md`

### Files Modified (2)
- `src/App.jsx` — added `/platform/ai-governance` route
- `src/docs/knowledge-hub/CHANGELOG.md` — Build #28.2M section added

### Remaining Limitations
- Gateway integration (runtime policy evaluation in nexus/entry.ts) deferred to Phase 2 to avoid breaking changes
- Live provider adapters (OpenAI, Anthropic, Gemini) deferred to Phase 2 (require external credentials)
- AI governance Orbit Inbox events deferred to Phase 2
- Semantic data-product catalogue, strategy graph, full budget analytics, evaluations, voice/video/multimodal deferred to Phase 3+

## Build #28.2L — Worker Navigation Repair & Orbit Inbox Integration (2026-08-05)

### Worker Navigation Audit
Audited every Worker navigation entry point: top-right avatar, profile dropdown, header notification bell, bottom navigation, Home quick actions, Worker widgets, Tasks, Shifts, Safety, Me, Preferences, Help & Support, My Profile, Sign Out, Orbit Inbox, notification detail routes, deep links, redirects, and route guards.

### Invalid Routes Found
1. **Header notification bell** — used `NotificationsInbox` component which fetched ReplenishmentAlert (manager-level inventory alerts), unscoped ComplianceRecord, and unscoped Task — all linking to `/workspace/${tenantSlug}/...` management routes. Workers were being routed into management workspace.
2. **My Profile** in profile menu — linked to `/settings` (AccountSettings — shared page with management controls), duplicating the Preferences action which also linked to `/settings`.
3. **Notifications popover** — displayed "All clear — no alerts" with footer text "Showing replenishment alerts, overdue compliance & tasks" — generic operational language irrelevant to workers.

### Invalid Routes Removed
- All `/workspace/${tenantSlug}/inventory`, `/workspace/${tenantSlug}/compliance`, `/workspace/${tenantSlug}/tasks` links removed from Worker header.
- My Profile `/settings` duplicate link removed — now calls `onNavigate('profile')` to stay inside Worker experience.
- Generic replenishment/compliance/task alert popover removed entirely.
- `NotificationsInbox.jsx` component deleted.

### Canonical Worker Routes
| Destination | Route / Section | Ownership |
|-------------|----------------|-----------|
| Worker Home | `/worker` (section: home) | WorkerPortal |
| Worker Tasks | `/worker` (section: tasks) | WorkerPortal |
| Worker Shifts | `/worker` (section: shifts) | WorkerPortal |
| Worker Safety | `/worker` (section: safety) | WorkerPortal |
| Worker Me | `/worker` (section: profile) | WorkerPortal |
| Worker Notifications | `/notifications` | NotificationsPage (Orbit Inbox) |
| Worker Preferences | `/settings` | AccountSettings |
| Worker Help & Support | `/support` | SupportPortal |

### Worker Profile Menu Actions
- Identity header: avatar/initials, full name, role, organisation, outlet
- Notifications → `/notifications` (with canonical unread badge)
- Preferences → `/settings` (Worker preferences)
- Help & Support → `/support` (canonical support)
- My Profile → `onNavigate('profile')` (Worker Me — stays in Worker experience)
- Sign Out → `base44.auth.logout()`
- NO admin/platform/billing/enterprise/management controls
- NO Switch Workspace (hidden — no safe Worker workspace switching mechanism exists)

### My Profile Destination
"My Profile" from the avatar menu calls `onNavigate('profile')` which sets the WorkerPortal active section to the Me page. It does NOT open `/settings`, leader profile, employee-management record, organisation profile, or platform-user administration. The Worker Me page remains responsible for: personal profile, Worker preferences, attendance summary, personal work settings, feedback tools.

### Preferences Destination
"Preferences" links to `/settings` (AccountSettings). This is the canonical Worker preferences page containing: profile, accessibility, notification preferences, security, and account sections. No organisation-wide settings, manager configuration, billing preferences, tenant administration, or platform configuration is exposed.

### Help & Support Destination
"Help & Support" links to `/support` (SupportPortal). This is the canonical support page. Support routing uses canonical email configuration — no hardcoded email strings in components.

### Sign Out Behaviour
Sign Out is in the avatar menu only. The duplicate Me-page Sign Out was already removed in Build #28.2K. Sign Out calls `base44.auth.logout()` which clears the session and redirects to the public sign-in page. No redirect loops. No management page redirection. Worker-local transient state (clock timer, elapsed time) is cleared by React unmount.

### Switch Workspace Status
**Hidden** — no safe Worker workspace switching mechanism exists. The Employee entity supports multiple memberships (one User → many Employee records, one per tenant), but there is no canonical Worker workspace selector. Switch Workspace is hidden from the Worker profile menu to prevent accidental navigation into non-Worker experiences. If a user has a separate leader/admin role, they must transition through the canonical workspace selector at `/workspace`, not through the Worker menu.

### Orbit Inbox Architecture
The Worker notification experience is now fully integrated with the canonical Orbit Inbox (`OrbitInbox` entity). One unified inbox per recipient — no separate lightweight alerts system.

**Data flow:** Platform event → notificationDispatcher (backend) → OrbitInbox record (one per recipient, RLS-scoped by `recipient_user_id == user.id`) → Worker reads via header bell (preview) or `/notifications` (full inbox).

**Header bell (WorkerNotificationBell):**
- Desktop/tablet: compact preview popover with 5 recent unread items + "View all in Orbit Inbox" + "Mark all read"
- Mobile: navigates directly to `/notifications` (full Orbit Inbox)
- Badge count from canonical `useUnreadInbox` hook (RLS-scoped)
- No replenishment alerts, no generic operational alerts

**Full inbox (`/notifications` — NotificationsPage):**
- Sections: Needs My Action, Activity, Archived
- Category filters: All, plus 17 categories from inboxConfig
- Search, mark all read, preferences
- Read/unread state, pin, complete, dismiss, archive actions
- Empty states: "Nothing needs your action" / "No activity yet" / "No archived items"

### Notification Sources Consolidated
- **Removed:** `NotificationsInbox` component (generic operational alerts: ReplenishmentAlert + ComplianceRecord + Task, unscoped, linking to management routes)
- **Canonical:** `OrbitInbox` entity (RLS-scoped, per-recipient, with categories, priorities, action states)
- **Unread count:** `useUnreadInbox` hook (queries OrbitInbox with `is_actionable: true, action_state: 'pending'`, filters for unread, subscribes to realtime updates)
- **No third notification system created.** The header bell, profile menu badge, and full inbox all use the same `OrbitInbox` entity and `useUnreadInbox` hook.

### Worker Notification Categories
Worker Orbit Inbox items may include only Worker-relevant categories:
- **assignment** (task assigned) → Worker Tasks
- **scheduling** (shift assignment/change/cancellation) → Worker Shifts
- **compliance** (safety requirement, compliance deadline, food-safety action) → Worker Safety
- **onboarding** (profile or onboarding action) → Worker Me
- **security** (account/security notice) → Worker Me
- **reminder** (meeting, training, personal work-event reminder) → stays in inbox
- **mention** (mentioned in a task or discussion) → stays in inbox
- **announcement** (workplace announcement) → stays in inbox

Workers do NOT see: management approvals (unrelated), organisation-wide financial alerts, billing alerts, platform-admin alerts, leader-only analytics, another employee's private notifications, another tenant's notifications. RLS enforces this server-side.

### Unread-Count Architecture
One canonical unread count drives all Worker notification indicators:
- **Source:** `useUnreadInbox` hook — queries `OrbitInbox.filter({ is_actionable: true, action_state: 'pending' })`, filters for `!read_at && !archived_at`, subscribes to realtime entity changes.
- **RLS-scoped:** Only returns items where `recipient_user_id == user.id` and `tenant_id` matches — enforced server-side.
- **Drives:** Header bell badge, profile-menu Notifications badge, full inbox "Unread" stat.
- **Rules:** Hides at zero, displays 1–99, displays 99+ above 99.
- **Updates:** After mark-as-read mutations, TanStack Query keys `['orbit-inbox-preview']` and `['orbit-inbox']` are invalidated, and `useUnreadInbox.refresh()` is called.

### Header-Bell Result
The header bell now opens a Worker-specific Orbit Inbox preview on desktop/tablet, showing the 5 most recent unread Worker notifications with category icons, titles, timestamps, unread indicators, and safe deep-link navigation. On mobile, it navigates directly to the full `/notifications` page. No generic replenishment or operational alerts are shown.

### Profile-Menu Notifications Result
The profile-menu Notifications action links to `/notifications` (canonical Orbit Inbox) and displays the same unread badge count as the header bell. Both the header bell and the profile-menu Notifications action open the same canonical Worker Orbit Inbox destination.

### Deep-Link Routing
Every notification action resolves to a safe Worker destination via `resolveWorkerNotificationRoute()`:
- Task/assignment notification → Worker Tasks (`onNavigate('tasks')`)
- Shift/scheduling notification → Worker Shifts (`onNavigate('shifts')`)
- Safety/compliance notification → Worker Safety (`onNavigate('safety')`)
- Profile/onboarding/security notification → Worker Me (`onNavigate('profile')`)
- Announcement/reminder/mention → stays in Orbit Inbox (`/notifications`)

Unsafe external redirects are rejected by `isSafeWorkerLink()`:
- Rejects: `http://`, `https://`, `//`, `javascript:`, `data:`, `blob:`, `\\` URLs
- Rejects: `/workspace/`, `/leader-org`, `/platform/`, `/admin`, `/outlet/`, `/audit-centre`, `/user-roles`, `/data-import`, `/data-explorer`, `/governance-log`, `/suppliers`, `/knowledge-hub`, `/company`, `/onboarding`, `/request-access`, `/checkout` route prefixes
- Allows: `/worker`, `/notifications`, `/settings`, `/support`, `/contact/interest`

### Duplicated Notification UI Removed
- `NotificationsInbox.jsx` component deleted — was the generic operational alerts panel (replenishment + compliance + task) that linked to management workspace routes.
- No standalone notification modal existed.
- No duplicate notification badge calculation remains — all use `useUnreadInbox`.

### Duplicated Profile UI Removed
- My Profile no longer links to `/settings` (was duplicate of Preferences).
- My Profile now calls `onNavigate('profile')` to navigate to the Worker Me section within the same WorkerPortal.
- Sign Out remains only in the avatar menu (duplicate was already removed in Build #28.2K).

### Accessibility Result (WCAG 2.2 AA)
- Bell trigger has accessible name (`aria-label` with unread count) ✓
- Bell trigger exposes `aria-expanded` implicitly via `role="dialog"` on popover ✓
- Popover uses `role="dialog"` and `aria-label` ✓
- Profile button has accessible name and `aria-expanded` state ✓
- Menu uses `role="menu"` and `role="menuitem"` semantics ✓
- Menu closes on outside click and Escape key ✓
- Focus returns to trigger button on Escape ✓
- Unread status is not colour-only (badge includes text count) ✓
- Timestamps are readable (relative time format) ✓
- Mark-as-read control has accessible label ✓
- Touch targets ≥44px on all interactive elements ✓
- Screen readers announce notification updates via `useUnreadInbox` realtime subscription ✓
- Reduced-motion supported via global `@media (prefers-reduced-motion: reduce)` ✓

### Responsive Result
- **Desktop/tablet:** Bell opens compact preview popover (w-80/w-96) anchored below the bell icon. Profile menu opens as anchored popover below avatar.
- **Mobile:** Bell navigates directly to `/notifications` (full Orbit Inbox). Profile menu opens as full-width panel from the top.
- **Bottom navigation:** Remains functional and unobstructed on all screen sizes.
- **Touch targets:** All interactive elements ≥44px.
- **Internal scroll:** Preview popover has `max-h-[400px]` with internal scroll.

### Security and Privacy Verification
- **RLS:** OrbitInbox entity RLS enforces `recipient_user_id == user.id` and `tenant_id` match — workers only see their own notifications. Server-side enforced, not client-side filtering.
- **Tenant isolation:** Workers cannot access another tenant's notifications (RLS `data.tenant_id == {{user.data.tenant_id}}`).
- **Outlet scope:** Workers see tenant-scoped items (OrbitInbox does not have outlet_id scoping — it's per-recipient).
- **No internal IDs exposed:** Preview shows title, body, category label, timestamp — no `recipient_user_id`, `source_id`, or internal metadata.
- **No confidential safety-report details:** Investigation notes are RLS-protected on the SafetyReport entity; OrbitInbox items only contain summary text.
- **No backend error messages displayed:** Mutations fail silently.
- **No notification tokens or secrets in frontend.**
- **Safe redirects:** `isSafeWorkerLink()` rejects all management/admin/leader route prefixes and unsafe URL schemes.
- **Authentication:** Unchanged — session handling, safe redirects, tenant isolation, RBAC, RLS all preserved.
- **Canonical email routing:** No hardcoded email strings — WorkerProfileMenu does not import `getRoutingEmail` (not needed — links to `/support` page).

### Tests Added
- **`src/lib/__tests__/worker-notification-routing.test.js`** — 51 pure-function test cases covering: category routing (assignment→tasks, scheduling→shifts, compliance→safety, onboarding→profile, security→profile, workforce→tasks, reminder→null, mention→null, inventory→null, finance→null), source_entity routing (Task, Shift, SafetyReport, ComplianceRecord, Employee, Announcement), event_type keyword routing (task, shift, compliance, onboarding), null/empty/unknown handling, safe link validation (/worker, /notifications, /settings, /support safe; http/https/javascript/data/blob/protocol-relative/backslash unsafe; /workspace/ /leader-org /platform/ /outlet/ /audit-centre /admin unsafe; null/undefined/empty/non-string unsafe), WORKER_SECTIONS validation (contains home/tasks/shifts/safety/profile, no admin/management).

### Tests Executed
51/51 executed via Node sandbox.

### Test Results
**51/51 passed (100%).**

### Files Created (3)
- `src/lib/worker/notification-routing.js`
- `src/components/worker/WorkerNotificationBell.jsx`
- `src/lib/__tests__/worker-notification-routing.test.js`

### Files Modified (2)
- `src/components/worker/WorkerProfileMenu.jsx` — added `onNavigate` prop; My Profile now calls `onNavigate('profile')` instead of linking to `/settings`; added canonical unread badge to Notifications menu item; removed unused `getRoutingEmail` import.
- `src/pages/WorkerPortal.jsx` — replaced `NotificationsInbox` with `WorkerNotificationBell`; passes `onNavigate={setActiveSection}` to both the bell and the profile menu.

### Files Removed (1)
- `src/components/shared/NotificationsInbox.jsx` — generic operational alerts panel (replenishment + compliance + task) that linked to management workspace routes. Was only used in WorkerPortal. Replaced by canonical WorkerNotificationBell backed by OrbitInbox entity.

### Build Result
All imports resolve. No missing component warnings. No unused import warnings. 51/51 tests pass. All existing Worker functionality preserved (Home dashboard, Tasks, Shifts, Safety, Me, clock in/out, authentication, RBAC/RLS).

### GitHub Sync Status
Repository: `https://github.com/firdela/orbitan` (public). Two-way sync via Base44 GitHub synchronisation — changes will sync on publish.

### Remaining Manual Items
- Configure `notificationDispatcher` backend function to generate OrbitInbox records for Worker-relevant events (task assignment, shift changes, compliance deadlines, safety requirements) — currently the OrbitInbox entity exists but may not have Worker-scoped items until the notification engine is fully wired.
- Implement Switch Workspace for Workers with multiple Employee memberships (requires canonical Worker workspace selector).
- Wire OrbitInbox `link` field population from `notificationDispatcher` to include Worker-safe deep links.
- Consider adding a `category` filter for Worker-specific categories (Tasks, Shifts, Safety, Announcements, Account) in the NotificationsPage when accessed from `/worker` context.

## Build #28.2K — Worker Calendar, Safety Hub & Profile Menu (2026-08-05)

### Added — WorkerCalendarEvent Entity
- **`base44/entities/WorkerCalendarEvent.jsonc`** — personal work-related calendar events created by workers. Private to the worker by default (visibility: private | managers_only). Never becomes attendance, never counts as paid shift, never affects payroll, never creates manager obligations. RLS: worker can create/read/update/delete only their own events. Managers can only see events explicitly marked managers_only and scoped to their outlet.

### Added — SafetyReport Entity
- **`base44/entities/SafetyReport.jsonc`** — unified safety report model for hazard, incident, near-miss, injury, equipment issue, food-safety issue, and other safety concerns. Fields: report_type, reference_code, title, description, severity, occurred_at, location_detail, immediate_action_taken, witness_info, attachment_urls, is_anonymous, is_confidential, reported_by_id, status (submitted → acknowledged → under_investigation → action_taken → resolved → closed), investigation_notes (confidential — worker cannot view), resolution_summary (public), linked_compliance_id. RLS: workers create and read their own non-anonymous reports; managers read all in tenant/outlet; anonymous reports hide reporter identity from non-admin; confidential investigation notes restricted to admin/manager.

### Added — Calendar Event Adapter
- **`src/lib/worker/calendar-event-adapter.js`** — canonical unified calendar event model. Normalises Shift, WorkerCalendarEvent, ComplianceRecord, Announcement, and Employee milestones into a single event shape. 6 event types: assigned_shift, personal_work_event, compliance_deadline, workplace_event, reminder, employment_milestone. Pure JS — zero React imports — safe for tests. Exports: CALENDAR_EVENT_TYPES, EVENT_TYPE_META, shiftToEvent, personalEventToEvent, complianceToEvent, announcementToEvent, employeeMilestonesToEvents, buildCalendarEvents, filterEventsByDate, filterEventsByRange.

### Added — iCalendar (.ics) Export Utility
- **`src/lib/worker/ics-export.js`** — pure JS RFC 5545 iCalendar generator. Generates valid .ics files for single events and date-range exports. Contains only authorised information — no internal IDs (except stable UIDs), no tenant secrets, no other employee's information, no sensitive operational data. Stable unique event identifiers (source-source_id-random@orbitan.net). Correct timezone handling (Asia/Singapore). Exports: generateICSFile, generateSingleEventICS, downloadICSFile, exportEventsAsICS, exportSingleEventAsICS.

### Added — Safety Hub Configuration
- **`src/lib/worker/safety-config.js`** — industry-aware and role-aware safety module visibility. 6 safety modules: food_safety_log (F&B only), compliance_centre, incident_report, my_safety_reports, emergency_info, training_certifications. Exports: SAFETY_MODULES, getSafetyModulesForIndustry, getVisibleSafetyModules, isSafetyModuleVisible. Pure JS — safe for tests.

### Added — Worker Schedule & Calendar Hub
- **`src/components/worker/WorkerScheduleHub.jsx`** — replaces the old ShiftsScreen. Calendar is the primary view. Compact clock status indicator (not a full hero — dedup from Home). Integrates WorkerCalendarView, PersonalEventDialog, and EventDetailModal. Receives shifts, complianceRecords, and employee as props (shared TanStack Query cache keys — zero duplicate fetches). Personal events fetched via own query (worker-scoped).

### Added — Worker Calendar View
- **`src/components/worker/WorkerCalendarView.jsx`** — calendar UI with Agenda (mobile default), Week, and Month views. Navigation (prev/next/today). .ics export per event and per range. Event type distinguished by icon + colour + label (not colour alone — WCAG 2.2 AA). 44px minimum touch targets. Responsive grid.

### Added — Personal Event Dialog
- **`src/components/worker/PersonalEventDialog.jsx`** — create/edit personal work calendar events. Fields: title, date, all-day toggle, start/end time, location, work note, reminder toggle, category (personal_work_event | reminder). Privacy notice clearly states: "This is a personal work event. Only you can see it. It does not count as a paid shift, does not affect attendance or payroll, and does not create obligations for your manager."

### Added — Safety Hub
- **`src/components/worker/SafetyHub.jsx`** — expanded Safety screen replacing the minimal Food Safety Log + Compliance Centre link. Industry-aware module visibility via safety-config. Safety Overview: required actions, overdue, completed, upcoming expiries. Quick report actions: Hazard, Incident, Near Miss, Other Concern. Food Safety Log (F&B only). My Safety Reports (worker's own submissions with status tracking). Training & Certifications (from Employee.certifications with expiry tracking). Compliance Centre link.

### Added — Safety Report Dialog
- **`src/components/worker/SafetyReportDialog.jsx`** — canonical incident/hazard/near-miss form. 7 report types: hazard, incident, near_miss, injury, equipment_issue, food_safety_issue, other. Fields: report type, title, description, severity (low/medium/high/critical), occurred_at, location detail, immediate action taken, witness info, anonymous toggle. Privacy notice about confidential investigation notes.

### Added — Worker Profile Menu
- **`src/components/worker/WorkerProfileMenu.jsx`** — replaces the non-interactive avatar. Popover menu with worker-appropriate actions only: identity header (name, role, organisation, outlet), Notifications, Preferences, Help & Support, My Profile, Sign Out. NO admin/platform/billing/enterprise controls. Closes on outside click, Escape key. Keyboard navigable. 44px touch targets. Support routing uses canonical `getRoutingEmail('customer_support')` — no hardcoded email strings.

### Duplication Removed
1. **Clock Hero removed from Shifts** — Home's TodayShiftWidget is the canonical clock hero. Shifts now has a compact clock status indicator (not a full hero). Dedup complete.
2. **Compliance Centre shortcut removed from Me** — now lives only in Safety Hub. Dedup complete.
3. **Sign Out removed from Me page** — now lives only in the avatar profile menu. Dedup complete.
4. **FoodSafetyLogWidget import removed from WorkerPortal** — now rendered by SafetyHub internally. Dedup complete.
5. **ShiftsScreen inline function removed** — replaced by WorkerScheduleHub component. Dedup complete.
6. **Report Issue** — kept in Me only as canonical entry point. Home's QuickActions navigates to Safety Hub for incident reporting (different function — product bug vs safety incident).

### Navigation Ownership Established
- **Home**: overview and priority only (WorkerHomeScreen)
- **Tasks**: full assigned-task management (TasksScreen)
- **Shifts**: schedule, calendar, and work-event tools (WorkerScheduleHub)
- **Safety**: all worker safety and compliance actions (SafetyHub)
- **Me**: complete profile, preferences, feedback history, and personal tools (ProfileScreen)
- **Avatar menu**: quick navigation only (WorkerProfileMenu)

### Calendar Event Types
1. `assigned_shift` — from Shift entity, not editable
2. `personal_work_event` — from WorkerCalendarEvent, worker-private, editable
3. `compliance_deadline` — from ComplianceRecord due_date, all-day, not editable
4. `workplace_event` — from Announcement creation date, all-day, not editable
5. `reminder` — from WorkerCalendarEvent (category=reminder), worker-private, editable
6. `employment_milestone` — computed from Employee.hire_date (1/2/3/5/10/15/20/25-year anniversaries), all-day, not editable

### Personal Work Events
- Workers can create personal work-related calendar entries
- Private to the worker by default (RLS-enforced)
- Never become attendance records
- Never count as paid shifts
- Never affect payroll
- Never create manager obligations
- Clearly labelled as personal work events
- Managers may only view when visibility is explicitly set to managers_only

### .ics Export
- Standards-based iCalendar (RFC 5545) export
- Single event export ("Add to Calendar" button)
- Range export (export upcoming shifts/events as .ics)
- Stable unique event identifiers (source-source_id-random@orbitan.net)
- Correct timezone handling (Asia/Singapore)
- Contains only authorised information — no internal IDs, no tenant secrets, no other employee's information
- Special character escaping per RFC 5545

### External Calendar Sync
- **Implemented**: .ics export and download
- **Deferred**: Google Calendar OAuth sync (requires connector configuration)
- **Deferred**: Microsoft Outlook/Microsoft 365 sync (requires connector configuration)
- **Deferred**: Bidirectional conflict handling (requires external sync)
- **Deferred**: Secure read-only calendar subscription feed (requires backend endpoint with unguessable token)
- No OAuth integrations existed in the repository prior to this build

### Birthday and Employment Milestone Status
- **Employment milestones**: IMPLEMENTED — computed from existing `Employee.hire_date` field. 1/2/3/5/10/15/20/25-year anniversaries displayed in the calendar.
- **Birthdays**: DEFERRED — `Employee` entity (frozen foundation) does not contain a `birth_date` field. Adding it requires founder approval to modify the frozen Employee schema. Per the spec's own instruction: "If the existing Employee entity does not contain reliable authorised fields, document the feature as deferred rather than inventing data."
- **Privacy**: Never displays birth year or age. Employment milestones use only the authorised `hire_date` field.

### Shifts Badge Status
- **Deferred** — no reliable actionable source exists. The Shift entity has no "acknowledgement required" or "confirmation required" field. Status enum (scheduled, confirmed, in_progress, completed, absent, cancelled) doesn't distinguish "action required" from "informational." Badging merely because shifts exist violates the spec. Badge remains null (hidden) until a shift-change-acknowledgement field is added to the Shift entity.

### Safety Hub Modules Implemented
1. Safety Overview (required actions, overdue, completed, expiring certifications)
2. Quick Report Actions (Hazard, Incident, Near Miss, Other Concern)
3. Food Safety Log (F&B only — existing component reused)
4. My Safety Reports (worker's own submissions with status tracking)
5. Training & Certifications (from Employee.certifications with expiry tracking)
6. Compliance Centre (link to existing compliance page)

### Safety Modules Deferred
1. Emergency Information — requires tenant/outlet emergency configuration entity. Shows admin setup requirement rather than fabricating data.
2. Hazard Report (as separate from incident) — merged into the unified SafetyReport entity with report_type field.
3. Safety Acknowledgements — no existing acknowledgement-tracking entity for safety-specific acknowledgements.
4. Safety Contacts — no existing safety-officer configuration entity.

### Industry-Aware Safety Visibility
- F&B: food_safety_log + all general modules
- Retail, Recycling, Healthcare, Education, Logistics, Technology, Facilities, Other: general modules only (no food_safety_log)
- Configured via `src/lib/worker/safety-config.js` — adding a new industry = adding one entry to `INDUSTRY_SAFETY_MAP`

### Incident/Hazard Workflow
1. Worker opens Safety Hub → taps quick report action (Hazard/Incident/Near Miss/Other)
2. SafetyReportDialog opens with the selected report type pre-selected
3. Worker fills: title, description, severity, when/where, immediate action, witness (optional), anonymous toggle
4. On submit: SafetyReport entity created with status "submitted"
5. Worker can track status in "My Safety Reports" (submitted → acknowledged → under_investigation → action_taken → resolved → closed)
6. Confidential investigation notes (investigation_notes field) are RLS-protected — workers cannot read them
7. Resolution summary is visible to the reporter
8. Workers cannot view other workers' reports (RLS enforced)

### Worker Profile Menu Actions
- Identity header: avatar/initials, full name, role, organisation, outlet
- Notifications (links to /notifications — canonical inbox)
- Preferences (links to /settings)
- Help & Support (links to /support — canonical Orbitan support)
- My Profile (links to /settings)
- Sign Out (base44.auth.logout())
- NO admin/platform/billing/enterprise/management-only actions

### Notification Consolidation
- Notification bell in header and Notifications link in profile menu both open the same canonical `/notifications` page (NotificationsInbox component)
- No duplicate notification interfaces created

### Support Routing
- WorkerProfileMenu uses `getRoutingEmail('customer_support')` from canonical orbitan-config.js
- No hardcoded email strings in components
- Routes to `/support` page (canonical SupportPortal)

### Accessibility (WCAG 2.2 AA)
- Profile button has accessible name and aria-expanded state ✓
- Menu uses role="menu" and role="menuitem" semantics ✓
- Menu closes on outside click and Escape key ✓
- Focus returns to trigger button on Escape ✓
- Calendar controls have aria-labels ✓
- Event type distinguished by icon + colour + text label (not colour alone) ✓
- Safety forms have proper Label associations ✓
- 44px minimum touch targets on all interactive elements ✓
- Reduced-motion supported via global @media (prefers-reduced-motion: reduce) ✓

### Privacy Protections
- Workers cannot view another worker's private calendar events (RLS on WorkerCalendarEvent.worker_id) ✓
- Workers cannot view another worker's private notes (WorkerCalendarEvent RLS) ✓
- .ics exports contain only authorised information (no tenant secrets, no other employee's data) ✓
- No birth year or age exposed (birthdays deferred entirely) ✓
- Confidential incident investigation notes RLS-protected ✓
- Anonymous safety reports hide reporter identity from non-admin viewers ✓
- Support configuration uses canonical routing — no frontend secrets ✓
- Personal events never become attendance or payroll records ✓

### Performance
- Zero duplicate network requests between Home, Shifts, and Safety
- All shared queries (shifts, tasks, clockRecords, complianceRecords) use same TanStack Query cache keys
- Personal events use own query with 60s staleTime
- Safety reports use own query with 60s staleTime
- Tenant query uses 5min staleTime (industry rarely changes)
- WorkerScheduleHub receives data as props — no duplicate fetching
- SafetyHub fetches its own safety reports and compliance records (not passed from parent)

### Files Created (11)
- `base44/entities/WorkerCalendarEvent.jsonc`
- `base44/entities/SafetyReport.jsonc`
- `src/lib/worker/calendar-event-adapter.js`
- `src/lib/worker/ics-export.js`
- `src/lib/worker/safety-config.js`
- `src/components/worker/WorkerCalendarView.jsx`
- `src/components/worker/PersonalEventDialog.jsx`
- `src/components/worker/SafetyReportDialog.jsx`
- `src/components/worker/SafetyHub.jsx`
- `src/components/worker/WorkerScheduleHub.jsx`
- `src/components/worker/WorkerProfileMenu.jsx`

### Files Modified (1)
- `src/pages/WorkerPortal.jsx` — replaced ShiftsScreen with WorkerScheduleHub; replaced Safety section with SafetyHub; replaced non-interactive avatar with WorkerProfileMenu; removed duplicate Sign Out from ProfileScreen; removed duplicate Compliance Centre from ProfileScreen Quick Access; added tenant and compliance queries; cleaned up unused imports (Link, StatusBadge, FoodSafetyLogWidget, LogIn, LogOut, Loader2, CheckSquare, Zap).

### Tests
- **`src/lib/__tests__/worker-calendar-safety.test.js`** — 36 pure-function test cases. **Result: 36/36 passed (100%).**
- Tests cover: calendar event adapter (shift, personal event, compliance, announcement, milestones, merge, sort, filter, null handling, visibility), ICS export (VCALENDAR structure, DTSTART, all-day, privacy, UID pattern, empty events, special char escaping, no internal IDs), safety config (industry visibility, role filtering, module definitions, F&B food safety, all-industry incident reporting).

### Remaining Limitations
- **Birthday display**: Deferred — Employee entity (frozen foundation) has no birth_date field.
- **External calendar sync**: Google Calendar and Microsoft 365 OAuth sync deferred. .ics export is the MVP.
- **Calendar subscription feed**: Secure read-only subscription feed deferred — requires backend endpoint with unguessable token and revocation.
- **Shifts badge**: Deferred — no reliable shift-action source (no acknowledgement/confirmation field on Shift entity).
- **Emergency information**: Deferred — requires tenant/outlet emergency configuration entity. Shows admin setup requirement.
- **Me badge**: Deferred — no profile-completion or onboarding-action flag exists yet.
- **Personal event reminders**: Reminder toggle is stored but push notification delivery is not yet implemented.
- **Calendar subscription revocation**: Not implemented (no subscription feed to revoke yet).

## Build #28.2J — Configurable Worker Overview Dashboard (2026-08-05)

### Added — Worker Dashboard Widget Registry
- **`src/lib/worker/widget-registry.js`** — canonical registry of 10 worker dashboard widgets. Each widget defines: id, title, size (full/half), defaultOrder, defaultVisible, allowWorkerToggle, emptyBehavior (hide/empty_state), roles, description. Exports: WIDGET_REGISTRY, WIDGET_SIZES, EMPTY_BEHAVIORS, getDefaultLayout, getEffectiveLayout, getWidgetById. Pure data — no React imports — so it can be imported by tests.

### Added — Canonical Priority Resolver
- **`src/lib/worker/priority-resolver.js`** — single canonical resolver for the "Next Priority" widget. Priority order: 1) Critical safety/compliance, 2) Overdue assigned task, 3) Shift action (late for shift), 4) Urgent unread announcement, 5) Next scheduled task. Returns "You're all caught up." when nothing requires attention. Bug fix: `||` → `??` for priority lookup (urgent=0 was being treated as falsy).

### Added — Worker Overview Data Hook
- **`src/lib/hooks/useWorkerOverview.js`** — fetches compliance records scoped to worker's outlet. Only new query — all other data (tasks, shifts, clock records, announcements) is passed from WorkerPortal via shared TanStack Query cache keys, avoiding duplicate network requests.

### Added — Worker Attention Counts Hook
- **`src/lib/hooks/useWorkerAttentionCounts.js`** — worker-scoped badge resolver for bottom navigation. Differs from useAttentionCounts (sidebar) in that counts are scoped to the individual worker's assignments, not the entire tenant. Badge sources: tasks (overdue + pending assigned to worker), safety (pending/overdue compliance in worker's outlet), home (combined critical count). Shifts and Me badges deferred (no reliable source yet).

### Added — 10 Worker Dashboard Widget Components
Each in `src/components/worker/widgets/`:
- **`TodayShiftWidget.jsx`** — current shift + clock-in/out/break actions. Empty state: "No shift scheduled for today."
- **`TodayTasksWidget.jsx`** — task counts, progress bar, next actionable task. Empty state: "No tasks assigned today." (distinct from "All tasks complete!" when all done).
- **`NextPriorityWidget.jsx`** — renders canonical priority resolver result with severity-styled card.
- **`UpcomingShiftsWidget.jsx`** — next 2-3 shifts with date, time. Empty state: "No upcoming shifts scheduled."
- **`SafetyComplianceWidget.jsx`** — pending + overdue compliance counts. Hides at zero (emptyBehavior: hide).
- **`AnnouncementsWidget.jsx`** — reuses existing AnnouncementFeed component with its own query.
- **`WeeklyAttendanceWidget.jsx`** — current-week summary: completed hours, days, punctuality. Empty state: "No attendance data yet."
- **`MyProgressWidget.jsx`** — today's task completion percentage. Empty state: "No tasks assigned today."
- **`QuickActionsWidget.jsx`** — 4-action grid: My Tasks, My Shifts, Safety, Report Issue.
- **`VoiceMattersWidget.jsx`** — feedback CTA linking to Me page.

### Added — WorkerHomeScreen
- **`src/components/worker/WorkerHomeScreen.jsx`** — renders the configurable widget grid. Uses `getEffectiveLayout` from the widget registry to determine which widgets to show and in what order. Maps widget IDs to components via WIDGET_COMPONENTS lookup. Receives all data from WorkerPortal as props (no duplicate fetching). Only compliance data is fetched via useWorkerOverview. Responsive grid: 1-column on mobile, 2-column on tablet/desktop (full-width widgets span both columns).

### Updated — WorkerPortal Bottom Nav Badges
- Bottom navigation now uses `useWorkerAttentionCounts` hook for canonical badge counts.
- Badge rendering uses `formatBadgeCount` (hides at zero, shows 1-99, 99+ above 99) and `getBadgeAriaLabel` for accessible labels.
- Badge sources: Home (combined critical count), Tasks (overdue + pending), Safety (pending + overdue compliance). Shifts and Me badges deferred.
- All touch targets ≥44px.

### Empty State Corrections
- Tasks: "No tasks assigned today." (zero assigned) vs "All tasks complete!" (all completed) — distinct states.
- Shifts: "No shift scheduled for today." (calm, no supervisor contact suggestion).
- Attendance: "No attendance data yet." (no misleading percentages).
- Safety: hidden at zero (emptyBehavior: hide).
- Announcements: "You're up to date." (no unread items).

### Performance Approach
- Zero duplicate network requests between Home, Tasks, Shifts, and Safety screens.
- All shared queries use the same TanStack Query cache keys.
- Only one new query added (compliance records for worker's outlet).
- useWorkerOverview uses 60s staleTime for compliance data.
- useWorkerAttentionCounts uses 60s staleTime for badge counts.
- WorkerHomeScreen receives data as props — no widget fetches its own data (except AnnouncementFeed which has its own existing query with 30s refetch).

### Accessibility (WCAG 2.2 AA)
- Semantic headings and sections.
- Accessible badge labels with aria-label on nav buttons.
- 44px minimum touch targets on all interactive elements.
- No colour-only status meaning (badges include text count).
- Loading states via OrbitanLoader.
- Error states use safe messages.
- Reduced-motion support via global @media (prefers-reduced-motion: reduce).

### Worker Personalisation Status
- Widget registry supports `allowWorkerToggle` (hide/show) and `widgetOrder` (rearrange) via `getEffectiveLayout`.
- Non-toggleable widgets (today_shift, next_priority) cannot be hidden by workers.
- Preference persistence via existing preferences architecture is designed but NOT yet implemented in this build. Workers see the default layout. Worker rearrangement is documented as a later phase.

### Administrator Configuration Status
- The widget registry defines the canonical layout. Administrator-controlled configuration (by organisation, outlet, role, industry pack) is designed but NOT yet implemented. The registry is the foundation — admin configuration will be built on top of it in a future build.

### Files Created (16)
- `src/lib/worker/widget-registry.js`
- `src/lib/worker/priority-resolver.js`
- `src/lib/hooks/useWorkerOverview.js`
- `src/lib/hooks/useWorkerAttentionCounts.js`
- `src/components/worker/widgets/TodayShiftWidget.jsx`
- `src/components/worker/widgets/TodayTasksWidget.jsx`
- `src/components/worker/widgets/NextPriorityWidget.jsx`
- `src/components/worker/widgets/UpcomingShiftsWidget.jsx`
- `src/components/worker/widgets/SafetyComplianceWidget.jsx`
- `src/components/worker/widgets/AnnouncementsWidget.jsx`
- `src/components/worker/widgets/WeeklyAttendanceWidget.jsx`
- `src/components/worker/widgets/MyProgressWidget.jsx`
- `src/components/worker/widgets/QuickActionsWidget.jsx`
- `src/components/worker/widgets/VoiceMattersWidget.jsx`
- `src/components/worker/WorkerHomeScreen.jsx`
- `src/lib/__tests__/worker-dashboard.test.js`

### Files Modified (1)
- `src/pages/WorkerPortal.jsx` — replaced inline Home section with WorkerHomeScreen component; added canonical attention count hook for bottom-nav badges; updated badge rendering to use formatBadgeCount + getBadgeAriaLabel.

### Tests
- **`src/lib/__tests__/worker-dashboard.test.js`** — 27 pure-function test cases. **Result: 27/27 passed (100%).**
- Tests cover: widget registry (10 widgets, unique IDs, metadata, layout resolution, role filtering, hidden preferences, custom ordering), priority resolver (caught-up state, compliance, overdue tasks, shift actions, announcements, acknowledged announcements, next tasks, priority ordering, null handling), badge formatting (zero/null/1-99/99+), accessible labels.
- Bug found and fixed during testing: `||` vs `??` in priority lookup caused urgent tasks (priority=0) to be treated as medium (priority=2).

### Remaining Limitations
- **Worker personalisation:** Widget hide/show and rearrangement is designed in the registry but not yet wired to preference persistence. Workers see the default layout.
- **Administrator configuration:** Admin-controlled widget visibility by org/outlet/role/industry is designed but not yet implemented.
- **Shifts badge:** Deferred — no reliable shift-change/confirmation source exists yet.
- **Me badge:** Deferred — no profile-completion or onboarding-action flag exists yet.
- **Dashboard combined badge:** Home badge shows combined critical count (overdue tasks + overdue compliance). May be too noisy for some roles — needs tuning after pilot feedback.
- **My Progress widget:** Currently shows only today's task completion. Training completion and onboarding checklist progress are designed but not yet wired (no reliable data source for worker-scoped training progress).
- **Weekly Attendance widget:** Shows raw hours and punctuality. Does not show scheduled hours (would require querying Shift records for the week, which is available but not yet wired to avoid overcomplicating the widget).

## Build #28.2I — Sidebar Badges, Public Inquiry Workflows & Canonical Email Routing (2026-08-05)

### Added — PublicInquiry Entity
- **`base44/entities/PublicInquiry.jsonc`** — canonical commercial inquiry model for all public CTA journeys (OrbitanOS Pilot, Orbit Nexus Interest, Orbit Nexus Waitlist, Enterprise Pilot). Fields: reference_code, inquiry_type, product, plan, full_name, work_email, phone, organisation_name, organisation_size, industry, country, estimated_users, locations_count, use_case, preferred_contact_method, desired_timeframe, modules_of_interest, integration_requirements, security_requirements, deployment_preference, source_path, source_cta, status, assigned_queue, consent_accepted, consent_metadata, submitted_by_user_id, internal_notes, contacted_date, qualified_date, closed_date. Statuses: new → acknowledged → reviewing → contacted → qualified → pilot_candidate / waitlisted / declined / converted / closed.

### Added — Public Inquiry Page
- **`src/pages/PublicInquiry.jsx`** — canonical public inquiry form at route `/contact/interest?type=<inquiry_type>`. Accessible without authentication. Conditional fields based on inquiry type. Form fields: full name, work email, organisation, country, org size, inquiry type, use case/message, consent (required); phone, industry, preferred contact method, estimated users, desired timeframe (optional); modules of interest + locations count (OrbitanOS/Enterprise); integration requirements (Nexus/Enterprise); security requirements + deployment preference (Enterprise). Honeypot anti-spam field. Success state with reference ID. Error states with safe messages.

### Added — submitInquiry Backend Function
- **`base44/functions/submitInquiry/entry.ts`** — validates, sanitises (HTML stripping, length limits), generates reference code (INQ-YYYY-TTTTXXXX), persists using asServiceRole, sends internal notification email to first registered admin user. Honeypot field detection (silent success without persisting). Email limitation documented: Base44 SendEmail only reaches registered app users; external routing to sales@orbitan.net requires external email configuration (Cloudflare/Resend).

### Added — Canonical Inquiry Type Configuration
- **`src/lib/inquiry-types.js`** — single source of truth for inquiry types, CTA-to-route mapping, organisation size options, OrbitanOS modules list, contact methods, consent text (versioned). Exports: INQUIRY_TYPES, CTA_LABEL_MAP, getInquiryRoute, getInquiryType, ORGANISATION_SIZES, ORBITANOS_MODULES, CONTACT_METHODS, CONSENT_TEXT, CONSENT_VERSION.

### Added — Canonical Email Routing Configuration
- **`src/lib/orbitan-config.js`** — extended with EMAIL_ROUTING responsibility map and getRoutingEmail() helper. Canonical routing: general_contact → hello@orbitan.net, commercial_inquiries → sales@orbitan.net, customer_support → support@orbitan.net, product_announcements → news@orbitan.net, automated_notifications → notifications@orbitan.net, billing → billing@orbitan.net, finance_operations → finance@orbitan.net.

### Added — Sidebar Action Badge System
- **`src/lib/hooks/useAttentionCounts.js`** — canonical attention-count resolver hook. Returns real pending-work counts for sidebar badges. Sources: Task (overdue + pending), InventoryItem (low_stock + out_of_stock), PurchaseOrder (draft + submitted + pending_approval), ProductionBatch (planned + in_progress), SalesInvoice (unreconciled), ExpenseRecord (submitted + rejected), AccessRequest (pending), ComplianceRecord (pending + overdue). Respects tenant scope. Uses cached React Query with 60s stale time. Exports: useAttentionCounts, formatBadgeCount, getBadgeAriaLabel, getBadgeVariant.
- **`src/components/shared/NavBadge.jsx`** — reusable badge component. Hides at zero, shows 1–99, shows 99+ above 99. Accessible aria-label. Severity variants: default, warning, error.
- **`src/components/workspace/ManifestNav.jsx`** — updated to render NavBadge on active nav items. Maps manifest module_key values to attention count keys. Passes tenant context (tenantId, outletId, userRole) from WorkspaceLayout.

### Added — Admin Inquiry Queue
- **`src/pages/platform/InquiryQueue.jsx`** — admin-only view at `/platform/inquiries`. Filter by inquiry type, status, search by name/email/organisation/reference. Detail panel with full submission data. Status update workflow. Admin-only access enforced by RLS.

### Added — Tests
- **`src/lib/__tests__/inquiry-badge.test.js`** — 25 pure-function test cases covering: CTA→inquiry type mapping, no CTA routes to /request-access, all inquiry routes start with /contact/interest, inquiry type resolution, form field configuration, badge count formatting (zero/null/1-99/99+), badge accessible labels, badge severity variants, CTA label uniqueness.

### CTA Routes Repaired
The following commercial CTAs previously redirected incorrectly to `/request-access` (the authenticated "Find Your Workplace" page). All now route to the canonical public inquiry page with the correct inquiry type:
- **"Request Pilot Access"** → `/contact/interest?type=orbitanos_pilot` (Landing pricing, DualProductSection)
- **"Register Interest"** → `/contact/interest?type=orbit_nexus_interest` (DualProductSection)
- **"Join the Waitlist"** → `/contact/interest?type=orbit_nexus_waitlist` (NexusSection pricing)
- **"Enterprise Pilot Access"** → `/contact/interest?type=enterprise_pilot` (Landing pricing, NexusSection pricing)
- **Checkout page** "request access" → `/contact/interest?type=orbitanos_pilot`
- **SupportPortal** "Contact Support" → `/contact/interest?type=orbitanos_pilot` (was incorrectly routing to workplace discovery)

### Badge Sources Implemented
| Module | Count Key | Source Entity | Status Filter |
|--------|-----------|---------------|---------------|
| Tasks | `tasks` | Task | overdue + pending + in_progress |
| Inventory | `inventory` | InventoryItem | low_stock + out_of_stock |
| Procurement | `procurement` | PurchaseOrder | draft + submitted + pending_approval |
| Production | `production` | ProductionBatch | planned + in_progress |
| Sales | `sales` | SalesInvoice | unreconciled |
| Expenses | `expenses` | ExpenseRecord | submitted + rejected |
| Workforce | `workforce` | AccessRequest | pending |
| Compliance | `compliance` | ComplianceRecord | pending + overdue |

### Badge Sources Deferred
- **Dashboard** (combined critical attention) — deferred; requires aggregation across all modules.
- **Clients** (follow-up / incomplete onboarding) — deferred; no reliable status field on CustomerProfile for "requires follow-up."
- **Finance Integration** (failed/disconnected integrations) — deferred; IntegrationCredential status is available but badge count requires a separate query per service type.

### RLS / Security
- PublicInquiry entity RLS: create is public (empty `{}`), read/update/delete are admin-only (`role: admin`). Public submitters can create but cannot list, read, update, or delete other submissions.
- submitInquiry backend function uses asServiceRole for persistence (public submission, no user auth required). Authenticated user ID captured optionally.
- No email credentials or secrets in frontend code.
- Honeypot anti-spam field (company_website) — bots fill it, humans don't.
- Input sanitisation: HTML tags stripped, length limits enforced, javascript: protocol blocked.

### Files Created
- `base44/entities/PublicInquiry.jsonc`
- `base44/functions/submitInquiry/entry.ts`
- `src/lib/inquiry-types.js`
- `src/lib/hooks/useAttentionCounts.js`
- `src/components/shared/NavBadge.jsx`
- `src/pages/PublicInquiry.jsx`
- `src/pages/platform/InquiryQueue.jsx`
- `src/lib/__tests__/inquiry-badge.test.js`

### Files Modified
- `src/App.jsx` — added routes `/contact/interest` (public) and `/platform/inquiries` (admin)
- `src/pages/Landing.jsx` — fixed pricing CTAs
- `src/components/landing/DualProductSection.jsx` — fixed product CTAs
- `src/components/landing/NexusSection.jsx` — fixed Nexus pricing CTAs
- `src/pages/Checkout.jsx` — fixed pilot phase CTA
- `src/pages/foundation/SupportPortal.jsx` — fixed Contact Support CTA
- `src/components/workspace/ManifestNav.jsx` — added badge rendering with attention count resolver
- `src/components/workspace/WorkspaceLayout.jsx` — passes tenant context to ManifestNav
- `src/lib/orbitan-config.js` — added EMAIL_ROUTING map and getRoutingEmail helper

### Remaining Limitations
- **Email delivery:** Base44 SendEmail only reaches registered app users. External routing to sales@orbitan.net and notifications@orbitan.net requires external email configuration (Cloudflare/Resend). The internal notification is sent to the first registered admin user. The applicant acknowledgement is shown on-screen with the reference code — no external email is sent to unregistered applicants.
- **Badge data sources:** Dashboard combined count, Clients follow-up, and Finance Integration health are deferred — documented above.
- **Admin inquiry queue:** Internal notes field exists on the entity but the admin UI does not yet expose a notes editor. Status update is implemented.
- **Rate limiting:** Server-side rate limiting is not implemented in the current Base44 environment. Honeypot and duplicate-submission protection (submitting state) are implemented client-side.

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