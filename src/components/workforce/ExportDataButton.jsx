import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Download, Loader2 } from 'lucide-react';

export default function ExportDataButton({ tenantId, type = 'workforce', label, variant = 'outline', size = 'sm' }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const response = await base44.functions.invoke('exportData', { type, tenant_id: tenantId });
    // response.data is the CSV string
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {label || `Export ${type === 'workforce' ? 'Workforce' : 'Compliance'}`}
    </Button>
  );
}