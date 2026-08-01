// ============================================================
// ORBITANOS — PLATFORM NAVIGATION REGISTRY (BUILD #27E)
// Metadata-Driven Navigation Configuration — Consolidated
// © 2024–2026 Orbitan. All Rights Reserved.
//
// Six primary domains: Overview · Tenants · Customer Success ·
// Governance · Integrations · Platform
//
// This file is pure data — zero UI dependencies.
// Internal `type` metadata (tab/route) is engineering-only and
// is NEVER displayed to end users.
// ============================================================

// ── Flat item lookup (O(1)) ────────────────────────────────
const NAV_ITEMS = {
  // Overview
  overview: { key: 'overview', label: 'Platform Overview', route: '/leader-org', description: 'Platform overview, quick access, and readiness summary', permission: 'admin' },

  // Tenants
  tenants: { key: 'tenants', label: 'Tenant Command Center', route: '/leader-org?tab=tenants', description: 'View and manage all tenant organisations', permission: 'admin' },
  subscriptions: { key: 'subscriptions', label: 'Tenant Plans & Entitlements', route: '/leader-org?tab=subscriptions', description: 'Subscription plans, billing, modules, and entitlement policies', permission: 'admin' },
  'tenant-metrics': { key: 'tenant-metrics', label: 'Tenant Insights', route: '/platform/tenant-metrics', description: 'Tenant growth, usage, subscriptions, and revenue analytics', permission: 'admin' },
  'tenant-insights': { key: 'tenant-insights', label: 'Tenant Insights', route: '/leader-org?section=tenant-insights', description: 'Tenant growth, usage, subscriptions, and revenue analytics', permission: 'admin' },
  'pilot-management': { key: 'pilot-management', label: 'Pilot Management', route: '/platform/pilot-admin', description: 'Provision, activate, monitor, and retire pilot tenants', permission: 'admin' },

  // Customer Success
  'customer-success': { key: 'customer-success', label: 'Customer Success Workspace', route: '/platform/customer-success', description: 'Cross-tenant health, adoption, onboarding, and milestones', permission: 'admin' },
  'feedback-intelligence': { key: 'feedback-intelligence', label: 'Feedback Intelligence', route: '/leader-org?tab=feedback-intelligence', description: 'AI-analysed pilot feedback and product backlog', permission: 'admin' },

  // Governance
  'shield-command': { key: 'shield-command', label: 'Shield Command', route: '/platform/shield', description: 'Runtime governance policies, overrides, and protection', permission: 'admin' },
  'audit-logs': { key: 'audit-logs', label: 'Audit Centre', route: '/audit-centre', description: 'Immutable audit trail and forensic records', permission: 'admin' },
  compliance: { key: 'compliance', label: 'Compliance', route: '/governance', description: 'Regulatory status, evidence, and corrective actions', permission: 'admin' },
  'access-control': { key: 'access-control', label: 'Access Control', route: '/platform/access-control', description: 'Roles, permissions, and access administration', permission: 'admin' },

  // Integrations
  'integration-hub': { key: 'integration-hub', label: 'Integration Hub', route: '/platform/integrations', description: 'Configure and manage Xero, Stripe, and external services', permission: 'admin' },
  'integration-health': { key: 'integration-health', label: 'Integration Health', route: '/platform/integrations', description: 'Connectivity, sync state, failures, and recovery', permission: 'admin' },

  // Platform — Foundation
  'platform-identity': { key: 'platform-identity', label: 'Platform Identity', route: '/leader-org?tab=platform-identity', description: 'Branding, operating cycle, and about platform', permission: 'admin' },
  'system-controls': { key: 'system-controls', label: 'System Controls', route: '/leader-org?tab=system-controls', description: 'Orchestrator, broadcasts, and platform settings', permission: 'admin' },
  blueprint: { key: 'blueprint', label: 'Blueprint Studio', route: '/leader-org?tab=blueprint', description: 'Design tenant blueprints and layouts', permission: 'admin' },

  // Platform — Capabilities & Access
  capabilities: { key: 'capabilities', label: 'Capability & Module Manager', route: '/platform/capabilities', description: 'Capabilities, tenant modules, feature flags, and entitlements', permission: 'admin' },
  'security-centre': { key: 'security-centre', label: 'Security Centre', route: '/platform/security-dashboard', description: 'Security events, sessions, authentication, and settings', permission: 'admin' },

  // Platform — Reliability & Operations
  'operational-health': { key: 'operational-health', label: 'Operational Health', route: '/platform/operational-health', description: 'System, transaction, inventory, finance, and audit health', permission: 'admin' },
  'incident-response': { key: 'incident-response', label: 'Incident Response', route: '/platform/exception-centre', description: 'Incidents, exceptions, investigation, and resolution', permission: 'admin' },
  'activity-logs': { key: 'activity-logs', label: 'Activity & Logs', route: '/platform/system-logs', description: 'System activity, audit centre, and technical logs', permission: 'admin' },
  'support-diagnostics': { key: 'support-diagnostics', label: 'Support Diagnostics', route: '/platform/diagnostics', description: 'Admin diagnostics: failures, queue health, and connections', permission: 'admin' },

  // Platform — Release & Evolution
  'release-readiness': { key: 'release-readiness', label: 'Release Readiness', route: '/platform/go-live-readiness', description: 'Pilot readiness, go-live readiness, validation, and blockers', permission: 'admin' },
  'deployment-pipeline': { key: 'deployment-pipeline', label: 'Deployment Pipeline', route: '/platform/deployment-pipeline', description: 'Environments, testing, staging, and release history', permission: 'admin' },
  'change-log': { key: 'change-log', label: 'Change Log', route: '/platform/change-log', description: 'Features, improvements, fixes, and known issues', permission: 'admin' },
  roadmap: { key: 'roadmap', label: 'Roadmap', route: '/roadmap', description: 'Product roadmap and planned milestones', permission: 'admin' },

  // Quick Access utilities (compact, not primary nav)
  wallet: { key: 'wallet', label: 'Orbit Wallet', route: '/platform/wallet', description: 'Platform wallet ledger and transaction management', permission: 'admin' },
  marketplace: { key: 'marketplace', label: 'Marketplace', route: '/platform/marketplace', description: 'Module marketplace and add-on catalog', permission: 'admin' },

  // Workspace — Operational Analytics & Workflows
  'task-analytics': { key: 'task-analytics', label: 'Task Analytics', route: '/task-analytics', description: 'Task performance, workload, and completion trends', permission: ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'] },
  'inventory-transfers': { key: 'inventory-transfers', label: 'Inventory Transfers', route: '/inventory-transfers', description: 'Inter-outlet stock transfer ledger and lifecycle', permission: ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'] },
  'workflow-templates': { key: 'workflow-templates', label: 'Workflow Templates', route: '/workflow-templates', description: 'Reusable, versioned operational workflow definitions', permission: ['admin', 'tenant_admin', 'outlet_manager'] },

  // Subscription & Billing — canonical tenant-facing billing
  'subscription-billing': { key: 'subscription-billing', label: 'Subscription & Billing', route: '/leader-org?section=subscription-billing', description: 'Plan, billing, usage, invoices, and payment methods', permission: 'admin' },

  // System Health — embedded console section
  'system-health': { key: 'system-health', label: 'System Health', route: '/leader-org?section=system-health', description: 'Live operational health: web, API, auth, database, storage, jobs, integrations', permission: 'admin' },

  // ── Legacy keys (backward compatibility — not shown in primary nav) ──
  modules: { key: 'modules', label: 'Modules & Packs', route: '/leader-org?tab=modules', description: 'Platform modules and industry packs', permission: 'admin' },
  'pilot-control': { key: 'pilot-control', label: 'Pilot Control', route: '/leader-org?tab=pilot-control', description: 'Pilot tenant management', permission: 'admin' },
  'pilot-admin': { key: 'pilot-admin', label: 'Pilot Administration', route: '/platform/pilot-admin', description: 'Provision and manage pilot tenants', permission: 'admin' },
  'pilot-activation': { key: 'pilot-activation', label: 'Pilot Activation', route: '/platform/pilot-activation', description: 'Validate readiness and activate pilots', permission: 'admin' },
  'pilot-deployment': { key: 'pilot-deployment', label: 'Pilot Deployment Centre', route: '/platform/pilot-deployment', description: 'Deploy and manage pilot lifecycle', permission: 'admin' },
  'pilot-readiness': { key: 'pilot-readiness', label: 'Pilot Readiness', route: '/platform/pilot-readiness', description: 'Tenant readiness assessment', permission: 'admin' },
  'system-logs': { key: 'system-logs', label: 'System Logs', route: '/platform/system-logs', description: 'Background jobs and system events', permission: 'admin' },
  'exception-centre': { key: 'exception-centre', label: 'Exception Centre', route: '/platform/exception-centre', description: 'Derived exceptions and sync retry queue', permission: 'admin' },
  'security-dashboard': { key: 'security-dashboard', label: 'Security Dashboard', route: '/platform/security-dashboard', description: 'Security events and threat indicators', permission: 'admin' },
  'feature-flags': { key: 'feature-flags', label: 'Feature Flag Manager', route: '/platform/feature-flags', description: 'Module activation per tenant', permission: 'admin' },
  'go-live-readiness': { key: 'go-live-readiness', label: 'Go-Live Readiness Centre', route: '/platform/go-live-readiness', description: 'Unified system readiness', permission: 'admin' },
};

// ── Group structure for navigation rendering ───────────────
export const PLATFORM_NAVIGATION = {
  groups: [
    {
      id: 'tenants',
      title: 'Tenants',
      description: 'Manage tenant lifecycles, plans, and pilot programs',
      icon: 'Building2',
      items: [
        NAV_ITEMS.tenants,
        NAV_ITEMS.subscriptions,
        NAV_ITEMS['tenant-metrics'],
        NAV_ITEMS['pilot-management'],
      ],
    },
    {
      id: 'customer-success',
      title: 'Customer Success',
      description: 'Cross-tenant health, adoption, and feedback',
      icon: 'HeartHandshake',
      items: [
        NAV_ITEMS['customer-success'],
        NAV_ITEMS['feedback-intelligence'],
      ],
    },
    {
      id: 'governance',
      title: 'Governance',
      description: 'Shield governance, audit, compliance, and access control',
      icon: 'Shield',
      items: [
        NAV_ITEMS['shield-command'],
        NAV_ITEMS['audit-logs'],
        NAV_ITEMS.compliance,
        NAV_ITEMS['access-control'],
      ],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect and monitor external services',
      icon: 'Plug',
      items: [
        NAV_ITEMS['integration-hub'],
        NAV_ITEMS['integration-health'],
      ],
    },
    {
      id: 'platform',
      title: 'Platform',
      description: 'Platform foundation, capabilities, reliability, and release',
      icon: 'Settings',
      items: [
        NAV_ITEMS['platform-identity'],
        NAV_ITEMS['system-controls'],
        NAV_ITEMS.blueprint,
        NAV_ITEMS.capabilities,
        NAV_ITEMS['security-centre'],
        NAV_ITEMS['operational-health'],
        NAV_ITEMS['incident-response'],
        NAV_ITEMS['activity-logs'],
        NAV_ITEMS['support-diagnostics'],
        NAV_ITEMS['release-readiness'],
        NAV_ITEMS['deployment-pipeline'],
        NAV_ITEMS['change-log'],
        NAV_ITEMS.roadmap,
      ],
      megaGroups: [
        {
          section: 'Foundation',
          items: [NAV_ITEMS['platform-identity'], NAV_ITEMS['system-controls'], NAV_ITEMS.blueprint],
        },
        {
          section: 'Capabilities & Access',
          items: [NAV_ITEMS.capabilities, NAV_ITEMS['security-centre']],
        },
        {
          section: 'Reliability & Operations',
          items: [NAV_ITEMS['operational-health'], NAV_ITEMS['incident-response'], NAV_ITEMS['activity-logs'], NAV_ITEMS['support-diagnostics']],
        },
        {
          section: 'Release & Evolution',
          items: [NAV_ITEMS['release-readiness'], NAV_ITEMS['deployment-pipeline'], NAV_ITEMS['change-log'], NAV_ITEMS.roadmap],
        },
      ],
    },
  ],
};

// ── Quick Access — compact shortcuts for the Overview ──────
export const QUICK_ACCESS = [
  NAV_ITEMS.wallet,
  NAV_ITEMS.marketplace,
  NAV_ITEMS['shield-command'],
  NAV_ITEMS['audit-logs'],
  NAV_ITEMS['access-control'],
];

// ── Console Section Registry ─────────────────────────────
// Maps section keys to their console domain. Used by LeaderOrg to validate
// URL ?section= parameters and by UnifiedCommandNav to determine active state.
export const CONSOLE_SECTIONS = {
  overview:             { domain: 'overview',         label: 'Overview',              embedded: true },
  tenants:               { domain: 'tenants',          label: 'Tenant Command Center', embedded: true },
  subscriptions:        { domain: 'tenants',          label: 'Tenant Plans & Entitlements', embedded: true },
  modules:              { domain: 'tenants',          label: 'Modules & Packs',      embedded: true },
  'tenant-insights':    { domain: 'tenants',          label: 'Tenant Insights',      embedded: true },
  'pilot-management':   { domain: 'tenants',          label: 'Pilot Management',      embedded: true },
  'customer-success':   { domain: 'customer-success',  label: 'Customer Success',      embedded: true },
  'feedback-intelligence': { domain: 'customer-success', label: 'Feedback Intelligence', embedded: true },
  'shield-command':     { domain: 'governance',       label: 'Shield Command',        embedded: true },
  'audit-centre':       { domain: 'governance',       label: 'Audit Centre',          embedded: false, route: '/audit-centre' },
  'access-control':     { domain: 'governance',       label: 'Access Control',       embedded: false, route: '/platform/access-control' },
  'security-centre':    { domain: 'governance',       label: 'Security Centre',       embedded: true },
  'integration-hub':    { domain: 'integrations',     label: 'Integration Hub',       embedded: true },
  'integration-health': { domain: 'integrations',     label: 'Integration Health',    embedded: true },
  'integration-directory': { domain: 'integrations',  label: 'Integration Directory', embedded: true },
  'platform-identity':  { domain: 'platform',         label: 'Platform Identity',     embedded: true },
  'system-controls':    { domain: 'platform',         label: 'System Controls',      embedded: true },
  blueprint:            { domain: 'platform',         label: 'Blueprint Studio',     embedded: true },
  'system-health':      { domain: 'platform',         label: 'System Health',         embedded: true },
  'operational-health': { domain: 'platform',         label: 'Operational Health',    embedded: true },
  'incident-response':  { domain: 'platform',         label: 'Incident Response',     embedded: true },
  'activity-logs':      { domain: 'platform',         label: 'Activity & Logs',       embedded: true },
  'release-readiness':  { domain: 'platform',         label: 'Release Readiness',    embedded: true },
  'deployment-pipeline': { domain: 'platform',        label: 'Deployment Pipeline',   embedded: true },
  'change-log':         { domain: 'platform',         label: 'Change Log',            embedded: true },
  roadmap:              { domain: 'platform',         label: 'Roadmap',               embedded: true },
  'subscription-billing': { domain: 'platform',       label: 'Subscription & Billing', embedded: true },
  'resource-usage':     { domain: 'platform',         label: 'Resource Usage',        embedded: true },
};

// ── Canonical alias map (old route → canonical destination) ────
// Preserved for backward compatibility. Deep links and bookmarks
// using old routes are safely redirected to their canonical home.
// App.jsx owns the actual <Navigate> declarations; this registry
// informs consistency checks and alias resolution.
export const ROUTE_ALIASES = {
  '/help-center':              { canonical: '/knowledge-hub',              deprecated: false },
  '/module-config':           { canonical: '/platform/feature-flags',     deprecated: false },
  '/integration-health':      { canonical: '/platform/integrations',       deprecated: false },
  '/incident-response':      { canonical: '/platform/exception-centre',   deprecated: false },
  '/security-settings':      { canonical: '/settings#security',            deprecated: false },
  '/compliance-dashboard':   { canonical: '/workspace',                   deprecated: false },
  '/subscription-billing':   { canonical: '/leader-org?section=subscription-billing', deprecated: false },
  '/integration-directory':  { canonical: '/leader-org?section=integration-hub',      deprecated: false },
  '/activity-log':           { canonical: '/audit-centre',                 deprecated: false },
  '/system-health':          { canonical: '/leader-org?section=system-health',        deprecated: false },
  '/resource-usage':         { canonical: '/leader-org?section=subscription-billing', deprecated: false },
  '/employee-directory':     { canonical: '/workspace',                   deprecated: false },
  '/supplier-portal':        { canonical: '/suppliers',                   deprecated: false },
  '/document-repository':    { canonical: '/workspace',                   deprecated: false },
  '/audit-trail':            { canonical: '/audit-centre',                 deprecated: false },
  '/platform/release-readiness':     { canonical: '/platform/go-live-readiness',    deprecated: false },
  '/platform/security-centre':       { canonical: '/platform/security-dashboard',  deprecated: false },
  '/platform/activity-logs':         { canonical: '/platform/system-logs',          deprecated: false },
  '/platform/pilot-management':      { canonical: '/platform/pilot-admin',          deprecated: false },
  '/platform/tenant-insights':       { canonical: '/platform/tenant-metrics',       deprecated: false },
};

// ── Helpers ────────────────────────────────────────────────

/**
 * getNavItemByKey — O(1) lookup of a navigation item by its stable key.
 */
export function getNavItemByKey(key) {
  return NAV_ITEMS[key] || null;
}

/**
 * resolveAlias — resolves an old route to its canonical destination.
 * Returns { canonical, deprecated } or null if the route is not an alias.
 * Preserves query parameters from the original route.
 */
export function resolveAlias(oldRoute) {
  if (!oldRoute) return null;
  const [path, queryString] = oldRoute.split('?');
  const alias = ROUTE_ALIASES[path];
  if (!alias) return null;
  const [canonicalPath, canonicalQuery] = alias.canonical.split('?');
  const params = new URLSearchParams(queryString || '');
  const canonicalParams = new URLSearchParams(canonicalQuery || '');
  for (const [key, value] of canonicalParams) {
    params.set(key, value);
  }
  const finalQuery = params.toString();
  return {
    canonical: finalQuery ? `${canonicalPath}?${finalQuery}` : canonicalPath,
    deprecated: alias.deprecated,
  };
}

/**
 * getNavByRoute — retrieves the navigation item matching a given route path.
 */
export function getNavByRoute(routePath) {
  if (!routePath) return null;
  const [path] = routePath.split('?');
  for (const item of Object.values(NAV_ITEMS)) {
    const [itemPath] = (item.route || '').split('?');
    if (itemPath === path) return item;
  }
  return null;
}

/**
 * isDeprecatedAlias — checks whether an old route is marked as deprecated.
 */
export function isDeprecatedAlias(oldRoute) {
  if (!oldRoute) return false;
  const [path] = oldRoute.split('?');
  return ROUTE_ALIASES[path]?.deprecated === true;
}

export function canAccessNavItem(item, userRole) {
  if (!item?.permission) return true;
  const allowed = Array.isArray(item.permission) ? item.permission : [item.permission];
  if (userRole === 'admin' || userRole === 'platform_admin') return true;
  return allowed.includes(userRole);
}

/**
 * canAccessRoute — convenience: check role access by route path.
 */
export function canAccessRoute(routePath, userRole) {
  const item = getNavByRoute(routePath);
  if (!item) return true;
  return canAccessNavItem(item, userRole);
}

/**
 * safeNavDestination — returns a navigation destination safe for the given role.
 * Returns null if access is denied.
 */
export function safeNavDestination(key, userRole) {
  const item = getNavItemByKey(key);
  if (!item) return null;
  if (!canAccessNavItem(item, userRole)) return null;
  return { key: item.key, label: item.label, route: item.route };
}

export function getConsoleSection(key) {
  return CONSOLE_SECTIONS[key] || null;
}