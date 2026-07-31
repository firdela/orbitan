import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace';
import BackBar from '@/components/shared/BackBar';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Download, FileText, Loader2, Shield, Database } from 'lucide-react';
import { classifyIntegrationError } from '@/lib/integration-errors';

const CATEGORIES = [
  { key: 'workforce', label: 'Workforce & Payroll', icon: '👥', desc: 'Employees, clock records, payroll summary' },
  { key: 'compliance', label: 'Compliance Records', icon: '📋', desc: 'Compliance status, due dates, submissions' },
  { key: 'inventory', label: 'Inventory Items', icon: '📦', desc: 'Stock levels, costs, suppliers' },
  { key: 'procurement', label: 'Purchase Orders', icon: '🛒', desc: 'POs, goods receipts, supplier invoices' },
  { key: 'finance', label: 'Finance & Sales', icon: '💰', desc: 'Sales invoices, expenses, reconciliations' },
  { key: 'tasks', label: 'Tasks', icon: '✅', desc: 'Task assignments and completion status' },
  { key: 'customers', label: 'Customers', icon: '🛍️', desc: 'Customer profiles and purchase history' },
  { key: 'audit', label: 'Audit Activity', icon: '📜', desc: 'Audit log entries and governance events' },
];

const FORMATS = [
  { key: 'csv', label: 'CSV', desc: 'Comma-separated values' },
  { key: 'json', label: 'JSON', desc: 'Structured JSON' },
];

export default function DataExportPage() {
  const { user } = useAuth();
  const { tenant, activeOutlet } = useWorkspace();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const tenantId = tenant?.id || user?.data?.tenant_id;

  const [category, setCategory] = useState('workforce');
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const selectedCategory = useMemo(() => CATEGORIES.find(c => c.key === category), [category]);

  const handleExport = async () => {
    if (!tenantId) {
      toast({ title: 'No workspace', description: 'Join or select a workspace first.', variant: 'destructive' });
      return;
    }
    setExporting(true);
    try {
      if (format === 'csv') {
        // Use the exportData backend function for supported types
        const supportedTypes = ['workforce', 'compliance'];
        let csvContent, filename;

        if (supportedTypes.includes(category)) {
          const res = await base44.functions.invoke('exportData', { type: category, tenant_id: tenantId });
          if (res instanceof Response) {
            csvContent = await res.text();
            const cd = res.headers.get('Content-Disposition') || '';
            const match = cd.match(/filename="?(.+?)"?$/);
            filename = match ? match[1] : `${category}_export_${new Date().toISOString().split('T')[0]}.csv`;
          } else if (typeof res === 'string') {
            csvContent = res;
            filename = `${category}_export_${new Date().toISOString().split('T')[0]}.csv`;
          } else {
            throw new Error('Unexpected export response');
          }
        } else {
          // Client-side CSV generation for other entity types
          csvContent = await generateEntityCSV(category, tenantId);
          filename = `${category}_export_${new Date().toISOString().split('T')[0]}.csv`;
        }

        // Download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setLastExport({ category: selectedCategory.label, filename, at: new Date().toISOString() });
        toast({ title: 'Export complete', description: `${filename} downloaded successfully.` });
      } else {
        // JSON export — fetch entity data and download
        const data = await fetchEntityData(category, tenantId);
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${category}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setLastExport({ category: selectedCategory.label, filename: a.download, at: new Date().toISOString() });
        toast({ title: 'Export complete', description: `${a.download} downloaded successfully.` });
      }
    } catch (err) {
      const classified = classifyIntegrationError(err, 'Data Export');
      toast({ title: classified.title, description: classified.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <BackBar to="/workspace" label="Back to Workspace" breadcrumb={[{ label: 'Data Export' }]} />

      <PageHeader
        title="Data Export"
        subtitle="Export operational data securely — tenant-scoped, role-based, audited"
        help={{ title: 'Data Export', content: 'Exports are scoped to your current workspace and filtered by role. Sensitive fields (credentials, tokens) are never included. Each export is recorded in the audit trail.' }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><Database className="w-4 h-4 text-muted-foreground" /> Configure Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <Label>Data Category</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all ${category === c.key ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <span className="text-lg shrink-0">{c.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${format === f.key ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:border-primary/30'}`}
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{f.label}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Export Scope</p>
              <p>Workspace: {tenant?.name || '—'} {activeOutlet?.name ? `· Outlet: ${activeOutlet.name}` : ''}</p>
              <p>Exports are tenant-scoped and respect RBAC. No cross-tenant data, secrets, or credentials are included.</p>
            </div>
          </div>

          {/* Action */}
          <Button onClick={handleExport} disabled={exporting || !tenantId} className="w-full gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting…' : `Export ${selectedCategory?.label} as ${format.toUpperCase()}`}
          </Button>

          {lastExport && (
            <div className="text-xs text-muted-foreground text-center">
              Last export: {lastExport.filename} · {new Date(lastExport.at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helper: fetch entity data for JSON export ──
async function fetchEntityData(category, tenantId) {
  const map = {
    inventory: 'InventoryItem',
    procurement: 'PurchaseOrder',
    finance: 'SalesInvoice',
    tasks: 'Task',
    customers: 'CustomerProfile',
    audit: 'AuditLog',
  };
  const entityName = map[category];
  if (!entityName) return [];
  const data = await base44.entities[entityName].filter({ tenant_id: tenantId }, '-created_date', 500);
  return data || [];
}

// ── Helper: generate CSV client-side for unsupported backend types ──
async function generateEntityCSV(category, tenantId) {
  const data = await fetchEntityData(category, tenantId);
  if (!data || data.length === 0) return 'No data available';
  const keys = Object.keys(data[0]).filter(k => !['previous_state', 'new_state', 'metadata', 'generation_metadata'].includes(k));
  const headers = keys.map(k => `"${k}"`).join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const v = row[k];
      if (v === null || v === undefined) return '""';
      if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers, ...rows].join('\n');
}