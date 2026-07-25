// Data Migration Page — tabbed bulk importer for the active tenant (Build #17).
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import GuidedMigration from '@/components/onboarding/GuidedMigration';
import { Loader2, Upload, Package, Truck, ChefHat, Users, UserCircle } from 'lucide-react';

const TABS = [
  { key: 'InventoryItem', label: 'Inventory', icon: Package },
  { key: 'Supplier', label: 'Suppliers', icon: Truck },
  { key: 'Recipe', label: 'Recipes / Menu', icon: ChefHat },
  { key: 'Employee', label: 'Employees', icon: Users },
  { key: 'CustomerProfile', label: 'Customers', icon: UserCircle },
];

export default function DataMigrationPage() {
  const { tenantId } = useParams();
  const [activeTab, setActiveTab] = useState('InventoryItem');
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.Outlet.filter({ tenant_id: tenantId });
        setOutlets(list || []);
        if (list && list.length > 0) setOutletId(list[0].id);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [tenantId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <PageHeader title="Data Migration" subtitle="Bulk-import your existing data into OrbitanOS — CSV or Excel, with validation, duplicate detection, and rollback." />

      {/* Outlet selector (required for inventory) */}
      {outlets.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-xs font-medium block mb-1.5">Target Outlet <span className="text-muted-foreground">(required for inventory)</span></label>
          <select value={outletId || ''} onChange={e => setOutletId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${activeTab === key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Active importer */}
      <GuidedMigration key={activeTab} entityName={activeTab} tenantId={tenantId} outletId={outletId} />

      <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1"><Upload className="w-3 h-3" /> CSV imports are parsed deterministically. Excel uses the AI extraction integration. Max 500 rows per import.</p>
    </div>
  );
}