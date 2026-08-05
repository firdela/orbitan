// ============================================================
// Widget: Safety & Compliance
// Shows actionable safety/compliance counts for the worker's outlet.
// Hides when zero (emptyBehavior: hide).
// ============================================================
import React from 'react';
import { Shield, ChevronRight, AlertTriangle } from 'lucide-react';

export default function SafetyComplianceWidget({ complianceRecords = [], onNavigate }) {
  const now = new Date();
  const pending = (complianceRecords || []).filter(r => r.status === 'pending' || r.status === 'in_review');
  const overdue = (complianceRecords || []).filter(r =>
    r.status === 'overdue' || (r.due_date && new Date(r.due_date) < now && r.status !== 'approved')
  );
  const total = pending.length + overdue.length;

  // Hide when zero (emptyBehavior: hide)
  if (total === 0) return null;

  const nextItem = [...overdue, ...pending].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  })[0];

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Shield className="w-3.5 h-3.5 text-orbitan-purple" />
        <span className="text-xs font-semibold">Safety & Compliance</span>
        {overdue.length > 0 && (
          <span className="text-[9px] font-bold bg-destructive/10 text-destructive px-1 py-0.5 rounded-full">
            {overdue.length} overdue
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 py-1">
        <div className="flex flex-col items-center">
          <span className={`text-lg font-bold font-display ${overdue.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {overdue.length}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Overdue</span>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex flex-col items-center">
          <span className="text-lg font-bold font-display text-foreground">{pending.length}</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Pending</span>
        </div>
      </div>

      {nextItem && (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">
          {overdue.length > 0 && <AlertTriangle className="w-2.5 h-2.5 inline text-destructive mr-1" />}
          {nextItem.title || nextItem.type || 'Compliance action required'}
        </p>
      )}

      <button
        onClick={() => onNavigate?.('safety')}
        className="w-full flex items-center justify-between mt-2 text-xs font-medium text-primary hover:underline min-h-[44px] py-2"
      >
        Review safety
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}