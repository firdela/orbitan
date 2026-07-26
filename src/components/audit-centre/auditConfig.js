// OrbitanOS — Audit Centre shared configuration (ADR-0054)
// Single source of truth for module labels, severity, category, and
// shield-outcome styling consumed by the Audit Centre timeline + table.

import {
  Info, CheckCircle2, AlertTriangle, AlertOctagon,
} from 'lucide-react';

export const MODULE_LABELS = {
  finance: 'Finance', inventory: 'Inventory', procurement: 'Procurement',
  workforce: 'Workforce', compliance: 'Compliance', sales: 'Sales',
  scheduling: 'Scheduling', retail: 'Retail', sustainability: 'Sustainability',
  system: 'System',
};

export const CATEGORY_LABELS = {
  operational: 'Operational', lifecycle: 'Lifecycle', access: 'Access',
  governance: 'Governance', security: 'Security', ai: 'AI Insight', system: 'System',
};

export const SEVERITY_CONFIG = {
  info: {
    label: 'Info', icon: Info,
    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    dot: 'bg-blue-500', iconWrap: 'bg-blue-500/10 text-blue-600',
  },
  success: {
    label: 'Success', icon: CheckCircle2,
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    dot: 'bg-emerald-500', iconWrap: 'bg-emerald-500/10 text-emerald-600',
  },
  warning: {
    label: 'Warning', icon: AlertTriangle,
    badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    dot: 'bg-amber-500', iconWrap: 'bg-amber-500/10 text-amber-600',
  },
  critical: {
    label: 'Critical', icon: AlertOctagon,
    badge: 'bg-red-500/10 text-red-600 border-red-500/20',
    dot: 'bg-red-500', iconWrap: 'bg-red-500/10 text-red-600',
  },
};

export const SHIELD_STYLES = {
  pass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  notify: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  blocked: 'bg-red-500/10 text-red-600 border-red-500/20',
  override_requested: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  override_approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  override_denied: 'bg-red-500/10 text-red-600 border-red-500/20',
  not_evaluated: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// Map AuditLog.module to a representative icon for the timeline.
const MODULE_ICON_MAP = {
  finance: '💰', inventory: '📦', procurement: '🛒', workforce: '👥',
  compliance: '🛡️', sales: '🧾', scheduling: '📅', retail: '🛍️',
  sustainability: '♻️', system: '⚙️',
};

export const moduleEmoji = (mod) => MODULE_ICON_MAP[mod] || '•';

export const formatAction = (actionType) =>
  (actionType || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const formatTimestamp = (iso, opts = {}) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-SG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', ...opts,
  });
};

export const formatRelative = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
};