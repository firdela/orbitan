# Project Memory — Orbitan Ecosystem

> **Purpose:** Institutional memory for the Orbitan platform. All architectural decisions,
> naming standards, and constraints are recorded here. Do not contradict decisions recorded
> in this document unless explicitly directed by the Product Owner.

## App Name
Orbitan (Product) / OrbitanOS (Platform)

## App Purpose
A commercial, scalable, multi-tenant SaaS Workforce Operating System. Pilot tenants
(Taqueria, Renewed Resources, Renewed Fashion, HBBs) are validation environments only.
Future customers are the primary market.

## Target Users
- Home-Based Businesses
- Startups & SMEs
- Multi-Brand Organisations
- Holding Companies
- Enterprise & Regional/Global Operations

## User Roles
| Role | Scope |
|------|-------|
| `admin` | Platform owner (Orbitan staff). Full access across all tenants. |
| `tenant_admin` | Organisation-level admin. Cross-outlet visibility within their tenant. |
| `client_manager` | Manages client accounts within a tenant. |
| `outlet_manager` | Single-outlet operations manager. |
| `supervisor` | Shift supervisor. Read/write within assigned outlet. |
| `worker` | Frontline employee. Own data + outlet-scoped reads. |

## Core Pages
- `/` — Public Landing (marketing + onboarding gateway)
- `/auth/gateway` — Intelligent auth entry
- `/join` — Invitation-based worker onboarding
- `/onboarding` — Self-serve org creation wizard
- `/workspace/:tenantId/*` — Dynamic tenant workspace (manifest-driven)
- `/outlet/*` — Legacy outlet routes (being phased out in favour of /workspace)
- `/platform/*` — Platform owner console (wallet, marketplace, shield, audit)
- `/leader-org` — Founder/pilot command center

## Core Entities
**Orbit Core (Foundation):** Tenant, Company, Client, Outlet, Employee, Invitation, AccessRequest
**Workforce:** Shift, ClockRecord, PayrollSnapshot, Task
**Operations:** InventoryItem, Supplier, PurchaseOrder, GoodsReceipt, ProductCatalog, Recipe, ReplenishmentAlert
**Finance:** SalesInvoice, DailyReconciliation, FinanceSyncQueue, FinanceMapping, AccountMapping
**Governance:** GovernancePolicy, GovernanceOverride, AuditLog, ComplianceRecord, FoodSafetyLog, ComplianceSnapshot
**Platform:** ActivationRegistry, SubscriptionPolicy, PlatformManifest, OrbitanWallet, WalletTransaction, MarketplaceModule, IntegrationCredential, SystemSettings
**Intelligence:** AIDocument, IssueLog, WorkerFeedback, DeploymentLog, DashboardLayout, Announcement

## Important Workflows
1. **Onboarding:** Register → Select Industry → Select Plan → Configure Structure → Activate Packs → Workspace
2. **Procurement:** Create PO → Upload Supplier Doc → AI Extract → Manager Verify → Receive Goods → Sync to Xero
3. **Sales:** Create Invoice / Upload Receipt → AI Extract → Daily Reconciliation → Xero Sync
4. **Governance:** Action → Shield Interceptor → Threshold Check → Auto-approve or Override Request → Manager Review → Audit Log
5. **Worker Onboarding:** Invite Code → AccessRequest → Manager Approve → Employee Record → Workspace

## Security Rules
- **Tenant isolation:** Every entity carries `tenant_id`. RLS enforces `data.tenant_id === {{user.data.tenant_id}}` for all non-admin roles.
- **Outlet scoping:** `outlet_manager` and below are restricted to `data.outlet_id === {{user.data.outlet_id}}`.
- **`tenant_admin` cross-outlet:** Must see ALL outlets within their tenant. RLS must NOT apply `outlet_id` filter for this role.
- **`$in` operator:** The Base44 RLS engine does NOT support `$in` in user_condition role checks. Use explicit `$or` blocks instead.
- **Admin-only entities:** SubscriptionPolicy, ActivationRegistry, PlatformManifest, OrbitanWallet (write), WalletTransaction (write) are admin-only for create/update/delete.
- **Public reads:** ActivationRegistry and PlatformManifest have empty `read` RLS (publicly readable) so the onboarding wizard works pre-auth.

## Design Rules
- **Fonts:** Sora (headings/display), Inter (body)
- **Primary:** Orbit Blue #2563EB
- **Plan colours:** Starter=Blue, Growth=Emerald, Business=Violet, Enterprise=Titanium+Gold
- **Industry pack colours:** F&B=Orange, Retail=Green, Recycling=DarkGreen, etc.
- **Sidebar:** Deep Titanium dark rail
- **Design system:** shadcn/ui + Tailwind tokens in src/index.css → tailwind.config.js
- **Accessibility:** WCAG 2.1 compliance mandatory (see Golden UI/UX Standard)

