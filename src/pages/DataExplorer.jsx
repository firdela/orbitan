import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import OrbitanLogo from '@/components/layout/OrbitanLogo';
import { Download, ArrowLeft, LogOut, Filter, Plus, X, Database, Table } from 'lucide-react';

const ENTITY_CONFIGS = {
  Task: {
    label: 'Tasks',
    columns: ['title', 'status', 'priority', 'module_context', 'assigned_to_name', 'created_date'],
    fields: {
      title: { label: 'Title', type: 'string' },
      status: { label: 'Status', type: 'enum', options: ['todo', 'in_progress', 'done', 'blocked', 'overdue'] },
      priority: { label: 'Priority', type: 'enum', options: ['low', 'medium', 'high', 'urgent'] },
      module_context: { label: 'Module', type: 'string' },
      assigned_to_name: { label: 'Assigned To', type: 'string' },
    },
  },
  InventoryItem: {
    label: 'Inventory',
    columns: ['name', 'sku', 'category', 'unit', 'current_stock', 'par_level', 'cost_per_unit', 'status'],
    fields: {
      name: { label: 'Name', type: 'string' },
      sku: { label: 'SKU', type: 'string' },
      category: { label: 'Category', type: 'string' },
      unit: { label: 'Unit', type: 'string' },
      current_stock: { label: 'Stock', type: 'number' },
      par_level: { label: 'Par Level', type: 'number' },
      cost_per_unit: { label: 'Cost/Unit', type: 'number' },
      status: { label: 'Status', type: 'enum', options: ['active', 'inactive', 'discontinued'] },
    },
  },
  PurchaseOrder: {
    label: 'Purchase Orders',
    columns: ['po_number', 'supplier_name', 'status', 'total_amount', 'expected_delivery_date', 'processing_status'],
    fields: {
      po_number: { label: 'PO Number', type: 'string' },
      supplier_name: { label: 'Supplier', type: 'string' },
      status: { label: 'Status', type: 'enum', options: ['draft', 'pending_approval', 'approved', 'sent', 'partially_received', 'received', 'cancelled'] },
      total_amount: { label: 'Total', type: 'number' },
      processing_status: { label: 'Processing', type: 'enum', options: ['awaiting_evidence', 'raw', 'ai_processing', 'needs_review', 'verified', 'rejected'] },
    },
  },
  SalesInvoice: {
    label: 'Sales Invoices',
    columns: ['invoice_number', 'customer_name', 'status', 'total_amount', 'invoice_date'],
    fields: {
      invoice_number: { label: 'Invoice #', type: 'string' },
      customer_name: { label: 'Customer', type: 'string' },
      status: { label: 'Status', type: 'enum', options: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
      total_amount: { label: 'Total', type: 'number' },
    },
  },
  Employee: {
    label: 'Employees',
    columns: ['full_name', 'role', 'position', 'employment_type', 'status', 'hire_date'],
    fields: {
      full_name: { label: 'Name', type: 'string' },
      role: { label: 'Role', type: 'enum', options: ['tenant_admin', 'client_manager', 'outlet_manager', 'supervisor', 'worker'] },
      position: { label: 'Position', type: 'string' },
      employment_type: { label: 'Type', type: 'enum', options: ['full_time', 'part_time', 'contract', 'temporary'] },
      status: { label: 'Status', type: 'enum', options: ['active', 'inactive', 'on_leave', 'terminated'] },
    },
  },
  Shift: {
    label: 'Shifts',
    columns: ['employee_name', 'date', 'start_time', 'end_time', 'status'],
    fields: {
      employee_name: { label: 'Employee', type: 'string' },
      date: { label: 'Date', type: 'date' },
      status: { label: 'Status', type: 'enum', options: ['scheduled', 'confirmed', 'in_progress', 'completed', 'absent', 'cancelled'] },
    },
  },
  ComplianceRecord: {
    label: 'Compliance',
    columns: ['title', 'type', 'category', 'status', 'due_date'],
    fields: {
      title: { label: 'Title', type: 'string' },
      type: { label: 'Type', type: 'string' },
      category: { label: 'Category', type: 'enum', options: ['food_safety', 'fire_safety', 'licensing', 'hr', 'environmental', 'financial', 'other'] },
      status: { label: 'Status', type: 'enum', options: ['pending', 'in_review', 'submitted', 'approved', 'rejected', 'overdue'] },
    },
  },
  Supplier: {
    label: 'Suppliers',
    columns: ['name', 'contact_person', 'email', 'phone', 'lead_time_days', 'payment_terms', 'status'],
    fields: {
      name: { label: 'Name', type: 'string' },
      contact_person: { label: 'Contact', type: 'string' },
      email: { label: 'Email', type: 'string' },
      status: { label: 'Status', type: 'enum', options: ['active', 'inactive'] },
      is_preferred: { label: 'Preferred', type: 'boolean' },
    },
  },
};

const OPERATORS = [
  { key: 'equals', label: 'Equals' },
  { key: 'not_equals', label: 'Not Equals' },
  { key: 'contains', label: 'Contains' },
  { key: 'gt', label: 'Greater Than' },
  { key: 'lt', label: 'Less Than' },
];

export default function DataExplorer() {
  const [entity, setEntity] = useState('Task');
  const [filters, setFilters] = useState([]);
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const config = ENTITY_CONFIGS[entity];

  const buildQuery = () => {
    const query = {};
    filters.forEach(f => {
      if (!f.field || !f.value) return;
      if (f.operator === 'equals') query[f.field] = f.value;
      else if (f.operator === 'not_equals') query[f.field] = { $ne: f.value };
      else if (f.operator === 'contains') query[f.field] = { $regex: f.value, $options: 'i' };
      else if (f.operator === 'gt') query[f.field] = { $gt: isNaN(Number(f.value)) ? f.value : Number(f.value) };
      else if (f.operator === 'lt') query[f.field] = { $lt: isNaN(Number(f.value)) ? f.value : Number(f.value) };
    });
    return query;
  };

  const { data: results, isLoading } = useQuery({
    queryKey: ['data-explorer', entity, JSON.stringify(filters), page],
    queryFn: () => base44.entities[entity].filter(buildQuery(), '-created_date', pageSize + 1, page * pageSize),
  });

  const hasMore = results && results.length > pageSize;
  const displayResults = hasMore ? results.slice(0, pageSize) : results || [];

  const addFilter = () => {
    const firstField = Object.keys(config.fields)[0];
    setFilters([...filters, { field: firstField, operator: 'equals', value: '' }]);
  };

  const updateFilter = (i, key, val) => {
    setFilters(filters.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
    setPage(0);
  };

  const removeFilter = (i) => {
    setFilters(filters.filter((_, idx) => idx !== i));
    setPage(0);
  };

  const handleEntityChange = (v) => {
    setEntity(v);
    setFilters([]);
    setPage(0);
  };

  const handleExport = () => {
    if (!displayResults.length) return;
    const headers = config.columns;
    const rows = displayResults.map(r => headers.map(h => {
      const val = r[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val).replace(/"/g, '""');
    }));
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? '✓' : '✗';
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + '...';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(val).toLocaleDateString('en-SG');
    return String(val);
  };

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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Database className="w-3.5 h-3.5" /> Data Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Data Explorer</h1>
          <p className="text-sm text-muted-foreground">Filter and view granular operational data scoped to your assigned outlet and department.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Select value={entity} onValueChange={handleEntityChange}>
              <SelectTrigger><Table className="w-4 h-4 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ENTITY_CONFIGS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!displayResults.length} className="gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Filters</span>
            </div>
            <Button variant="ghost" size="sm" onClick={addFilter} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Filter
            </Button>
          </div>
          {filters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No filters applied. Showing all {config.label.toLowerCase()}.</p>
          ) : (
            <div className="space-y-2">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={f.field} onValueChange={v => { updateFilter(i, 'field', v); updateFilter(i, 'value', ''); }}>
                    <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(config.fields).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={f.operator} onValueChange={v => updateFilter(i, 'operator', v)}>
                    <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => <SelectItem key={op.key} value={op.key}>{op.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {config.fields[f.field]?.type === 'enum' ? (
                    <Select value={f.value} onValueChange={v => updateFilter(i, 'value', v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select value..." /></SelectTrigger>
                      <SelectContent>
                        {config.fields[f.field].options.map(opt => <SelectItem key={opt} value={opt}>{opt.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="flex-1"
                      placeholder="Enter value..."
                      value={f.value}
                      onChange={e => updateFilter(i, 'value', e.target.value)}
                    />
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeFilter(i)} className="flex-shrink-0">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground">{displayResults.length} record{displayResults.length !== 1 ? 's' : ''}</p>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : displayResults.length === 0 ? (
            <div className="py-16 text-center">
              <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No records found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {config.columns.map(col => (
                      <th key={col} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">
                        {config.fields[col]?.label || col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((row, i) => (
                    <tr key={row.id || i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {config.columns.map(col => (
                        <td key={col} className="px-4 py-3 text-xs text-foreground">{formatCellValue(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isLoading && displayResults.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Showing {page * pageSize + 1}–{page * pageSize + displayResults.length}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}