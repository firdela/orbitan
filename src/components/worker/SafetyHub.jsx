// ============================================================
// SafetyHub — Expanded Worker Safety screen
// Industry-aware, role-aware safety modules.
// ============================================================
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import FoodSafetyLogWidget from '@/components/worker/FoodSafetyLogWidget';
import SafetyReportDialog from '@/components/worker/SafetyReportDialog';
import { getVisibleSafetyModules, isSafetyModuleVisible } from '@/lib/worker/safety-config';
import {
  Shield, AlertTriangle, Siren, FileText, GraduationCap,
  ChevronRight, Plus, CheckCircle2, Clock, XCircle, Award,
  Utensils
} from 'lucide-react';

const STATUS_CONFIG = {
  submitted:          { label: 'Submitted', icon: Clock, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
  acknowledged:       { label: 'Acknowledged', icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950' },
  under_investigation:{ label: 'Under Investigation', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950' },
  action_taken:       { label: 'Action Taken', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  resolved:           { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  closed:             { label: 'Closed', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
};

const REPORT_TYPE_LABELS = {
  hazard: 'Hazard', incident: 'Incident', near_miss: 'Near Miss',
  injury: 'Injury', equipment_issue: 'Equipment', food_safety_issue: 'Food Safety', other: 'Other',
};

export default function SafetyHub({
  employee,
  tenantId,
  outletId,
  workerId,
  workerName,
  industry = 'food_beverage',
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const [defaultReportType, setDefaultReportType] = useState('hazard');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const role = employee?.role || 'worker';
  const visibleModules = useMemo(() => getVisibleSafetyModules({ industry, role }), [industry, role]);
  const showFoodSafety = isSafetyModuleVisible('food_safety_log', { industry, role });

  // ── Safety reports query (worker's own) ──
  const { data: myReports = [] } = useQuery({
    queryKey: ['worker-safety-reports', tenantId, workerId],
    queryFn: async () => {
      if (!tenantId || !workerId) return [];
      const reports = await base44.entities.SafetyReport.filter(
        { tenant_id: tenantId, reported_by_id: workerId },
        '-created_date',
        20
      );
      return reports || [];
    },
    enabled: !!tenantId && !!workerId,
    staleTime: 60 * 1000,
  });

  // ── Compliance records for overview ──
  const { data: complianceRecords = [] } = useQuery({
    queryKey: ['worker-safety-compliance', tenantId, outletId],
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

  // ── Safety overview stats ──
  const now = new Date();
  const pendingCompliance = complianceRecords.filter(r => r.status === 'pending');
  const overdueCompliance = complianceRecords.filter(r => r.status === 'overdue' || (r.due_date && new Date(r.due_date) < now && r.status !== 'approved'));
  const completedCompliance = complianceRecords.filter(r => r.status === 'approved');
  const requiredActions = pendingCompliance.length + overdueCompliance.length + myReports.filter(r => r.status === 'submitted').length;

  // ── Certifications from Employee ──
  const certifications = employee?.certifications || [];
  const upcomingExpiries = certifications.filter(c => {
    if (!c.expiry_date) return false;
    const daysUntil = (new Date(c.expiry_date) - now) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 90;
  });

  // ── Submit safety report ──
  const handleSaveReport = async (data) => {
    try {
      await base44.entities.SafetyReport.create({
        ...data,
        tenant_id: tenantId,
        outlet_id: outletId,
        reported_by_id: workerId,
        reported_by_name: workerName,
        reported_by_role: role,
      });
      toast({
        title: '✓ Report Submitted',
        description: 'Your safety report has been submitted. You can track its status in My Safety Reports.',
      });
      queryClient.invalidateQueries({ queryKey: ['worker-safety-reports', tenantId, workerId] });
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openReport = (type = 'hazard') => {
    setDefaultReportType(type);
    setReportOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-bold text-lg text-foreground">Safety Hub</h2>
        <p className="text-xs text-muted-foreground">Orbitan Shield™ · Regulate Principle</p>
      </div>

      {/* Safety Overview */}
      <SafetyOverview
        requiredActions={requiredActions}
        overdueCount={overdueCompliance.length}
        completedCount={completedCompliance.length}
        upcomingExpiries={upcomingExpiries.length}
        hasCertifications={certifications.length > 0}
      />

      {/* Quick Report Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => openReport('hazard')}
          className="flex flex-col items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 hover:opacity-80 transition-opacity min-h-[80px]">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Report Hazard</span>
        </button>
        <button onClick={() => openReport('incident')}
          className="flex flex-col items-center gap-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-3.5 hover:opacity-80 transition-opacity min-h-[80px]">
          <Siren className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-xs font-bold text-red-700 dark:text-red-300">Report Incident</span>
        </button>
        <button onClick={() => openReport('near_miss')}
          className="flex flex-col items-center gap-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-3.5 hover:opacity-80 transition-opacity min-h-[80px]">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Near Miss</span>
        </button>
        <button onClick={() => openReport('other')}
          className="flex flex-col items-center gap-1.5 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 hover:opacity-80 transition-opacity min-h-[80px]">
          <Plus className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Other Concern</span>
        </button>
      </div>

      {/* Food Safety Log (F&B only) */}
      {showFoodSafety && (
        <FoodSafetyLogWidget
          employeeId={workerId}
          employeeName={workerName}
          tenantId={tenantId}
          outletId={outletId}
        />
      )}

      {/* My Safety Reports */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-orbitan-blue" /> My Safety Reports
          </h3>
          <span className="text-xs text-muted-foreground">{myReports.length} total</span>
        </div>
        <div className="divide-y divide-border">
          {myReports.length === 0 && (
            <div className="px-5 py-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">No reports submitted</p>
              <p className="text-xs text-muted-foreground mt-1">Your safety reports will appear here.</p>
            </div>
          )}
          {myReports.map(report => {
            const statusConf = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
            const StatusIcon = statusConf.icon;
            return (
              <div key={report.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${statusConf.bg} ${statusConf.color} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{report.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    {report.resolution_summary && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{report.resolution_summary}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Training & Certifications */}
      {certifications.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-orbitan-green" /> My Certifications
            </h3>
          </div>
          <div className="divide-y divide-border">
            {certifications.map((cert, i) => {
              const isExpiringSoon = cert.expiry_date && (() => {
                const days = (new Date(cert.expiry_date) - now) / (1000 * 60 * 60 * 24);
                return days >= 0 && days <= 90;
              })();
              const isExpired = cert.expiry_date && new Date(cert.expiry_date) < now;
              return (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isExpired ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' :
                    isExpiringSoon ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isExpired ? <XCircle className="w-4 h-4" /> : isExpiringSoon ? <Clock className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{cert.name}</p>
                    {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                  </div>
                  {cert.expiry_date && (
                    <span className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {isExpired ? 'Expired' : `Exp ${new Date(cert.expiry_date).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance Centre Link */}
      <Link to={tenantId ? `/workspace/${tenantId}/compliance` : '/workspace'}
        className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 hover:border-primary/30 transition-all group">
        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Compliance Centre</p>
          <p className="text-xs text-muted-foreground">View all audits & requirements</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Safety Report Dialog */}
      <SafetyReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSave={handleSaveReport}
        defaultType={defaultReportType}
      />
    </div>
  );
}

// ─── Safety Overview Component ─────────────────────────────
function SafetyOverview({ requiredActions, overdueCount, completedCount, upcomingExpiries, hasCertifications }) {
  const hasActions = requiredActions > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-orbitan-purple" />
        <h3 className="font-heading font-semibold text-sm">Safety Overview</h3>
      </div>

      {hasActions ? (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
            {requiredActions} action{requiredActions !== 1 ? 's' : ''} required
          </p>
          {overdueCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {overdueCount} overdue compliance item{overdueCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">No safety actions required</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Required" value={requiredActions} variant={requiredActions > 0 ? 'warning' : 'muted'} />
        <StatBox label="Completed" value={completedCount} variant="success" />
        <StatBox label="Expiring" value={upcomingExpiries} variant={upcomingExpiries > 0 ? 'warning' : 'muted'} />
      </div>
    </div>
  );
}

function StatBox({ label, value, variant }) {
  const variants = {
    muted: 'bg-muted text-muted-foreground',
    warning: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <div className={`rounded-xl p-2.5 text-center ${variants[variant] || variants.muted}`}>
      <p className="text-lg font-bold font-display">{value}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  );
}