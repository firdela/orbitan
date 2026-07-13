import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import UserMenu from '@/components/shared/UserMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';
import { Plus, Truck, Star, Mail, Phone, MapPin, Clock, Edit2, Trash2, Package } from 'lucide-react';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '', contact_person: '', email: '', phone: '', address: '',
    payment_terms: 'Net 30', lead_time_days: 7, categories: [],
    is_preferred: false, is_critical_fnb: false, min_order_value: 0,
    status: 'active', notes: '',
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const resetForm = () => {
    setForm({
      name: '', contact_person: '', email: '', phone: '', address: '',
      payment_terms: 'Net 30', lead_time_days: 7, categories: [],
      is_preferred: false, is_critical_fnb: false, min_order_value: 0,
      status: 'active', notes: '',
    });
  };

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({ ...supplier });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const preferredCount = suppliers.filter(s => s.is_preferred).length;
  const criticalCount = suppliers.filter(s => s.is_critical_fnb).length;
  const avgLeadTime = suppliers.length
    ? Math.round(suppliers.reduce((acc, s) => acc + (s.lead_time_days || 0), 0) / suppliers.length)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <OrbitanLogo size="sm" showOS />
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground">
              <Truck className="w-3.5 h-3.5" />
              Supplier Management
            </div>
            <div className="w-28"><UserMenu variant="light" /></div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Suppliers</h1>
            <p className="text-sm text-muted-foreground">Manage vendor contacts, lead times, and performance ratings.</p>
          </div>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-orbitan-blue" />
              <p className="text-xs text-muted-foreground">Total Suppliers</p>
            </div>
            <p className="text-2xl font-display font-bold">{suppliers.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-orbitan-amber" />
              <p className="text-xs text-muted-foreground">Preferred</p>
            </div>
            <p className="text-2xl font-display font-bold">{preferredCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orbitan-green" />
              <p className="text-xs text-muted-foreground">Critical F&B</p>
            </div>
            <p className="text-2xl font-display font-bold">{criticalCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Avg Lead Time</p>
            </div>
            <p className="text-2xl font-display font-bold">{avgLeadTime}<span className="text-sm text-muted-foreground ml-1">days</span></p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search suppliers by name, contact, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Supplier List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading suppliers…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Truck} title="No suppliers found" description="Add your first supplier to start managing vendor relationships." action={openCreate} actionLabel="Add Supplier" />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(supplier => (
                <div key={supplier.id} className="px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${supplier.is_preferred ? 'bg-orbitan-amber-light' : 'bg-muted'}`}>
                      <Truck className={`w-5 h-5 ${supplier.is_preferred ? 'text-orbitan-amber' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                        {supplier.is_preferred && (
                          <Badge className="text-[10px] bg-orbitan-amber-light text-orbitan-amber border-amber-200 gap-0.5">
                            <Star className="w-3 h-3" /> Preferred
                          </Badge>
                        )}
                        {supplier.is_critical_fnb && (
                          <Badge className="text-[10px] bg-orbitan-green-light text-orbitan-green border-green-200">
                            Critical F&B
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] ${supplier.status === 'active' ? 'text-orbitan-green' : 'text-muted-foreground'}`}>
                          {supplier.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {supplier.contact_person && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground" /> {supplier.contact_person}
                          </span>
                        )}
                        {supplier.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {supplier.email}
                          </span>
                        )}
                        {supplier.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {supplier.phone}
                          </span>
                        )}
                        {supplier.lead_time_days != null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {supplier.lead_time_days}d lead
                          </span>
                        )}
                        {supplier.payment_terms && (
                          <span className="text-xs text-muted-foreground">{supplier.payment_terms}</span>
                        )}
                      </div>
                      {supplier.address && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {supplier.address}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(supplier)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete supplier "${supplier.name}"?`)) deleteMutation.mutate(supplier.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Supplier Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. ABC Distributors Pte Ltd" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Contact Person</Label>
              <Input value={form.contact_person || ''} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} placeholder="John Tan" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Phone</Label>
              <Input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+65 9123 4567" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Email</Label>
              <Input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="orders@abc.com" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Address</Label>
              <Input value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Industrial Ave, Singapore" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Payment Terms</Label>
              <Input value={form.payment_terms || ''} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} placeholder="Net 30" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Lead Time (days)</Label>
              <Input type="number" value={form.lead_time_days ?? 0} onChange={e => setForm(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Min Order Value (SGD)</Label>
              <Input type="number" value={form.min_order_value ?? 0} onChange={e => setForm(p => ({ ...p, min_order_value: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Status</Label>
              <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={!!form.is_preferred} onChange={e => setForm(p => ({ ...p, is_preferred: e.target.checked }))} className="rounded" />
                Preferred Supplier
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={!!form.is_critical_fnb} onChange={e => setForm(p => ({ ...p, is_critical_fnb: e.target.checked }))} className="rounded" />
                Critical F&B Supplier
              </label>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes about this supplier…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}