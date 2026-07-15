import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/shared/StatusBadge';
import SovereignAssetBadge from '@/components/recipes/SovereignAssetBadge';
import EmptyState from '@/components/shared/EmptyState';
import {
  ChefHat, Pencil, Trash2, Eye, RefreshCw, MoreHorizontal, Loader2, DollarSign,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(n);
};

export default function RecipeList({
  recipes, loading, onEdit, onView, onDelete, onRecalc, canManage,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading recipes…
      </div>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <EmptyState
        icon={ChefHat}
        title="No recipes yet"
        description="Create your first recipe to start tracking live COGS and protecting your IP."
        color="primary"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-4 py-3">Recipe</th>
            <th className="text-left font-medium px-4 py-3">Category</th>
            <th className="text-left font-medium px-4 py-3">IP Level</th>
            <th className="text-left font-medium px-4 py-3">Status</th>
            <th className="text-right font-medium px-4 py-3">Price</th>
            <th className="text-right font-medium px-4 py-3">Live COGS</th>
            <th className="text-right font-medium px-4 py-3">Margin</th>
            <th className="text-right font-medium px-4 py-3 w-16">·</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const margin = r.gross_margin_pct;
            const marginColor =
              margin == null ? 'text-muted-foreground'
              : margin >= 65 ? 'text-orbitan-green'
              : margin >= 40 ? 'text-orbitan-amber'
              : 'text-orbitan-red';
            return (
              <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{r.menu_item_name}</div>
                  {r.menu_item_sku && (
                    <div className="text-xs text-muted-foreground">SKU: {r.menu_item_sku}</div>
                  )}
                </td>
                <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{r.category || '—'}</Badge></td>
                <td className="px-4 py-3"><SovereignAssetBadge ipLevel={r.intellectual_property_level} /></td>
                <td className="px-4 py-3"><StatusBadge status={r.status || 'draft'} /></td>
                <td className="px-4 py-3 text-right">{formatCurrency(r.selling_price)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-medium">{formatCurrency(r.total_cogs)}</span>
                  {r.last_cogs_source && (
                    <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{r.last_cogs_source}</div>
                  )}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${marginColor}`}>
                  {margin != null ? `${margin.toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(r)}>
                        <Eye className="h-4 w-4 mr-2" /> View
                      </DropdownMenuItem>
                      {canManage && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(r)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRecalc(r)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Recalculate COGS
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(r)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}