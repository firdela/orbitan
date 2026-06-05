import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  ClipboardList, Users, CheckSquare, Shield, DollarSign,
  Clock, MapPin, Camera, CheckCircle2, AlertCircle,
  LogIn, LogOut, Timer, Star, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const NAV = [
  { type: 'section', label: 'F&B Operations' },
  { label: 'Dashboard', href: '/t1/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', href: '/t1/inventory', icon: Package },
  { label: 'Procurement', href: '/t1/procurement', icon: ShoppingCart },
  { label: 'Sales & Invoicing', href: '/t1/sales', icon: DollarSign },
  { type: 'section', label: 'People' },
  { label: 'Workforce', href: '/t1/workforce', icon: Users },
  { label: 'Scheduling', href: '/t1/scheduling', icon: Clock },
  { label: 'Clock In / Out', href: '/t1/clockin', icon: Timer },
  { label: 'Tasks', href: '/t1/tasks', icon: CheckSquare },
  { type: 'section', label: 'Governance' },
  { label: 'Compliance', href: '/t1/compliance', icon: Shield },
  { label: 'Reporting', href: '/t1/reporting', icon: BarChart2 },
  { label: 'Xero Sync', href: '/t1/xero', icon: DollarSign },
];

export default function FnBClockIn() {
  const [user, setUser] = useState(null);
  const [clockStatus, setClockStatus] = useState(null); // not_clocked_in | clocked_in | clocked_out
  const [activeRecord, setActiveRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [teamStatus, setTeamStatus] = useState([]);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadUserAndStatus();
  }, []);

  // Live elapsed timer
  useEffect(() => {
    if (clockStatus !== 'clocked_in' || !activeRecord?.clock_in_time) return;
    const interval = setInterval(() => {
      const start = new Date(activeRecord.clock_in_time);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(diff % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [clockStatus, activeRecord]);

  const loadUserAndStatus = async () => {
    setLoading(true);
    try {
      const isAuthed = await base44.auth.isAuthenticated();
      if (!isAuthed) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      setUser(me);

      const statusRes = await base44.functions.invoke('clockController', { action: 'get_status' });
      setClockStatus(statusRes.data.status);
      setActiveRecord(statusRes.data.record);

      if (['admin', 'outlet_manager', 'supervisor'].includes(me?.role)) {
        loadTeamStatus();
      }
    } catch (err) {
      if (err?.message?.toLowerCase().includes('authentication') || err?.message?.toLowerCase().includes('unauthorized')) {
        base44.auth.redirectToLogin();
        return;
      }
      setClockStatus('not_clocked_in');
    }
    setLoading(false);
  };

  const loadTeamStatus = async () => {
    const res = await base44.functions.invoke('clockController', {
      action: 'get_timesheet',
      date_from: new Date().toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0]
    });
    setTeamStatus(res.data.records || []);
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }
    const res = await base44.functions.invoke('clockController', { action: 'clock_in', lat, lng });
    setClockStatus('clocked_in');
    setActiveRecord(res.data.record);
    setResult(null);
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    let lat = null, lng = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }
    const res = await base44.functions.invoke('clockController', { action: 'clock_out', lat, lng });
    setClockStatus('clocked_out');
    setResult(res.data.summary);
    setActiveRecord(null);
    setActionLoading(false);
    if (['admin', 'outlet_manager', 'supervisor'].includes(user?.role)) loadTeamStatus();
  };

  const today = format(new Date(), 'EEEE, d MMMM yyyy');

  if (loading) {
    return (
      <AppShell navigation={NAV} title="Clock In / Out">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const isManager = ['admin', 'outlet_manager', 'supervisor'].includes(user?.role);

  return (
    <AppShell navigation={NAV} title="Clock In / Out">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">

        {/* Date + Greeting */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{today}</p>
          <h2 className="text-xl font-heading font-bold text-foreground mt-1">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0]}.
          </h2>
        </div>

        {/* Clock Card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

          {/* Status Bar */}
          <div className={`px-6 py-3 flex items-center justify-between ${
            clockStatus === 'clocked_in' ? 'bg-orbitan-green/10 border-b border-green-100' :
            clockStatus === 'clocked_out' ? 'bg-muted border-b border-border' :
            'bg-muted border-b border-border'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                clockStatus === 'clocked_in' ? 'bg-orbitan-green animate-pulse' : 'bg-muted-foreground'
              }`} />
              <span className="text-sm font-medium">
                {clockStatus === 'clocked_in' ? 'Currently On Shift' :
                 clockStatus === 'clocked_out' ? 'Shift Ended' : 'Not Clocked In'}
              </span>
            </div>
            {clockStatus === 'clocked_in' && (
              <span className="font-mono text-sm font-bold text-orbitan-green">{elapsed}</span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Clock In Time */}
            {activeRecord?.clock_in_time && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LogIn className="w-4 h-4 text-orbitan-green" />
                <span>Clocked in at <strong className="text-foreground">{format(new Date(activeRecord.clock_in_time), 'h:mm a')}</strong></span>
                {activeRecord.clock_in_geo_verified && (
                  <span className="flex items-center gap-1 text-xs text-orbitan-green">
                    <MapPin className="w-3 h-3" /> GPS Verified
                  </span>
                )}
              </div>
            )}

            {/* Action Button */}
            {clockStatus === 'not_clocked_in' && (
              <Button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="w-full h-14 text-base font-semibold orbitan-gradient text-white rounded-xl gap-3 shadow-md"
              >
                <LogIn className="w-5 h-5" />
                {actionLoading ? 'Verifying...' : 'Clock In'}
              </Button>
            )}

            {clockStatus === 'clocked_in' && (
              <Button
                onClick={handleClockOut}
                disabled={actionLoading}
                variant="outline"
                className="w-full h-14 text-base font-semibold border-orbitan-red text-orbitan-red hover:bg-orbitan-red-light rounded-xl gap-3"
              >
                <LogOut className="w-5 h-5" />
                {actionLoading ? 'Processing...' : 'Clock Out'}
              </Button>
            )}

            {/* Verification Indicators */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                activeRecord?.clock_in_geo_verified ? 'bg-orbitan-green-light text-orbitan-green' : 'bg-muted text-muted-foreground'
              }`}>
                <MapPin className="w-4 h-4" />
                <span>{activeRecord?.clock_in_geo_verified ? 'Location Verified' : 'Location Pending'}</span>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                activeRecord?.clock_in_photo_verified ? 'bg-orbitan-green-light text-orbitan-green' : 'bg-muted text-muted-foreground'
              }`}>
                <Camera className="w-4 h-4" />
                <span>{activeRecord?.clock_in_photo_verified ? 'Photo Captured' : 'No Photo'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post Clock-Out Summary */}
        {result && clockStatus === 'clocked_out' && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-orbitan-green" />
              <h3 className="font-heading font-semibold">Shift Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{result.hours_worked}h</p>
                <p className="text-xs text-muted-foreground mt-1">Hours Worked</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orbitan-green">{result.productivity_score}%</p>
                <p className="text-xs text-muted-foreground mt-1">Productivity</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{result.tasks_completed}/{result.tasks_assigned}</p>
                <p className="text-xs text-muted-foreground mt-1">Tasks Done</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{result.overtime_hours}h</p>
                <p className="text-xs text-muted-foreground mt-1">Overtime</p>
              </div>
            </div>
          </div>
        )}

        {/* Team Status (Managers only) */}
        {isManager && teamStatus.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-heading font-semibold text-sm">Team Status — Today</h3>
            </div>
            <div className="divide-y divide-border">
              {teamStatus.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.employee_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.clock_in_time ? `In: ${format(new Date(rec.clock_in_time), 'h:mm a')}` : ''}
                      {rec.clock_out_time ? ` · Out: ${format(new Date(rec.clock_out_time), 'h:mm a')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {rec.productivity_score !== undefined && rec.status === 'clocked_out' && (
                      <span className="text-xs text-muted-foreground">{rec.productivity_score}%</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rec.status === 'clocked_in' ? 'bg-orbitan-green-light text-orbitan-green' :
                      rec.status === 'clocked_out' ? 'bg-muted text-muted-foreground' :
                      'bg-orbitan-amber-light text-orbitan-amber'
                    }`}>
                      {rec.status === 'clocked_in' ? 'On Shift' : rec.status === 'clocked_out' ? 'Done' : rec.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}