# ADR-0057: Build #27H.1 — Workflow Template Service & Inventory Transfer Error Contract

**Date:** 2026-08-01  
**Status:** Implemented  
**Build:** #27H.1  
**Supersedes:** None (extends ADR-0056)

---

## Context

Build #27H QA identified two verified defects:

1. **D-01 (Inventory Transfer):** `TransferDetailSheet` exposed only a generic "Action failed." message for all service-level errors, including cross-tenant denials, insufficient stock, and stale-state transitions. No structured error contract existed between the service and the frontend.

2. **D-02 (Workflow Templates):** `WorkflowTemplatesPage` performed governance-sensitive lifecycle mutations (publish, archive, restore, duplicate, new version) directly in the browser via the Base44 SDK, with fire-and-forget `auditFrontend` calls. This violated the Build #27H principle that all governance mutations must be server-authoritative with fail-closed audit.

## Decision

### Package 1: Workflow Template Server-Side Service

**New backend function: `base44/functions/workflowTemplateService/entry.ts`**

Follows the established pattern from `inventoryTransferService` (Build #27H).

**Actions:**
- `create` — Create a draft template (optionally publish immediately)
- `update` — Update a draft only (published templates are immutable)
- `publish` — Publish a draft (validates steps, sets published metadata)
- `archive` — Archive a template
- `restore` — Restore an archived template to draft
- `duplicate` — Create an independent draft copy (no parent linkage)
- `newVersion` — Create a new draft version from a published template (preserves `parent_template_id`)
- `assign` — Assign template to outlet/industry (drafts only)
- `generateWork` — Generate operational tasks from a published template

**Lifecycle Rules:**
- Draft → Published → Archived
- Restore: Archived → Draft (clears published metadata)
- Published templates are immutable — `update` rejects with `TEMPLATE_IMMUTABLE`
- Editing a published template requires creating a new version (`newVersion`)
- Publishing requires at least one valid step with a title
- Step order must be sequential

**Versioning Rules:**
- `newVersion` increments version and links to parent via `parent_template_id`
- `duplicate` creates an independent copy (version resets to 1, no parent linkage)
- Published metadata is cleared on new versions and duplicates

**Task Generation Traceability:**
- Generated Task records include `[TemplateID:<id>|v<version>]` in the description
- `module_context` is set to `workflow_template`
- `category` inherits from the template
- Duplicate generation is prevented by checking for existing template-tagged tasks
- No new task engine is created — reuses the canonical Task entity

**Audit (fail-closed):**
- `workflow_template_created`
- `workflow_template_updated`
- `workflow_template_published`
- `workflow_template_archived`
- `workflow_template_restored`
- `workflow_template_duplicated`
- `workflow_template_version_created`
- `workflow_template_assigned`
- `workflow_work_generated`

All audit events are written server-side via `writeAuditCritical`. If the audit write fails, the mutation is rolled back.

### Package 2: Inventory Transfer Structured Error Contract

**Modified: `base44/functions/inventoryTransferService/entry.ts`**

All error responses now return structured objects:
```json
{ "error": { "code": "ERROR_CODE", "message": "Safe message", "retryable": false } }
```

**Error codes:**
| Code | Description |
|------|-------------|
| `TENANT_CONTEXT_REQUIRED` | No tenant context for scoped operation |
| `PERMISSION_DENIED` | Role not authorised |
| `CROSS_TENANT_DENIED` | Transfer belongs to different tenant |
| `INVALID_TRANSITION` | Status transition not allowed |
| `STALE_TRANSFER_STATE` | Transfer modified by another user |
| `SAME_OUTLET` | Source and destination must differ |
| `INVALID_QUANTITY` | Quantity validation failed |
| `INSUFFICIENT_STOCK` | Not enough stock to dispatch |
| `STOCK_CHANGED` | Inventory changed during mutation |
| `DISCREPANCY_REQUIRED` | Receipt quantities missing |
| `CANCELLATION_NOT_ALLOWED` | Cannot cancel in current state |
| `ALREADY_PROCESSED` | Idempotent no-op rejected |
| `AUDIT_FAILURE` | Audit write failed, rolled back |
| `SERVICE_UNAVAILABLE` | Service error, retryable |
| `UNKNOWN_ERROR` | Fallback |

No stack traces, internal paths, raw payloads, or secrets are exposed.

### Package 3: Frontend Migration

**Modified: `src/pages/workspace/WorkflowTemplatesPage.jsx`**
- All lifecycle actions (publish, archive, restore, duplicate, new version) now call `workflowTemplateService` via `base44.functions.invoke`
- `auditFrontend` and `ACTION_TYPES` imports removed
- `auditWorkflowEvent` helper removed
- Inline error display with `role="alert"` and `aria-live="assertive"`
- Consolidated duplicate "New Template" actions: page header button hidden when empty state is shown

**Modified: `src/components/workflow/TemplateFormDialog.jsx`**
- Create and update now call `workflowTemplateService` instead of direct SDK calls
- Errors display the service-provided message

**Modified: `src/components/inventory/TransferDetailSheet.jsx`**
- Structured error code parsing via `ERROR_MAP`
- Persistent inline error summary with `role="alert"`, `aria-live="assertive"`, and focus management
- Error actions mapped per code (Retry, Reload, Return to Transfers, etc.)
- Form values (receipt quantities, discrepancy reasons, cancellation reason) preserved on failure
- Sheet stays open after failure
- Error clears after successful retry
- Action buttons disabled while submitting

## Security Controls

- Server resolves actor identity, role, and tenant context — never trusts client-supplied values
- Cross-tenant access denied for all actions
- Platform admin must specify explicit `tenant_id`
- Published templates cannot be edited (immutability enforced server-side)
- Worker role cannot perform any governance mutation
- No fire-and-forget audit for governance events
- No secrets in audit state snapshots
- No stack traces or internal paths in error responses

## Deferred

- **Navigation alias memoisation (D-03):** P3, no measured performance trace. Documented as technical debt only. Not implemented.

## Impact

- **Short-term:** Workflow template governance is now server-authoritative with fail-closed audit. Inventory transfer errors are structured and actionable.
- **Medium-term:** The error contract pattern can be adopted by other services.
- **Long-term:** Server-side lifecycle hardening is now the established pattern for all operational entities.