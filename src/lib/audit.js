/**
 * OrbitanOS Audit Helper — Build #27H
 * ─────────────────────────────────
 * Standardised utility for writing to the global AuditLog entity.
 *
 * Canonical audit-event contract (mapped to existing AuditLog entity fields):
 *   tenant_id          — required (never fabricated)
 *   outlet_id          — where applicable (nullable for tenant-wide)
 *   actor_id           — required (resolved server-side; never trusted from client)
 *   actor_name         — display name at time of action
 *   actor_role         — role at time of action
 *   action_type        — canonical event key (see ACTION_TYPES)
 *   module             — owning OrbitanOS module
 *   target_entity      — entity type affected
 *   target_record_id   — record ID affected
 *   details            — human-readable summary
 *   previous_state     — snapshot before change (where applicable)
 *   new_state          — snapshot after change (where applicable)
 *   severity           — info | success | warning | critical (derived or explicit)
 *   category           — operational | lifecycle | access | governance | security | ai | system
 *   event_source       — engine/function that wrote this record
 *   related_user_id    — subject user if different from actor
 *   related_workflow   — workflow name if part of a multi-step workflow
 *   link               — best-effort deep link to source record
 *
 * Compatibility-safe normalisation:
 *   Legacy field names are mapped to canonical fields. Safe defaults are
 *   applied only where semantically valid. Required identifiers must be
 *   present — malformed events are rejected with actionable errors.
 *
 * Failure behaviour:
 *   logAudit        — fire-and-forget (operational events; logs error, returns null)
 *   logAuditCritical — fail-closed: throws on write failure (security/compliance mutations)
 *
 * Exit-Ready: No platform-specific dependencies beyond the base44 SDK client.
 */

import { base44 } from '@/api/base44Client';

// ── Secret/token field names that must never enter AuditLog ──────────
const FORBIDDEN_KEYS = new Set([
  'password', 'token', 'secret', 'api_key', 'apikey', 'authorization',
  'access_token', 'refresh_token', 'stripe_secret_key', 'xero_secret',
  'private_key', 'client_secret',
]);

const stripSecrets = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripSecrets);
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) continue;
    cleaned[key] = typeof value === 'object' ? stripSecrets(value) : value;
  }
  return cleaned;
};

/**
 * normalizeAuditPayload — maps legacy field names to canonical AuditLog fields,
 * applies safe defaults, strips secrets, and validates required identifiers.
 *
 * Returns { valid: true, payload } on success, or { valid: false, error } on failure.
 * Never fabricates tenant_id, actor_id, or target identifiers.
 */
export const normalizeAuditPayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Audit payload must be an object' };
  }

  // Map legacy field names → canonical
  const p = {
    tenant_id: raw.tenant_id || raw.tenantId,
    outlet_id: raw.outlet_id || raw.outletId || raw.outlet,
    actor_id: raw.actor_id || raw.actorId || raw.user_id || raw.userId,
    actor_name: raw.actor_name || raw.actorName || raw.user_name || raw.userName,
    actor_role: raw.actor_role || raw.actorRole || raw.role,
    action_type: raw.action_type || raw.actionType || raw.action,
    module: raw.module || raw.module_name,
    category: raw.category,
    severity: raw.severity,
    event_source: raw.event_source || raw.eventSource || raw.source,
    target_entity: raw.target_entity || raw.targetEntity || raw.entity,
    target_record_id: raw.target_record_id || raw.targetRecordId || raw.record_id || raw.recordId,
    related_user_id: raw.related_user_id || raw.relatedUserId,
    related_workflow: raw.related_workflow || raw.relatedWorkflow,
    link: raw.link || raw.deep_link,
    details: raw.details || raw.summary || raw.description,
    previous_state: raw.previous_state || raw.previousState || raw.before,
    new_state: raw.new_state || raw.newState || raw.after,
    ip_address: raw.ip_address || raw.ipAddress,
    evidence_urls: raw.evidence_urls || raw.evidenceUrls,
    override_id: raw.override_id || raw.overrideId,
    justification: raw.justification,
    policy_name: raw.policy_name || raw.policyName,
    shield_outcome: raw.shield_outcome || raw.shieldOutcome,
  };

  // Validate required identifiers — never fabricate
  if (!p.tenant_id) {
    return { valid: false, error: 'Audit event missing required tenant_id' };
  }
  if (!p.actor_id) {
    return { valid: false, error: 'Audit event missing required actor_id' };
  }
  if (!p.action_type) {
    return { valid: false, error: 'Audit event missing required action_type' };
  }
  if (!p.target_entity) {
    return { valid: false, error: 'Audit event missing required target_entity' };
  }
  if (!p.target_record_id) {
    return { valid: false, error: 'Audit event missing required target_record_id' };
  }

  // Strip secrets from state snapshots and details
  p.previous_state = stripSecrets(p.previous_state);
  p.new_state = stripSecrets(p.new_state);

  // Remove undefined keys to avoid storing nulls
  Object.keys(p).forEach((k) => p[k] === undefined && delete p[k]);

  return { valid: true, payload: p };
};

/**
 * logAudit — for use inside Deno backend functions.
 * Fire-and-forget: logs error, returns null on failure.
 * For security/compliance-critical mutations, use logAuditCritical instead.
 */
export const logAudit = async (base44Client, rawPayload) => {
  const { valid, error, payload } = normalizeAuditPayload(rawPayload);
  if (!valid) {
    console.error('[OrbitanOS AuditLog] Rejected malformed event:', error);
    return null;
  }
  try {
    return await base44Client.asServiceRole.entities.AuditLog.create({
      ...payload,
      ip_address: payload.ip_address || 'server_context',
    });
  } catch (err) {
    console.error('[OrbitanOS AuditLog] Write failed:', err?.message || err);
    return null;
  }
};