## Decisions Already Made
1. **Naming Hierarchy:** Orbitan = company/brand. OrbitanOS = flagship product. Orbit = shared services prefix. Orbit Nexus = AI platform (standalone).
2. **Orbit Core:** Foundational services (Auth, Tenancy, Permissions, Audit) reserved as "Orbit Core".
3. **MVP Deadline:** 30 July 2026 (2 months from 30 May 2026 start).
4. **Sprint 5 Priority:** 50% Stability/Security, 30% Onboarding Integrity, 20% Orbit Nexus hooks.
5. **No fictional data:** Never create fake companies, brands, outlets, or employees. Use "Pending Setup" / "Coming Soon" placeholders.
6. **Registry-driven:** Industry logic lives in ActivationRegistry, not hardcoded.
7. **Manifest-driven navigation:** PlatformManifest + ManifestHydrator render the sidebar. SubscriptionPolicy gates entitlement.
8. **Wallet-native ledger:** OrbitanWallet is the master ledger. FinanceSyncQueue bridges to ERP (Xero).
9. **Dynamic Trust thresholds:** Governance thresholds per industry (HBB=S$50, F&B=S$200, Retail=S$300).
10. **Decision Records:** All significant architecture decisions recorded in src/docs/knowledge-hub/decision-records/.
11. **Orbit Evolution:** Continuous improvement loop (Observe → Understand → Recommend → Approve → Implement → Measure → Learn). EvolutionProposal entity + evolutionEngine function. Privacy-first, human-in-control. (ODR-0019)
12. **Orbit ID expanded scope:** Identity governance for human + machine + AI agent identities. Business Access Intelligence as differentiator. AI Agent Governance via ActivationRegistry.ai_governance. (ODR-0020)
13. **Orbit Nexus standalone subscription:** Separate product with Free/Pro/Team/Enterprise plans. Customers can subscribe without OrbitanOS. MVP bundles AI within OrbitanOS plans; standalone is post-MVP. (ODR-0021)
14. **Enterprise compliance readiness:** SOC 2, ISO 27001, Vanta-ready from day one. RBAC, RLS, audit logs, encryption, shield governance, AI kill switch all built in. Formal certification post-MVP. (ODR-0022)
15. **Orbit Core Adapter Pattern:** Platform-agnostic data access layer at `src/lib/orbit-core.js`. All new modules import `OrbitCore` instead of `base44` directly. Existing code unchanged (additive). Single migration point when switching platforms. (ODR-0023)

## Things Not To Change
- Entity schemas for Tenant, Employee, Outlet, Company, Client (foundational structure)
- Authentication flow (Login → OTP → Register → ResetPassword) — use platform SDK
- Stripe product IDs and pricing (live mode, confirmed)
- The `@/api/base44Client` SDK import pattern
- Design tokens in src/index.css (colour system)
- The 6-R principles: Renew, Relate, Respond, Refine, Regulate, Reach

## Known Bugs / Risks
- **RLS `$in` operator:** Multiple entities use `$in` in RLS role checks. The Base44 engine does not support this. Must refactor to explicit `$or` blocks. Affected: InventoryItem, PurchaseOrder, Employee, Company, Client, Invitation, FinanceSyncQueue, OrbitanWallet.
- **Duplicate routes:** Both `/outlet/*` and `/workspace/:tenantId/*` serve the same pages. Need migration plan.
- **Manifest fallback:** If PlatformManifest lookup fails, ManifestHydrator falls back to hardcoded nav. This is intentional but must be monitored.

## Future Features (Post-MVP)
- Orbit Marketplace (apps & extensions)
- Advanced AI Agents (scheduling, procurement, financial)
- White-labelling
- Multi-currency / multi-region
- AquaOrbit, ChefOrbit products
- MCP Server and Connector SDK
- Vanta/SOC2 compliance certification

## Client Preferences
- **Founder:** Muhammad Firdaus Bin Ismail (Product Owner)
- **Co-founder:** Hamka Ariffin
- **Currency:** SGD default
- **Timezone:** Asia/Singapore
- **Language:** English (with multi-language readiness)
- **Communication:** Direct, practical, no over-explanation. Build when enough info exists.

## Frozen Foundations v1.0 (2026-07-23)
- **RA-0000** Architecture Governance Framework — FROZEN
- **RA-0004** Platform Services Architecture — FROZEN (Platform vs Domain layering, PCP-001..005)
- **RA-0005** Identity Architecture — FROZEN (Orbit Identity Model, global User vs tenant Employee)
- **Orbitan Frozen Foundations v1.0**, **MVP Charter**, **Build Manifest v1.0** — Published
- **Git tag:** `v1.0-foundation-freeze`
- **Discussion Mode:** OFF. **Build Mode:** ON.
- Build rules: no silent redesign; implementation-first; AFR compliance per merge; docs with code; new architecture via governed ADRs only.
- See: `src/docs/knowledge-hub/foundations/` and `src/docs/knowledge-hub/decision-records/RA-0000|0004|0005.md`

## Prompt History
- Sprint 5 planning: Approved 50/30/20 weighting (Stability/Onboarding/Intelligence)
- Naming architecture: Approved "Orbit" prefix for shared services, "Orbitan" for brand
- Knowledge Hub: Approved Decision Records system and Markdown-based knowledge store
- Foundation Freeze: RA-0000, RA-0004, RA-0005 accepted and frozen; Build Mode authorised