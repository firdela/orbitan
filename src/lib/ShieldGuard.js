/**
 * OrbitanOS — ShieldGuard Utility
 * The "Shield-Certified" contract for sensitive module operations.
 * 
 * This is the centralized gatekeeper that all finance (and future domain) 
 * modules must invoke before writing to the database.
 * 
 * Usage:
 *   const shieldResult = await ShieldGuard.check(base44, {
 *     entity_name: 'SalesInvoice',
 *     action: 'create',
 *     data: invoiceData,
 *     tenant_id: tenantId
 *   });
 * 
 *   if (!shieldResult.allowed) {
 *     // Trigger GovernanceOverride UI
 *     return { blocked: true, context: shieldResult.override_context };
 *   }
 */

import { base44 } from '@/api/base44Client';

export const ShieldGuard = {
  /**
   * Evaluate Shield policies for a given action.
   * Returns the shield interceptor response.
   */
  check: async (base44Client, payload) => {
    const { entity_name, action, data, tenant_id } = payload;

    if (!entity_name || !action) {
      throw new Error('ShieldGuard: entity_name and action are required');
    }

    try {
      const response = await base44Client.functions.invoke('shieldInterceptor', {
        action,
        entity_name,
        data,
        tenant_id
      });

      return response.data;
    } catch (error) {
      // If shieldInterceptor fails, we fail-closed (block by default)
      console.error('[ShieldGuard] Shield evaluation failed:', error);
      return {
        allowed: false,
        effect: 'block',
        policy_name: 'shield_error',
        reason: 'Shield evaluation failed. Action blocked for safety.',
        shield_mode: 'guardian',
        error: error.message
      };
    }
  },

  /**
   * Create a GovernanceOverride request when shield blocks an action.
   * This is the "Manager-in-the-Loop" workflow entry point.
   */
  requestOverride: async (base44Client, overrideContext, requesterNotes) => {
    const {
      target_entity,
      target_record_id,
      block_reason,
      request_type,
      policy_effect,
      condition_triggered
    } = overrideContext;

    const user = await base44Client.auth.me();

    const overrideRecord = await base44Client.entities.GovernanceOverride.create({
      tenant_id: user.data?.tenant_id,
      outlet_id: user.data?.outlet_id || null,
      request_type: request_type || 'custom',
      target_entity: target_entity,
      target_record_id: target_record_id || null,
      policy_name: 'shield_blocked_action',
      block_reason: block_reason,
      requested_by_id: user.id,
      requested_by_name: user.full_name,
      requested_by_role: user.role,
      requested_date: new Date().toISOString(),
      requester_notes: requesterNotes || 'Override requested via ShieldGuard',
      status: 'pending',
      shield_mode: 'guardian',
      severity: 'high',
      expiry_date: new Date(Date.now() + 7 * 86400000).toISOString() // 7 days
    });

    // Log the override request to AuditLog
    await base44Client.entities.AuditLog.create({
      tenant_id: user.data?.tenant_id,
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: user.role,
      action_type: 'override_requested',
      module: 'compliance',
      target_entity: 'GovernanceOverride',
      target_record_id: overrideRecord.id,
      details: `Governance override requested: ${request_type} for ${target_entity}`,
      new_state: {
        request_type,
        target_entity,
        block_reason,
        status: 'pending'
      }
    });

    return overrideRecord;
  },

  /**
   * Check if a user has approval authority for overrides.
   * Returns true for admin, tenant_admin, outlet_manager, supervisor.
   */
  canApproveOverrides: (user) => {
    const approverRoles = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];
    return approverRoles.includes(user?.role);
  }
};

export default ShieldGuard;