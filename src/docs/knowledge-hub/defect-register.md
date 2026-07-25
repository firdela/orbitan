# OrbitanOS — Defect Register

> Updated 2026-07-25 (Build #15). Honest record. Defects found, fixed, and retested.
> S1/S2 defects are not left unresolved without a stated blocker.

## Resolved defects (Build #15)

| ID | Severity | Module | Affected roles | Tenant/Outlet impact | Root cause | Fix | Files changed | Retest |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DEF-001 | S2 | Sales / Finance | outlet mgr, tenant admin | Wrong discount rate sent to Xero on sale sync | `DiscountRate` math grouped as `1 - (total/gross)*100` instead of `(1 - total/gross)*100`, yielding ~-99% for full-price lines | Corrected to `(1 - total/gross)*100` | `salesEngine/entry.ts` | ✅ function redeploys (validation intact); math verified by inspection (0% no-discount, 25% for $5 off $20) |
| DEF-002 | S2 | Sales / Finance | outlet mgr, tenant admin | Refund amount not validated against invoice total — could refund more than sale | No upper-bound clamp on `payload.amount` | Clamp refund to `inv.total`; reject ≤ 0 | `salesEngine/entry.ts` | ✅ function redeploys (refund path intact) |
| DEF-003 | S2 | Sales | outlet mgr | Invoice number collision risk (last-6ms repeats within same ms) | `Date.now().slice(-6)` not guaranteed unique | Added 2-char random suffix | `salesEngine/entry.ts` | ✅ redeploys |
| DEF-004 | S2 | Production | outlet mgr, tenant admin | Duplicate batch numbers after any batch deletion (sequence derived from count) | `batchSeq = existingBatches.length + 1` — drops on delete; also unbounded fetch | Timestamp + random unique reference; removed unbounded fetch | `productionEngine/entry.ts` | ✅ redeploys (confirm path intact) |
| DEF-005 | S3 | Replenishment (perf) | system autopilot | Unbounded inventory + sales fetches | Missing `limit` | Bounded to 500 / 200 | `replenishmentEngine/entry.ts` | ✅ redeploys |

## Open defects
| ID | Severity | Module | Status | Blocker |
| :--- | :--- | :--- | :--- | :--- |
| (none) | — | — | — | — |

## Notes
- All 5 defects found by source inspection of the transactional engines during Build #15; all fixed directly and the functions verified to redeploy without breaking validation gates.
- DEF-001 would only have manifested once Xero live sync connects (pending credentials) — fixed pre-emptively per Part H/I integrity requirements.
- Full before/after inventory-state regression (real seed data) is **pending manual execution** — requires a provisioned pilot tenant + auth users, which cannot be created in-app (platform owns auth). Engine logic verified by inspection + redeploy.

## Severity scale
- S1 Critical — blocker preventing core ops.
- S2 High — major defect / data integrity, workaround may exist.
- S3 Medium — perf / minor.
- S4 Low — cosmetic.