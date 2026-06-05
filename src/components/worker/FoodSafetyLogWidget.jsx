// ============================================================
// ORBITAN — Worker Portal: Food Safety Log Widget
// Quick shift-based temperature & hygiene checklist submission
// EXIT-READY: Pure React + base44 SDK.
// ============================================================

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Thermometer, CheckSquare, Shield, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEFAULT_HYGIENE = [
  'Hand washing station stocked & functional',
  'Food prep surfaces sanitised',
  'Waste bins emptied and cleaned',
  'PPE (gloves/hairnets) available for all staff',
  'Raw/cooked food separation maintained',
  'Refrigeration doors sealed properly',
];

const DEFAULT_TEMPS = [
  { location: 'Walk-in Chiller', min: 0, max: 5, temp: '' },
  { location: 'Freezer', min: -22, max: -15, temp: '' },
  { location: 'Prep Counter', min: 0, max: 8, temp: '' },
];

export default function FoodSafetyLogWidget({ employeeId, employeeName, tenantId, outletId }) {
  const [expanded, setExpanded] = useState(false);
  const [logType, setLogType] = useState('opening');
  const [temps, setTemps] = useState(DEFAULT_TEMPS.map(t => ({ ...t })));
  const [hygiene, setHygiene] = useState(DEFAULT_HYGIENE.map(task => ({ task, is_completed: false })));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const allHygieneDone = hygiene.every(h => h.is_completed);
  const allTempsOk = temps.every(t => {
    const v = parseFloat(t.temp);
    return !isNaN(v) && v >= t.min && v <= t.max;
  });
  const tempsFilled = temps.every(t => t.temp !== '');

  const overallStatus = tempsFilled && allTempsOk && allHygieneDone ? 'pass' : 'needs_attention';

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.FoodSafetyLog.create({
      tenant_id: tenantId,
      outlet_id: outletId,
      logged_by: employeeId,
      logged_by_name: employeeName,
      log_date: format(new Date(), 'yyyy-MM-dd'),
      log_type: logType,
      temperature_checks: temps.map(t => ({
        location: t.location,
        temperature_celsius: parseFloat(t.temp) || 0,
        is_within_range: parseFloat(t.temp) >= t.min && parseFloat(t.temp) <= t.max,
      })),
      hygiene_checklist: hygiene,
      overall_status: overallStatus,
      handwashing_station_stocked: hygiene.find(h => h.task.includes('Hand washing'))?.is_completed || false,
      waste_disposed: hygiene.find(h => h.task.includes('Waste'))?.is_completed || false,
    });
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-orbitan-green-light flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-orbitan-green" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Food Safety Log Submitted</p>
          <p className="text-xs text-muted-foreground">{format(new Date(), 'h:mm a')} · {logType} check · {overallStatus === 'pass' ? '✅ All clear' : '⚠️ Needs attention'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header — collapsible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-orbitan-red" />
          <h3 className="font-heading font-semibold text-sm">Food Safety Log</h3>
          <span className="text-[10px] font-medium bg-orbitan-red-light text-orbitan-red px-1.5 py-0.5 rounded-full">Required</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
          {/* Log type */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Log Type</p>
            <div className="flex gap-1.5">
              {['opening', 'mid_shift', 'closing'].map(type => (
                <button
                  key={type}
                  onClick={() => setLogType(type)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-all capitalize',
                    logType === type
                      ? 'bg-orbitan-red-light border-red-300 text-orbitan-red font-semibold'
                      : 'border-border text-muted-foreground hover:border-muted-foreground'
                  )}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Temperature checks */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Thermometer className="w-3.5 h-3.5 text-orbitan-amber" />
              <p className="text-xs font-semibold text-foreground">Temperature Checks</p>
            </div>
            <div className="space-y-2">
              {temps.map((t, i) => {
                const val = parseFloat(t.temp);
                const ok = !isNaN(val) && val >= t.min && val <= t.max;
                const filled = t.temp !== '';
                return (
                  <div key={t.location} className="flex items-center gap-3">
                    <p className="text-xs text-muted-foreground w-32 flex-shrink-0">{t.location}</p>
                    <Input
                      type="number"
                      placeholder={`${t.min}°–${t.max}°C`}
                      value={t.temp}
                      onChange={e => setTemps(prev => prev.map((x, j) => j === i ? { ...x, temp: e.target.value } : x))}
                      className={cn('h-8 text-sm w-24', filled && !ok && 'border-orbitan-red focus-visible:ring-orbitan-red')}
                    />
                    <span className="text-xs text-muted-foreground">°C</span>
                    {filled && (
                      ok
                        ? <CheckCircle2 className="w-4 h-4 text-orbitan-green flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-orbitan-red flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hygiene checklist */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CheckSquare className="w-3.5 h-3.5 text-orbitan-blue" />
              <p className="text-xs font-semibold text-foreground">Hygiene Checklist</p>
            </div>
            <div className="space-y-2">
              {hygiene.map((item, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setHygiene(prev => prev.map((h, j) => j === i ? { ...h, is_completed: !h.is_completed } : h))}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      item.is_completed ? 'bg-orbitan-green border-orbitan-green' : 'border-border group-hover:border-primary'
                    )}
                  >
                    {item.is_completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn('text-xs leading-tight', item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                    {item.task}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status preview */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
            overallStatus === 'pass'
              ? 'bg-orbitan-green-light text-orbitan-green'
              : 'bg-orbitan-amber-light text-orbitan-amber'
          )}>
            {overallStatus === 'pass'
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> All checks passing — ready to submit</>
              : <><AlertTriangle className="w-3.5 h-3.5" /> Complete all checks before submitting</>
            }
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || !tempsFilled}
            size="sm"
            className="w-full gap-2"
          >
            {submitting ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
            ) : (
              <><Shield className="w-3.5 h-3.5" /> Submit Safety Log</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}