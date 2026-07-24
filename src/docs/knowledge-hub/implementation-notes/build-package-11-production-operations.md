# Build Package #11 — Production Operations + Sales Execution

> **Status:** Implemented (Production capability) — 2026-07-24
> **Phase:** Build Manifest Phase 3 (F&B operational loop)
> **Directive:** Product Authority Build Package #11

## Scope delivered this package

This package delivered the **Recipe Production capability** (Parts A, B, C, and
the production→finance-queue integration of Parts E/F), the single highest-value
coherent business capability that closes the F&B operational loop. Sales
execution (Part D) and the remaining sales/finance reporting (Parts G/H sales
reports) are documented as deferred and recommended as the immediate follow-on.

## Part A — Recipe Production (completed)
New **Production module** at `/workspace/:tenantId/production`:
- **Create Production Batch**: select an approved Recipe, enter quantity to
  produce, production date, shelf life, notes.
- **Preview ingredient consumption**: live, debounced preview computed by the
  `productionEngine` backend — shows each ingredient's required quantity
  (Σ `Recipe.ingredients[].quantity_required` × qty), available stock, and line
  cost; flags insufficient items; blocks confirm until sufficient.
- **Preview production yield**: quantity × yield unit.
- **Confirm production**: validates + deducts + records + audits + enqueues
  finance in one transactional call.
- **Cancel production**: planned/in_progress batches can be cancelled
  (completed batches are immutable — restoration deferred).
- **Production history**: full list of batches with status, qty, cost, expiry,
  and consumed ingredients.
- **Finished Goods view**: completed batches aggregated by recipe showing
  total produced units, batch count, and production cost.

## Part B — Automatic Inventory Consumption (completed)
`productionEngine` confirm action:
- **Deduct ingredient inventory automatically** — each `Recipe.ingredients`
  entry is matched to its `InventoryItem` and stock reduced by
  `quantity_required × quantity_to_produce`.
- **Insufficient inventory validation** — pre-validates ALL ingredients before
  any write; returns a structured `shortages` list and HTTP 400, no writes.
- **Never allows negative stock** — validation guarantees `new_stock ≥ 0`.
- **Transaction rollback** — if any deduction write fails, already-deducted
  items are restored to their pre-batch stock (best-effort).
- **Audit logging** — one `production_consumed` AuditLog per ingredient
  deduction (previous/new stock) + one `production_completed` audit for the
  batch. Written via `asServiceRole` for ledger immutability.
- **Multiple batches / partial production** — each confirm is one batch;
  managers can run successive batches (partial production = smaller qty).

## Part C — Finished Goods (completed)
- **ProductionBatch entity** is the finished-goods ledger: batch number,
  production date, expiry date (production_date + shelf_life_days), shelf
  life, yield (`quantity_produced` + `yield_unit`), production cost, and an
  immutable `ingredient_consumption` snapshot.
- **Finished Goods tab** aggregates completed batches by recipe into a
  sellable-stock summary (units produced, batches, cost).
