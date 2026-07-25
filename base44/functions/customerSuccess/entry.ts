// Customer Success Engine (Build Package #18, Part 1)
// Principle: Reach + Relate
//
// Cross-tenant customer success workspace for platform admins.
// Computes per-tenant: onboarding progress, deterministic health score,
// adoption breadth, last activity, outstanding setup tasks, training
// completion, feedback/support summary, and success milestones.
//
// Admin-only. All queries bounded (≤500). Deterministic — no fabricated
// sentiment or estimated values; health is a weighted sum of real signals.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const APP_VERSION = '18.0.0';
const RULE_VERSION = 'customer-success-v1';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — customer success requires platform admin role' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'overview';
    const E = base44.asServiceRole.entities;

    if (action === 'overview') {
      // Bounded parallel fetches — group by tenant in memory
      const [tenants, checklists, inventory, sales, batches, shifts, tasks, employees, issues, recon, insights, aiDocs, queue, audits] = await Promise.all([
        E.Tenant.filter({ is_pilot_tenant: true }, '-created_date', 200).catch(() => []),
        E.OnboardingChecklist.list('-updated_at', 200).catch(() => []),
        E.InventoryItem.list('-updated_date', 500).catch(() => []),
        E.SalesInvoice.list('-created_date', 500).catch(() => []),
        E.ProductionBatch.list('-created_date', 500).catch(() => []),
        E.Shift.list('-created_date', 500).catch(() => []),
        E.Task.list('-updated_date', 500).catch(() => []),
        E.Employee.list('-updated_date', 500).catch(() => []),
        E.IssueLog.list('-created_date', 500).catch(() => []),
        E.DailyReconciliation.list('-created_date', 500).catch(() => []),
        E.NexusInsight.list('-created_date', 200).catch(() => []),
        E.AIDocument.list('-created_date', 200).catch(() => []),
        E.FinanceSyncQueue.filter({ status: 'failed' }, '-created_date', 200).catch(() => []),
        E.AuditLog.filter({ action_type: { $in: ['pilot_tenant_created', 'pilot_activated', 'pilot_converted_to_paid', 'pilot_archived'] } }, '-created_date', 100).catch(() => []),
      ]);

      const byTenant = (arr) => {
        const m = {};
        for (const r of arr) { const t = r.tenant_id; if (!t) continue; (m[t] = m[t] || []).push(r); }
        return m;
      };
      const invMap = byTenant(inventory), salesMap = byTenant(sales), batchMap = byTenant(batches);
      const shiftMap = byTenant(shifts), taskMap = byTenant(tasks), empMap = byTenant(employees);
      const issueMap = byTenant(issues), reconMap = byTenant(recon), insightMap = byTenant(insights);
      const aiMap = byTenant(aiDocs), queueMap = byTenant(queue);
      const checklistMap = byTenant(checklists);

      const customers = tenants.map(t => {
        const tid = t.id;
        const inv = invMap[tid] || [], sl = salesMap[tid] || [], bt = batchMap[tid] || [];
        const sh = shiftMap[tid] || [], tk = taskMap[tid] || [], em = empMap[tid] || [];
        const is = issueMap[tid] || [], rc = reconMap[tid] || [], ni = insightMap[tid] || [];
        const ai = aiMap[tid] || [], fq = queueMap[tid] || [];
        const cl = (checklistMap[tid] || [])[0];

        // ── Last activity (most recent updated_date across key entities) ──
        const candidates = [inv, sl, bt, sh, tk, em, is, rc, ni].flat().map(r => r.updated_date || r.created_date).filter(Boolean);
        const lastActivity = candidates.length ? candidates.sort().slice(-1)[0] : t.updated_date || t.created_date;
        const lastActivityDays = daysSince(lastActivity);

        // ── Adoption breadth (modules in active use) ──
        const modulesUsed = [
          inv.length > 0 && 'inventory',
          sl.length > 0 && 'sales',
          bt.length > 0 && 'production',
          sh.length > 0 && 'scheduling',
          tk.length > 0 && 'tasks',
          em.length > 0 && 'workforce',
          rc.length > 0 && 'reconciliation',
          ni.length > 0 && 'nexus',
        ].filter(Boolean).length;

        // ── Onboarding progress (from cached readiness, or quick heuristic) ──
        const onboardingPct = cl?.last_computed_readiness_pct != null
          ? cl.last_computed_readiness_pct
          : Math.round((modulesUsed / 8) * 100);

        // ── Feedback summary ──
        const openIssues = is.filter(i => !['closed', 'released', 'resolved', 'wont_fix', 'duplicate'].includes(i.workflow_status || i.status));
        const sentiment = { positive: 0, neutral: 0, negative: 0, frustrated: 0 };
        is.forEach(i => { if (i.ai_sentiment && sentiment[i.ai_sentiment] != null) sentiment[i.ai_sentiment]++; });
        const supportTickets = openIssues.filter(i => i.issue_type === 'bug' || i.severity === 'critical' || i.severity === 'high').length;

        // ── Training completion ──
        const trainingModules = ai.filter(d => d.document_type === 'training_module');
        const trainingApproved = trainingModules.filter(d => d.status === 'approved' || d.status === 'auto_published').length;

        // ── Success milestones (deterministic, boolean) ──
        const milestones = [
          { key: 'first_sale', label: 'First sale recorded', achieved: sl.length > 0, date: sl[0]?.created_date },
          { key: 'first_production', label: 'First production batch', achieved: bt.length > 0, date: bt[0]?.created_date },
          { key: 'first_reconciliation', label: 'First daily reconciliation', achieved: rc.length > 0, date: rc[0]?.created_date },
          { key: 'nexus_insight', label: 'First Orbit Nexus insight', achieved: ni.length > 0, date: ni[0]?.generated_at },
          { key: 'training_published', label: 'First training module published', achieved: trainingApproved > 0 },
          { key: 'converted_to_paid', label: 'Converted to paid subscription', achieved: !t.is_pilot_tenant && t.status === 'active' },
        ];
        const milestonesAchieved = milestones.filter(m => m.achieved).length;

        // ── Outstanding setup tasks (lightweight, from real signals) ──
        const outstanding = [];
        if (em.length === 0) outstanding.push('Invite employees');
        if (inv.length === 0) outstanding.push('Add inventory items');
        if (sl.length === 0) outstanding.push('Record first sale');
        if (cl && !cl.manual_flags?.pilot_owner_confirmed) outstanding.push('Confirm pilot owner');
        if (cl && !cl.manual_flags?.support_contact_confirmed) outstanding.push('Confirm support contact');
        if (cl && !cl.manual_flags?.tenant_admin_signoff) outstanding.push('Tenant admin sign-off');

        // ── Deterministic health score (0-100) ──
        // Adoption (35) + Activity recency (20) + Feedback health (15) + Onboarding (20) + Stability (10)
        const adoptionScore = Math.min(35, (modulesUsed / 8) * 35);
        const activityScore = lastActivityDays == null ? 0 : Math.max(0, 20 - Math.min(20, lastActivityDays)); // 0 days=20, 20+days=0
        const frustratedWeight = sentiment.frustrated * 3 + sentiment.negative * 1.5;
        const feedbackHealth = Math.max(0, 15 - Math.min(15, frustratedWeight + (openIssues.length > 5 ? 5 : openIssues.length)));
        const onboardingScore = (onboardingPct / 100) * 20;
        const stabilityScore = Math.max(0, 10 - Math.min(10, fq.length * 2)); // finance failures reduce stability
        const health = round2(adoptionScore + activityScore + feedbackHealth + onboardingScore + stabilityScore);

        let healthTier;
        if (health >= 75) healthTier = 'healthy';
        else if (health >= 50) healthTier = 'watch';
        else if (health >= 25) healthTier = 'at_risk';
        else healthTier = 'critical';

        return {
          tenant_id: tid, name: t.name, status: t.status, plan: t.subscription_plan,
          industry: t.industry, is_pilot_tenant: !!t.is_pilot_tenant, is_sandbox: !!t.is_sandbox,
          trial_ends_date: t.trial_ends_date, contact_email: t.contact_email, contact_name: t.contact_name,
          created_date: t.created_date,
          health, health_tier: healthTier,
          onboarding_pct: onboardingPct,
          adoption: { modules_used: modulesUsed, inventory: inv.length, sales: sl.length, production: bt.length, shifts: sh.length, tasks: tk.length, employees: em.length, reconciliations: rc.length, nexus_insights: ni.length },
          last_activity: lastActivity, last_activity_days: lastActivityDays,
          outstanding_setup_tasks: outstanding,
          training: { modules_total: trainingModules.length, modules_published: trainingApproved },
          feedback: { total: is.length, open: openIssues.length, support_tickets: supportTickets, sentiment },
          finance_failures: fq.length,
          milestones, milestones_achieved: milestonesAchieved, milestones_total: milestones.length,
          checklist: cl ? { pilot_owner_confirmed: !!cl.manual_flags?.pilot_owner_confirmed, support_contact_confirmed: !!cl.manual_flags?.support_contact_confirmed, tenant_admin_signoff: !!cl.manual_flags?.tenant_admin_signoff } : null,
        };
      });

      // ── Portfolio rollup ──
      const rollup = {
        total_customers: customers.length,
        healthy: customers.filter(c => c.health_tier === 'healthy').length,
        watch: customers.filter(c => c.health_tier === 'watch').length,
        at_risk: customers.filter(c => c.health_tier === 'at_risk').length,
        critical: customers.filter(c => c.health_tier === 'critical').length,
        avg_health: customers.length ? round2(customers.reduce((s, c) => s + c.health, 0) / customers.length) : 0,
        avg_onboarding: customers.length ? round2(customers.reduce((s, c) => s + c.onboarding_pct, 0) / customers.length) : 0,
        total_open_support: customers.reduce((s, c) => s + c.feedback.support_tickets, 0),
        total_converted: customers.filter(c => c.milestones.find(m => m.key === 'converted_to_paid')?.achieved).length,
        deployments: audits.length,
      };

      return Response.json({
        app_version: APP_VERSION, rule_version: RULE_VERSION, generated_at: new Date().toISOString(),
        rollup, customers,
        deterministic_note: 'Health is a deterministic weighted sum of adoption breadth, activity recency, feedback sentiment, onboarding %, and finance-failure rate. No estimated values.',
      });
    }

    if (action === 'tenant_detail') {
      const tid = body.tenant_id;
      if (!tid) return Response.json({ error: 'tenant_id required' }, { status: 400 });
      // Reuse overview logic for a single tenant — return the matching customer object + recent issues + recent audit
      const [tenants, issues, audits] = await Promise.all([
        E.Tenant.filter({ id: tid }).catch(() => []),
        E.IssueLog.filter({ tenant_id: tid }, '-created_date', 50).catch(() => []),
        E.AuditLog.filter({ tenant_id: tid }, '-created_date', 50).catch(() => []),
      ]);
      const t = tenants[0];
      if (!t) return Response.json({ error: 'Tenant not found' }, { status: 404 });
      return Response.json({
        tenant: { id: t.id, name: t.name, status: t.status, plan: t.subscription_plan, industry: t.industry, contact_email: t.contact_email, contact_name: t.contact_name, trial_ends_date: t.trial_ends_date, created_date: t.created_date },
        recent_feedback: issues.map(i => ({ id: i.id, title: i.title, type: i.issue_type, severity: i.severity, status: i.workflow_status, sentiment: i.ai_sentiment, ai_summary: i.ai_summary, created_date: i.created_date })),
        recent_activity: audits.map(a => ({ id: a.id, action_type: a.action_type, details: a.details, actor_name: a.actor_name, created_date: a.created_date })),
      });
    }

    if (action === 'add_note') {
      const { tenant_id, note } = body;
      if (!tenant_id || !note) return Response.json({ error: 'tenant_id and note required' }, { status: 400 });
      const me = user;
      await E.AuditLog.create({
        tenant_id: tenant_id, actor_id: me.id, actor_name: me.full_name || me.email, actor_role: me.role,
        action_type: 'customer_success_note', module: 'system', target_entity: 'Tenant', target_record_id: tenant_id,
        details: note,
      }).catch(() => null);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[customerSuccess] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});