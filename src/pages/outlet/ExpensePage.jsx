import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import { Receipt, Plus, DollarSign, TrendingDown, Loader2, Paperclip, CheckCircle2, XCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'transport', label: 'Transport' },
  { value: 'meals', label: 'Meals' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'misc', label: 'Miscellaneous' },
];

export default function ExpensePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [form, setForm] = useState({
    description: '', amount: '', category: 'misc', department: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'), vendor: '', notes: '',
  });
  const [uploading, setUploading] = useState(false);

  const tenantId = user?.data?.tenant_id || user?.tenant_id;
  const outletId = user?.data?.outlet_id || user?.outlet_id;
  const isManager = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'].includes(user?.role);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', tenantId],
    queryFn: () => base44.entities.ExpenseRecord.list('-expense_date', 200),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExpenseRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowForm(false);
      setForm({ description: '', amount: '', category: 'misc', department: '', expense_date: format(new Date(), 'yyyy-MM-dd'), vendor: '', notes: '' });
      toast({ title: 'Expense Logged', description: 'Your expense has been recorded.' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.ExpenseRecord.update(id, {
      status: approved ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_by_name: user.full_name,
      approved_date: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: 'Expense Updated' });
    },
  });

  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(filterMonth));
  const totalMonth = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;

  const byCategory = useMemo(() => {
    const map = {};
    monthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const byDepartment = useMemo(() => {
    const map = {};
    monthExpenses.forEach(e => {
      const dept = e.department || 'Unassigned';
      map[dept] = (map[dept] || 0) + (e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const handleUpload = async (file) => {
    if (!file) return null;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      return res.file_url;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    const data = {
      tenant_id: tenantId,
      outlet_id: outletId,
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      category: form.category,
      department: form.department,
      expense_date: form.expense_date,
      vendor: form.vendor,
      notes: form.notes,
      status: 'pending',
      created_by_id: user.id,
      created_by_name: user.full_name,
    };

    auditFrontend({
      tenant_id: tenantId,
      outlet_id: outletId,
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: user.role,
      action_type: ACTION_TYPES.EXPENSE_LOGGED,
      module: 'finance',
      target_entity: 'ExpenseRecord',
      target_record_id: 'pending',
      new_state: data,
      details: `Expense logged: ${form.description} — S$${form.amount} (${form.category})`,
    });

    createMutation.mutate(data);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Expense Tracking"
        subtitle={`${expenses.length} records · S$${totalMonth.toLocaleString()} this month`}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Log Expense
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="This Month" value={`S$${totalMonth.toLocaleString()}`} subtitle={format(new Date(filterMonth + '-01'), 'MMMM')} icon={DollarSign} color="blue" />
        <StatCard title="Pending Approval" value={pendingCount} subtitle="Awaiting review" icon={TrendingDown} color="amber" />
        <StatCard title="Categories" value={byCategory.length} subtitle="Active this month" icon={Receipt} color="purple" />
        <StatCard title="Departments" value={byDepartment.length} subtitle="Cost centres" icon={Receipt} color="green" />
      </div>

      <Tabs defaultValue="records">
        <TabsList className="mb-5">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <div className="flex items-center gap-3 mb-4">
            <Label className="text-xs">Month:</Label>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : monthExpenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No expenses this month" description="Log operational costs to track spending." color="blue" onAction={() => setShowForm(true)} actionLabel="Log Expense" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden card-elevated">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Dept</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Amount</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      {isManager && <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground w-20">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{exp.expense_date}</td>
                        <td className="px-4 py-3 font-medium">{exp.description}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">{exp.category?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{exp.department || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">S${exp.amount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={exp.status} /></td>
                        {isManager && exp.status === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-orbitan-green" onClick={() => approveMutation.mutate({ id: exp.id, approved: true })}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-orbitan-red" onClick={() => approveMutation.mutate({ id: exp.id, approved: false })}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                        {isManager && exp.status !== 'pending' && <td className="px-4 py-3"></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Spending by Category</h3>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data for this month.</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map(([cat, amt]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium capitalize">{cat?.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">S${amt.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(amt / totalMonth) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-heading font-semibold text-sm mb-4">Spending by Department</h3>
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data for this month.</p>
              ) : (
                <div className="space-y-3">
                  {byDepartment.map(([dept, amt]) => (
                    <div key={dept}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{dept}</span>
                        <span className="text-muted-foreground">S${amt.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-orbitan-green" style={{ width: `${(amt / totalMonth) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What was this expense for?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Amount (S$)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date</Label>
                <Input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Department</Label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Kitchen" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Vendor / Payee</Label>
              <Input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} placeholder="Who was paid?" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Receipt</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer border border-dashed border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Attach receipt'}
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={async (e) => {
                    const url = await handleUpload(e.target.files?.[0]);
                    if (url) { setForm(p => ({ ...p, notes: (p.notes || '') + '\nReceipt: ' + url })); toast({ title: 'Receipt attached' }); }
                  }} />
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional context..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.description || !form.amount || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}