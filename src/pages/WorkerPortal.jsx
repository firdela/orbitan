import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Clock, CheckSquare, Calendar, LogIn, LogOut,
  ChevronRight, MapPin, CheckCircle2, Briefcase, Layers,
  Building2, Zap, Star, Flame, Trophy, Target, BookOpen, Shield
} from 'lucide-react';
import FoodSafetyLogWidget from '@/components/worker/FoodSafetyLogWidget';
import NotificationsInbox from '@/components/shared/NotificationsInbox';

const T1_TENANT_ID = 'taqueria_pte_ltd';
const T1_OUTLET_ID = 'taqueria_pte_ltd_main';

const WORKER = {
  name: "Fahmi",
  position: "Kitchen Staff",
  outlet: "La Birria Tacos (North Bridge Rd)",
  avatar_initials: "FM",
  tenant_id: T1_TENANT_ID,
};

const DEMO_SHIFTS = [
  { id: 1, date: new Date().toISOString().split('T')[0], start_time: "09:00", end_time: "17:00", status: "scheduled", outlet: "La Birria Tacos (NB)" },
  { id: 2, date: new Date(Date.now() + 86400000).toISOString().split('T')[0], start_time: "11:00", end_time: "19:00", status: "scheduled", outlet: "La Birria Tacos (NB)" },
];

