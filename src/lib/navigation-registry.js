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
          key: "support-diagnostics",
          label: "Support Diagnostics",
          route: "/platform/diagnostics",
          description: "Authorised admin diagnostics: failures, queue health, insight status, connections",
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