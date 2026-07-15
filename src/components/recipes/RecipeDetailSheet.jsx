import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SovereignAssetBadge from '@/components/recipes/SovereignAssetBadge';
import SovereignWatermark from '@/components/recipes/SovereignWatermark';
import StatusBadge from '@/components/shared/StatusBadge';
import { RefreshCw, Printer, Lock, Clock, Package } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(n);
};

export default function RecipeDetailSheet({ recipe, open, onClose, onRecalc, canManage, tenantName }) {
  const { user } = useAuth();
  if (!recipe) return null;

  const isProtected = recipe.intellectual_property_level !== 'standard';
  const watermarkEnabled = isProtected && recipe.content_protection?.watermark_enabled;
  const copyRestricted = isProtected && recipe.content_protection?.copy_restrict_enabled;
  const margin = recipe.gross_margin_pct;
  const marginColor =
    margin == null ? 'text-muted-foreground'
    : margin >= 65 ? 'text-orbitan-green'
    : margin >= 40 ? 'text-orbitan-amber'
    : 'text-orbitan-red';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-xl">{recipe.menu_item_name}</SheetTitle>
            <SovereignAssetBadge ipLevel={recipe.intellectual_property_level} />
          </div>
          {recipe.menu_item_sku && (
            <div className="text-xs text-muted-foreground">SKU: {recipe.menu_item_sku}</div>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="capitalize">{recipe.category}</Badge>
            <StatusBadge status={recipe.status || 'draft'} />
            {recipe.prep_time_mins != null && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" /> {recipe.prep_time_mins} mins
              </span>
            )}
            {recipe.yield_qty != null && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Package className="h-3 w-3" /> {recipe.yield_qty} {recipe.yield_unit || ''}
              </span>
            )}
            {recipe.version > 1 && (
              <span className="text-muted-foreground">v{recipe.version}</span>
            )}
          </div>

          {recipe.description && (
            <p className="text-sm text-muted-foreground">{recipe.description}</p>
          )}

          {/* Pricing + COGS summary */}
          <div className="grid grid-cols-3 gap-3 rounded-xl border bg-muted/30 p-3">
            <Metric label="Selling Price" value={formatCurrency(recipe.selling_price)} />
            <Metric label="Live COGS" value={formatCurrency(recipe.total_cogs)} sub={recipe.last_cogs_source} />
            <Metric label="Gross Margin" value={margin != null ? `${margin.toFixed(1)}%` : '—'} valueClass={marginColor} />
          </div>

          {/* Ingredients BOM */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Ingredients (Bill of Materials)</h3>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Ingredient</th>
                      <th className="text-right font-medium px-3 py-2">Qty</th>
                      <th className="text-right font-medium px-3 py-2">Unit Cost</th>
                      <th className="text-right font-medium px-3 py-2">Line Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.ingredients.map((ing, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{ing.inventory_item_name}</td>
                        <td className="px-3 py-2 text-right">{ing.quantity_required} {ing.unit}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(ing.unit_cost_snapshot)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(ing.ingredient_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No ingredients linked yet.</p>
            )}
          </div>

          {/* Instructions / SOP — Controlled View */}
          {recipe.instructions_markdown && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Preparation SOP</h3>
                {isProtected && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> Controlled View
                  </span>
                )}
              </div>
              <div
                className={`relative rounded-lg border bg-card p-4 overflow-hidden ${copyRestricted ? 'select-none' : ''}`}
                onContextMenu={(e) => copyRestricted && e.preventDefault()}
              >
                <SovereignWatermark enabled={watermarkEnabled} tenantName={tenantName} />
                <div className="prose prose-sm max-w-none relative z-10">
                  <ReactMarkdown>{recipe.instructions_markdown}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Allergens / Dietary */}
          {(recipe.allergens?.length > 0 || recipe.dietary_tags?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {recipe.allergens?.map((a) => (
                <Badge key={a} variant="outline" className="border-orbitan-red/30 text-orbitan-red">{a}</Badge>
              ))}
              {recipe.dietary_tags?.map((d) => (
                <Badge key={d} variant="outline" className="border-orbitan-green/30 text-orbitan-green">{d}</Badge>
              ))}
            </div>
          )}

          {recipe.last_cogs_calculated_date && (
            <div className="text-[11px] text-muted-foreground">
              COGS last computed {new Date(recipe.last_cogs_calculated_date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}
            </div>
          )}

          {recipe.notes && (
            <div className="rounded-lg border-l-2 border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
              {recipe.notes}
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          {canManage && (
            <Button variant="outline" onClick={() => onRecalc(recipe)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Recalculate Live COGS
            </Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Export
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ label, value, sub, valueClass = '' }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-lg font-display font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}