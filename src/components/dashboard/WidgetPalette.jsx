// ============================================================
// ORBITANOS — WidgetPalette
// Shown in edit mode; lists hidden widgets available to re-add.
// ============================================================

import React from 'react';
import { Plus } from 'lucide-react';

export default function WidgetPalette({ widgets, onAdd }) {
  if (!widgets || widgets.length === 0) return null;
  return (
    <div className="mb-4 bg-muted/40 border border-dashed border-border rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Hidden widgets — click to add</p>
      <div className="flex flex-wrap gap-2">
        {widgets.map(w => {
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              onClick={() => onAdd(w.id)}
              className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="font-medium text-foreground">{w.title}</span>
              <Plus className="w-3 h-3 text-orbitan-green" />
            </button>
          );
        })}
      </div>
    </div>
  );
}