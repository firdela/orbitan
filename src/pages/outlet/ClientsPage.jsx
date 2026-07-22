import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
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
import { useToast } from '@/components/ui/use-toast';
import { Building2, Plus, Search, Mail, Phone, MapPin, Globe, Loader2, Pencil, Users } from 'lucide-react';

const CLIENT_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'supplier_partner', label: 'Supplier / Partner' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  name: '', client_type: 'customer', contact_person: '', contact_email: '',
  contact_phone: '', contact_position: '', address: '', website: '',
  description: '', notes: '',
};

export default function ClientsPage() {
  const { user } = useAuth();
  const { tenantId } = useOutletContext() || {};
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const companyId = user?.data?.company_id || null;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', tenantId],
    queryFn: () => base44.entities.Client.filter({ tenant_id: tenantId }, '-created_date', 200),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      toast({ title: 'Client Added' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditing(null);
      toast({ title: 'Client Updated' });
    },
  });

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clients.filter(c => c.status === 'active').length;

  const handleSubmit = () => {
    const data = {
      ...form,
      tenant_id: tenantId,
      company_id: companyId,
      status: 'active',
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      name: client.name || '', client_type: client.client_type || 'customer',
      contact_person: client.contact_person || '', contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '', contact_position: client.contact_position || '',
      address: client.address || '', website: client.website || '',
      description: client.description || '', notes: client.notes || '',
    });
    setShowForm(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title="Client Directory"
        subtitle={`${clients.length} contacts · ${activeCount} active`}
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Clients" value={clients.length} icon={Building2} color="blue" />
        <StatCard title="Active" value={activeCount} icon={Users} color="green" />
        <StatCard title="Prospective" value={clients.filter(c => c.status === 'prospective').length} icon={Building2} color="amber" />
        <StatCard title="Types" value={[...new Set(clients.map(c => c.client_type))].length} icon={Building2} color="purple" />
      </div>

      <div className="relative max-w-xs mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No clients yet" description="Add external clients and partners to manage relationships." color="blue" onAction={() => setShowForm(true)} actionLabel="Add Client" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-card border border-border rounded-xl p-5 card-elevated hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orbitan-blue-light flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-orbitan-blue" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-sm text-foreground truncate">{client.name}</h3>
                    <p className="text-[10px] text-muted-foreground capitalize">{client.client_type?.replace('_', ' ') || 'Client'}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(client)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              {client.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{client.description}</p>}
              <div className="space-y-1.5">
                {client.contact_person && (
                  <p className="text-xs flex items-center gap-1.5 text-foreground">
                    <Users className="w-3 h-3 text-muted-foreground" /> {client.contact_person}
                    {client.contact_position && <span className="text-muted-foreground">· {client.contact_position}</span>}
                  </p>
                )}
                {client.contact_email && (
                  <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="w-3 h-3" /> {client.contact_email}
                  </p>
                )}
                {client.contact_phone && (
                  <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3 h-3" /> {client.contact_phone}
                  </p>
                )}
                {client.address && (
                  <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {client.address}
                  </p>
                )}
                {client.website && (
                  <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Globe className="w-3 h-3" /> {client.website}
                  </p>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <StatusBadge status={client.status || 'active'} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block">Organisation Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Type</Label>
              <Select value={form.client_type} onValueChange={v => setForm(p => ({ ...p, client_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLIENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Contact Person</Label>
                <Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Position</Label>
                <Input value={form.contact_position} onChange={e => setForm(p => ({ ...p, contact_position: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Email</Label>
                <Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Phone</Label>
                <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Website</Label>
              <Input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Save Changes' : 'Add Client')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}