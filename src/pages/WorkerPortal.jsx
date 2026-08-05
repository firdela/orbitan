import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Button } from '@/components/ui/button';
import WorkerFeedbackModal from '@/components/worker/WorkerFeedbackModal';
import AccessRequestView from '@/components/worker/AccessRequestView';
import ReportIssueModal from '@/components/shared/ReportIssueModal';
import WorkerNotificationBell from '@/components/worker/WorkerNotificationBell';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import WorkerHomeScreen from '@/components/worker/WorkerHomeScreen';
import WorkerScheduleHub from '@/components/worker/WorkerScheduleHub';
import SafetyHub from '@/components/worker/SafetyHub';
import WorkerProfileMenu from '@/components/worker/WorkerProfileMenu';
import { useWorkerAttentionCounts } from '@/lib/hooks/useWorkerAttentionCounts';
import { formatBadgeCount, getBadgeAriaLabel } from '@/lib/hooks/useAttentionCounts';
import {
  Clock, Calendar,
  ChevronRight, MapPin, CheckCircle2, Flame, Trophy, Shield,
  MessageSquarePlus, Home, ListChecks, User,
  RotateCcw, Utensils, X
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function computeAttendancePct(records) {
  if (!records || records.length === 0) return 0;
  const verified = records.filter(r => r.validation_status === 'approved');
  return Math.round((verified.length / records.length) * 100);
}

function computeProductivityPct(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 100);
}

