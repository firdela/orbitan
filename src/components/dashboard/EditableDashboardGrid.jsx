// ============================================================
// ORBITANOS — EditableDashboardGrid
// Reusable drag-and-drop dashboard widget grid with edit mode.
// Any dashboard declares a widget registry; this component renders
// them in the persisted order and lets users reorder / hide / add.
// Layout persists per (tenant_id, dashboard_key, role).
// Scales to any tenant — no hardcoded pilot data.
// ============================================================

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import WidgetPalette from '@/components/dashboard/WidgetPalette';
import {
  Pencil, Check, RotateCcw, GripVertical, X, LayoutGrid,
} from 'lucide-react';

export default function EditableDashboardGrid({ dashboardKey, widgets, tenantId, role = 'default' }) {
  const defaultLayout = widgets.map(w => ({ id: w.id, visible: true }));
  const [layout, setLayout] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!tenantId) { setLayout(defaultLayout); return; }
    base44.entities.DashboardLayout.filter({ dashboard_key: dashboardKey, tenant_id: tenantId, role })
      .then(rows => {
        if (!active) return;
        const cfg = rows?.[0]?.widget_config;
        if (Array.isArray(cfg) && cfg.length > 0) {
          const savedIds = new Set(cfg.map(c => c.id));
          const merged = [...cfg, ...widgets.filter(w => !savedIds.has(w.id)).map(w => ({ id: w.id, visible: true }))];
          setLayout(merged);
        } else {
          setLayout(defaultLayout);
        }
      })
      .catch(() => { if (active) setLayout(defaultLayout); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardKey, tenantId, role]);

  const widgetMap = Object.fromEntries(widgets.map(w => [w.id, w]));
  const current = layout || defaultLayout;
  const visibleItems = current.filter(i => i.visible && widgetMap[i.id]);
  const hiddenWidgets = current.filter(i => !i.visible && widgetMap[i.id]).map(i => widgetMap[i.id]);

  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const visibleIds = visibleItems.map(i => i.id);
    const [moved] = visibleIds.splice(result.source.index, 1);
    visibleIds.splice(result.destination.index, 0, moved);
    const hidden = current.filter(i => !i.visible);
    setLayout(visibleIds.map(id => ({ id, visible: true })).concat(hidden));
  };

  const handleRemove = (id) => {
    setLayout(current.map(i => (i.id === id ? { ...i, visible: false } : i)));
  };

  const handleAdd = (id) => {
    setLayout(current.map(i => (i.id === id ? { ...i, visible: true } : i)));
    setPaletteOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = await base44.entities.DashboardLayout.filter({ dashboard_key: dashboardKey, tenant_id: tenantId, role });
      if (rows?.length > 0) {
        await base44.entities.DashboardLayout.update(rows[0].id, { widget_config: layout });
      } else {
        await base44.entities.DashboardLayout.create({ tenant_id: tenantId, dashboard_key: dashboardKey, role, widget_config: layout });
      }
    } catch { /* non-blocking */ }
    setSaving(false);
    setEditMode(false);
  };

  const handleReset = () => setLayout(defaultLayout);

  if (!layout) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.slice(0, 4).map(w => (
          <div key={w.id} className="bg-card border border-border rounded-xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-base flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" /> Your Dashboard
          {editMode && (
            <span className="text-[10px] bg-orbitan-blue-light text-orbitan-blue px-2 py-0.5 rounded-full font-bold tracking-wide">EDITING</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={() => setPaletteOpen(!paletteOpen)}>
                Add Widget
              </Button>
              <Button size="sm" className="text-xs gap-1.5 h-8" onClick={handleSave} disabled={saving}>
                <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Layout'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={() => setEditMode(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit Layout
            </Button>
          )}
        </div>
      </div>

      {editMode && paletteOpen && (
        <WidgetPalette widgets={hiddenWidgets} onAdd={handleAdd} />
      )}
      {editMode && hiddenWidgets.length === 0 && (
        <p className="text-xs text-muted-foreground mb-3 italic">All widgets are visible — remove one to add it back.</p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-grid">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {visibleItems.map((item, index) => {
                const w = widgetMap[item.id];
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!editMode}>
                    {(p, s) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        className={cn("relative h-full", s.isDragging && "z-50")}
                      >
                        {editMode && (
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                            <span
                              {...p.dragHandleProps}
                              className="p-1 bg-background/90 border border-border rounded cursor-grab active:cursor-grabbing shadow-sm"
                            >
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </span>
                            <button
                              onClick={() => handleRemove(item.id)}
                              className="p-1 bg-background/90 border border-border rounded hover:bg-destructive/10 hover:text-destructive transition-colors shadow-sm"
                              title="Hide widget"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className={cn("h-full", editMode && "ring-1 ring-primary/20 rounded-xl")}>
                          {w.render()}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}