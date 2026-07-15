import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Mail, Phone, MapPin, Briefcase, Shield, Award, Calendar, Loader2,
  Save, Plus, X, Clock, Building2, AlertCircle, Edit3, History
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'worker', label: 'Team Member' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'outlet_manager', label: 'Outlet Manager' },
  { value: 'client_manager', label: 'Client Manager' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
];

const ROLE_STYLES = {
  tenant_admin: { label: 'Tenant Admin', cls: 'bg-orbitan-purple-light text-orbitan-purple' },
  client_manager: { label: 'Client Manager', cls: 'bg-orbitan-amber-light text-orbitan-amber' },
  outlet_manager: { label: 'Outlet Manager', cls: 'bg-orbitan-blue-light text-orbitan-blue' },
  supervisor: { label: 'Supervisor', cls: 'bg-orbitan-green-light text-orbitan-green' },
  worker: { label: 'Team Member', cls: 'bg-secondary text-muted-foreground' },
};

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfileDialog({ employee, open, onOpenChange, outlets, canEdit }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [newSkill, setNewSkill] = useState('');

  // Fetch audit history for this employee
  const { data: auditHistory = [] } = useQuery({
    queryKey: ['employee-audit', employee?.id],
    queryFn: () => base44.entities.AuditLog.filter({
      target_entity: 'Employee',
      target_record_id: employee.id,
    }, '-created_date', 20),
    enabled: !!employee?.id,
  });

  React.useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        team: employee.team || '',
        role: employee.role || 'worker',
        employment_type: employee.employment_type || 'full_time',
        status: employee.status || 'active',
        hire_date: employee.hire_date || '',
        avatar_url: employee.avatar_url || '',
        skills: employee.skills || [],
        emergency_contact: employee.emergency_contact || { name: '', phone: '', relationship: '' },
      });
      setIsEditing(false);
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const previousState = { ...employee };
      // Track role/position changes in employment_history
      let employmentHistory = [...(employee.employment_history || [])];
      const changes = [];
      if (data.role !== employee.role) {
        changes.push(`Role: ${employee.role || '—'} → ${data.role}`);
        employmentHistory.push({
          position: data.position,
          outlet_id: employee.outlet_id,
          outlet_name: outlets.find(o => o.id === employee.outlet_id)?.name || '',
          role: data.role,
          start_date: new Date().toISOString().slice(0, 10),
          change_reason: 'Role change',
        });
      }
      if (data.position !== employee.position && employee.position) {
        changes.push(`Position: ${employee.position || '—'} → ${data.position}`);
      }

      const updated = await base44.entities.Employee.update(employee.id, {
        ...data,
        employment_history: employmentHistory,
      });

      await auditFrontend({
        tenant_id: employee.tenant_id,
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action_type: ACTION_TYPES.ROLE_CHANGED,
        module: 'workforce',
        target_entity: 'Employee',
        target_record_id: employee.id,
        previous_state: previousState,
        new_state: data,
        details: `Updated staff record for ${data.full_name}${changes.length ? ': ' + changes.join(', ') : ''}.`,
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['employee-audit', employee.id] });
      setIsEditing(false);
    },
  });

  if (!employee) return null;

  const roleStyle = ROLE_STYLES[employee.role] || ROLE_STYLES.worker;
  const outlet = outlets.find(o => o.id === employee.outlet_id);

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    setForm(p => ({ ...p, skills: [...(p.skills || []), newSkill.trim()] }));
    setNewSkill('');
  };

  const handleRemoveSkill = (idx) => {
    setForm(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.full_name?.trim()) return;
    updateMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit3 className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
            {isEditing ? 'Edit Staff Member' : 'Staff Profile'}
          </DialogTitle>
        </DialogHeader>

        {/* Profile header */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="orbitan-gradient text-white text-xl font-bold">
              {getInitials(employee.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-lg truncate">{employee.full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">{employee.position || 'Staff'}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleStyle.cls}`}>
                {roleStyle.label}
              </span>
              <StatusBadge status={employee.status || 'active'} size="sm" />
            </div>
          </div>
          {canEdit && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          /* Edit mode */
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="skills">Skills & Certs</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Full Name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Position</Label>
                  <Input value={form.position} onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Department</Label>
                  <Input value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Kitchen, Operations" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Team</Label>
                  <Input value={form.team} onChange={(e) => setForm(p => ({ ...p, team: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Employment Type</Label>
                  <Select value={form.employment_type} onValueChange={(v) => setForm(p => ({ ...p, employment_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Hire Date</Label>
                  <Input type="date" value={form.hire_date} onChange={(e) => setForm(p => ({ ...p, hire_date: e.target.value }))} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill..." onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} />
                  <Button type="button" size="sm" onClick={handleAddSkill}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.skills || []).map((skill, idx) => (
                    <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                      {skill}
                      <button onClick={() => handleRemoveSkill(idx)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {(!form.skills || form.skills.length === 0) && (
                    <p className="text-xs text-muted-foreground">No skills added yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Certifications are managed through the Compliance module with expiry tracking.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Emergency Contact Name</Label>
                  <Input
                    value={form.emergency_contact?.name || ''}
                    onChange={(e) => setForm(p => ({ ...p, emergency_contact: { ...(p.emergency_contact || {}), name: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Emergency Phone</Label>
                  <Input
                    value={form.emergency_contact?.phone || ''}
                    onChange={(e) => setForm(p => ({ ...p, emergency_contact: { ...(p.emergency_contact || {}), phone: e.target.value } }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Relationship</Label>
                  <Input
                    value={form.emergency_contact?.relationship || ''}
                    onChange={(e) => setForm(p => ({ ...p, emergency_contact: { ...(p.emergency_contact || {}), relationship: e.target.value } }))}
                    placeholder="e.g. Spouse, Parent"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* View mode */
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="skills">Skills & History</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={Mail} label="Email" value={employee.email} />
                <InfoRow icon={Phone} label="Phone" value={employee.phone} />
                <InfoRow icon={Briefcase} label="Position" value={employee.position} />
                <InfoRow icon={Building2} label="Department" value={employee.department} />
                <InfoRow icon={MapPin} label="Outlet" value={outlet?.name} />
                <InfoRow icon={Shield} label="Role" value={roleStyle.label} />
                <InfoRow icon={Clock} label="Employment Type" value={employee.employment_type?.replace('_', ' ')} />
                <InfoRow icon={Calendar} label="Hire Date" value={employee.hire_date} />
              </div>
            </TabsContent>

            <TabsContent value="skills">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2">Skills</h4>
                  {(employee.skills && employee.skills.length > 0) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {employee.skills.map((skill, idx) => (
                        <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No skills recorded.</p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Employment History
                  </h4>
                  {(employee.employment_history && employee.employment_history.length > 0) ? (
                    <div className="space-y-2">
                      {employee.employment_history.map((h, idx) => (
                        <div key={idx} className="text-xs border-l-2 border-primary/30 pl-3 py-1">
                          <p className="font-medium text-foreground">{h.position || h.role || '—'}</p>
                          {h.outlet_name && <p className="text-muted-foreground">{h.outlet_name}</p>}
                          <p className="text-muted-foreground">{h.start_date}{h.end_date ? ` → ${h.end_date}` : ' → Present'}</p>
                          {h.change_reason && <p className="text-[10px] text-muted-foreground italic">{h.change_reason}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No history recorded yet.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="audit">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditHistory.length > 0 ? (
                  auditHistory.map(log => (
                    <div key={log.id} className="text-xs border border-border/60 rounded-lg p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{log.action_type?.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {log.created_date ? new Date(log.created_date).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{log.details || 'No details recorded.'}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">By {log.actor_name || 'Unknown'} ({log.actor_role || '—'})</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No audit history yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {isEditing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || !form.full_name?.trim()} className="gap-1.5">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}