import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ============================================================
// OrbitanOS Orbit Notification Engine (ADR-0031, ADR-0053)
//
// The canonical event → delivery pipeline for the entire Orbit
// ecosystem. Decouples notification *trigger* (the platform event)
// from *delivery* (the channel + copy).
//
// Two invocation modes:
//
// 1. DIRECT — modules call with an explicit payload:
//    { template_key, tenant_id, outlet_id?, recipient_resolver,
//      context, source_entity?, source_id?, link? }
//    recipient_resolver:
//      { type: 'outlet_managers' | 'tenant_admins' | 'explicit',
//        user_ids?: string[] }
//      OR { type: 'assignee', user_id }  (single user)
//      OR omit + pass recipient_emails/recipient_user_ids directly
//
// 2. AUTOMATION — entity automations fire this function with:
//    { event: { type, entity_name, entity_id }, data, old_data,
//      changed_fields, payload_too_large? }
//    The event adapter map derives template_key + resolver + context
//    from the entity. No business logic is duplicated — the adapter
//    only reads fields already on the source record.
//
// Delivery channels (ADR-0053):
//   in_app  → creates an OrbitInbox record per recipient (NEW)
//   email   → SendEmail per recipient (existing)
//   webhook → reserved (logged, future adapter)
//   push/sms/slack/teams/whatsapp → reserved (future adapters)
//
// Recipient preferences (NotificationPreference) gate delivery:
//   muted         → skip in_app + push
//   min_priority  → skip in_app if item priority is below the floor
// ============================================================

// ── Priority ordering for min_priority comparison ──
const PRIORITY_RANK = { informational: 0, normal: 1, important: 2, critical: 3 };

// ── Event Adapters ──
// Each adapter receives (data, old_data, changed_fields) and returns a
// dispatch payload, or null to skip (event not notifiable).
const EVENT_ADAPTERS = {
  ReplenishmentAlert: (data) => {
    // Only notify on open alerts (not already-resolved)
    if (data.status && data.status !== 'open') return null;
    return {
      template_key: 'replenishment_alert',
      inbox_category: 'inventory',
      tenant_id: data.tenant_id,
      outlet_id: data.outlet_id,
      recipient_resolver: { type: 'outlet_managers' },
      context: {
        item_name: data.inventory_item_name || 'Inventory item',
        current_stock: data.current_stock ?? '—',
        reorder_point: data.reorder_point ?? '—',
        days_until_stockout: data.days_until_stockout ?? '—',
        urgency: data.urgency || 'medium',
        suggested_qty: data.suggested_order_qty ?? '—',
        supplier_name: data.supplier_name || '—',
      },
      source_entity: 'ReplenishmentAlert',
      source_id: data.id,
      link: `/workspace/${data.tenant_id}/inventory`,
    };
  },

  Task: (data, _old_data, changed_fields) => {
    // Notify on create, or when reassigned (responsible_agent_id changed)
    const isCreate = !_old_data;
    const reassigned = changed_fields && changed_fields.includes('responsible_agent_id');
    if (!isCreate && !reassigned) return null;
    return {
      template_key: 'task_assigned',
      inbox_category: 'assignment',
      tenant_id: data.tenant_id,
      outlet_id: data.outlet_id,
      recipient_resolver: { type: 'assignee', user_id: data.responsible_agent_id },
      context: {
        task_title: data.title || 'Task',
        due_date: data.due_date || '—',
        priority: data.priority || 'medium',
        module: data.module_context || data.category || 'operations',
      },
      source_entity: 'Task',
      source_id: data.id,
      link: `/workspace/${data.tenant_id}/tasks`,
    };
  },

  ComplianceRecord: (data, old_data, changed_fields) => {
    // Notify when status transitions TO overdue
    const becameOverdue = changed_fields && changed_fields.includes('status')
      && data.status === 'overdue'
      && (!old_data || old_data.status !== 'overdue');
    if (!becameOverdue) return null;
    return {
      template_key: 'compliance_overdue',
      inbox_category: 'compliance',
      tenant_id: data.tenant_id,
      outlet_id: data.outlet_id,
      recipient_resolver: { type: 'outlet_managers' },
      context: {
        record_title: data.title || data.type || 'Compliance record',
        record_type: data.type || 'Compliance',
        due_date: data.due_date || '—',
        category: data.category || 'other',
      },
      source_entity: 'ComplianceRecord',
      source_id: data.id,
      link: `/workspace/${data.tenant_id}/compliance`,
    };
  },
};

