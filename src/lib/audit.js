/**
 * OrbitanOS Audit Helper
 * ─────────────────────
 * Standardised utility for writing to the global AuditLog entity.
 * Exit-Ready: No platform-specific dependencies beyond the base44 SDK client.
 *
 * Usage (backend functions):
 *   import { logAudit } from '../lib/audit.js';
 *   await logAudit(base44, { tenant_id, actor_id, actor_name, action_type, module, target_entity, target_record_id, previous_state, new_state, details });
 *
 * Usage (frontend via SDK):
 *   import { auditFrontend } from '@/lib/audit.js';
 *   await auditFrontend({ tenant_id, actor_id, actor_name, action_type, module, target_entity, target_record_id, details });
 */

import { base44 } from '@/api/base44Client';

/**
 * logAudit — for use inside Deno backend functions.
 * Accepts a pre-initialised base44 service-role client.
 */
export const logAudit = async (base44Client, payload) => {
  try {
    return await base44Client.asServiceRole.entities.AuditLog.create({
      ...payload,
      ip_address: payload.ip_address || 'server_context',
    });
  } catch (err) {
    // Never throw — audit failure must not block the primary operation
    console.error('[OrbitanOS AuditLog] Write failed:', err?.message || err);
    return null;
  }
};

/**
 * auditFrontend — for use in React pages/components.
 * Uses the shared base44 client directly.
 */
export const auditFrontend = async (payload) => {
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

  // Compliance
  COMPLIANCE_SUBMITTED: 'compliance_submitted',
  COMPLIANCE_APPROVED:  'compliance_approved',
  COMPLIANCE_REJECTED:  'compliance_rejected',

  // Retail
  PRODUCT_LISTED:       'product_listed',
  PRICE_ADJUSTED:       'price_adjusted',
  ITEM_SOLD:            'item_sold',

  // System
  USER_INVITED:         'user_invited',
  ROLE_CHANGED:         'role_changed',
  SETTINGS_UPDATED:     'settings_updated',
};