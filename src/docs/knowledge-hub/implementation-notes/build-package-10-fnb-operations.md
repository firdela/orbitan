# Build Package #10 — F&B Operations MVP

> **Status:** Implemented — 2026-07-24
> **Phase:** Build Manifest Phase 3 Feature Layer (F&B Industry Pack)
> **Directive:** Product Authority Build Package #10

## Assessment — modules already operational (reused, not rebuilt)

Evidence-first read of all four F&B modules found them substantially built
and wired to real backends. This package completed the genuine gaps rather
than rebuilding working systems.

### Inventory (`/workspace/:tenantId/inventory`) — Part A
**Operational:** full CRUD (add/edit), search, low-stock filter, KPI strip
(Total Items, Low Stock, Categories, Stock Value = Σ current_stock ×
cost_per_unit, currency-aware), Quick Stock Adjustment (audit-logged via
`ACTION_TYPES.STOCK_ADJUSTED`), Stock Reconciliation (count vs system,
discrepancy audit trail for SOC 2), Forecasting panel, loading + empty
states, responsive table with progress bars vs par level.
- **Stock adjustments** ✅ (audit-logged, reason captured)
- **Low stock alerts** ✅ (banner + filter)
- **Inventory valuation** ✅ (Stock Value KPI)

### Suppliers (`/suppliers`) — Part B
**Operational:** full CRUD (React Query mutations), search, stats (Total /
Preferred / Critical F&B / Avg Lead Time), Directory tab with contact /
payment-terms / lead-time / address, Performance tab (`SupplierPerformancePanel`),
preferred + critical-F&B flags, min-order-value, status. Complete for pilot.

### Procurement (`/workspace/:tenantId/procurement`) — Part C
**Operational:** PO create (Shield-gated), line items with live total,
Draft → Submit → Approve → Receive flow, `GoodsReceiptDialog` confirms
received quantities with discrepancy logging, **increments matching
InventoryItem stock by name match + audit** (Part E ✅), dispatches
`po.received` to `actionDispatcher` (wallet debit), governance-override
modal on threshold breach.
- **Goods receipt updates inventory** ✅ (Part E — confirmed in
  `GoodsReceiptDialog.handleConfirm`: name-match → `current_stock += received_qty` → audit)

### Recipes (`/workspace/:tenantId/recipes`) — Part D
**Operational:** CRUD, search, live COGS recalculation via
`calculateRecipeCost` backend, avg margin + total COGS + protected-IP stats,
delete confirmation, audit. Recipe ingredients, yield, margin, IP level
all on the schema.

### Reports (`/workspace/:tenantId/reports`) — Part F (completed this package)
**Already had:** real revenue/COGS/margin from `DailyReconciliation`,
Registry Metrics (`inventory_value_sgd`, `po_pending_count` via
`metricsEngine`), revenue-vs-COGS chart, performance heatmap,
reconciliation table.
**Completed this package:** added `FBOperationsReports` — the missing
F&B-specific operational reports, computed live from existing entities
(no fabrication, zero-when-empty):

| Report | Source | Metric |
|---|---|---|
| Inventory Valuation | `InventoryItem` | Σ current_stock × cost_per_unit + top-5 categories |
| Purchase Summary | `PurchaseOrder` | count + value grouped by status; total received spend |
| Supplier Spend | `PurchaseOrder` (received) | spend grouped by supplier, top 5 |
| Food / Recipe Cost | `Recipe` | total COGS, avg margin, top-5 by cost with margin flag |
| Stock Variance | `InventoryItem` | items below par with gap (−units) |

Loading + empty + no-data states; responsive grid; currency-aware.

## Part E — Inventory Integration (verified)
- **Goods receipt → inventory** ✅ (`GoodsReceiptDialog` increments + audits).
- **Waste → inventory** ✅ (Quick Stock Adjustment reduces stock with a
  reason, audit-logged — covers waste write-off).
- **Stock adjustment → reports** ✅ (adjustments change `current_stock`,
  which flows into Inventory Valuation + Stock Variance reports).
- **Inventory valuation → finance** — Inventory Value is surfaced in
  Reports; full `AccountMapping`/`financeController` journal posting is
  part of the Xero/Finance integration (Build #11), not this package.
- **Recipe production → inventory deduction** — NOT yet implemented.
  Producing a recipe batch does not auto-deduct ingredient stock. This is
  the remaining core F&B integration gap (deferred — requires a production
  UI + ingredient-to-InventoryItem matching + audit; recommended Build #11).

## Files modified
- `src/components/reporting/FBOperationsReports.jsx` — **new**. F&B
  operational reports component (Inventory Valuation, Purchase Summary,
  Supplier Spend, Food/Recipe Cost, Stock Variance).
- `src/pages/outlet/ReportsPage.jsx` — import + render
  `FBOperationsReports` section.

## Files refactored / removed
None — existing modules reused as-is.

## Modules completed
- F&B Operational Reports (Part F) — the genuinely-missing piece.

## Reports completed
Inventory Valuation, Purchase Summary, Supplier Spend, Food/Recipe Cost,
Stock Variance.

## Integrations completed (verified existing)
- Goods Receipt → Inventory increment + audit (Part E).
- Waste → Inventory deduction via stock adjustment + audit (Part E).
- PO Receive → Wallet debit via `actionDispatcher` (Part C).
- Recipe → Live COGS via `calculateRecipeCost` (Part D).

## Technical debt
- **Recipe production → inventory deduction** not implemented (Part E gap).
- Inventory: expiry tracking, barcode/QR, formal stock transfers,
  opening/closing stock, inventory movement history view — not built
  (lower MVP priority for the pilot tenants).
- Procurement: formal purchase requests, back-order tracking, purchase
  history view — not built.
- Recipes: batch-scaling UI, version-history UI, waste-% capture — not built.
- F&B reports are computed client-side (acceptable at MVP scale; a
  server-side `metricsEngine` rollup is the scale path).

## Estimated F&B Pack completion (conservative)
**~80%.** Inventory, Suppliers, Procurement (with goods-receipt→inventory
integration), Recipes (with live COGS), and now F&B Operational Reports are
all real and operational. The remaining 20%: recipe-production inventory
deduction, expiry/barcode/transfer features, and the deeper
finance/journal integration.

## Estimated overall MVP completion (conservative)
**~74%.** (Up from ~70% in Package #9.) The F&B pack is now operational
enough for a pilot F&B outlet to track stock, order from suppliers,
receive goods (auto-updating inventory), cost recipes, and read
operational reports — the daily F&B loop.

## Next recommended build package (ONE)
**Build Package #11 — Recipe Production inventory deduction + Sales/Finance
(Xero) integration.** Close the last F&B integration gap (producing a recipe
batch auto-deducts ingredient inventory with audit) and wire Sales
invoicing + expense records to the finance sync queue / Xero. This
completes the F&B operational loop end-to-end (procure → produce → sell →
reconcile → finance) and is the natural follow-on to the reports added
here. Per the founder's stated roadmap, Build #11 then moves into
Sales/Customers/Finance/Xero.