// ============================================================
// AccountMappingManager — per-tenant Xero chart-of-accounts mapping (Part E)
// CRUD on AccountMapping. Validation before auto-sync.
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

const CATEGORY_TYPES = ['revenue', 'cogs', 'expense', 'labour', 'asset'];
const XERO_ACCOUNT_TYPES = ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS', 'CURRENT', 'FIXED'];

const TEMPLATE_MAPPINGS = [
  { category_name: 'Food Revenue', category_type: 'revenue', xero_account_type: 'REVENUE' },
  { category_name: 'Service Charge', category_type: 'revenue', xero_account_type: 'REVENUE' },
  { category_name: 'Discounts Given', category_type: 'revenue', xero_account_type: 'REVENUE' },
  { category_name: 'Cost of Goods Sold', category_type: 'cogs', xero_account_type: 'DIRECTCOSTS' },
  { category_name: 'Inventory Asset', category_type: 'asset', xero_account_type: 'CURRENT' },
  { category_name: 'Inventory Adjustment', category_type: 'expense', xero_account_type: 'EXPENSE' },
  { category_name: 'Waste / Write-Off', category_type: 'expense', xero_account_type: 'EXPENSE' },
  { category_name: 'Purchases', category_type: 'expense', xero_account_type: 'EXPENSE' },
  { category_name: 'Accounts Payable', category_type: 'asset', xero_account_type: 'CURRENT' },
  { category_name: 'Operating Expenses', category_type: 'expense', xero_account_type: 'OVERHEADS' },
  { category_name: 'Payroll Expense', category_type: 'labour', xero_account_type: 'EXPENSE' },
  { category_name: 'Tax / GST', category_type: 'expense', xero_account_type: 'CURRENT' },
  { category_name: 'Production Adjustment', category_type: 'expense', xero_account_type: 'DIRECTCOSTS' },
];

export default function AccountMappingManager({ tenantId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category_name: '', category_type: 'revenue', xero_account_code: '', xero_account_name: '', xero_account_type: 'REVENUE', tax_type: 'NONE', tax_rate_pct: 0, is_default: false, is_active: true, notes: '' });

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['account-mappings', tenantId],
    queryFn: () => base44.entities.AccountMapping.filter({ tenant_id: tenantId }, '-created_date', 100),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities.AccountMapping.update(id, data) : base44.entities.AccountMapping.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['account-mappings', tenantId] }); setShowForm(false); setEditing(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AccountMapping.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account-mappings', tenantId] }),
  });

  const openEdit = (m) => { setEditing(m); setForm({ ...m }); setShowForm(true); };
  const openCreate = () => { setEditing(null); setForm({ category_name: '', category_type: 'revenue', xero_account_code: '', xero_account_name: '', xero_account_type: 'REVENUE', tax_type: 'NONE', tax_rate_pct: 0, is_default: false, is_active: true, notes: '' }); setShowForm(true); };

  const loadTemplate = () => {
    // Bulk-create template mappings that don't already exist.
    const existing = new Set(mappings.map(m => m.category_name));
    const toCreate = TEMPLATE_MAPPINGS.filter(t => !existing.has(t.category_name));
    Promise.all(toCreate.map(t => base44.entities.AccountMapping.create({ tenant_id: tenantId, ...t, is_active: true })))
      .then(() => queryClient.invalidateQueries({ queryKey: ['account-mappings', tenantId] }));
  };

  const valid = form.category_name && form.xero_account_code;
  const unmappedCount = mappings.filter(m => !m.xero_account_code).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-heading font-semibold text-sm">Account Mapping</h3>
          <p className="text-xs text-muted-foreground">{mappings.length} mappings · {unmappedCount} incomplete</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={loadTemplate}>Load Template</Button>
          <Button size="sm" className="text-xs gap-1" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Add Mapping</Button>
        </div>
      </div>
      {unmappedCount > 0 && (
        <div className="bg-orbitan-amber-light border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 mb-3">
          {unmappedCount} mapping(s) have no Xero account code — automatic sync is blocked until all mappings are complete.
        </div>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : mappings.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">No mappings yet. Load the template to start, then add your Xero account codes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Xero Code</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Xero Account</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{m.category_name}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{m.category_type}</td>
                  <td className="px-3 py-2 tabular-nums">{m.xero_account_code || <span className="text-orbitan-amber">—</span>}</td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{m.xero_account_name || '—'}</td>
                  <td className="px-3 py-2 text-center">{m.xero_account_code ? <CheckCircle2 className="w-3.5 h-3.5 inline text-orbitan-green" /> : <span className="text-[10px] text-orbitan-amber">incomplete</span>}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(`Delete mapping "${m.category_name}"?`)) deleteMutation.mutate(m.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Mapping' : 'Add Mapping'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label className="text-xs mb-1 block">Category Name *</Label><Input value={form.category_name || ''} onChange={e => setForm(p => ({ ...p, category_name: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">Category Type</Label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.category_type || 'revenue'} onChange={e => setForm(p => ({ ...p, category_type: e.target.value }))}>
                {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label className="text-xs mb-1 block">Xero Account Type</Label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.xero_account_type || 'REVENUE'} onChange={e => setForm(p => ({ ...p, xero_account_type: e.target.value }))}>
                {XERO_ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label className="text-xs mb-1 block">Xero Account Code *</Label><Input value={form.xero_account_code || ''} onChange={e => setForm(p => ({ ...p, xero_account_code: e.target.value }))} placeholder="e.g. 400" /></div>
            <div><Label className="text-xs mb-1 block">Xero Account Name</Label><Input value={form.xero_account_name || ''} onChange={e => setForm(p => ({ ...p, xero_account_name: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">Tax Type</Label><Input value={form.tax_type || 'NONE'} onChange={e => setForm(p => ({ ...p, tax_type: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">Tax Rate %</Label><Input type="number" value={form.tax_rate_pct ?? 0} onChange={e => setForm(p => ({ ...p, tax_rate_pct: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({ id: editing?.id, data: { ...form, tenant_id: tenantId } })} disabled={!valid || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}