- Finished-goods inventory is tracked via ProductionBatch records (completed
  = sellable). Sales-driven deduction from finished goods is Part E
  (deferred to Build #12 with Sales execution).

## Part D — Sales Execution (deferred)
`SalesInvoice` entity already supports line items, subtotal, tax, total,
`cogs_total`, `gross_profit`, payment method/status, document-AI review, and
Xero sync status — but the Sales UI currently only creates daily
reconciliations (manual P&L). A POS/invoicing UI driving `SalesInvoice` is
deferred to Build #12.

## Part E — Sales Integration (partial — production side complete)
- **Production → inventory deduction** ✅ (this package).
- **Sales → finished-goods deduction / revenue / COGS / margin / finance
  queue** — deferred to Build #12 (requires the Sales UI above).

## Part F — Finance Integration (production side complete)
- **Production → FinanceSyncQueue** ✅ — `productionEngine` creates a
  `journal_entry` queue entry (`impact_category: adjustment`,
  `financial_impact_sgd: production_cost`, `erp_target: xero`,
  `priority: end_of_shift`) for each completed batch, with the consumption
  payload. The existing `financeSyncProcessor` drains this queue to Xero.
- Accounting-ready records for **Sales, Purchases, Waste, Expenses** flow
  through existing queue types (`invoice_sync`, `po_sync`, `write_off`,
  `labour_cost`). **Production** is the new `journal_entry` source added here.
- Full Xero live sync remains Build #12 (connector authorisation).

## Part G — Operational Dashboard (partial)
Production KPIs on the Production page: Batches, Completed, Items Produced,
Production Cost. Full operational dashboard widgets (today's production,
revenue today, waste, production efficiency, top-selling, low finished
goods) deferred to Build #12/13 (depend on Sales data).

## Part H — Reports (production report added)
Extended `FBOperationsReports` on the Reports page with a **Production
(Batch Output)** card: items produced, production cost, and top recipes by
produced quantity — computed live from `ProductionBatch`. The remaining
reports (Sales, COGS, Gross Margin, Daily Operations, Waste) are deferred
to Build #12 (Sales data dependency).

## Part I — UX
Loading states (recipe load, preview debounce, confirm spinner), validation
(insufficient-stock blocking, quantity > 0), confirmation via the preview
table, error display (shortage list + inline), responsive grid/table
(mobile→desktop), accessible labels, tabular-nums for figures.

## Files modified
- `base44/entities/ProductionBatch.jsonc` — **new**. Finished-goods ledger
  entity with RLS (manager write, broader read).
- `base44/functions/productionEngine/entry.ts` — **new**. Transactional
  production engine: preview / confirm (validate→deduct→audit→enqueue) /
  cancel.
- `src/components/production/ProductionBatchForm.jsx` — **new**. Create +
  live preview + confirm UI.
- `src/components/production/ProductionHistory.jsx` — **new**. Batch history
  list.
- `src/pages/outlet/ProductionPage.jsx` — **new**. Production module page
  (New Batch / History / Finished Goods tabs) + KPIs.
- `src/App.jsx` — import + `/workspace/:tenantId/production` route.
- `src/pages/outlet/RecipesPage.jsx` — "Production" link button (discoverability).
- `src/components/reporting/FBOperationsReports.jsx` — Production report card
  + `ProductionBatch` data fetch.

## Files refactored / removed
None.

## Production features completed
Recipe production (create/preview/confirm/cancel/history), automatic
ingredient consumption with validation + rollback + audit, finished-goods
ledger (batch/expiry/shelf-life/yield/cost), production→finance queue.

## Sales features completed
None this package (deferred — `SalesInvoice` entity + daily reconciliation
already exist; POS/invoicing UI is Build #12).

## Finance integrations completed
Production cost → FinanceSyncQueue (`journal_entry`, Xero-ready) via
`productionEngine`. Drained by the existing `financeSyncProcessor`.

## Reports completed
Production (Batch Output) report added to F&B Operations Reports.

## Technical debt
- **Sales execution** (Part D) — POS/invoicing UI driving `SalesInvoice` not
  built; sales-driven finished-goods deduction + revenue/COGS/margin + sales
  finance queue not built. This is the next package.
- **Completed-batch cancellation** — cancelling a completed batch does not
  restore consumed stock (immutable by design; restoration deferred).
- **Production efficiency / waste %** widgets depend on Sales data (Build #12).
- **Manifest nav** — Production page is reachable via route + Recipes link;
  sidebar manifest entry not added (manifest-registry edit deferred).
- `productionEngine` uses `asServiceRole` for inventory mutation (robust
  transactional choice; consistent with `replenishmentEngine`).

## Estimated F&B Pack completion (conservative)
**~88%** (up from ~80%). The production loop — recipe → produce →
auto-deduct ingredients → finished goods → audit → finance queue — is now
operational end-to-end. Remaining 12%: Sales execution + sales-driven
finished-goods/COGS/finance + full Xero live sync.

## Estimated overall MVP completion (conservative)
**~78%** (up from ~74%). The F&B daily operational loop (procure → receive →
cost → produce → report) is now complete; the sell → reconcile → finance
loop is the remaining major capability.

## Next recommended build package (ONE)
**Build Package #12 — Sales Execution + Xero live sync.** Build the POS /
invoicing UI on the existing `SalesInvoice` entity (line items, tax, service
charge, discounts, refunds, cancellations, order history), wire sales to
auto-deduct finished-goods (completed ProductionBatches) and update
revenue/COGS/margin, enqueue sales to `FinanceSyncQueue`, and authorise the
Xero connector for live `financeSyncProcessor` drainage. This completes the
F&B loop (procure → produce → sell → reconcile → finance) and the founder's
stated roadmap.