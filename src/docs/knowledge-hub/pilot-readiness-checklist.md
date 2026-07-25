# OrbitanOS — Pilot Readiness Checklist (Deterministic)

> Computed by the `pilotReadiness` function (rule set `pilot-readiness-v1`).
> Readiness % = completed weight ÷ total weight × 100. Explainable. No
> fabricated values.

## Critical blockers (incomplete ⇒ cannot be "Ready")
| Item | Category | Source | Weight |
| :--- | :--- | :--- | :--- |
| Outlet configured | Organisation | auto | 10 |
| Leader assigned | People | auto | 8 |
| Workers invited/added | People | auto | 7 |
| Inventory items added | Inventory & Recipes | auto | 8 |
| Sale tested | Sales & Finance | auto | 10 |

## Full checklist (22 items)
### Organisation (20)
- Tenant configured — auto — 5
- Company/Brand configured — auto — 5
- Outlet configured — auto — 10 ⚠ critical

### People (23)
- Leader assigned — auto — 8 ⚠ critical
- Workers invited/added — auto — 7 ⚠ critical
- Permissions reviewed — manual — 4
- Attendance settings configured — auto — 5
- Scheduling configured — auto — 4

### Inventory & Recipes (20)
- Inventory items added — auto — 8 ⚠ critical
- Suppliers added — auto — 4
- Recipes added — auto — 4
- Opening stock entered — auto — 4

### Operations (5)
- Production tested — auto — 5

### Sales & Finance (24)
- Sale tested — auto — 10 ⚠ critical
- Daily reconciliation tested — auto — 5
- Finance account mappings complete — auto — 5
- Xero status reviewed — manual — 4

### Governance (10)
- Compliance configured — auto — 4
- Security review complete — manual — 6

### Intelligence (5)
- Orbit Nexus data available — auto — 5

### Pilot Controls (8)
- Pilot owner confirmed — manual — 4
- Support contact confirmed — manual — 4

## Go-live recommendation logic
- **Not Ready:** any critical blocker incomplete OR readiness < 60%.
- **Conditionally Ready:** 60-89% AND no critical blockers AND (pilot owner /
  support contact / security review pending).
- **Ready for Controlled Pilot:** ≥90% AND no critical blockers AND all
  manual attestation flags set.

## Manual attestation
- Set via the Pilot Readiness Dashboard (`/platform/pilot-readiness`) —
  tenant admin / platform admin only.