const PRIORITY_CONFIG = {
  low:    { color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', dot: 'bg-slate-400',    label: 'Low',    ring: 'ring-slate-500/20' },
  medium: { color: 'bg-primary/10 text-primary',                         dot: 'bg-primary',     label: 'Medium', ring: 'ring-primary/20' },
  high:   { color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500',    label: 'High',   ring: 'ring-amber-500/20' },
  urgent: { color: 'bg-destructive/10 text-destructive',                 dot: 'bg-destructive', label: 'Urgent', ring: 'ring-destructive/20' },
};

// ─── Sub-screens ─────────────────────────────────────────────────────────────

function TasksScreen({ tasks, updateTask }) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = tasks.filter(t =>
    filter === 'all' ? true :
    filter === 'pending' ? t.status !== 'completed' :
    t.status === filter
  );
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold">Today's Progress</span>
          </div>
          <span className="text-sm font-bold">{pct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{completed} of {tasks.length} completed</p>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
        {[['all','All'], ['pending','To Do'], ['completed','Done']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${filter === v ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-orbitan-green mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-foreground">All tasks complete!</p>
            <p className="text-xs text-muted-foreground mt-1">Great work today.</p>
          </div>
        )}
        {filtered.map(task => {
          const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          const done = task.status === 'completed';
          return (
            <button key={task.id} onClick={() => setSelected(task)}
              className={`w-full bg-card border rounded-2xl p-4 text-left transition-all active:scale-[0.99] hover:shadow-sm ${
                task.priority === 'urgent' && !done ? 'border-destructive/20 bg-destructive/5' :
                done ? 'border-border opacity-60' : 'border-border hover:border-primary/30'
              }`}>
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground'}`}>
                  {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                  {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.due_date && <span className="text-[10px] text-muted-foreground">{task.due_date}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pConf.color}`}>{pConf.label}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Task detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h3 className="font-heading font-bold text-base">Task Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="font-semibold text-foreground text-sm leading-snug">{selected.title}</p>
              {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">Priority</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[selected.priority]?.color}`}>
                  {PRIORITY_CONFIG[selected.priority]?.label}
                </span>
              </div>
              {selected.due_date && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">Due Date</span>
                  <span className="text-xs font-medium text-foreground">{selected.due_date}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selected.status !== 'completed' && (
                  <Button className="flex-1 gap-1.5 h-11" onClick={() => {
                    updateTask.mutate({ id: selected.id, status: 'completed' });
                    setSelected(null);
                  }}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Done
                  </Button>
                )}
                {selected.status === 'completed' && (
                  <Button variant="outline" className="flex-1 gap-1.5 h-11" onClick={() => {
                    updateTask.mutate({ id: selected.id, status: 'in_progress' });
                    setSelected(null);
                  }}>
                    <RotateCcw className="w-4 h-4" /> Undo
                  </Button>
                )}
                <Button variant="outline" className="flex-1 h-11" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ShiftsScreen is now WorkerScheduleHub — see src/components/worker/

// ProfileScreen: Sign Out moved to avatar menu (dedup).
// Compliance Centre shortcut removed (now in Safety Hub — dedup).
// Report Issue kept here as the canonical single entry point.
function ProfileScreen({ worker, attendancePct, productivityPct, onFeedback, onReportIssue, onNavigate }) {
  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-gradient-to-br from-[#1D4ED8] to-[#111827] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold font-display border-2 border-white/30">
            {worker.initials}
          </div>
          <div>
            <p className="text-xl font-display font-bold">{worker.full_name}</p>
            <p className="text-white/70 text-sm">{worker.position}</p>
            <p className="text-white/50 text-xs mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{worker.position || 'Team Member'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold font-display">{attendancePct}%</p>
            <p className="text-white/60 text-[10px]">Attendance</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-lg font-bold font-display">{productivityPct}%</p>
            <p className="text-white/60 text-[10px]">Productivity</p>
          </div>
        </div>
      </div>

      {/* Feedback channels — canonical single location */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-orbitan-blue" /> Voice & Feedback
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your voice reaches your managers, business leaders, and Orbitan directly.</p>
        </div>
        <div className="divide-y divide-border">
          {[
            { emoji: '💡', label: 'Share a Suggestion', desc: 'Improve how we work', type: 'suggestion' },
            { emoji: '🌟', label: 'Give Praise', desc: 'Recognise your team', type: 'praise' },
            { emoji: '🚨', label: 'Urgent Escalation', desc: 'Needs immediate attention', type: 'urgent_escalation' },
            { emoji: '🚀', label: 'Improve Orbitan', desc: 'Tell the product team', type: 'orbitan_product_feedback' },
          ].map(item => (
            <button key={item.type} onClick={() => onFeedback(item.type)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left min-h-[44px]">
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          <button onClick={onReportIssue}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left min-h-[44px]">
            <span className="text-lg flex-shrink-0">🐛</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Report an Issue</p>
              <p className="text-xs text-muted-foreground">Bug, data issue, or usability problem</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Quick access — Home only (Compliance Centre is in Safety Hub) */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">Quick Access</h3>
        </div>
        <div className="divide-y divide-border">
          <button onClick={() => onNavigate?.('home')} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors group text-left min-h-[44px]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Utensils className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-foreground flex-1">Home Dashboard</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main WorkerPortal ────────────────────────────────────────────────────────

export default function WorkerPortal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userEmail = user?.email || '';

  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState('home');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackPreset, setFeedbackPreset] = useState(null);
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [elapsed, setElapsed] = useState('0:00:00');
  const [clocking, setClocking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!clockedIn || !clockInTime) { setElapsed('0:00:00'); return; }
    const iv = setInterval(() => {
      const diff = Math.floor((Date.now() - clockInTime.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [clockedIn, clockInTime]);

  // ── Live data queries ─────────────────────────────────────────────────────

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['worker-employee', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const results = await base44.entities.Employee.filter({ email: userEmail });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!userEmail,
  });

  const tenantId = employee?.tenant_id || '';
  const outletId = employee?.outlet_id || '';
  const workerId = employee?.id || '';
  // Operational entities (Task, Shift, ClockRecord) key on the GLOBAL User id
  // — per their RLS `{{user.id}}` templates and clockController — NOT the
  // Employee record id. Use userId for scoped reads so workers actually see
  // their assigned tasks, shifts and clock records. workerId (Employee.id)
  // remains for component props / display only.
  const userId = user?.id || '';
  const workerName = employee?.full_name || user?.full_name || 'Worker';
  const workerFirstName = workerName.split(' ')[0];
  const workerInitials = getInitials(workerName);

  const { data: liveTasks = [] } = useQuery({
    queryKey: ['worker-tasks', tenantId, userId],
    queryFn: () => base44.entities.Task.filter({ tenant_id: tenantId, responsible_agent_id: userId }),
    enabled: !!tenantId && !!userId,
  });

  const { data: liveShifts = [] } = useQuery({
    queryKey: ['worker-shifts', tenantId, userId],
    queryFn: () => base44.entities.Shift.filter({ tenant_id: tenantId, employee_id: userId }),
    enabled: !!tenantId && !!userId,
  });

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['worker-clockrecords', tenantId, userId],
    queryFn: () => base44.entities.ClockRecord.filter({ tenant_id: tenantId, employee_id: userId }),
    enabled: !!tenantId && !!userId,
  });

  // ── Tenant query for industry-aware safety modules ──────────────────────
  const { data: tenant } = useQuery({
    queryKey: ['worker-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      return await base44.entities.Tenant.get(tenantId);
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Compliance records for calendar + safety overview ───────────────────
  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['worker-compliance', tenantId, outletId],
    queryFn: async () => {
      if (!tenantId || !outletId) return [];
      const records = await base44.entities.ComplianceRecord.filter(
        { tenant_id: tenantId, outlet_id: outletId },
        '-due_date',
        50
      );
      return records || [];
    },
    enabled: !!tenantId && !!outletId,
    staleTime: 60 * 1000,
  });

  // ── Real clock status from clockController backend function ──────────────
  const { data: clockStatus } = useQuery({
    queryKey: ['worker-clock-status', tenantId, workerId],
    queryFn: async () => {
      const response = await base44.functions.invoke('clockController', {
        action: 'get_status',
      });
      return response.data;
    },
    enabled: !!tenantId && !!workerId,
    refetchInterval: 30000,
  });

  const isClockedIn = clockStatus?.status === 'clocked_in' || clockStatus?.status === 'on_break';

  useEffect(() => {
    if (clockStatus?.record?.clock_in_time) {
      setClockInTime(new Date(clockStatus.record.clock_in_time));
      setClockedIn(isClockedIn);
    } else {
      setClockedIn(false);
      setClockInTime(null);
    }
  }, [clockStatus, isClockedIn]);

  // ── Clock In / Clock Out handlers (real backend persistence) ─────────────
  const handleClockIn = async () => {
    setClocking(true);
    try {
      const shiftId = todayShift?.id || '';
      const response = await base44.functions.invoke('clockController', {
        action: 'clock_in',
        shift_id: shiftId,
      });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      setClockedIn(true);
      setClockInTime(new Date());
      toast({ title: '✓ Clocked In', description: `Your shift started at ${format(new Date(), 'HH:mm')}.` });
      queryClient.invalidateQueries({ queryKey: ['worker-clock-status'] });
      queryClient.invalidateQueries({ queryKey: ['worker-clockrecords'] });
      await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: workerId,
        actor_name: workerName,
        actor_role: 'worker',
        action_type: ACTION_TYPES.CLOCK_IN,
        module: 'workforce',
        target_entity: 'ClockRecord',
        target_record_id: res?.record?.id || '',
        details: `${workerName} clocked in at ${format(new Date(), 'HH:mm')}`,
      });
    } catch (err) {
      toast({ title: 'Clock In Failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const response = await base44.functions.invoke('clockController', {
        action: 'clock_out',
      });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      setClockedIn(false);
      setClockInTime(null);
      const summary = res?.summary || {};
      toast({
        title: '✓ Clocked Out',
        description: `Worked ${summary.hours_worked || 0} hrs${summary.overtime_hours > 0 ? ` (${summary.overtime_hours} OT)` : ''}.`,
      });

      // Backend (clockController) now evaluates policy and creates exceptions authoritatively (ADR-0052).
      const record = res?.record;
      if (summary.exceptions_created > 0) {
        toast({
          title: 'Attendance exception detected',
          description: `${summary.exceptions_created} exception(s) flagged for manager review.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['worker-clock-status'] });
      queryClient.invalidateQueries({ queryKey: ['worker-clockrecords'] });
      await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outletId,
        actor_id: workerId,
        actor_name: workerName,
        actor_role: 'worker',
        action_type: ACTION_TYPES.CLOCK_OUT || 'clock_out',
        module: 'workforce',
        target_entity: 'ClockRecord',
        target_record_id: record?.id || '',
        details: `${workerName} clocked out after ${summary.hours_worked || 0} hrs`,
      });
    } catch (err) {
      toast({ title: 'Clock Out Failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setClocking(false);
    }
  };

  const handleStartBreak = async () => {
    setClocking(true);
    try {
      const response = await base44.functions.invoke('clockController', { action: 'start_break' });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      toast({ title: '☕ Break Started', description: 'Your break has started. Remember to resume when ready.' });
      queryClient.invalidateQueries({ queryKey: ['worker-clock-status'] });
    } catch (err) {
      toast({ title: 'Break Failed', description: err.message, variant: 'destructive' });
    } finally {
      setClocking(false);
    }
  };

  const handleEndBreak = async () => {
    setClocking(true);
    try {
      const response = await base44.functions.invoke('clockController', { action: 'end_break' });
      const res = response.data;
      if (res?.error) throw new Error(res.error);
      toast({ title: '✓ Break Ended', description: `Break: ${res.break_duration_mins || 0} min. Back to work!` });
      queryClient.invalidateQueries({ queryKey: ['worker-clock-status'] });
    } catch (err) {
      toast({ title: 'Break Failed', description: err.message, variant: 'destructive' });
    } finally {
      setClocking(false);
    }
  };

  const attendancePct = computeAttendancePct(clockRecords);
  const productivityPct = computeProductivityPct(liveTasks);

  const updateTask = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, {
      status,
      completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['worker-tasks', tenantId, userId] }),
  });

  // ── Compliance Gate: check if any clock record needs manager verification ──
  const pendingVerification = clockRecords.filter(r => r.status === 'pending_verification');

  const todayShift = liveShifts.find(s => isToday(new Date(s.date)));
  const completedTasks = liveTasks.filter(t => t.status === 'completed').length;
  const totalTasks = liveTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const urgentTasks = liveTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  // ── Canonical attention counts for bottom-nav badges ──
  const { counts: attentionCounts } = useWorkerAttentionCounts({
    tenantId, outletId, userId,
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  if (empLoading) {
    return <OrbitanLoader size="fullscreen" message="Loading your profile…" />;
  }

  // Render Governed Onboarding Pipeline when user is authenticated but not yet linked to an employee record
  if (!employee && !empLoading && userEmail) {
    return <AccessRequestView />;
  }

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const openFeedback = (type) => {
    setFeedbackPreset(type);
    setFeedbackOpen(true);
  };

  const NAV_TABS = [
    { id: 'home', icon: Home, label: 'Home', badge: attentionCounts.home },
    { id: 'tasks', icon: ListChecks, label: 'Tasks', badge: attentionCounts.tasks },
    { id: 'shifts', icon: Calendar, label: 'Shifts', badge: attentionCounts.shifts },
    { id: 'safety', icon: Shield, label: 'Safety', badge: attentionCounts.safety },
    { id: 'profile', icon: User, label: 'Me', badge: attentionCounts.me },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <OrbitanLogo size="sm" />
          <div className="flex items-center gap-2">
            {urgentTasks > 0 && (
              <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-1">
                <Flame className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-bold text-destructive">{urgentTasks} urgent</span>
              </div>
            )}
            <WorkerNotificationBell onNavigate={setActiveSection} />
            <WorkerProfileMenu
              workerName={workerName}
              workerInitials={workerInitials}
              workerRole={employee?.role || 'worker'}
              position={employee?.position || 'Team Member'}
              organisationName={tenant?.name || ''}
              outletName={employee?.outlet_id || ''}
              onNavigate={setActiveSection}
              onSignOut={() => base44.auth.logout()}
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-28">

        {/* HOME — Configurable Worker Overview Dashboard */}
        {activeSection === 'home' && (
          <WorkerHomeScreen
            workerFirstName={workerFirstName}
            employee={employee}
            tenantId={tenantId}
            outletId={outletId}
            workerId={workerId}
            userId={userId}
            currentTime={currentTime}
            tasks={liveTasks}
            shifts={liveShifts}
            clockRecords={clockRecords}
            clockStatus={clockStatus}
            clocking={clocking}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onStartBreak={handleStartBreak}
            onEndBreak={handleEndBreak}
            onNavigate={setActiveSection}
            onReportIssue={() => setReportIssueOpen(true)}
            pendingVerification={pendingVerification}
          />
        )}

        {/* TASKS */}
        {activeSection === 'tasks' && (
          <TasksScreen tasks={liveTasks} updateTask={updateTask} />
        )}

        {/* SHIFTS — Worker Schedule & Calendar Hub */}
        {activeSection === 'shifts' && (
          <WorkerScheduleHub
            employee={employee}
            tenantId={tenantId}
            outletId={outletId}
            workerId={workerId}
            userId={userId}
            shifts={liveShifts}
            clockStatus={clockStatus?.status}
            clocking={clocking}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onStartBreak={handleStartBreak}
            onEndBreak={handleEndBreak}
            complianceRecords={complianceRecords}
          />
        )}

        {/* SAFETY — Industry-aware Safety Hub */}
        {activeSection === 'safety' && (
          <SafetyHub
            employee={employee}
            tenantId={tenantId}
            outletId={outletId}
            workerId={userId}
            workerName={workerName}
            industry={tenant?.industry || 'food_beverage'}
          />
        )}

        {/* PROFILE / ME — Sign Out moved to avatar menu */}
        {activeSection === 'profile' && (
          <ProfileScreen
            worker={{
              initials: workerInitials,
              full_name: workerName,
              position: employee?.position || 'Team Member',
            }}
            attendancePct={attendancePct}
            productivityPct={productivityPct}
            onFeedback={openFeedback}
            onReportIssue={() => setReportIssueOpen(true)}
            onNavigate={setActiveSection}
          />
        )}

      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-2 pt-2 pb-3 flex items-center justify-around">
          {NAV_TABS.map(({ id, icon: Icon, label, badge }) => {
            const badgeText = formatBadgeCount(badge);
            const badgeLabel = getBadgeAriaLabel(id === 'safety' ? 'compliance' : id, badge);
            return (
              <button key={id} onClick={() => setActiveSection(id)}
                aria-label={badgeLabel ? `${label} — ${badgeLabel}` : label}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${activeSection === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <div className={`p-1.5 rounded-xl transition-colors ${activeSection === id ? 'bg-primary/10' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
                {badgeText && (
                  <span className="absolute -top-0.5 right-0 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Modal */}
      <WorkerFeedbackModal
        open={feedbackOpen}
        onClose={() => { setFeedbackOpen(false); setFeedbackPreset(null); }}
        worker={{
          id: workerId,
          name: workerFirstName,
          full_name: workerName,
          position: employee?.position || 'Team Member',
          tenant_id: tenantId,
          outlet_id: outletId,
          role: 'worker',
        }}
      />

      {/* Report Issue Modal — triggered from Me tab, FAB hidden */}
      <ReportIssueModal
        hideFloatingButton
        externalOpen={reportIssueOpen}
        onExternalClose={() => setReportIssueOpen(false)}
      />
    </div>
  );
}