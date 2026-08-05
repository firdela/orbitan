// ============================================================
// ORBITANOS — Admin Inquiry Queue (Build #28.2I)
// Platform admin view for reviewing public inquiry submissions.
// Admin-only access. Filter by type, status, search.
// ============================================================

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import BackBar from '@/components/shared/BackBar';
import { INQUIRY_TYPES } from '@/lib/inquiry-types';
import { Search, Mail, Building2, Globe, Clock, CheckCircle2, X } from 'lucide-react';

const STATUS_OPTIONS = ['new', 'acknowledged', 'reviewing', 'contacted', 'qualified', 'pilot_candidate', 'waitlisted', 'declined', 'converted', 'closed'];

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-cyan-100 text-cyan-700',
  reviewing: 'bg-amber-100 text-amber-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  pilot_candidate: 'bg-green-100 text-green-800',
  waitlisted: 'bg-slate-100 text-slate-700',
  declined: 'bg-red-100 text-red-700',
  converted: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-500',
};

export default function InquiryQueue() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [updating, setUpdating] = useState(false);

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['public-inquiries'],
    queryFn: () => base44.entities.PublicInquiry.list('-created_date', 200),
  });

  const filtered = useMemo(() => {
    return inquiries.filter(inq => {
      if (typeFilter !== 'all' && inq.inquiry_type !== typeFilter) return false;
      if (statusFilter !== 'all' && inq.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          inq.full_name?.toLowerCase().includes(q) ||
          inq.work_email?.toLowerCase().includes(q) ||
          inq.organisation_name?.toLowerCase().includes(q) ||
          inq.reference_code?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inquiries, search, typeFilter, statusFilter]);

  const selected = inquiries.find(i => i.id === selectedId);

  const updateStatus = async (newStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      await base44.entities.PublicInquiry.update(selected.id, {
        status: newStatus,
        ...(newStatus === 'contacted' && !selected.contacted_date ? { contacted_date: new Date().toISOString() } : {}),
        ...(newStatus === 'closed' && !selected.closed_date ? { closed_date: new Date().toISOString() } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ['public-inquiries'] });
    } catch (err) {
      console.error('Failed to update inquiry status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <BackBar to="/leader-org" label="Platform Console" />
      <PageHeader
        title="Inquiry Queue"
        description="Review and manage public commercial inquiry submissions."
        icon={Mail}
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, email, organisation..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Inquiry Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(INQUIRY_TYPES).map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {isLoading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Loading inquiries...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No inquiries found.</CardContent></Card>
          ) : (
            filtered.map(inq => (
              <Card
                key={inq.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedId === inq.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedId(inq.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{inq.full_name}</span>
                        <Badge variant="outline" className="text-[9px]">{inq.reference_code}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{inq.organisation_name} · {inq.work_email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`text-[9px] ${STATUS_COLORS[inq.status] || ''}`}>{inq.status.replace(/_/g, ' ')}</Badge>
                        <span className="text-[10px] text-muted-foreground">{INQUIRY_TYPES[inq.inquiry_type]?.label || inq.inquiry_type}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {inq.created_date && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(inq.created_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selected ? (
            <Card className="sticky top-4">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base">Inquiry Details</CardTitle>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="font-mono font-bold text-primary">{selected.reference_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{selected.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a href={`mailto:${selected.work_email}`} className="text-primary underline text-xs">{selected.work_email}</a>
                </div>
                {selected.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-xs">{selected.phone}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs">{selected.organisation_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs">{selected.country}</p>
                </div>
                {selected.organisation_size && (
                  <div><p className="text-xs text-muted-foreground">Org Size</p><p className="text-xs">{selected.organisation_size}</p></div>
                )}
                {selected.industry && (
                  <div><p className="text-xs text-muted-foreground">Industry</p><p className="text-xs">{selected.industry}</p></div>
                )}
                {selected.use_case && (
                  <div>
                    <p className="text-xs text-muted-foreground">Use Case</p>
                    <p className="text-xs leading-relaxed">{selected.use_case}</p>
                  </div>
                )}
                {selected.modules_of_interest?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Modules</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selected.modules_of_interest.map(m => (
                        <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selected.integration_requirements && (
                  <div><p className="text-xs text-muted-foreground">Integrations</p><p className="text-xs">{selected.integration_requirements}</p></div>
                )}
                {selected.security_requirements && (
                  <div><p className="text-xs text-muted-foreground">Security</p><p className="text-xs">{selected.security_requirements}</p></div>
                )}
                {selected.desired_timeframe && (
                  <div><p className="text-xs text-muted-foreground">Timeframe</p><p className="text-xs">{selected.desired_timeframe}</p></div>
                )}
                {selected.source_cta && (
                  <div><p className="text-xs text-muted-foreground">Source CTA</p><p className="text-xs">{selected.source_cta}</p></div>
                )}

                {/* Status Update */}
                <div className="pt-3 border-t">
                  <Label className="text-xs">Update Status</Label>
                  <Select value={selected.status} onValueChange={updateStatus} disabled={updating}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                <Mail className="w-8 h-8 mx-auto mb-3 opacity-30" />
                Select an inquiry to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}