import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import RecipeList from '@/components/recipes/RecipeList';
import RecipeFormDialog from '@/components/recipes/RecipeFormDialog';
import RecipeDetailSheet from '@/components/recipes/RecipeDetailSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { ChefHat, Plus, Search, Loader2, DollarSign, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { auditFrontend, ACTION_TYPES } from '@/lib/audit';

export default function RecipesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.data?.tenant_id;
  const tenantName = user?.data?.tenant_name || 'OrbitanOS';

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [showView, setShowView] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const canManage =
    user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'outlet_manager';

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Recipe.list('-updated_date', 200);
      setRecipes(data || []);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = recipes.filter((r) =>
    !search ||
    r.menu_item_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.menu_item_sku?.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.toLowerCase().includes(search.toLowerCase())
  );

  const avgMargin = recipes.length > 0
    ? recipes.reduce((s, r) => s + (r.gross_margin_pct || 0), 0) / recipes.length
    : 0;
  const proprietaryCount = recipes.filter((r) => r.intellectual_property_level !== 'standard').length;
  const totalCogs = recipes.reduce((s, r) => s + (r.total_cogs || 0), 0);

  const handleSave = async (payload, isEdit) => {
    try {
      if (isEdit && editing) {
        const updated = await base44.entities.Recipe.update(editing.id, payload);
        setRecipes((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
        auditFrontend(ACTION_TYPES.RECIPE_UPDATED || 'recipe_updated', {
          target_entity: 'Recipe', target_record_id: editing.id, details: `Updated recipe "${payload.menu_item_name}"`,
        });
        toast({ title: 'Recipe updated', description: `${payload.menu_item_name} saved successfully.` });
      } else {
        payload.created_by_id = user.id;
        payload.created_by_name = user.full_name || user.email;
        const created = await base44.entities.Recipe.create(payload);
        setRecipes((prev) => [created, ...prev]);
        auditFrontend(ACTION_TYPES.RECIPE_CREATED || 'recipe_created', {
          target_entity: 'Recipe', target_record_id: created.id, details: `Created recipe "${payload.menu_item_name}"`,
        });
        toast({ title: 'Recipe created', description: `${payload.menu_item_name} added as a Sovereign Asset.` });
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast({ title: 'Error saving recipe', description: err.message, variant: 'destructive' });
    }
  };

  const handleRecalc = async (recipe) => {
    setRecalculating(true);
    try {
      const res = await base44.functions.invoke('calculateRecipeCost', { recipe_id: recipe.id });
      const updated = { ...recipe, ...res.data };
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? updated : r)));
      if (viewing?.id === recipe.id) setViewing(updated);
      toast({
        title: 'Live COGS recalculated',
        description: `${recipe.menu_item_name}: ${new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(res.data.total_cogs)} (margin ${res.data.gross_margin_pct?.toFixed(1)}%)`,
      });
    } catch (err) {
      toast({ title: 'Recalculation failed', description: err.message, variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.Recipe.delete(deleteTarget.id);
      setRecipes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      auditFrontend(ACTION_TYPES.RECIPE_DELETED || 'recipe_deleted', {
        target_entity: 'Recipe', target_record_id: deleteTarget.id, details: `Deleted recipe "${deleteTarget.menu_item_name}"`,
      });
      toast({ title: 'Recipe deleted' });
      setDeleteTarget(null);
    } catch (err) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Recipe Manager"
        subtitle="Sovereign Asset Container · Live COGS · IP Protection (ADR-0026)"
        action={
          canManage && (
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Recipe
            </Button>
          )
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ChefHat} title="Total Recipes" value={recipes.length} color="blue" />
        <StatCard icon={TrendingUp} title="Avg Gross Margin" value={`${avgMargin.toFixed(1)}%`} color="green" />
        <StatCard icon={DollarSign} title="Total Live COGS" value={new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(totalCogs)} color="amber" />
        <StatCard icon={ShieldCheck} title="Protected IP Assets" value={proprietaryCount} color="red" />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search recipes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {recalculating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* List */}
      <RecipeList
        recipes={filtered}
        loading={loading}
        onEdit={(r) => { setEditing(r); setShowForm(true); }}
        onView={(r) => { setViewing(r); setShowView(true); }}
        onDelete={(r) => setDeleteTarget(r)}
        onRecalc={handleRecalc}
        canManage={canManage}
      />

      {/* Form dialog */}
      <RecipeFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
        tenantId={tenantId}
        user={user}
      />

      {/* Detail sheet */}
      <RecipeDetailSheet
        recipe={viewing}
        open={showView}
        onClose={() => setShowView(false)}
        onRecalc={handleRecalc}
        canManage={canManage}
        tenantName={tenantName}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
            <DialogDescription>
              This will permanently delete "{deleteTarget?.menu_item_name}". This action is audit-logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}