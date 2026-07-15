import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';

const CATEGORIES = ['main', 'side', 'beverage', 'dessert', 'combo', 'ingredient', 'other'];
const IP_LEVELS = [
  { value: 'standard', label: 'Standard — visible to all staff' },
  { value: 'proprietary', label: 'Proprietary — managers + supervisors (watermarked)' },
  { value: 'confidential', label: 'Confidential — tenant_admin only (controlled view)' },
];

export default function RecipeFormDialog({ open, onClose, onSave, editing, tenantId, user }) {
  const [form, setForm] = useState(blankForm());
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invSearch, setInvSearch] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          ...blankForm(),
          ...editing,
          content_protection: {
            ...blankForm().content_protection,
            ...(editing.content_protection || {}),
          },
        });
      } else {
        setForm(blankForm());
      }
      loadInventory();
    }
  }, [open, editing]);

  const loadInventory = async () => {
    setInvLoading(true);
    try {
      const items = await base44.entities.InventoryItem.list('-created_date', 200);
      setInventory(items || []);
    } catch {
      setInventory([]);
    } finally {
      setInvLoading(false);
    }
  };

  const filteredInv = inventory.filter((i) =>
    !invSearch || i.name?.toLowerCase().includes(invSearch.toLowerCase()) || i.sku?.toLowerCase().includes(invSearch.toLowerCase())
  );

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateProtection = (field, value) =>
    setForm((f) => ({ ...f, content_protection: { ...f.content_protection, [field]: value } }));

  const addIngredient = (invItem) => {
    setForm((f) => ({
      ...f,
      ingredients: [
        ...f.ingredients,
        {
          inventory_item_id: invItem.id,
          inventory_item_name: invItem.name,
          quantity_required: 1,
          unit: invItem.unit || '',
          unit_cost_snapshot: invItem.cost_per_unit || 0,
          ingredient_cost: invItem.cost_per_unit || 0,
        },
      ],
    }));
    setInvSearch('');
  };

  const updateIngredient = (idx, field, value) => {
    setForm((f) => {
      const ingredients = [...f.ingredients];
      const ing = { ...ingredients[idx], [field]: value };
      if (field === 'quantity_required' || field === 'unit_cost_snapshot') {
        ing.ingredient_cost = (Number(ing.quantity_required) || 0) * (Number(ing.unit_cost_snapshot) || 0);
      }
      ingredients[idx] = ing;
      return { ...f, ingredients };
    });
  };

  const removeIngredient = (idx) => {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        outlet_id: form.outlet_id || undefined,
        menu_item_name: form.menu_item_name,
        menu_item_sku: form.menu_item_sku,
        category: form.category,
        description: form.description,
        instructions_markdown: form.instructions_markdown,
        intellectual_property_level: form.intellectual_property_level,
        yield_qty: form.yield_qty ? Number(form.yield_qty) : undefined,
        yield_unit: form.yield_unit,
        prep_time_mins: form.prep_time_mins ? Number(form.prep_time_mins) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        ingredients: form.ingredients.map((i) => ({
          inventory_item_id: i.inventory_item_id,
          inventory_item_name: i.inventory_item_name,
          quantity_required: Number(i.quantity_required) || 0,
          unit: i.unit,
          unit_cost_snapshot: Number(i.unit_cost_snapshot) || 0,
          ingredient_cost: (Number(i.quantity_required) || 0) * (Number(i.unit_cost_snapshot) || 0),
          last_cost_source: i.last_cost_source || 'inventory_fallback',
        })),
        content_protection: form.content_protection,
        status: form.status,
        allergens: form.allergens,
        dietary_tags: form.dietary_tags,
        is_active: form.is_active,
        notes: form.notes,
      };
      await onSave(payload, !!editing);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Recipe' : 'New Recipe — Sovereign Asset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Recipe / Menu Item Name *</Label>
              <Input value={form.menu_item_name} onChange={(e) => update('menu_item_name', e.target.value)} placeholder="e.g. Birria Taco" />
            </div>
            <div className="space-y-1.5">
              <Label>SKU / POS Code</Label>
              <Input value={form.menu_item_sku || ''} onChange={(e) => update('menu_item_sku', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price (SGD)</Label>
              <Input type="number" step="0.01" value={form.selling_price || ''} onChange={(e) => update('selling_price', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IP Classification *</Label>
              <Select value={form.intellectual_property_level} onValueChange={(v) => update('intellectual_property_level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IP_LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Yield Qty</Label>
              <Input type="number" step="0.1" value={form.yield_qty || ''} onChange={(e) => update('yield_qty', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Yield Unit</Label>
              <Input value={form.yield_unit || ''} onChange={(e) => update('yield_unit', e.target.value)} placeholder="servings, pcs" />
            </div>
            <div className="space-y-1.5">
              <Label>Prep Time (mins)</Label>
              <Input type="number" value={form.prep_time_mins || ''} onChange={(e) => update('prep_time_mins', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft', 'in_review', 'approved', 'archived'].map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={(e) => update('description', e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Instructions / SOP (Markdown) — the core IP</Label>
            <Textarea value={form.instructions_markdown || ''} onChange={(e) => update('instructions_markdown', e.target.value)} rows={5} placeholder="Step-by-step preparation method…" />
          </div>

          {/* Ingredients — BOM linking to InventoryItem */}
          <div className="space-y-2">
            <Label>Ingredients (Bill of Materials)</Label>
            {form.ingredients.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                {form.ingredients.map((ing, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 text-sm font-medium">{ing.inventory_item_name}</div>
                    <Input className="col-span-2 h-8" type="number" step="0.01" value={ing.quantity_required} onChange={(e) => updateIngredient(idx, 'quantity_required', e.target.value)} />
                    <Input className="col-span-2 h-8" value={ing.unit} onChange={(e) => updateIngredient(idx, 'unit', e.target.value)} placeholder="unit" />
                    <Input className="col-span-2 h-8" type="number" step="0.01" value={ing.unit_cost_snapshot} onChange={(e) => updateIngredient(idx, 'unit_cost_snapshot', e.target.value)} />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-destructive" onClick={() => removeIngredient(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search inventory to add ingredient…"
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
              </div>
              {invSearch && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border bg-popover">
                  {invLoading ? (
                    <div className="p-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin inline mr-1" />Loading…</div>
                  ) : filteredInv.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">No matching inventory items.</div>
                  ) : (
                    filteredInv.slice(0, 8).map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => addIngredient(inv)}
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors"
                      >
                        <span>{inv.name}</span>
                        <span className="text-xs text-muted-foreground">{inv.unit} · {inv.cost_per_unit ? `S$${inv.cost_per_unit}` : '—'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content Protection — Sovereignty-by-Design */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="text-sm font-medium">Content Protection (Sovereign Asset)</div>
            <div className="grid grid-cols-2 gap-3">
              <ProtectionToggle label="Watermark enabled" checked={form.content_protection.watermark_enabled} onChange={(v) => updateProtection('watermark_enabled', v)} />
              <ProtectionToggle label="Copy restrict" checked={form.content_protection.copy_restrict_enabled} onChange={(v) => updateProtection('copy_restrict_enabled', v)} />
              <ProtectionToggle label="Download controlled" checked={form.content_protection.download_controlled} onChange={(v) => updateProtection('download_controlled', v)} />
              <ProtectionToggle label="Export requires approval" checked={form.content_protection.export_requires_approval} onChange={(v) => updateProtection('export_requires_approval', v)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.menu_item_name}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {editing ? 'Save Changes' : 'Create Recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function blankForm() {
  return {
    menu_item_name: '',
    menu_item_sku: '',
    category: 'main',
    description: '',
    instructions_markdown: '',
    intellectual_property_level: 'standard',
    yield_qty: '',
    yield_unit: '',
    prep_time_mins: '',
    selling_price: '',
    ingredients: [],
    content_protection: {
      watermark_enabled: true,
      copy_restrict_enabled: true,
      export_requires_approval: false,
      download_controlled: true,
    },
    status: 'draft',
    allergens: [],
    dietary_tags: [],
    is_active: true,
    notes: '',
  };
}

function ProtectionToggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}