// ============================================================
// ORBITANOS — ShiftBoard
//
// Drag-and-drop scheduling board. Managers drag shift templates
// (or existing shifts) onto employee/day cells to assign shifts.
// Drops publish immediately (published=true) so the Worker Portal
// reflects assignments without a separate publish step.
//
// Uses native HTML5 DnD — ideal for a grid with many drop zones
// (employees × 7 days) without the overhead of a DnD library.
// ============================================================

import React, { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { X, Clock, Users, GripVertical, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHIFT_TEMPLATES = [
  { id: 'tpl_morning', label: 'Morning', start_time: '09:00', end_time: '17:00', color: 'bg-orbitan-blue-light text-orbitan-blue border-blue-300' },
  { id: 'tpl_evening', label: 'Evening', start_time: '17:00', end_time: '23:00', color: 'bg-orbitan-purple-light text-orbitan-purple border-purple-300' },
  { id: 'tpl_half_am', label: 'Half AM', start_time: '09:00', end_time: '13:00', color: 'bg-orbitan-green-light text-orbitan-green border-green-300' },
  { id: 'tpl_half_pm', label: 'Half PM', start_time: '14:00', end_time: '18:00', color: 'bg-orbitan-amber-light text-orbitan-amber border-amber-300' },
];

const AVATAR_COLORS = ['orbitan-gradient', 'bg-orbitan-purple', 'bg-orbitan-green', 'bg-orbitan-amber'];
const SHIFT_COLORS = [
  'bg-orbitan-blue-light text-orbitan-blue border-blue-200',
  'bg-orbitan-purple-light text-orbitan-purple border-purple-200',
  'bg-orbitan-green-light text-orbitan-green border-green-200',
  'bg-orbitan-amber-light text-orbitan-amber border-amber-200',
];

export default function ShiftBoard({
  employees,
  shifts,
  weekDays,
  onCreateShift,
  onUpdateShift,
  onDeleteShift,
}) {
  const [dragOver, setDragOver] = useState(null); // `${employeeId}_${dayIdx}`

  // Group employees by role for the "assign by role" workflow
  const employeesByRole = React.useMemo(() => {
    const groups = {};
    employees.forEach((emp) => {
      const role = emp.role || 'worker';
      if (!groups[role]) groups[role] = [];
      groups[role].push(emp);
    });
    return groups;
  }, [employees]);

  const roleOrder = ['tenant_admin', 'client_manager', 'outlet_manager', 'supervisor', 'worker'];
  const sortedRoles = Object.keys(employeesByRole).sort(
    (a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b)
  );

  // Build a flat index for avatar color stability
  const empIndex = new Map(employees.map((e, i) => [e.id, i]));

  const shiftsForCell = (empId, day) =>
    shifts.filter(
      (s) => s.employee_id === empId && isSameDay(new Date(s.date + 'T00:00:00'), day)
    );

  // ── Conflict detection: time overlap between shifts on the same day ──
  const timeToMin = (t) => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return h * 60 + m;
  };
  const hasOverlap = (cellShifts) => {
    if (cellShifts.length < 2) return false;
    const ranges = cellShifts
      .map((s) => ({ start: timeToMin(s.start_time), end: timeToMin(s.end_time) }))
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].start < ranges[i - 1].end) return true;
    }
    return false;
  };

  // ── Drag handlers ─────────────────────────────────────────
  const handleDragStart = (e, payload) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e, empId, dayIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const key = `${empId}_${dayIdx}`;
    if (dragOver !== key) setDragOver(key);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the cell entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(null);
    }
  };

  const handleDrop = (e, emp, day) => {
    e.preventDefault();
    setDragOver(null);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload = JSON.parse(raw);
    const dateStr = format(day, 'yyyy-MM-dd');

    if (payload.type === 'template') {
      onCreateShift({
        employee_id: emp.id,
        employee_name: emp.full_name,
        date: dateStr,
        start_time: payload.start_time,
        end_time: payload.end_time,
      });
    } else if (payload.type === 'move' && payload.shiftId) {
      onUpdateShift(payload.shiftId, {
        employee_id: emp.id,
        employee_name: emp.full_name,
        date: dateStr,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Shift Template Palette ──────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">
            Shift Templates — drag onto an employee's day to assign & publish instantly
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SHIFT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              draggable
              onDragStart={(e) => handleDragStart(e, { type: 'template', ...tpl })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow select-none',
                tpl.color
              )}
            >
              <GripVertical className="w-3 h-3 opacity-60" />
              <span>{tpl.label}</span>
              <span className="opacity-70">{tpl.start_time}–{tpl.end_time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Board: employees grouped by role × days of week ─ */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border bg-muted/40">
            <div className="px-4 py-3 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Employee
            </div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 py-3 text-center border-l border-border',
                  isSameDay(day, new Date()) && 'bg-orbitan-blue-light'
                )}
              >
                <p className={cn('text-xs font-semibold', isSameDay(day, new Date()) ? 'text-orbitan-blue' : 'text-muted-foreground')}>
                  {format(day, 'EEE')}
                </p>
                <p className={cn('text-sm font-bold', isSameDay(day, new Date()) ? 'text-orbitan-blue' : 'text-foreground')}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          {sortedRoles.map((role) => {
            const emps = employeesByRole[role];
            const roleColorIdx = roleOrder.indexOf(role);
            return (
              <div key={role}>
                {/* Role group header */}
                <div className="px-4 py-1.5 bg-muted/30 border-b border-border">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {role.replace('_', ' ')} · {emps.length}
                  </p>
                </div>
                {emps.map((emp) => {
                  const ei = empIndex.get(emp.id) ?? 0;
                  return (
                    <div key={emp.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border last:border-b-0">
                      <div className="px-4 py-2.5 flex items-center gap-2 border-r border-border bg-muted/10">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', AVATAR_COLORS[ei % 4])}>
                          {emp.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{emp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.position || 'Staff'}</p>
                        </div>
                      </div>
                      {weekDays.map((day, di) => {
                        const cellKey = `${emp.id}_${di}`;
                        const cellShifts = shiftsForCell(emp.id, day);
                        const isOver = dragOver === cellKey;
                        return (
                          <div
                            key={di}
                            onDragOver={(e) => handleDragOver(e, emp.id, di)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, emp, day)}
                            className={cn(
                              'border-l border-border min-h-[56px] p-1.5 flex flex-col gap-1 transition-colors',
                              isOver && 'bg-orbitan-blue-light/60 ring-1 ring-inset ring-orbitan-blue'
                            )}
                          >
                            {hasOverlap(cellShifts) && (
                              <div className="flex items-center gap-1 text-[9px] font-semibold text-orbitan-red bg-orbitan-red-light px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-2.5 h-2.5" /> Overlap
                              </div>
                            )}
                            {cellShifts.map((shift, si) => (
                              <div
                                key={shift.id}
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(e, { type: 'move', shiftId: shift.id })
                                }
                                className={cn(
                                  'group flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded border cursor-grab active:cursor-grabbing',
                                  SHIFT_COLORS[ei % 4]
                                )}
                              >
                                <GripVertical className="w-2.5 h-2.5 opacity-40" />
                                <span className="flex-1">
                                  {shift.start_time}–{shift.end_time}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteShift(shift.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove shift"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {cellShifts.length === 0 && isOver && (
                              <div className="flex items-center justify-center text-[10px] text-orbitan-blue/70 italic">
                                Drop here
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        Shifts dropped onto the board publish immediately to the worker portal. Drag existing shifts to reassign. Click × to remove.
      </p>
    </div>
  );
}