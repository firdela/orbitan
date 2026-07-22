import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import MyAttendanceExceptions from '@/components/worker/MyAttendanceExceptions';
import { useToast } from '@/components/ui/use-toast';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import WorkerFeedbackModal from '@/components/worker/WorkerFeedbackModal';
import AccessRequestView from '@/components/worker/AccessRequestView';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';
import ReportIssueModal from '@/components/shared/ReportIssueModal';
import FoodSafetyLogWidget from '@/components/worker/FoodSafetyLogWidget';
import NotificationsInbox from '@/components/shared/NotificationsInbox';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import {
  Clock, CheckSquare, Calendar, LogIn, LogOut,
  ChevronRight, MapPin, CheckCircle2, Flame, Trophy, Shield,
  MessageSquarePlus, Home, ListChecks, User,
  RotateCcw, Utensils, Zap, X, Loader2
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
  low:    { color: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    label: 'Low',    ring: 'ring-slate-200' },
  medium: { color: 'bg-blue-50 text-blue-600',       dot: 'bg-blue-500',     label: 'Medium', ring: 'ring-blue-200' },
  high:   { color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',    label: 'High',   ring: 'ring-amber-200' },
  urgent: { color: 'bg-red-50 text-red-600',         dot: 'bg-red-500',      label: 'Urgent', ring: 'ring-red-200' },
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
                task.priority === 'urgent' && !done ? 'border-red-200 bg-red-50/50' :
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
                    updateTask.mutate({ id: selected.id, status: 'pending' });
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

function ShiftsScreen({ shifts, clockedIn, clockInTime, elapsed, onClockIn, onClockOut }) {
  const currentTime = new Date();
  const todayShift = shifts.find(s => isToday(new Date(s.date)));

  return (
    <div className="space-y-4">
      {/* Clock Hero */}
      <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Work Status</p>
            <p className="text-xl font-display font-bold mt-0.5">{clockedIn ? 'Clocked In ✓' : 'Not Started'}</p>
            {clockedIn
              ? <p className="text-white/80 text-xs mt-1">Duration: <span className="font-mono font-bold">{elapsed}</span></p>
              : <p className="text-white/60 text-xs mt-1">Tap to begin your shift</p>
            }
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
            <p className="text-white/50 text-xs font-mono">{format(currentTime, ':ss')}</p>
          </div>
        </div>
        {todayShift && (
          <div className="bg-white/15 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
            <span className="text-xs text-white/90 font-medium">Today: {todayShift.start_time} – {todayShift.end_time}</span>
          </div>
        )}
        <button
          onClick={clockedIn ? onClockOut : onClockIn}
          className="w-full bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/20">
          {clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {clockedIn ? 'Clock Out' : 'Clock In Now'}
        </button>
      </div>

      {/* Full schedule */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orbitan-purple" />
          <h3 className="font-heading font-semibold text-sm">My Schedule</h3>
        </div>
        <div className="divide-y divide-border">
          {shifts.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No shifts scheduled</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[16rem] mx-auto">
                Your manager hasn't assigned any shifts yet. Contact your supervisor if you
                believe this is an error.
              </p>
            </div>
          )}
          {shifts.map(shift => {
            const isShiftToday = isToday(new Date(shift.date));
            return (
              <div key={shift.id} className={`px-5 py-4 flex items-center gap-3 ${isShiftToday ? 'bg-primary/5' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isShiftToday ? 'orbitan-gradient' : 'bg-muted'}`}>
                  <Clock className={`w-4 h-4 ${isShiftToday ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{format(new Date(shift.date), 'EEE, d MMM')}</p>
                    {isShiftToday && <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Today</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{shift.start_time} – {shift.end_time}</p>
                </div>
                <StatusBadge status={isShiftToday && clockedIn ? 'in_progress' : shift.status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick link to full timesheets */}
      <Link to="/t1/clockin" className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 hover:border-primary/30 transition-all group">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Timesheet & Records</p>
          <p className="text-xs text-muted-foreground">Full clock history & verification</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

function ProfileScreen({ worker, attendancePct, productivityPct, onFeedback, onReportIssue, onSignOut }) {
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

      {/* Feedback channels */}
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
            { emoji: '🚀', label: 'Improve Orbitan', desc: 'Tell Firdaus & product team', type: 'orbitan_product_feedback' },
          ].map(item => (
            <button key={item.type} onClick={() => onFeedback(item.type)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left">
              <span className="text-lg flex-shrink-0">{item.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          <button onClick={onReportIssue}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left">
            <span className="text-lg flex-shrink-0">🐛</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Report an Issue</p>
              <p className="text-xs text-muted-foreground">Bug, data issue, or usability problem</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-2xl px-5 py-4 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-sm font-semibold text-muted-foreground">
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>

      {/* Quick access links */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">Quick Access</h3>
        </div>
        <div className="divide-y divide-border">
          {[
            { to: '/t1/dashboard', icon: Utensils, label: 'F&B Dashboard', color: 'bg-orange-50 text-orange-600' },
            { to: '/t1/compliance', icon: Shield, label: 'Compliance Centre', color: 'bg-purple-50 text-purple-600' },
            { to: '/t1/ai-studio', icon: Zap, label: 'AI Studio & SOPs', color: 'bg-amber-50 text-amber-600' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors group">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-foreground flex-1">{label}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
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
  const workerName = employee?.full_name || user?.full_name || 'Worker';
  const workerFirstName = workerName.split(' ')[0];
  const workerInitials = getInitials(workerName);

  const { data: liveTasks = [] } = useQuery({
    queryKey: ['worker-tasks', tenantId, workerId],
    queryFn: () => base44.entities.Task.filter({ tenant_id: tenantId, assigned_to: workerId }),
    enabled: !!tenantId && !!workerId,
  });

  const { data: liveShifts = [] } = useQuery({
    queryKey: ['worker-shifts', tenantId, workerId],
    queryFn: () => base44.entities.Shift.filter({ tenant_id: tenantId, employee_id: workerId }),
    enabled: !!tenantId && !!workerId,
  });

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['worker-clockrecords', tenantId, workerId],
    queryFn: () => base44.entities.ClockRecord.filter({ tenant_id: tenantId, employee_id: workerId }),
    enabled: !!tenantId && !!workerId,
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
    onSuccess: () => queryClient.invalidateQueries(['worker-tasks', tenantId, workerId]),
  });

  // ── Compliance Gate: check if any clock record needs manager verification ──
  const pendingVerification = clockRecords.filter(r => r.status === 'pending_verification');

  const todayShift = liveShifts.find(s => isToday(new Date(s.date)));
  const completedTasks = liveTasks.filter(t => t.status === 'completed').length;
  const totalTasks = liveTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const urgentTasks = liveTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

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
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tasks', icon: ListChecks, label: 'Tasks', badge: urgentTasks },
    { id: 'shifts', icon: Calendar, label: 'Shifts' },
    { id: 'safety', icon: Shield, label: 'Safety' },
    { id: 'profile', icon: User, label: 'Me' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <OrbitanLogo size="sm" />
          <div className="flex items-center gap-2">
            {urgentTasks > 0 && (
              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <Flame className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-bold text-red-600">{urgentTasks} urgent</span>
              </div>
            )}
            <NotificationsInbox tenantSlug="t1" />
            <div className="w-9 h-9 rounded-full orbitan-gradient flex items-center justify-center text-white text-xs font-bold shadow-md">
              {workerInitials}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-28">

        {/* HOME */}
        {activeSection === 'home' && (
          <>
            {/* Greeting */}
            <div className="animate-fade-in">
              <p className="text-xs text-muted-foreground">{format(currentTime, 'EEEE, d MMMM yyyy')}</p>
              <h1 className="text-2xl font-display font-bold text-foreground mt-0.5">
                {greeting}, <span className="text-orbitan-blue">{workerFirstName}</span> 👋
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{employee?.position || 'Team Member'}
              </p>
            </div>

            {/* Compliance Gate Alert */}
            {pendingVerification.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Attendance Verification Required</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    {pendingVerification.length} clock record{pendingVerification.length > 1 ? 's are' : ' is'} pending
                    manager verification — likely due to a missing Food Safety Log. Please contact your supervisor.
                  </p>
                </div>
              </div>
            )}

            {/* Progress */}
            {totalTasks > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">Today's Progress</span>
                  </div>
                  <span className="text-sm font-bold">{progressPct}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{completedTasks} of {totalTasks} tasks completed</p>
              </div>
            )}

            {/* Clock In/Out Hero */}
            <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
              <div className="relative flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Work Status</p>
                  <p className="text-xl font-display font-bold mt-0.5">
                    {clockStatus?.status === 'on_break' ? 'On Break ☕' : clockedIn ? 'Clocked In ✓' : 'Not Clocked In'}
                  </p>
                  {clockedIn
                    ? <p className="text-white/80 text-xs mt-1">Duration: <span className="font-mono font-bold">{elapsed}</span></p>
                    : <p className="text-white/60 text-xs mt-1">Tap below to start your shift</p>
                  }
                </div>
                <div className="text-right">
                  <p className="text-3xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
                  <p className="text-white/50 text-xs font-mono">{format(currentTime, ':ss')}</p>
                </div>
              </div>
              {todayShift && (
                <div className="bg-white/15 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
                  <span className="text-xs text-white/90 font-medium">Today: {todayShift.start_time} – {todayShift.end_time}</span>
                </div>
              )}
              <button
                onClick={clockedIn ? handleClockOut : handleClockIn}
                disabled={clocking}
                className="w-full bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/20 disabled:opacity-50">
                {clocking ? <Loader2 className="w-4 h-4 animate-spin" /> : clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {clocking ? 'Please wait...' : clockedIn ? 'Clock Out' : 'Clock In Now'}
              </button>
              {clockStatus?.status === 'clocked_in' && (
                <button
                  onClick={handleStartBreak}
                  disabled={clocking}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/15 disabled:opacity-50 mt-2">
                  <Utensils className="w-3.5 h-3.5" /> Start Break
                </button>
              )}
              {clockStatus?.status === 'on_break' && (
                <button
                  onClick={handleEndBreak}
                  disabled={clocking}
                  className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/20 disabled:opacity-50 mt-2">
                  <RotateCcw className="w-3.5 h-3.5" /> End Break & Resume
                </button>
              )}
            </div>

            {/* My Attendance Exceptions — employee justification */}
            <MyAttendanceExceptions tenantId={tenantId} employeeId={workerId} employeeName={workerName} />

            {/* Top urgent tasks */}
            {liveTasks.filter(t => t.status !== 'completed').slice(0, 3).length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-orbitan-blue" />
                    <span className="text-sm font-semibold">Pending Tasks</span>
                    {urgentTasks > 0 && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{urgentTasks} urgent</span>}
                  </div>
                  <button onClick={() => setActiveSection('tasks')} className="text-xs text-primary font-medium">See all →</button>
                </div>
                <div className="divide-y divide-border">
                  {liveTasks.filter(t => t.status !== 'completed').slice(0, 3).map(task => {
                    const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    return (
                      <div key={task.id}
                        onClick={() => updateTask.mutate({ id: task.id, status: 'completed' })}
                        className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-muted/40 active:bg-muted transition-colors">
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${pConf.color}`}>{pConf.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Announcements Feed */}
            <AnnouncementFeed
              tenantId={tenantId}
              workerId={workerId}
              maxItems={5}
            />

            {/* Feedback CTA */}
            <button onClick={() => setActiveSection('profile')}
              className="w-full bg-gradient-to-r from-orbitan-blue/10 to-purple-500/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm active:scale-[0.99] transition-all text-left">
              <div className="w-10 h-10 rounded-xl orbitan-gradient flex items-center justify-center flex-shrink-0">
                <MessageSquarePlus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Your Voice Matters</p>
                <p className="text-xs text-muted-foreground">Send feedback to your manager, leaders, or Orbitan</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}

        {/* TASKS */}
        {activeSection === 'tasks' && (
          <TasksScreen tasks={liveTasks} updateTask={updateTask} />
        )}

        {/* SHIFTS */}
        {activeSection === 'shifts' && (
          <ShiftsScreen
            shifts={liveShifts}
            clockedIn={clockedIn}
            clockInTime={clockInTime}
            elapsed={elapsed}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />
        )}

        {/* SAFETY */}
        {activeSection === 'safety' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Food Safety</h2>
              <p className="text-xs text-muted-foreground">Orbitan Shield™ · Regulate Principle</p>
            </div>
            <FoodSafetyLogWidget
              employeeId={workerId}
              employeeName={workerFirstName}
              tenantId={tenantId}
              outletId={outletId}
            />
            <Link to={tenantId ? `/workspace/${tenantId}/compliance` : '/workspace'}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3.5 hover:border-primary/30 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Compliance Centre</p>
                <p className="text-xs text-muted-foreground">View all audits & requirements</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* PROFILE / ME */}
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
            onSignOut={() => base44.auth.logout()}
          />
        )}

      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-2 pt-2 pb-3 flex items-center justify-around">
          {NAV_TABS.map(({ id, icon: Icon, label, badge }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative ${activeSection === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <div className={`p-1.5 rounded-xl transition-colors ${activeSection === id ? 'bg-primary/10' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold">{label}</span>
              {badge > 0 && (
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
              )}
            </button>
          ))}
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