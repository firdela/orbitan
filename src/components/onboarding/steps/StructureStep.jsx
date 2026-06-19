import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Tag, MapPin, Home, ArrowDown } from 'lucide-react';

// Standard Organisational Architecture:
// Tenant / Company → Brand → Outlet
export default function StructureStep({ data, update }) {
  const t = data.tenant || {};
  const s = data.structure || {};

  const setTenant = (patch) => update({ tenant: { ...t, ...patch } });
  const setStructure = (patch) => update({ structure: { ...s, ...patch } });

  const fieldRow = (icon, level, color, children) =>
  <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          {React.createElement(icon, { className: 'w-3.5 h-3.5', style: { color } })}
        </div>
        <span className="text-[10px] tracking-[0.15em] uppercase font-bold" style={{ color }}>{level}</span>
      </div>
      <div className="pl-8 space-y-3">{children}</div>
    </div>;


  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">Set up your organisation</h2>
        <p className="text-slate-400 text-sm">
          Every OrbitanOS workspace follows one architecture — Company → Brand → Outlet — so you can scale without redesigning later.
        </p>
      </div>

      <div className="space-y-5">
        {fieldRow(Building2, 'Company / Tenant', '#2563EB',
        <>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Organisation name *</Label>
              <Input
              value={t.name || ''}
              onChange={(e) => setTenant({ name: e.target.value })}
              placeholder="e.g. Acme Pte Ltd"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Legal name</Label>
                <Input
                value={t.legal_name || ''}
                onChange={(e) => setTenant({ legal_name: e.target.value })}
                placeholder="Registered entity name"
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

              </div>
              <div>
                <Label className="text-slate-400 text-xs mb-1.5 block">Contact email</Label>
                <Input
                value={t.contact_email || ''}
                onChange={(e) => setTenant({ contact_email: e.target.value })}
                placeholder="ops@company.com"
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

              </div>
            </div>
          </>
        )}

        <div className="pl-2"><ArrowDown className="w-4 h-4 text-slate-700" /></div>

        {fieldRow(Tag, 'Brand', '#7C3AED',
        <div>
            <Label className="text-slate-400 text-xs mb-1.5 block">Brand name</Label>
            <Input
            value={s.brand_name || ''}
            onChange={(e) => setStructure({ brand_name: e.target.value })}
            placeholder="Defaults to your company name"
            className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

          </div>
        )}

        <div className="pl-2"><ArrowDown className="w-4 h-4 text-slate-700" /></div>

        {fieldRow(MapPin, 'Outlet', '#F97316',
        <>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Outlet name</Label>
              <Input
              value={s.outlet_name || ''}
              onChange={(e) => setStructure({ outlet_name: e.target.value })}
              placeholder="e.g. Main Branch"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

            </div>
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 block">Address</Label>
              <Input
              value={s.outlet_address || ''}
              onChange={(e) => setStructure({ outlet_address: e.target.value })}
              placeholder="Street, city, postal code"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-slate-600" />

            </div>
            <button
            onClick={() => setStructure({ is_virtual: !s.is_virtual })}
            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors ${
            s.is_virtual ?
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
            'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-white'}`
            }>

              <Home className="w-3.5 h-3.5" />
              Home-based / virtual operation (no physical premises)
            </button>
          </>
        )}
      </div>
    </div>);

}