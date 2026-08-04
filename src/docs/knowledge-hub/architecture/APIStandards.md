---
title: Orbitan API Standards
category: Architecture
owner: Product Architecture
status: Active
version: 1.0
last_updated: 2026-07-13
related:
  - PlatformArchitecture.md
  - DataArchitecture.md
  - EngineeringPrinciples.md
tags:
  - API
  - REST
  - backend-functions
  - authentication
  - security
  - versioning
  - contracts
---

# Orbitan API Standards

## Purpose

Defines API standards, backend function contracts, authentication, security, rate limits, versioning, and documentation for all OrbitanOS backend functions.

## REST APIs (Backend Functions)

All business logic lives in backend functions (`/base44/functions/{functionName}/entry.ts`). These are HTTP handlers that:
1. Authenticate the user via `base44.auth.me()`
2. Validate input
3. Execute business logic
4. Return JSON responses

### Function Pattern
```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // ... business logic
    return Response.json({ success: true, data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### Frontend Invocation
```javascript
import { base44 } from "@/api/base44Client";
const response = await base44.functions.invoke('functionName', { param: "value" });
// response.data contains the function's return value
```

## Function Contracts

### financeController
- **Actions:** `verify_document`, `sync_invoice`, `sync_purchase_order`, `get_sync_status`
- **Access:** admin, tenant_admin, outlet_manager
- **Purpose:** Financial document workflows — verification, Xero sync, status queries

### replenishmentEngine
- **Actions:** `run_analysis`, `dismiss_alert`, `create_po_from_alert`
- **Access:** admin, tenant_admin, outlet_manager
- **Trigger:** Scheduled automation + manual trigger

### clockController
- **Actions:** `clock_in`, `clock_out`, `get_shift_status`
- **Access:** admin, outlet_manager, supervisor, worker (own records only)
- **Purpose:** Clock-in/out with GPS verification, photo capture, labour cost calculation

### nexus
- **Actions:** Routes to AI service functions (nexusFeedbackAnalyst, sopGenerator, etc.)
- **Access:** Authenticated users with AI entitlement
- **Purpose:** AI gateway with usage metering and wallet debit

## Authentication

- Every backend function authenticates via `base44.auth.me()`
- Admin-only functions verify `user.role === 'admin'` and return 403 otherwise
- Webhook endpoints validate request authenticity (Stripe signature verification, shared secrets)
- No local imports between backend functions — each deploys independently

## Security

- All API calls over HTTPS
- Secrets stored as environment variables, never in code
- OAuth credentials stored per-tenant in `IntegrationCredential` entity
- Shield governance interceptor evaluates policies before sensitive writes
- Admin-only functions return 403 for non-admin users

## Rate Limits

- Platform-managed rate limits (Base44 infrastructure)
- AI requests metered via `OrbitUsageTracker` (credit-based, not time-based)
- `OrbitanWallet.balance_credits` gates AI usage

## Versioning

- Backend functions are versioned via the `@base44/sdk` version (currently `0.8.38`)
- Entity schemas versioned via `manifest_version` field (on registry entities)
- API contracts documented in this file — changes require contract updates

## Documentation

Every cross-module function call must document:
- **Function name** (e.g., `nexus`)
- **Service key** (e.g., `ocr_receipt`)
- **Input schema** (what params are expected)
- **Output schema** (what the response looks like)
- **Fallback behaviour** (what happens if the function is unavailable)

## Standard Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHORISED` | User role does not have permission |
| `NOT_FOUND` | The requested record does not exist |
| `VALIDATION_ERROR` | Required fields missing or data fails business rules |
| `ALREADY_CLOCKED_IN` | Employee already has an active clock-in record |
| `XERO_ERROR` | Xero API returned an error |
| `TENANT_MISMATCH` | Record does not belong to the requesting tenant |

## Interface-First Constraint

All cross-module communication uses `base44.functions.invoke()` — no direct imports. This ensures independent deployability.

## Future: GraphQL

GraphQL is not implemented. REST via backend functions is the standard. GraphQL could be considered post-MVP for complex query needs.

## Related Documents

- [PlatformArchitecture.md](./PlatformArchitecture.md) — Platform architecture
- [DataArchitecture.md](./DataArchitecture.md) — Data models
- [EngineeringPrinciples.md](./EngineeringPrinciples.md) — Engineering standards