import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/lib/use-tenant.jsx';
import { auditFrontend } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { UploadCloud, FileSpreadsheet, ArrowLeft, LogOut, CheckCircle2, AlertTriangle, Loader2, Download, Database } from 'lucide-react';

const IMPORT_TARGETS = {
  InventoryItem: {
    label: 'Inventory Items',
    description: 'Stock items, SKUs, par levels, costs',
    requiredFields: ['name', 'unit'],
    templateHeaders: ['name', 'sku', 'category', 'unit', 'current_stock', 'par_level', 'reorder_point', 'cost_per_unit', 'supplier_id', 'storage_location'],
    redirectUrl: '/outlet/inventory',
  },
  Supplier: {
    label: 'Suppliers',
    description: 'Vendor contacts, lead times, payment terms',
    requiredFields: ['name'],
    templateHeaders: ['name', 'contact_person', 'email', 'phone', 'address', 'payment_terms', 'lead_time_days', 'min_order_value', 'is_preferred', 'is_critical_fnb', 'status', 'notes'],
    redirectUrl: '/suppliers',
  },
};

const STEP_MAP = { select: 0, uploading: 1, extracting: 1, preview: 2, importing: 3, done: 3 };
const STEP_LABELS = ['Select', 'Upload', 'Preview', 'Import'];

export default function DataImport() {
  const { currentTenant: tenant } = useTenant();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [targetEntity, setTargetEntity] = useState('InventoryItem');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('select');
  const [parsedData, setParsedData] = useState(null);
  const currentStep = STEP_MAP[step] ?? 0;

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  const handleProcess = async () => {
    if (!file) return;
    try {
      setStep('uploading');
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setStep('extracting');
      const schema = await base44.entities[targetEntity].schema();
      const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadRes.file_url,
        json_schema: { ...schema, type: 'object' },
      });
      if (extractRes.status === 'error') throw new Error(extractRes.details || 'Failed to parse file');
      const records = Array.isArray(extractRes.output) ? extractRes.output : (extractRes.output ? [extractRes.output] : []);
      if (records.length === 0) throw new Error('No data found in file');
      setParsedData(records);
      setStep('preview');
    } catch (err) {
      toast({ title: 'Processing failed', description: err.message, variant: 'destructive' });
      setStep('select');
    }
  };

  const handleImport = async () => {
    try {
      setStep('importing');
      const user = await base44.auth.me();
      const recordsToCreate = parsedData.map(r => ({
        ...r,
        tenant_id: tenant.id,
        outlet_id: user.data?.outlet_id || r.outlet_id,
      }));
      const result = await base44.entities[targetEntity].bulkCreate(recordsToCreate);
      const count = Array.isArray(result) ? result.length : recordsToCreate.length;
      await auditFrontend({
        tenant_id: tenant.id, actor_id: user.id, actor_name: user.full_name, actor_role: user.role,
        action_type: 'bulk_import', module: targetEntity === 'InventoryItem' ? 'inventory' : 'procurement',
        target_entity: targetEntity, target_record_id: 'bulk',
        details: `Bulk imported ${count} ${targetEntity} records`,
        new_state: { count, entity: targetEntity },
      });
      setStep('done');
      toast({ title: 'Import complete', description: `${count} records imported successfully.` });
    } catch (err) {
      toast({ title: 'Import failed', description: err.message, variant: 'destructive' });
      setStep('preview');
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setStep('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const target = IMPORT_TARGETS[targetEntity];
    const csv = target.templateHeaders.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetEntity.toLowerCase()}-import-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tenant) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading workspace...</p></div>;
  }

  const target = IMPORT_TARGETS[targetEntity];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/company"><ArrowLeft className="w-4 h-4" /></Link></Button>
            <OrbitanLogo size="sm" showOS />
          </div>
          <Button variant="outline" size="sm" onClick={() => base44.auth.logout()} className="gap-1.5 text-xs">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Database className="w-3.5 h-3.5" /> Data Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Bulk Import</h1>
          <p className="text-sm text-muted-foreground">Import inventory and supplier data via CSV or spreadsheet to quickly populate your records.</p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => {
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <React.Fragment key={label}>
                {i > 0 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-primary' : 'bg-border'}`} />}
                <div className={`flex items-center gap-1.5 ${isActive ? 'text-primary' : isDone ? 'text-orbitan-green' : 'text-muted-foreground'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-orbitan-green text-white' : 'bg-muted'}`}>
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {(step === 'select' || step === 'uploading' || step === 'extracting') && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-4">
              <Label className="text-xs mb-2 block">Import Target</Label>
              <Select value={targetEntity} onValueChange={v => { setTargetEntity(v); setFile(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_TARGETS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">{target.description}</p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground">Required: <span className="font-medium text-foreground">{target.requiredFields.join(', ')}</span></p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs gap-1">
                <Download className="w-3 h-3" /> Template
              </Button>
            </div>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => step === 'select' && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${step === 'select' ? 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer' : 'border-primary/30'}`}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFileSelect} className="hidden" />
              {step === 'uploading' || step === 'extracting' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">{step === 'uploading' ? 'Uploading file...' : 'Extracting data...'}</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="w-8 h-8 text-orbitan-green" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">Supports CSV, Excel, JSON</p>
                </div>
              )}
            </div>

            {file && step === 'select' && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleProcess}>Process File</Button>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && parsedData && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-sm">Preview — {parsedData.length} records found</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Review the extracted data before importing.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>Start Over</Button>
            </div>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {Object.keys(parsedData[0] || {}).map(key => (
                      <th key={key} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 whitespace-nowrap">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-xs text-foreground">{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 10 && <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 10 of {parsedData.length} records</p>}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button onClick={handleImport} className="gap-1.5">
                <UploadCloud className="w-4 h-4" /> Import {parsedData.length} Records
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Importing records...</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-orbitan-green mx-auto mb-3" />
            <p className="text-lg font-heading font-bold text-foreground">Import Complete</p>
            <p className="text-sm text-muted-foreground mt-1">{parsedData.length} {target.label.toLowerCase()} imported successfully.</p>
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="outline" onClick={handleReset}>Import Another</Button>
              <Button asChild><Link to={target.redirectUrl}>View Records</Link></Button>
            </div>
          </div>
        )}

        <div className="bg-muted/50 border border-border rounded-xl p-4 mt-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-orbitan-amber flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Data integrity:</strong> Imported records are subject to your tenant's RLS policies and will be scoped to your current outlet/tenant context. Always preview before importing.
          </div>
        </div>
      </main>
    </div>
  );
}