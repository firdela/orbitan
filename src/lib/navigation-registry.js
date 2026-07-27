// ============================================================
// ORBITANOS — PLATFORM NAVIGATION REGISTRY
// Metadata-Driven Navigation Configuration
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This file is pure data — zero UI dependencies.
// Add/remove features by editing this JSON-like structure.
// The PlatformNavigation component renders from this registry.
// ============================================================

export const PLATFORM_NAVIGATION = {
  groups: [
    {
      id: "tenants",
      title: "Tenants & Access",
      description: "Manage tenant lifecycles, subscriptions, and access control",
      icon: "Building2",
      items: [
        {
          key: "tenants",
          label: "Tenants",
          route: "/leader-org?tab=tenants",
          description: "View and manage all tenant organisations",
          permission: "admin",
        },
        {
          key: "subscriptions",
          label: "Subscriptions & Policy",
          route: "/leader-org?tab=subscriptions",
          description: "Manage subscription plans, billing, and entitlement policies",
          permission: "admin",
        },
      ],
    },
    {
      id: "product",
      title: "Modules & Blueprints",
      description: "Configure platform capabilities and industry packs",
      icon: "LayoutGrid",
      items: [
        {
          key: "modules",
          label: "Modules & Packs",
          route: "/leader-org?tab=modules",
          description: "Activate modules and industry packs",
          permission: "admin",
        },
        {
          key: "blueprint",
          label: "Blueprint Studio",
          route: "/leader-org?tab=blueprint",
          description: "Design tenant blueprints and layouts",
          permission: "admin",
        },
        {
          key: "capabilities",
          label: "Capability Manager",
          route: "/platform/capabilities",
          description: "Manage platform capabilities and module entitlements",
          permission: "admin",
        },
      ],
    },
    {
      id: "system",
      title: "System & Identity",
      description: "Platform-wide controls and brand configuration",
      icon: "Settings",
      items: [
        {
          key: "system-controls",
          label: "System Controls",
          route: "/leader-org?tab=system-controls",
          description: "Orchestrator, broadcasts, and platform settings",
          permission: "admin",
        },
        {
          key: "platform-identity",
          label: "Platform Identity",
          route: "/leader-org?tab=platform-identity",
          description: "Branding, operating cycle, and about platform",
          permission: "admin",
        },
        {
          key: "access-control",
          label: "Access Control",
          route: "/platform/access-control",
          description: "Role-based access control and permission management",
          permission: "admin",
        },
      ],
    },
    {
      id: "governance",
      title: "Governance & Pilot",
      description: "Security policies and pilot tenant management",
      icon: "Shield",
      items: [
        {
          key: "pilot-control",
          label: "Pilot Control",
          route: "/leader-org?tab=pilot-control",
          description: "Manage pilot tenants and validation",
          permission: "admin",
        },
        {
          key: "feedback-intelligence",
          label: "Feedback Intelligence",
          route: "/leader-org?tab=feedback-intelligence",
          description: "AI-analysed pilot feedback and product backlog",
          permission: "admin",
        },
        {
          key: "shield-command",
          label: "Shield Command",
          route: "/platform/shield",
          description: "Governance policies and security oversight",
          permission: "admin",
        },
        {
          key: "integration-hub",
          label: "Integration Hub",
          route: "/platform/integrations",
          description: "Connect Xero, Stripe, and external services",
          permission: "admin",
        },
        {
          key: "pilot-readiness",
          label: "Pilot Readiness",
          route: "/platform/pilot-readiness",
          description: "Deterministic tenant readiness %, onboarding checklist, go-live recommendation",
          permission: "admin",
        },
        {
          key: "pilot-admin",
          label: "Pilot Administration",
          route: "/platform/pilot-admin",
          description: "Provision, manage, and retire pilot tenants",
          permission: "admin",
        },
        {
          key: "pilot-activation",
          label: "Pilot Activation",
          route: "/platform/pilot-activation",
          description: "Validate readiness and activate a pilot tenant for go-live",
          permission: "admin",
        },
        {
          key: "pilot-deployment",
          label: "Pilot Deployment Centre",
          route: "/platform/pilot-deployment",
          description: "Activate, pause, resume, close pilots · deployment timeline · audit trail",
          permission: "admin",
        },
        {
          key: "customer-success",
          label: "Customer Success",
          route: "/platform/customer-success",
          description: "Cross-tenant health, adoption, onboarding, feedback & milestones",
          permission: "admin",
        },
        {
          key: "go-live-readiness",
          label: "Go-Live Readiness Centre",
          route: "/platform/go-live-readiness",
          description: "Unified system readiness — auth, RBAC, PWA, accessibility, performance, security",
          permission: "admin",
        },
        {
          key: "operational-health",
          label: "Operational Health",
          route: "/platform/operational-health",
          description: "System, transaction, inventory, finance, and audit health",
          permission: "admin",
        },
        {
          key: "exception-centre",
          label: "Exception Centre",
          route: "/platform/exception-centre",
          description: "Derived exceptions and finance sync retry queue",
          permission: "admin",
        },
        {
          key: "support-diagnostics",
          label: "Support Diagnostics",
          route: "/platform/diagnostics",
          description: "Authorised admin diagnostics: failures, queue health, insight status, connections",
          permission: "admin",
        },
        {
          key: "audit-logs",
          label: "Audit Logs",
          route: "/audit-centre",
          description: "Immutable platform-wide audit trail and forensic log viewer",
          permission: "admin",
        },
      ],
    },
    {
      id: "revenue",
      title: "Revenue Engine",
      description: "Wallet, marketplace, and monetisation infrastructure",
      icon: "Wallet",
      items: [
        {
          key: "wallet",
          label: "Orbitan Wallet",
          route: "/platform/wallet",
          description: "Platform wallet ledger and transaction management",
          permission: "admin",
        },
        {
          key: "marketplace",
          label: "Marketplace",
          route: "/platform/marketplace",
          description: "Module marketplace and add-on catalog",
          permission: "admin",
        },
      ],
    },
  ],
};

// Helper: Get navigation item by key
export function getNavItemByKey(key) {
  for (const group of PLATFORM_NAVIGATION.groups) {
    const item = group.items.find((i) => i.key === key);
    if (item) return item;
  }
  return null;
}

// Helper: Check if user has permission for a navigation item
export function canAccessNavItem(item, userRole) {
  if (!item.permission) return true;
  return userRole === "admin" || userRole === "platform_admin";
}