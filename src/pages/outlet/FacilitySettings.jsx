import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Save, Loader2, Lock } from 'lucide-react';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';
import OperatingHoursSection from '@/components/facility/OperatingHoursSection';
import HolidayScheduleSection from '@/components/facility/HolidayScheduleSection';
import ContactLocationSection from '@/components/facility/ContactLocationSection';
import FacilityPreferencesSection from '@/components/facility/FacilityPreferencesSection';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const defaultWeeklyHours = () => {
  const h = {};
  for (let d = 0; d < 7; d++) h[d] = { open: '09:00', close: '17:00', is_closed: d === 0 };
  return h;
};

export default function FacilitySettings() {
  const { user } = useAuth();
  const { tenantId } = useOutletContext() || {};
  const queryClient = useQueryClient();
  const userOutletId = user?.outlet_id || user?.data?.outlet_id;
  const canEdit = ['admin', 'tenant_admin', 'outlet_manager'].includes(user?.role);

  const { data: outlets = [], isLoading } = useQuery({
    queryKey: ['facility-outlets', tenantId],
    queryFn: () => base44.entities.Outlet.filter({ tenant_id: tenantId }, '-created_date', 100),
    enabled: !!tenantId,
  });

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!selectedId && outlets.length) setSelectedId(userOutletId || outlets[0].id);
  }, [outlets, selectedId, userOutletId]);

  const outlet = outlets.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    if (!outlet) return;
    setDraft({
      weekly_hours: outlet.weekly_hours || defaultWeeklyHours(),
      holidays: outlet.holidays || [],
      address: outlet.address || '',
      contact_person: outlet.contact_person || '',
      contact_phone: outlet.contact_phone || '',
      latitude: outlet.latitude ?? null,
      longitude: outlet.longitude ?? null,
      timezone: outlet.timezone || 'Asia/Singapore',
      facility_settings: outlet.facility_settings || {},
    });
  }, [outlet?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const business_days = DAY_ORDER.filter((d) => !draft.weekly_hours[d]?.is_closed);
      const payload = { ...draft, business_days };
      const updated = await base44.entities.Outlet.update(outlet.id, payload);
      await auditFrontend({
        tenant_id: tenantId,
        outlet_id: outlet.id,
        actor_id: user?.id,
        actor_name: user?.full_name,
        actor_role: user?.role,
        action_type: ACTION_TYPES.SETTINGS_UPDATED,
        module: 'system',
        target_entity: 'Outlet',
        target_record_id: outlet.id,
        new_state: payload,
        details: `Facility settings updated for ${outlet.name} (operating hours, holidays, contact, location, preferences)`,
      });
      return updated;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facility-outlets'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading facilities...
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
        <PageHeader title="Facility Settings" subtitle="Configure operating hours, holidays, and facility preferences" />
        <EmptyState icon={Building2} title="No facilities configured"
          description="Facilities are created during organisation onboarding. Ask your tenant admin to add an outlet." color="blue" />
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-3xl">
      <PageHeader
        title="Facility Settings"
        subtitle="Operating hours, holidays, contact, location & preferences"
        actions={
          outlets.length > 1 ? (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select facility" /></SelectTrigger>
              <SelectContent>
                {outlets.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {!canEdit && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" /> Read-only view — only managers and admins can edit facility settings.
        </div>
      )}

      <div className="space-y-5">
        <OperatingHoursSection weeklyHours={draft.weekly_hours}
          onChange={(v) => setDraft({ ...draft, weekly_hours: v })} disabled={!canEdit} />
        <HolidayScheduleSection holidays={draft.holidays}
          onChange={(v) => setDraft({ ...draft, holidays: v })} disabled={!canEdit} />
        <ContactLocationSection value={draft}
          onChange={(v) => setDraft({ ...draft, ...v })} disabled={!canEdit} />
        <FacilityPreferencesSection timezone={draft.timezone} facilitySettings={draft.facility_settings}
          onTimezone={(v) => setDraft({ ...draft, timezone: v })}
          onSettings={(v) => setDraft({ ...draft, facility_settings: v })} disabled={!canEdit} />

        {canEdit && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Facility Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}