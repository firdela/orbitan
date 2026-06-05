import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format, isToday } from 'date-fns';
import { PLATFORM_IDENTITY } from '@/lib/orbitan-config';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock, CheckSquare, Calendar, Bell, LogIn, LogOut,
  ChevronRight, User, MapPin, Star, AlertCircle, CheckCircle2,
  Briefcase, Layers, Building2
} from 'lucide-react';
import FoodSafetyLogWidget from '@/components/worker/FoodSafetyLogWidget';

const DEMO_WORKER = {
  name: "Ahmad Rizal",
  position: "Kitchen Staff",
  outlet: "La Birria Tacos (North Bridge Rd)",
  avatar_initials: "AR",
};

const DEMO_SHIFTS = [
  { id: 1, date: new Date().toISOString().split('T')[0], start_time: "09:00", end_time: "17:00", status: "scheduled", outlet: "La Birria Tacos (NB)" },
  { id: 2, date: new Date(Date.now() + 86400000).toISOString().split('T')[0], start_time: "11:00", end_time: "19:00", status: "scheduled", outlet: "La Birria Tacos (NB)" },
];

const DEMO_TASKS = [
  { id: 1, title: "Complete morning prep checklist", priority: "high", status: "pending", due_time: "09:30", module_context: "task" },
  { id: 2, title: "Check ingredient stock levels", priority: "medium", status: "pending", due_time: "10:00", module_context: "inventory" },
  { id: 3, title: "Food safety temperature log", priority: "urgent", status: "in_progress", due_time: "11:00", module_context: "compliance" },
  { id: 4, title: "End-of-day cleaning schedule", priority: "low", status: "pending", due_time: "17:00", module_context: "task" },
];

const PRIORITY_COLORS = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-orbitan-blue-light text-orbitan-blue',
  high: 'bg-orbitan-amber-light text-orbitan-amber',
  urgent: 'bg-orbitan-red-light text-orbitan-red',
};

export default function WorkerPortal() {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = () => {
    setClockedIn(true);
    setClockInTime(new Date());
  };
  const handleClockOut = () => {
    setClockedIn(false);
    setClockInTime(null);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  const todayShift = DEMO_SHIFTS.find(s => isToday(new Date(s.date)));
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <OrbitanLogo size="sm" />
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orbitan-red rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full orbitan-gradient flex items-center justify-center text-white text-xs font-bold">
              {DEMO_WORKER.avatar_initials}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
        {/* Greeting */}
        <div className="animate-fade-in">
          <p className="text-sm text-muted-foreground">{format(currentTime, 'EEEE, d MMMM yyyy')}</p>
          <h1 className="text-2xl font-display font-bold text-foreground mt-1">
            Good {currentTime.getHours() < 12 ? 'morning' : currentTime.getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="text-orbitan-blue">{DEMO_WORKER.name.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            {DEMO_WORKER.outlet}
          </p>
        </div>

        {/* Clock In/Out Card */}
        <div className={`rounded-2xl p-5 text-white ${clockedIn ? 'bg-orbitan-green' : 'orbitan-gradient'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Work Status</p>
              <p className="text-xl font-display font-bold mt-0.5">
                {clockedIn ? 'Clocked In' : 'Not Clocked In'}
              </p>
              {clockedIn && clockInTime && (
                <p className="text-white/80 text-xs mt-1">Since {format(clockInTime, 'h:mm a')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
              <p className="text-white/70 text-xs">{format(currentTime, 'ss')}s</p>
            </div>
          </div>
          <button
            onClick={clockedIn ? handleClockOut : handleClockIn}
            className="w-full bg-white/20 hover:bg-white/30 active:bg-white/10 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {clockedIn ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>

        {/* Today's Shift */}
        {todayShift ? (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-orbitan-blue" />
              <h3 className="font-heading font-semibold text-sm">Today's Shift</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-display font-bold text-foreground">
                  {todayShift.start_time} — {todayShift.end_time}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{todayShift.outlet}</p>
              </div>
              <StatusBadge status={clockedIn ? 'in_progress' : todayShift.status} />
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-2xl p-5 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No shift scheduled today</p>
          </div>
        )}

        {/* Tasks */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-orbitan-blue" />
              <h3 className="font-heading font-semibold text-sm">My Tasks</h3>
            </div>
            <span className="text-xs text-muted-foreground">{completedTasks}/{tasks.length} done</span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-1 bg-orbitan-green transition-all duration-500"
              style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }}
            />
          </div>

          <div className="divide-y divide-border">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`px-5 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors ${task.status === 'completed' ? 'opacity-60' : ''}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  task.status === 'completed' ? 'bg-orbitan-green border-orbitan-green' : 'border-border'
                }`}>
                  {task.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {task.due_time && <span className="text-xs text-muted-foreground">{task.due_time}</span>}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Shifts */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orbitan-purple" />
            <h3 className="font-heading font-semibold text-sm">Upcoming Shifts</h3>
          </div>
          <div className="divide-y divide-border">
            {DEMO_SHIFTS.map(shift => (
              <div key={shift.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(shift.date + 'T00:00:00'), 'EEE, d MMM')}
                  </p>
                  <p className="text-xs text-muted-foreground">{shift.start_time} – {shift.end_time}</p>
                </div>
                <StatusBadge status={isToday(new Date(shift.date + 'T00:00:00')) && clockedIn ? 'in_progress' : 'scheduled'} />
              </div>
            ))}
          </div>
        </div>

        {/* Food Safety Log */}
        <FoodSafetyLogWidget
          employeeId="demo-worker-1"
          employeeName={DEMO_WORKER.name}
          tenantId="t1-demo"
          outletId="outlet-1"
        />

        {/* Navigation Links */}
        <div className="flex flex-col gap-2">
          <Link to="/outlet" className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground flex-1">Outlet Dashboard</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link to="/company" className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground flex-1">Company Dashboard</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </main>

      {/* Footer attribution */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          {PLATFORM_IDENTITY.copyright}
        </p>
      </div>
    </div>
  );
}