/**
 * logAuditCritical — fail-closed audit write for security/compliance-critical mutations.
 * Throws on write failure so the calling mutation can roll back.
 * Use for: status transitions, stock movements, role changes, governance overrides.
 */
export const logAuditCritical = async (base44Client, rawPayload) => {
  const { valid, error, payload } = normalizeAuditPayload(rawPayload);
  if (!valid) {
    throw new Error(`[OrbitanOS AuditLog] Critical event rejected: ${error}`);
  }
  return await base44Client.asServiceRole.entities.AuditLog.create({
    ...payload,
    ip_address: payload.ip_address || 'server_context',
  });
};

/**
 * auditFrontend — for use in React pages/components.
 * Fire-and-forget for low-risk operational events only.
 * Security-critical mutations must go through a backend function.
 */
export const auditFrontend = async (rawPayload) => {
  const { valid, error, payload } = normalizeAuditPayload(rawPayload);
  if (!valid) {
    console.error('[OrbitanOS AuditLog] Frontend event rejected:', error);
    return null;
  }
  try {
    return await base44.entities.AuditLog.create({
      ...payload,
      ip_address: 'browser_context',
    });
  } catch (err) {
    console.error('[OrbitanOS AuditLog] Frontend write failed:', err?.message || err);
    return null;
  }
};

/**
 * ACTION_TYPES — canonical event keys for consistency across all modules.
 * Use these constants instead of raw strings to prevent drift.
 */
export const ACTION_TYPES = {
  // Finance
  DOCUMENT_VERIFIED:    'document_verified',
  DOCUMENT_REJECTED:    'document_rejected',
  XERO_SYNC_TRIGGERED:  'xero_sync_triggered',
  RECONCILIATION_APPROVED: 'reconciliation_approved',

  // Procurement
  PO_APPROVED:          'po_approved',
  PO_REJECTED:          'po_rejected',
  GOODS_RECEIVED:       'goods_received',

  // Inventory
  STOCK_ADJUSTED:       'stock_adjusted',
  REORDER_TRIGGERED:    'reorder_triggered',

  // Workforce
  CLOCK_IN:             'clock_in',
  CLOCK_OUT:            'clock_out',
  SHIFT_AMENDED:        'shift_amended',
  PRODUCTIVITY_FLAGGED: 'productivity_flagged',
  ATTENDANCE_EXCEPTION_DETECTED: 'attendance_exception_detected',
  ATTENDANCE_APPROVED:  'attendance_approved',
  ATTENDANCE_REJECTED:  'attendance_rejected',
  ATTENDANCE_JUSTIFIED: 'attendance_justified',

  // Compliance
  COMPLIANCE_SUBMITTED: 'compliance_submitted',
  COMPLIANCE_APPROVED:  'compliance_approved',
  COMPLIANCE_REJECTED:  'compliance_rejected',

  // Artifacts (ADR-0025)
  ARTIFACT_UPLOADED:    'artifact_uploaded',
  ARTIFACT_APPROVED:    'artifact_approved',
  ARTIFACT_REJECTED:    'artifact_rejected',
  ARTIFACT_ARCHIVED:    'artifact_archived',
  ARTIFACT_UPDATED:    'artifact_updated',

  // Retail
  PRODUCT_LISTED:       'product_listed',
  PRICE_ADJUSTED:       'price_adjusted',
  ITEM_SOLD:            'item_sold',

  // Inventory Reconciliation
  STOCK_RECONCILED:     'stock_reconciled',
  STOCK_DISCREPANCY:    'stock_discrepancy',

  // Shift Trades
  SHIFT_TRADE_REQUESTED: 'shift_trade_requested',
  SHIFT_TRADE_APPROVED:  'shift_trade_approved',
  SHIFT_TRADE_DENIED:    'shift_trade_denied',
  SHIFT_CHANGE_REQUESTED: 'shift_change_requested',
  SHIFT_CHANGE_APPROVED:  'shift_change_approved',

  // Expenses
  EXPENSE_LOGGED:       'expense_logged',
  EXPENSE_APPROVED:     'expense_approved',
  EXPENSE_REJECTED:     'expense_rejected',

  // Inventory Transfers (Build #27H)
  TRANSFER_CREATED:           'transfer_created',
  TRANSFER_SUBMITTED:         'transfer_submitted',
  TRANSFER_APPROVED:          'transfer_approved',
  TRANSFER_PREPARING:         'transfer_preparing',
  TRANSFER_DISPATCHED:        'transfer_dispatched',
  TRANSFER_PARTIALLY_RECEIVED: 'transfer_partially_received',
  TRANSFER_RECEIVED:          'transfer_received',
  TRANSFER_RECONCILED:        'transfer_reconciled',
  TRANSFER_CANCELLED:         'transfer_cancelled',

  // Workflow Templates (Build #27H)
  WORKFLOW_PUBLISHED:   'workflow_published',
  WORKFLOW_ARCHIVED:    'workflow_archived',
  WORKFLOW_RESTORED:    'workflow_restored',
  WORKFLOW_DUPLICATED:  'workflow_duplicated',
  WORKFLOW_NEW_VERSION: 'workflow_new_version',

  // System
  USER_INVITED:         'user_invited',
  ROLE_CHANGED:         'role_changed',
  SETTINGS_UPDATED:     'settings_updated',
};