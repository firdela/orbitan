import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, Package, ShoppingCart, CheckSquare, Loader2, X, ArrowRight } from 'lucide-react';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;
const FETCH_LIMIT = 50;
const MAX_PER_CATEGORY = 5;

const SEARCH_ENTITIES = [
  {
    key: 'inventory',
    label: 'Ingredients & Stock',
    entity: 'InventoryItem',
    searchFields: ['name', 'sku'],
    primaryField: 'name',
    secondaryField: 'sku',
    icon: Package,
    routeSegment: 'inventory',
    color: 'text-orange-500',
  },
  {
    key: 'procurement',
    label: 'Purchase Orders',
    entity: 'PurchaseOrder',
    searchFields: ['po_number', 'supplier_name'],
    primaryField: 'po_number',
    secondaryField: 'supplier_name',
    icon: ShoppingCart,
    routeSegment: 'procurement',
    color: 'text-blue-500',
  },
  {
    key: 'tasks',
    label: 'Tasks',
    entity: 'Task',
    searchFields: ['title'],
    primaryField: 'title',
    secondaryField: 'priority',
    icon: CheckSquare,
    routeSegment: 'tasks',
    color: 'text-emerald-500',
  },
];

export default function GlobalSearchBar({ tenant }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const tenantId = tenant?.id;

  // Determine route base for navigation
  const workspaceMatch = location.pathname.match(/^\/workspace\/([^/]+)/);
  const routeBase = workspaceMatch ? `/workspace/${workspaceMatch[1]}` : '/outlet';

  // Debounced search
  useEffect(() => {
    if (query.trim().length < MIN_QUERY || !tenantId) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const q = query.toLowerCase().trim();

      const searchPromises = SEARCH_ENTITIES.map(async (config) => {
        try {
          const records = await base44.entities[config.entity].filter(
            { tenant_id: tenantId },
            '-created_date',
            FETCH_LIMIT
          );
          const filtered = records
            .filter(r =>
              config.searchFields.some(f =>
                r[f]?.toString().toLowerCase().includes(q)
              )
            )
            .slice(0, MAX_PER_CATEGORY);
          return { config, items: filtered };
        } catch {
          return { config, items: [] };
        }
      });

      const searchResults = await Promise.all(searchPromises);
      setResults(searchResults.filter(r => r.items.length > 0));
      setLoading(false);
      setOpen(true);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, tenantId]);

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleResultClick = (routeSegment) => {
    navigate(`${routeBase}/${routeSegment}`);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const totalResults = results.reduce((sum, r) => sum + r.items.length, 0);

  if (!tenantId) return null;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md hidden sm:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search ingredients, POs, tasks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full h-9 pl-9 pr-16 rounded-lg bg-muted/60 border border-border/50 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/50 font-mono bg-muted px-1.5 py-0.5 rounded border border-border/40">
            ⌘K
          </kbd>
        )}
      </div>

      {open && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {totalResults === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            results.map(({ config, items }) => {
              const Icon = config.icon;
              return (
                <div key={config.key}>
                  <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 bg-muted/30">
                    {config.label}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(config.routeSegment)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-foreground">
                          {item[config.primaryField] || 'Untitled'}
                        </p>
                        {item[config.secondaryField] && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {config.secondaryField === 'sku' ? `SKU: ${item[config.secondaryField]}` : item[config.secondaryField]}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}