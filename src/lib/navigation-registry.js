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

// ── Helpers ────────────────────────────────────────────────
export function getNavItemByKey(key) {
  return NAV_ITEMS[key] || null;
}

export function canAccessNavItem(item, userRole) {
  if (!item?.permission) return true;
  return userRole === 'admin' || userRole === 'platform_admin';
}