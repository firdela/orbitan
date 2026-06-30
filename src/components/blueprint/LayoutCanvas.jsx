// ============================================================
// ORBITAN — Blueprint Studio: Layout Canvas
// Drag-and-drop reorderable list of active modules.
// Uses @hello-pangea/dnd (installed). Exit-Ready UI layer.
// ============================================================

import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { MODULES, INDUSTRY_PACKS } from '@/lib/orbitan-config';
import { cn } from '@/lib/utils';
import { GripVertical, X, Lock } from 'lucide-react';

export default function LayoutCanvas({ activeModules, onReorder, onRemove, lockedCount = 0 }) {
  const onDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = Array.from(activeModules);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onReorder(next);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Workspace Layout</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Drag to reorder · the top module becomes the tenant's landing view</p>
        </div>
        {lockedCount > 0 && (
          <span className="text-[9px] bg-orbitan-red-light text-orbitan-red px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />{lockedCount} blocked
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="module-layout">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn("flex-1 min-h-[200px] p-3 space-y-2", snapshot.isDraggingOver && "bg-orbitan-blue-light/20")}
            >
              {activeModules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-xs text-muted-foreground">No modules active</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Toggle modules from the library to build the layout</p>
                </div>
              )}
              {activeModules.map((modKey, index) => {
                const mod = MODULES[modKey];
                if (!mod) return null;
                const packColor = mod.principle ? PRINCIPLE_COLORS[mod.principle] : '#2563EB';
                return (
                  <Draggable key={modKey} draggableId={modKey} index={index}>
                    {(p, s) => (
                      <div
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        className={cn(
                          "flex items-center gap-3 bg-background border border-border rounded-lg px-3 py-2.5 shadow-sm transition-shadow",
                          s.isDragging && "shadow-lg ring-2 ring-primary/30"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold" style={{ background: packColor }}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{mod.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{mod.principle}</p>
                        </div>
                        <button
                          onClick={() => onRemove(modKey)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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

const PRINCIPLE_COLORS = {
  regulate: '#DC2626', respond: '#2563EB', refine: '#7C3AED',
  renew: '#16A34A', relate: '#F59E0B', reach: '#06B6D4',
};