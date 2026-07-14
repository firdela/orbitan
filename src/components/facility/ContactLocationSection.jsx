import React from 'react';
import { MapPin, Phone, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactLocationSection({ value, onChange, disabled }) {
  const set = (k, v) => onChange({ ...value, [k]: v });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="w-4 h-4 text-primary" /> Contact & Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs mb-1 block">Street Address</Label>
          <Input value={value.address || ''} disabled={disabled}
            onChange={(e) => set('address', e.target.value)}
            placeholder="e.g. 730 North Bridge Road, Floor 1, Singapore 198698" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block flex items-center gap-1.5"><User className="w-3 h-3" /> Contact Person</Label>
            <Input value={value.contact_person || ''} disabled={disabled}
              onChange={(e) => set('contact_person', e.target.value)} placeholder="Facility manager" />
          </div>
          <div>
            <Label className="text-xs mb-1 block flex items-center gap-1.5"><Phone className="w-3 h-3" /> Contact Phone</Label>
            <Input value={value.contact_phone || ''} disabled={disabled}
              onChange={(e) => set('contact_phone', e.target.value)} placeholder="+65 9123 4567" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Latitude</Label>
            <Input type="number" step="any" value={value.latitude ?? ''} disabled={disabled}
              onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))} placeholder="1.3521" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Longitude</Label>
            <Input type="number" step="any" value={value.longitude ?? ''} disabled={disabled}
              onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))} placeholder="103.8198" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}