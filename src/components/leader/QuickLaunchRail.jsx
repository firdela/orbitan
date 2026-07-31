import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { QUICK_ACCESS, canAccessNavItem, getNavItemByKey } from '@/lib/navigation-registry';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Pencil, Plus, X, ArrowUp, ArrowDown, RotateCcw, Star } from 'lucide-react';

const STORAGE_KEY = 'quick_access';

// All destinations available for Quick Access (validated by RBAC at render time).
const ALL_DESTINATIONS = [
  'wallet', 'marketplace', 'shield-command', 'audit-logs', 'access-control',
  'tenants', 'tenant-insights', 'customer-success', 'integration-hub',
  'integration-health', 'operational-health', 'incident-response',
  'activity-logs', 'security-centre', 'release-readiness', 'deployment-pipeline',
  'change-log', 'roadmap', 'system-health', 'subscription-billing',
  'pilot-management', 'feedback-intelligence',
  'task-analytics', 'inventory-transfers', 'workflow-templates',
];

// Icon resolver — maps destination keys to lucide icons.
import {
  Wallet, ShoppingBag, Shield, ScrollText, Lock, Building2, BarChart3,
  HeartHandshake, Plug, Activity, AlertTriangle, ListTree, Lock as LockIcon,
  CheckCircle2, GitBranch, FileText, Map, Server, CreditCard, Rocket,
  MessageSquare, ListChecks, Package, Workflow,
} from 'lucide-react';

const ICON_MAP = {
  'wallet': Wallet, 'marketplace': ShoppingBag, 'shield-command': Shield,
  'audit-logs': ScrollText, 'access-control': Lock, 'tenants': Building2,
  'tenant-insights': BarChart3, 'customer-success': HeartHandshake,
  'integration-hub': Plug, 'integration-health': Activity,
  'operational-health': Activity, 'incident-response': AlertTriangle,
  'activity-logs': ListTree, 'security-centre': LockIcon,
  'release-readiness': CheckCircle2, 'deployment-pipeline': GitBranch,
  'change-log': FileText, 'roadmap': Map, 'system-health': Server,
  'subscription-billing': CreditCard, 'pilot-management': Rocket,
  'feedback-intelligence': MessageSquare,
  'task-analytics': ListChecks, 'inventory-transfers': Package,
  'workflow-templates': Workflow,
};

function getIcon(key) {
  return ICON_MAP[key] || Star;
}

export default function QuickAccess() {
  const { user } = useAuth();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const [addKey, setAddKey] = useState('');

  // Load user's saved shortcuts from their profile (persisted across sessions/devices).
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        const saved = me?.data?.[STORAGE_KEY];
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setShortcuts(saved);
        } else {
          // Fall back to defaults
          setShortcuts(QUICK_ACCESS.map((i) => i.key));
        }
      } catch {
        setShortcuts(QUICK_ACCESS.map((i) => i.key));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveShortcuts = async (keys) => {
    try {
      await base44.auth.updateMe({ [STORAGE_KEY]: keys });
    } catch (err) {
      console.error('[QuickAccess] Failed to save shortcuts:', err);
    }
  };

  const openEdit = () => {
    setDraft([...shortcuts]);
    setEditOpen(true);
  };

  const handleAdd = () => {
    if (!addKey || draft.includes(addKey)) return;
    const next = [...draft, addKey];
    setDraft(next);
    setAddKey('');
  };

  const handleRemove = (key) => {
    setDraft(draft.filter((k) => k !== key));
  };

  const handleMove = (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= draft.length) return;
    const next = [...draft];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setDraft(next);
  };

  const handleRestoreDefaults = () => {
    setDraft(QUICK_ACCESS.map((i) => i.key));
  };

  const handleSave = () => {
    setShortcuts(draft);
    saveShortcuts(draft);
    setEditOpen(false);
  };

  // Filter shortcuts by RBAC — hide inaccessible destinations automatically.
  const visibleShortcuts = shortcuts.filter((key) => {
    const item = getNavItemByKey(key);
    return item && canAccessNavItem(item, user?.role);
  });

  // Available destinations not yet in the draft (for the Add dropdown).
  const availableToAdd = ALL_DESTINATIONS.filter((k) => !draft.includes(k) && getNavItemByKey(k));

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-base">Quick Access</h3>
          <p className="text-xs text-muted-foreground">Your personal platform shortcuts.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>

      {visibleShortcuts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No shortcuts configured. Click Edit to add your favourite destinations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleShortcuts.map((key) => {
            const item = getNavItemByKey(key);
            const Icon = getIcon(key);
            return (
              <Link
                key={key}
                to={item.route}
                className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:bg-accent hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              >
                <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Quick Access</DialogTitle>
            <DialogDescription>
              Add, remove, and reorder your personal shortcuts. Changes save to your profile and sync across devices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No shortcuts. Add one below.</p>
            )}
            {draft.map((key, index) => {
              const item = getNavItemByKey(key);
              if (!item) return null;
              const Icon = getIcon(key);
              return (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(index, -1)} disabled={index === 0} aria-label="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMove(index, 1)} disabled={index === draft.length - 1} aria-label="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(key)} aria-label={`Remove ${item.label}`}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Add new shortcut */}
          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Select value={addKey} onValueChange={setAddKey}>
                <SelectTrigger className="flex-1" aria-label="Add shortcut">
                  <SelectValue placeholder="Select a destination…" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((key) => (
                    <SelectItem key={key} value={key}>{getNavItemByKey(key).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd} disabled={!addKey} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={handleRestoreDefaults} className="gap-1.5 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
            </Button>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}