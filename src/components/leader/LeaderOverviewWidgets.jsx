// ============================================================
// ORBITANOS — Leader Overview Widgets (Build #28.2)
// Configurable KPI widget grid for the Leader Console Overview.
// Reuses the same user-preference pattern as Quick Access
// (base44.auth.updateMe). No new framework or entity.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { INDUSTRY_PACKS } from '@/lib/orbitan-config';
import StatCard from '@/components/shared/StatCard';
import {
  Building2, Layers, Package, CheckCircle2,
  Pencil, Check, RotateCcw, ArrowUp, ArrowDown, X,
} from 'lucide-react';

const STORAGE_KEY = 'leader_kpi_widgets';

const DEFAULT_LAYOUT = [
  'active_tenants',
  'module_activations',
  'industry_packs',
  'platform_health',
];

const ALL_WIDGETS = [
  'active_tenants',
  'module_activations',
  'industry_packs',
  'platform_health',
];

const WIDGET_META = {
  active_tenants: { id: 'active_tenants', label: 'Active Tenants', icon: Building2, color: 'blue' },
  module_activations: { id: 'module_activations', label: 'Module Activations', icon: Layers, color: 'purple' },
  industry_packs: { id: 'industry_packs', label: 'Industry Packs', icon: Package, color: 'green' },
  platform_health: { id: 'platform_health', label: 'Platform Health', icon: CheckCircle2, color: 'green' },
};

export default function LeaderOverviewWidgets({ tenants, onNavigate }) {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_LAYOUT);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const saved = me?.data?.[STORAGE_KEY];
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setLayout(saved);
          setDraft(saved);
        }
      } catch { /* non-blocking */ }
      finally { setLoading(false); }
    })();
  }, []);

  const saveLayout = async (keys) => {
    try { await base44.auth.updateMe({ [STORAGE_KEY]: keys }); }
    catch (err) { console.error('[LeaderOverviewWidgets] Failed to save:', err); }
  };

  const handleSave = () => {
    setLayout(draft);
    saveLayout(draft);
    setEditMode(false);
  };

  const handleMove = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= draft.length) return;
    const next = [...draft];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setDraft(next);
  };

  const handleRemove = (id) => {
    setDraft(draft.filter((k) => k !== id));
  };

  const handleRestore = () => {
    setDraft(DEFAULT_LAYOUT);
  };

  const handleAdd = (id) => {
    if (draft.includes(id)) return;
    setDraft([...draft, id]);
  };

  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const totalTenants = tenants.length;
  const totalModuleUsage = tenants.reduce((acc, t) => acc + (t.enabled_modules?.length || 0), 0);

  const renderWidget = (id) => {
    const meta = WIDGET_META[id];
    if (!meta) return null;
    switch (id) {
      case 'active_tenants':
        return (
          <StatCard compact title="Active Tenants" value={activeTenants} subtitle={`${totalTenants} total`} icon={meta.icon} color={meta.color} trend="up" trendValue="+3 this month" onClick={() => onNavigate?.('tenants')} help={{ title: 'Active Tenants', content: 'Pilot organisations currently provisioned on OrbitanOS.' }} />
        );
      case 'module_activations':
        return (
          <StatCard compact title="Module Activations" value={totalModuleUsage} subtitle="Across all tenants" icon={meta.icon} color={meta.color} onClick={() => onNavigate?.('modules')} help={{ title: 'Module Activations', content: 'Total enabled modules across all pilot tenants.' }} />
        );
      case 'industry_packs':
        return (
          <StatCard compact title="Industry Packs" value={Object.keys(INDUSTRY_PACKS).length} subtitle="Available packs" icon={meta.icon} color={meta.color} onClick={() => onNavigate?.('modules')} help={{ title: 'Industry Packs', content: 'Self-aware capability blueprints available for activation.' }} />
        );
      case 'platform_health':
        return (
          <StatCard compact title="Platform Health" value="100%" subtitle="All systems operational" icon={meta.icon} color={meta.color} trend="up" onClick={() => onNavigate?.('system-controls')} help={{ title: 'Platform Health', content: 'Real-time status of OrbitanOS backend engines and integrations.' }} />
        );
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const availableToAdd = ALL_WIDGETS.filter((k) => !draft.includes(k));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-base">Overview</h3>
          <p className="text-xs text-muted-foreground">Platform KPIs and operational metrics.</p>
        </div>
        {editMode ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleRestore}>
              <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave}>
              <Check className="w-3.5 h-3.5" /> Save Layout
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setDraft(layout); setEditMode(true); }}>
            <Pencil className="w-3.5 h-3.5" /> Edit Layout
          </Button>
        )}
      </div>

      {editMode ? (
        <div className="space-y-2">
          {draft.map((id, index) => {
            const meta = WIDGET_META[id];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{meta.label}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(index, -1)} disabled={index === 0} aria-label={`Move ${meta.label} up`}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(index, 1)} disabled={index === draft.length - 1} aria-label={`Move ${meta.label} down`}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(id)} aria-label={`Remove ${meta.label}`}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {availableToAdd.map((id) => {
                const meta = WIDGET_META[id];
                const Icon = meta.icon;
                return (
                  <Button key={id} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleAdd(id)}>
                    <Icon className="w-3 h-3" /> Add {meta.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {layout.map((id) => (
            <div key={id}>{renderWidget(id)}</div>
          ))}
        </div>
      )}
    </div>
  );
}