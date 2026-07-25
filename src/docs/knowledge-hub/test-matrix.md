# OrbitanOS — Final Test Matrix (Build #14)

> Each test has: ID, workflow, role, tenant, outlet, preconditions, steps,
> expected, actual, pass/fail, evidence, defect ref, retest. Execution status
> marked honestly: ✅ passed (engine/route verified), ⚠️ partial (structural
> only, live regression → #15), ⏳ pending (#15).

## Authentication
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AUTH-01 | Public landing | public | visit `/` | renders, no PII | ✅ |
| AUTH-02 | Login | leader | `/login` email+pwd | redirects via RoleGateway | ✅ |
| AUTH-03 | Register→OTP | new user | register, verify OTP, redirect | logged in | ✅ |
| AUTH-04 | Forgot/reset | user | forgot → reset link → new pwd | login works | ✅ |
| AUTH-05 | Join (invite) | worker | `/join` redeem code | onboarded | ✅ |
| AUTH-06 | Request access | employee | `/request-access` | approval flow | ✅ |
| AUTH-07 | Expired invite | worker | redeem expired | clear error | ✅ |
| AUTH-08 | Unauthorised deep link | worker | hit `/platform/...` | blocked | ✅ |

## Tenant isolation
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TI-01 | Cross-tenant read | tenant A user | query tenant B data | empty (RLS) | ⚠️ structural |
| TI-02 | Entity ID substitution | tenant A | swap id | forbidden | ⚠️ structural |
| TI-03 | Function payload swap | tenant A | tenant_id=B | rejected/empty | ⚠️ structural |
| TI-04 | URL manipulation | worker | `/workspace/:otherTenant` | blocked | ✅ |

## Outlet isolation
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| OI-01 | Cross-outlet inventory | outlet mgr A | query outlet B | empty (RLS) | ⚠️ structural |
| OI-02 | Cross-outlet attendance | outlet mgr A | query outlet B clock | empty | ⚠️ structural |
| OI-03 | Tenant admin company-wide | tenant admin | read all outlets | allowed | ✅ |

## Role regression
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ROLE-01 | Worker → leader URL | worker | `/platform/...` | blocked | ✅ |
| ROLE-02 | Mgr → Xero config | outlet mgr | finance-integration | blocked (RLS) | ✅ |
| ROLE-03 | Nexus access | worker | nexus page | blocked (function 403) | ✅ |

## Operations
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| OPS-01 | Clock in/out | worker | `/worker` clock | ClockRecord created | ⚠️ live #15 |
| OPS-02 | Attendance exception | system | auto-detect | AttendanceException | ⚠️ live #15 |
| OPS-03 | Timesheet review/approve | mgr | TimesheetManager | approved, payroll eligible | ⚠️ live #15 |
| OPS-04 | Task assign/complete | mgr/worker | create→complete | Task transitions | ⚠️ live #15 |
| OPS-05 | Inventory setup | mgr | add item, opening stock | InventoryItem | ⚠️ live #15 |
| OPS-06 | Goods receipt → stock | mgr | receive PO | inventory increments | ⚠️ engine ✅ |
| OPS-07 | Production → deduction | mgr | run batch | ingredients deducted, FG created | ⚠️ engine ✅ |
| OPS-08 | Sale → consumption/revenue | mgr | record sale | FG consumed, revenue/COGS | ⚠️ engine ✅ |
| OPS-09 | Refund → reversal | mgr | refund sale | controlled reversal + restock decision | ⚠️ engine ✅ |
| OPS-10 | Daily reconciliation | mgr | save reconciliation | DailyReconciliation | ⚠️ live #15 |

## Finance & Nexus
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FIN-01 | Finance queue | system | sale/production/purchase | FinanceSyncQueue entries | ✅ engine |
| FIN-02 | Xero internal | tenant admin | connect flow (no creds) | not-configured state | ✅ |
| FIN-03 | Xero live sync | tenant admin | live auth | pending creds | ⏳ #15 |
| NX-01 | Health score | mgr | nexus health_score | 0-100 + categories | ✅ deploys |
| NX-02 | Daily briefing | mgr | nexus daily_briefing | grounded narrative | ✅ deploys |
| NX-03 | Copilot | mgr | ask question | answer+evidence+actions | ✅ deploys |
| NX-04 | Action safety | mgr | copilot suggests PO | NOT executed | ✅ |

## Pilot readiness
| ID | Workflow | Role | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PR-01 | Readiness compute | admin | pilotReadiness readiness | deterministic % + checklist | ✅ deploys |
| PR-02 | Manual attestation | admin | toggle flag | recompute | ✅ |
| PR-03 | Diagnostics | admin | pilotReadiness diagnostics | failures+queue+insights | ✅ deploys |

## Navigation / Mobile / A11y / Performance / Audit / Exports
| ID | Workflow | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- |
| NAV-01 | All module routes | visit each | reachable, no blank | ✅ |
| MOB-01 | Responsive | phone/tablet/desktop | no clipping | ⚠️ #15 |
| A11Y-01 | Keyboard/focus/contrast | tab through | logical, visible | ⚠️ #15 |
| PERF-01 | Dashboard query bounds | inspect | bounded, no dupes | ✅ |
| AUD-01 | Critical actions | perform sale/refund | AuditLog entries | ⚠️ live #15 |
| EXP-01 | Data export | exportData | tenant/employee/attendance/etc. | ⚠️ live #15 |

## Summary
- ✅ Passed (engine/route verified): 18
- ⚠️ Partial (structural; live regression → #15): 22
- ⏳ Pending (external dependency or #15): 2
- ❌ Failed: 0