import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * systemSettingsWatcher — OrbitanOS Governance Automation
 * Principle: Regulate
 *
 * Triggered by entity automation on SystemSettings create/update.
 * Writes an immutable AuditLog entry capturing every governance change.
 * Exit-Ready: pure business logic, no external dependencies.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    const changedFields = [];
    if (old_data) {
      for (const key of Object.keys(data || {})) {
        if (JSON.stringify(data[key]) !== JSON.stringify(old_data[key])) {
          changedFields.push(key);
        }
      }
    }

    const maintenanceToggled = changedFields.includes('maintenance_mode');
    const shieldToggled = changedFields.includes('shield_level');

    let actionType = 'system_settings_updated';
    let details = `SystemSettings updated. Changed fields: ${changedFields.join(', ') || 'none'}`;

    if (maintenanceToggled) {
      actionType = data.maintenance_mode ? 'maintenance_mode_activated' : 'maintenance_mode_deactivated';
      details = data.maintenance_mode
        ? `⚠️ MAINTENANCE MODE ACTIVATED by platform operator. Message: "${data.maintenance_message || 'N/A'}"`
        : `✅ MAINTENANCE MODE DEACTIVATED. Platform restored to full operation.`;
    } else if (shieldToggled) {
      actionType = `shield_level_changed_to_${data.shield_level}`;
      details = `Orbitan Shield™ level changed from "${old_data?.shield_level || 'auditor'}" to "${data.shield_level}".`;
    }

    await base44.asServiceRole.entities.AuditLog.create({
      tenant_id: 'platform',
      actor_id: 'system_automation',
      actor_name: 'OrbitanOS Orchestrator',
      actor_role: 'admin',
      action_type: actionType,
      module: 'system',
      target_entity: 'SystemSettings',
      target_record_id: data?.id || 'singleton',
      previous_state: old_data || null,
      new_state: data || null,
      details,
    });

    return Response.json({ success: true, action_logged: actionType });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});