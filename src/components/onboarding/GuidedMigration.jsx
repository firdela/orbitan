// GuidedMigration — reusable bulk-importer for one entity type (Build #17).
// Flow: download template → upload file → preview/validate → commit → rollback.
import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, Upload, Download, FileCheck2, AlertTriangle, CheckCircle2,
  RotateCcw, FileSpreadsheet, History, X,
} from 'lucide-react';

const ENTITY_LABEL = {
  InventoryItem: 'Inventory Items', Supplier: 'Suppliers', Recipe: 'Recipes / Menu',
  Employee: 'Employees', CustomerProfile: 'Customers',
};

export default function GuidedMigration({ entityName, tenantId, outletId }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [rollingBack, setRollingBack] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('dataMigration', { action: 'history', tenant_id: tenantId, entity_name: entityName });
      setHistory(res.data?.history || []);
    } catch (e) { /* ignore */ }
  }, [tenantId, entityName]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const downloadTemplate = async () => {
    try {
      const res = await base44.functions.invoke('dataMigration', { action: 'templates' });
      const tpl = res.data?.templates?.[entityName];
      if (!tpl) return;
      const rows = [tpl.csv_header];
      const sample = tpl.fields.map(f => (f.required ? `sample_${f.key}` : '')).join(',');
      rows.push(sample);
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${entityName}_template.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Template failed', description: err.message, variant: 'destructive' });
    }
  };

  const onFile = async (f) => {
    setFile(f); setFileUrl(null); setPreview(null); setResult(null);
    if (!f) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(res.file_url);
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const doPreview = async () => {
    if (!fileUrl) return;
    setPreviewing(true); setResult(null);
    try {
      const res = await base44.functions.invoke('dataMigration', {
        action: 'preview', tenant_id: tenantId, outlet_id: outletId,
        entity_name: entityName, file_url: fileUrl, file_name: file?.name,
      });
      const d = res.data;
      if (d?.error) throw new Error(d.error);
      setPreview(d);
    } catch (err) {
      toast({ title: 'Preview failed', description: err.message, variant: 'destructive' });
    } finally { setPreviewing(false); }
  };

  const doCommit = async () => {
    if (!fileUrl) return;
    setCommitting(true);
    try {
      const res = await base44.functions.invoke('dataMigration', {
        action: 'commit', tenant_id: tenantId, outlet_id: outletId,
        entity_name: entityName, file_url: fileUrl, file_name: file?.name,
      });
      const d = res.data;
      if (d?.error) throw new Error(d.error);
      setResult(d);
      toast({ title: 'Import committed', description: `${d.created} ${ENTITY_LABEL[entityName]} created.` });
      loadHistory();
    } catch (err) {
      toast({ title: 'Commit failed', description: err.message, variant: 'destructive' });
    } finally { setCommitting(false); }
  };

  const doRollback = async (importId) => {
    if (!confirm('Roll back this import? All records created by it will be permanently deleted.')) return;
    setRollingBack(importId);
    try {
      const res = await base44.functions.invoke('dataMigration', { action: 'rollback', tenant_id: tenantId, import_id: importId });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: 'Import rolled back', description: `${res.data.rolled_back} records deleted.` });
      loadHistory();
    } catch (err) {
      toast({ title: 'Rollback failed', description: err.message, variant: 'destructive' });
    } finally { setRollingBack(null); }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: template + upload */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-orbitan-blue" /> Import {ENTITY_LABEL[entityName]}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV or Excel file. Download the template for the correct columns.</p>
          </div>
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-1.5"><Download className="w-3.5 h-3.5" /> Template</Button>
        </div>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
          <span className="text-sm font-medium mt-2">{file ? file.name : 'Click to choose a file'}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">CSV or Excel · max 500 rows</span>
        </label>
        {fileUrl && (
          <Button size="sm" onClick={doPreview} disabled={previewing} className="gap-1.5 w-full">
            {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />}
            {previewing ? 'Validating…' : 'Preview & Validate'}
          </Button>
        )}
      </div>

      {/* Step 2: preview */}
      {preview && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-fade-in">
          <h4 className="text-sm font-semibold">Preview</h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-lg font-bold">{preview.total}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
            <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-700">{preview.valid}</p><p className="text-[10px] text-muted-foreground">Valid</p></div>
            <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{preview.duplicate}</p><p className="text-[10px] text-muted-foreground">Duplicates</p></div>
            <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-700">{preview.invalid}</p><p className="text-[10px] text-muted-foreground">Invalid</p></div>
          </div>
          {preview.sample && preview.sample.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {Object.keys(preview.sample[0]).slice(0, 6).map(k => <th key={k} className="py-1 pr-2">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-b border-border/40">
                      {Object.values(r).slice(0, 6).map((v, j) => (
                        <td key={j} className="py-1 pr-2 truncate max-w-[120px]">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.errors && preview.errors.length > 0 && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {preview.errors.length} row(s) with errors (first {Math.min(preview.errors.length, 5)}):</p>
              <ul className="mt-1 ml-4 list-disc">{preview.errors.slice(0, 5).map((e, i) => <li key={i}>Row {e.row}: {e.errors.join(', ')}</li>)}</ul>
            </div>
          )}
          <Button size="sm" onClick={doCommit} disabled={committing || preview.valid === 0} className="gap-1.5 w-full">
            {committing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Commit {preview.valid} valid row(s)
          </Button>
        </div>
      )}

      {/* Step 3: result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Import committed</p>
              <p className="text-xs text-emerald-700 mt-1">{result.created} created · {result.duplicates} duplicates skipped · {result.invalid} invalid</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setFile(null); setFileUrl(null); setPreview(null); setResult(null); }} className="gap-1.5"><X className="w-3.5 h-3.5" /> Done</Button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h4 className="text-sm font-semibold flex items-center gap-2 mb-2"><History className="w-4 h-4 text-muted-foreground" /> Import History</h4>
        {history.length === 0 ? <p className="text-xs text-muted-foreground">No imports yet.</p> : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{h.file_name || 'import'} · {h.created_count} created</p>
                  <p className="text-[10px] text-muted-foreground">{h.committed_at ? new Date(h.committed_at).toLocaleString() : h.created_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${h.status === 'committed' ? 'bg-emerald-100 text-emerald-700' : h.status === 'rolled_back' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{h.status}</span>
                  {h.status === 'committed' && <Button size="sm" variant="ghost" disabled={rollingBack === h.id} onClick={() => doRollback(h.id)} className="gap-1 h-7"><RotateCcw className="w-3 h-3" /> Rollback</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}