// ── Resolve recipients from a resolver hint ──
async function resolveRecipients(base44, resolver, tenant_id, outlet_id) {
  if (!resolver) return [];
  const { type, user_id, user_ids } = resolver;

  if (type === 'explicit' && Array.isArray(user_ids)) {
    return user_ids.map((id) => ({ id }));
  }

  if (type === 'assignee' && user_id) {
    return [{ id: user_id }];
  }

  // outlet_managers / tenant_admins → query User entity
  let users = [];
  try {
    users = await base44.asServiceRole.entities.User.filter(
      { 'data.tenant_id': tenant_id },
      '-created_date', 100
    );
  } catch (e) {
    console.error('[notificationEngine] User query failed:', e?.message || e);
    return [];
  }

  const managerRoles = ['admin', 'tenant_admin', 'outlet_manager', 'supervisor'];
  const adminRoles = ['admin', 'tenant_admin'];

  if (type === 'outlet_managers') {
    return users.filter((u) => {
      if (!managerRoles.includes(u.role)) return false;
      if (u.role === 'admin' || u.role === 'tenant_admin') return true;
      return u.data && u.data.outlet_id === outlet_id;
    });
  }

  if (type === 'tenant_admins') {
    return users.filter((u) => adminRoles.includes(u.role));
  }

  return [];
}

// ── Resolve template: tenant override → system default ──
async function resolveTemplate(base44, tenant_id, template_key) {
  const tenantTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter(
    { tenant_id, template_key, is_active: true },
    '-created_date', 5
  );
  const systemTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter(
    { tenant_id: 'system', template_key, is_active: true },
    '-created_date', 5
  );
  return (tenantTemplates && tenantTemplates[0]) || (systemTemplates && systemTemplates[0]) || null;
}

// ── Mustache substitution ──
function resolve(str, context) {
  if (!str) return '';
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = context[key];
    return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
  });
}

// ── Get user preferences for a recipient + category ──
async function getPreferences(base44, user_id, tenant_id, category) {
  try {
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter(
      { tenant_id, user_id },
      '-created_date', 50
    );
    const cat = prefs.find((p) => p.category === category);
    const all = prefs.find((p) => p.category === 'all');
    // Category overrides 'all' default
    return {
      email_enabled: cat?.email_enabled ?? all?.email_enabled ?? true,
      push_enabled: cat?.push_enabled ?? all?.push_enabled ?? true,
      in_app_enabled: cat?.in_app_enabled ?? all?.in_app_enabled ?? true,
      muted: cat?.muted ?? all?.muted ?? false,
      min_priority: cat?.min_priority ?? all?.min_priority ?? 'informational',
    };
  } catch {
    // If preference system unavailable, allow all
    return { email_enabled: true, push_enabled: true, in_app_enabled: true, muted: false, min_priority: 'informational' };
  }
}