const PRIORITY_CONFIG = {
  low:    { color: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    label: 'Low' },
  medium: { color: 'bg-blue-50 text-blue-600',       dot: 'bg-blue-500',     label: 'Medium' },
  high:   { color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',    label: 'High' },
  urgent: { color: 'bg-red-50 text-red-600',         dot: 'bg-red-500',      label: 'Urgent' },
};

const MODULE_ICONS = {
  compliance: Shield,
  inventory: Briefcase,
  task: Target,
  workforce: Trophy,
};

export default function WorkerPortal() {
  const queryClient = useQueryClient();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSection, setActiveSection] = useState('home'); // 'home' | 'tasks' | 'shifts' | 'safety'

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Live tasks from DB
  const { data: liveTasks = [] } = useQuery({
    queryKey: ['worker-tasks', T1_TENANT_ID],
    queryFn: () => base44.entities.Task.filter({ tenant_id: T1_TENANT_ID }),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status, completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null }),
    onSuccess: () => queryClient.invalidateQueries(['worker-tasks', T1_TENANT_ID]),
  });

  const todayShift = DEMO_SHIFTS.find(s => isToday(new Date(s.date)));
  const completedTasks = liveTasks.filter(t => t.status === 'completed').length;
  const totalTasks = liveTasks.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const urgentTasks = liveTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Duration display
  const [elapsed, setElapsed] = useState('0:00:00');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <OrbitanLogo size="sm" />
          <div className="flex items-center gap-2">
            {urgentTasks > 0 && (
              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-full px-2 py-1">
                <Flame className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-bold text-red-600">{urgentTasks} urgent</span>
              </div>
            )}
            <NotificationsInbox tenantSlug="t1" />
            <div className="w-9 h-9 rounded-full orbitan-gradient flex items-center justify-center text-white text-xs font-bold shadow-md">
              {WORKER.avatar_initials}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-28">

        {/* Greeting + Progress */}
        <div className="animate-fade-in">
          <p className="text-xs text-muted-foreground">{format(currentTime, 'EEEE, d MMMM yyyy')}</p>
          <h1 className="text-xl font-display font-bold text-foreground mt-0.5">
            {greeting}, <span className="text-orbitan-blue">{WORKER.name.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />{WORKER.outlet}
          </p>
        </div>

        {/* Daily Progress Bar */}
        {totalTasks > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Today's Progress</span>
              </div>
              <span className="text-sm font-bold text-foreground">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{completedTasks} of {totalTasks} tasks completed</p>
          </div>
        )}

        {/* Clock In/Out Hero Card */}
        <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${clockedIn ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
          <div className="relative flex items-start justify-between mb-4">
            <div>
              <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">Work Status</p>
              <p className="text-xl font-display font-bold mt-0.5">{clockedIn ? 'Clocked In ✓' : 'Not Clocked In'}</p>
              {clockedIn ? (
                <p className="text-white/80 text-xs mt-1">Duration: <span className="font-mono font-bold">{elapsed}</span></p>
              ) : (
                <p className="text-white/70 text-xs mt-1">Tap below to start your shift</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
              <p className="text-white/60 text-xs font-mono">{format(currentTime, ':ss')}</p>
            </div>
          </div>

          {todayShift && (
            <div className="bg-white/15 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-white/70" />
                <span className="text-xs text-white/90 font-medium">Today: {todayShift.start_time} – {todayShift.end_time}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${clockedIn ? 'bg-white/20 text-white' : 'bg-white/15 text-white/80'}`}>
                {clockedIn ? 'Active' : 'Scheduled'}
              </span>
            </div>
          )}

          <button
            onClick={() => { if (clockedIn) { setClockedIn(false); setClockInTime(null); } else { setClockedIn(true); setClockInTime(new Date()); } }}
            className="w-full bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/20"
          >
            {clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {clockedIn ? 'Clock Out' : 'Clock In Now'}
          </button>
        </div>

        {/* Task List — Live from DB */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-orbitan-blue" />
              <h3 className="font-heading font-semibold text-sm">My Tasks</h3>
              {urgentTasks > 0 && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{urgentTasks} urgent</span>}
            </div>
            <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks}</span>
          </div>

          <div className="h-1 bg-muted">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>

          {liveTasks.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {liveTasks.slice(0, 8).map(task => {
                const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const ModIcon = MODULE_ICONS[task.module_context] || Target;
                const done = task.status === 'completed';
                return (
                  <div key={task.id}
                    className={`px-5 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-muted/40 transition-colors ${done ? 'opacity-50' : ''}`}
                    onClick={() => updateTask.mutate({ id: task.id, status: done ? 'pending' : 'completed' })}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                      {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pConf.color}`}>{pConf.label}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <ModIcon className="w-3 h-3" />
                          <span className="capitalize">{task.module_context || 'task'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Shifts */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orbitan-purple" />
            <h3 className="font-heading font-semibold text-sm">Upcoming Shifts</h3>
          </div>
          <div className="divide-y divide-border">
            {DEMO_SHIFTS.map(shift => (
              <div key={shift.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orbitan-purple-light flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orbitan-purple" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{format(new Date(shift.date + 'T00:00:00'), 'EEE, d MMM')}</p>
                    <p className="text-xs text-muted-foreground">{shift.start_time} – {shift.end_time} · {shift.outlet}</p>
                  </div>
                </div>
                <StatusBadge status={isToday(new Date(shift.date + 'T00:00:00')) && clockedIn ? 'in_progress' : 'scheduled'} />
              </div>
            ))}
          </div>
        </div>

        {/* Food Safety Log */}
        <FoodSafetyLogWidget employeeId="demo-worker-1" employeeName={WORKER.name} tenantId={T1_TENANT_ID} outletId={T1_OUTLET_ID} />

        {/* Quick Nav Cards */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Access</p>
          {[
            { to: '/t1/dashboard', icon: Building2, label: 'F&B Dashboard', sub: 'La Birria Tacos overview', color: 'text-orange-500 bg-orange-50' },
            { to: '/t1/clockin', icon: Clock, label: 'Timesheet & Attendance', sub: 'View your clock records', color: 'text-blue-500 bg-blue-50' },
            { to: '/t1/compliance', icon: Shield, label: 'Compliance Centre', sub: 'Orbitan Shield™ · Regulate', color: 'text-purple-500 bg-purple-50' },
            { to: '/t1/ai-studio', icon: Zap, label: 'AI Studio', sub: 'SOP Library & Training Docs', color: 'text-amber-500 bg-amber-50' },
          ].map(({ to, icon: Icon, label, sub, color }) => (
            <Link key={to} to={to} className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm hover:border-primary/20 transition-all group">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ))}
        </div>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around">
          {[
            { icon: Building2, label: 'Home', section: 'home' },
            { icon: CheckSquare, label: 'Tasks', section: 'tasks', badge: urgentTasks },
            { icon: Calendar, label: 'Schedule', section: 'shifts' },
            { icon: Shield, label: 'Safety', section: 'safety' },
          ].map(({ icon: Icon, label, section, badge }) => (
            <button key={section} onClick={() => setActiveSection(section)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors relative ${activeSection === section ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {badge > 0 && <span className="absolute top-0.5 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-center pb-1">{PLATFORM_IDENTITY.copyright}</p>
      </div>
    </div>
  );
}