import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// ============================================================
// OrbitanOS Unified Notification Dispatcher (ADR-0031, Pillar 2)
//
// Decouples notification *trigger* from *delivery*. Modules send a
// payload referencing a template_key; this function resolves the
// tenant-overridden NotificationTemplate (falling back to the system
// default), performs {{mustache}} substitution, and delivers via
// the template's configured channels.
//
// Invocation:
//   base44.functions.invoke('notificationDispatcher', {
//     template_key: 'shift_reminder',
//     tenant_id, recipient_email, recipient_name,
//     context: { shift_date, start_time, end_time }
//   })
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Both human users and system-initiated automations (scheduled engines)
    // may dispatch notifications. Auth is best-effort; template resolution
    // and delivery always use the service role for tenant-scoped safety.
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }

    const body = await req.json();
    const {
      template_key,
      tenant_id,
      recipient_email,
      recipient_name,
      context = {},
      from_name,
    } = body || {};

    if (!template_key || !recipient_email) {
      return Response.json({ error: 'template_key and recipient_email are required' }, { status: 400 });
    }

    // ── Resolve template: tenant override → system default ──
    const tenantTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter(
      { tenant_id, template_key, is_active: true },
      '-created_date', 5
    );
    const systemTemplates = await base44.asServiceRole.entities.NotificationTemplate.filter(
      { tenant_id: 'system', template_key, is_active: true },
      '-created_date', 5
    );

    const template = (tenantTemplates && tenantTemplates[0]) || (systemTemplates && systemTemplates[0]);
    if (!template) {
      return Response.json({
        error: `No active NotificationTemplate found for key '${template_key}' (tenant or system).`,
      }, { status: 404 });
    }

    // ── Mustache-style placeholder substitution ──
    const resolve = (str) => {
      if (!str) return '';
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = context[key];
        return val !== undefined && val !== null ? String(val) : `{{${key}}}`;
      });
    };

    const subject = resolve(template.subject_template);
    const bodyText = resolve(template.body_template);
    const greeting = recipient_name ? `Hi ${recipient_name},` : 'Hello,';

    // ── Deliver via configured channels ──
    const channels = template.delivery_channels || ['email'];
    const delivered = [];

    if (channels.includes('email')) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient_email,
          from_name: from_name || template.from_name || 'OrbitanOS',
          subject,
          body: `${greeting}\n\n${bodyText}`,
        });
        delivered.push('email');
      } catch (emailErr) {
        console.error('[notificationDispatcher] email delivery failed:', emailErr?.message || emailErr);
      }
    }

    // in_app + webhook channels are reserved for future delivery adapters
    // (ADR-0031). The trigger contract does not change when they arrive.

    if (delivered.length === 0) {
      return Response.json({ error: 'All configured delivery channels failed.' }, { status: 502 });
    }

    return Response.json({
      success: true,
      template_key,
      channels: delivered,
      subject,
    });
  } catch (error) {
    console.error('[notificationDispatcher] fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});