// ── Main handler ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }

    const body = await req.json();

    // ── Detect automation payload vs direct call ──
    let payload;
    if (body && body.event && body.event.entity_name) {
      const adapter = EVENT_ADAPTERS[body.event.entity_name];
      if (!adapter) {
        return Response.json({ skipped: true, reason: `no adapter for ${body.event.entity_name}` });
      }
      let data = body.data;
      if (!data && body.payload_too_large && body.event.entity_id) {
        try { data = await base44.asServiceRole.entities[body.event.entity_name].get(body.event.entity_id); } catch {}
      }
      if (!data) {
        return Response.json({ skipped: true, reason: 'no data' });
      }
      payload = adapter(data, body.old_data, body.changed_fields);
      if (!payload) {
        return Response.json({ skipped: true, reason: 'event not notifiable' });
      }
    } else {
      payload = body;
    }

    const {
      template_key,
      tenant_id,
      outlet_id,
      recipient_resolver,
      recipient_emails = [],
      recipient_user_ids = [],
      context = {},
      source_entity,
      source_id,
      link,
      from_name,
    } = payload || {};

    if (!template_key || !tenant_id) {
      return Response.json({ error: 'template_key and tenant_id are required' }, { status: 400 });
    }

    // ── Resolve template ──
    const template = await resolveTemplate(base44, tenant_id, template_key);
    if (!template) {
      return Response.json({ error: `No active NotificationTemplate for '${template_key}'.` }, { status: 404 });
    }

    // ── Resolve recipients ──
    let recipients = [];
    if (recipient_resolver) {
      recipients = await resolveRecipients(base44, recipient_resolver, tenant_id, outlet_id);
    }
    // Merge explicit user_ids / emails
    recipient_user_ids.forEach((id) => { if (!recipients.find((r) => r.id === id)) recipients.push({ id }); });
    const emailRecipients = [...recipient_emails];

    if (recipients.length === 0 && emailRecipients.length === 0) {
      return Response.json({ skipped: true, reason: 'no recipients resolved' });
    }

    // ── Resolve copy ──
    const subject = resolve(template.subject_template, context);
    const bodyText = resolve(template.body_template, context);
    const channels = template.delivery_channels || ['email'];
    const priority = template.default_priority || 'normal';
    const isActionable = template.is_actionable === true;
    const actionType = template.action_type || 'none';
    const inboxCategory = template.inbox_category || payload.inbox_category || 'system';

    const delivered = { in_app: 0, email: 0, skipped_muted: 0, skipped_priority: 0 };

    // ── in_app delivery: create OrbitInbox per recipient ──
    if (channels.includes('in_app')) {
      for (const r of recipients) {
        if (!r.id) continue;
        const prefs = await getPreferences(base44, r.id, tenant_id, inboxCategory);
        if (prefs.muted || !prefs.in_app_enabled) { delivered.skipped_muted++; continue; }
        if (PRIORITY_RANK[priority] < PRIORITY_RANK[prefs.min_priority]) { delivered.skipped_priority++; continue; }

        try {
          await base44.asServiceRole.entities.OrbitInbox.create({
            tenant_id,
            outlet_id: outlet_id || null,
            recipient_user_id: r.id,
            recipient_name: r.full_name || r.email || null,
            category: inboxCategory,
            event_type: template_key,
            title: subject,
            body: bodyText,
            priority,
            is_actionable: isActionable,
            action_type: actionType,
            action_state: 'pending',
            read_at: null,
            pinned: false,
            archived_at: null,
            source_entity: source_entity || null,
            source_id: source_id || null,
            link: link || null,
            metadata: context,
            channels_delivered: ['in_app'],
            template_key,
          });
          delivered.in_app++;
        } catch (e) {
          console.error('[notificationEngine] OrbitInbox create failed:', e?.message || e);
        }
      }
    }

    // ── email delivery ──
    if (channels.includes('email')) {
      // Collect emails: explicit list + resolved users with email_enabled
      const targets = new Set(emailRecipients);
      for (const r of recipients) {
        if (!r.email) continue;
        const prefs = await getPreferences(base44, r.id, tenant_id, inboxCategory);
        if (!prefs.email_enabled) continue;
        targets.add(r.email);
      }
      const greeting = '{{recipient_name}}';
      for (const email of targets) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            from_name: from_name || template.from_name || 'OrbitanOS',
            subject,
            body: bodyText.replace(greeting, 'Hello,'),
          });
          delivered.email++;
        } catch (emailErr) {
          console.error('[notificationEngine] email failed for', email, ':', emailErr?.message || emailErr);
        }
      }
    }

    // webhook / push / sms / slack / teams / whatsapp → reserved for future adapters
    // (ADR-0053). The trigger contract does not change when they arrive.

    if (delivered.in_app === 0 && delivered.email === 0) {
      return Response.json({
        skipped: true,
        reason: 'all recipients muted or below min_priority',
        delivered,
      });
    }

    return Response.json({
      success: true,
      template_key,
      recipients: recipients.length,
      channels: delivered,
      subject,
    });
  } catch (error) {
    console.error('[notificationEngine] fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});