// ============================================================
// ORBITANOS — PLATFORM NAVIGATION COMPONENT
// Metadata-Driven Tab Navigation for LeaderOrg Console
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY ARCHITECTURE:
// This component reads from lib/navigation-registry.js
// and renders tabs dynamically. No hardcoded tab labels.
// Adding a new tab = edit the registry JSON only.
// ============================================================

import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PLATFORM_NAVIGATION } from '@/lib/navigation-registry';
import { Building2, LayoutGrid, Settings, Shield, Wallet } from 'lucide-react';

const ICON_MAP = {
  Building2: Building2,
  LayoutGrid: LayoutGrid,
  Settings: Settings,
  Shield: Shield,
  Wallet: Wallet,
};

/**
 * Renders the platform navigation tabs from the registry.
 * @param {string} activeTab - Current active tab key
 * @param {function} onTabChange - Tab change handler
 */
export default function PlatformNavigation({ activeTab, onTabChange }) {
  return (
    <TabsList className="mb-6 bg-muted flex-wrap h-auto gap-1">
      {PLATFORM_NAVIGATION.groups.map((group) => (
        <React.Fragment key={group.id}>
          {group.items.map((item) => {
            const IconComponent = ICON_MAP[group.icon] || Building2;
            return (
              <TabsTrigger
                key={item.key}
                value={item.key}
                className="gap-1.5"
              >
                <IconComponent className="w-3.5 h-3.5" />
                {item.label}
              </TabsTrigger>
            );
          })}
        </React.Fragment>
      ))}
    </TabsList>
  );
}