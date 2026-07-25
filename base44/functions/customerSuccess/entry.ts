// Customer Success Engine (Build Package #18, Part 1 → Build #20 enhanced)
// Principle: Reach + Relate
//
// Cross-tenant customer success workspace for platform admins.
// Computes per-tenant: onboarding progress, 5-tier deterministic health score
// with factor breakdown, adoption breadth & score, last activity, outstanding
// setup tasks, training completion, feedback/support summary, success
// milestones, CSM derivation, renewal status, DAU/WAU proxies, and a
// deterministic AI recommendation set (no LLM — evidence-based rules).
//
// Admin-only. All queries bounded (≤500). Deterministic — no fabricated
// sentiment or estimated values; health is a weighted sum of real signals.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const APP_VERSION = '20.0.0';
const RULE_VERSION = 'customer-success-v2';
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
const clamp100 = (n) => Math.max(0, Math.min(100, n));

// 5-tier classification (Excellent / Healthy / Monitor / At Risk / Critical)
function classifyHealth(h) {
  if (h >= 85) return 'excellent';
  if (h >= 70) return 'healthy';
  if (h >= 50) return 'monitor';
  if (h >= 25) return 'at_risk';
  return 'critical';
}

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
      const [tenants, checklists, inventory, sales, batches, shifts, tasks, employees, issues, recon, insights, aiDocs, queue, audits, csNotes] = await Promise.all([
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
        E.AuditLog.filter({ action_type: 'customer_success_note' }, '-created_date', 200).catch(() => []),
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
      const csNoteMap = byTenant(csNotes);

      const customers = tenants.map(t => {
        const tid = t.id;
        const inv = invMap[tid] || [], sl = salesMap[tid] || [], bt = batchMap[tid] || [];
        const sh = shiftMap[tid] || [], tk = taskMap[tid] || [], em = empMap[tid] || [];
        const is = issueMap[tid] || [], rc = reconMap[tid] || [], ni = insightMap[tid] || [];
        const ai = aiMap[tid] || [], fq = queueMap[tid] || [];
        const cl = (checklistMap[tid] || [])[0];
        const notesForTenant = csNoteMap[tid] || [];

        // ── Last activity (most recent updated_date across key entities) ──
        const candidates = [inv, sl, bt, sh, tk, em, is, rc, ni].flat().map(r => r.updated_date || r.created_date).filter(Boolean);
        const lastActivity = candidates.length ? candidates.sort().slice(-1)[0] : t.updated_date || t.created_date;
        const lastActivityDays = daysSince(lastActivity);

        // ── Adoption breadth (modules in active use) ──
        const moduleFlags = {
          inventory: inv.length > 0,
          sales: sl.length > 0,
          production: bt.length > 0,
          scheduling: sh.length > 0,
          tasks: tk.length > 0,
          workforce: em.length > 0,
          reconciliation: rc.length > 0,
          nexus: ni.length > 0,
        };
        const modulesUsed = Object.values(moduleFlags).filter(Boolean).length;
        const adoptionScore = round2((modulesUsed / 8) * 100);

        // ── Onboarding progress ──
        const onboardingPct = cl?.last_computed_readiness_pct != null
          ? cl.last_computed_readiness_pct
          : Math.round((modulesUsed / 8) * 100);

        // ── Feedback summary ──
        const openIssues = is.filter(i => !['closed', 'released', 'resolved', 'wont_fix', 'duplicate'].includes(i.workflow_status || i.status));
        const sentiment = { positive: 0, neutral: 0, negative: 0, frustrated: 0 };
        is.forEach(i => { if (i.ai_sentiment && sentiment[i.ai_sentiment] != null) sentiment[i.ai_sentiment]++; });
        const supportTickets = openIssues.filter(i => i.issue_type === 'bug' || i.severity === 'critical' || i.severity === 'high').length;
        const escalations = openIssues.filter(i => i.severity === 'critical').length;
        const resolvedIssues = is.filter(i => ['closed', 'resolved', 'released'].includes(i.workflow_status || i.status) && i.resolved_date);
        const resolutionDays = resolvedIssues.map(i => Math.max(0, (new Date(i.resolved_date) - new Date(i.created_date)) / 86400000));
        const avgResolutionDays = resolutionDays.length ? round2(resolutionDays.reduce((s, d) => s + d, 0) / resolutionDays.length) : null;

        // ── Training completion ──
        const trainingModules = ai.filter(d => d.document_type === 'training_module');
        const trainingApproved = trainingModules.filter(d => d.status === 'approved' || d.status === 'auto_published').length;

        // ── Success milestones (deterministic, boolean) ──
        const milestones = [
          { key: 'go_live', label: 'Go-live completed', achieved: t.status === 'active' || t.onboarding_completed === true, date: null },
          { key: 'first_sale', label: 'First sale recorded', achieved: sl.length > 0, date: sl[0]?.created_date },
          { key: 'first_production', label: 'First production batch', achieved: bt.length > 0, date: bt[0]?.created_date },
          { key: 'first_reconciliation', label: 'First daily reconciliation', achieved: rc.length > 0, date: rc[0]?.created_date },
          { key: 'nexus_insight', label: 'First Orbit Nexus insight', achieved: ni.length > 0, date: ni[0]?.generated_at },
          { key: 'training_published', label: 'First training module published', achieved: trainingApproved > 0 },
          { key: 'compliance_achieved', label: 'Compliance sign-off complete', achieved: !!(cl?.manual_flags?.tenant_admin_signoff) },
          { key: 'converted_to_paid', label: 'Converted to paid subscription', achieved: !t.is_pilot_tenant && t.status === 'active' },
          { key: 'first_successful_month', label: 'First successful month', achieved: lastActivityDays != null && lastActivityDays <= 1 && sl.length >= 5 },
        ];
        const milestonesAchieved = milestones.filter(m => m.achieved).length;

        // ── Outstanding setup tasks ──
        const outstanding = [];
        if (em.length === 0) outstanding.push('Invite employees');
        if (inv.length === 0) outstanding.push('Add inventory items');
        if (sl.length === 0) outstanding.push('Record first sale');
        if (cl && !cl.manual_flags?.pilot_owner_confirmed) outstanding.push('Confirm pilot owner');
        if (cl && !cl.manual_flags?.support_contact_confirmed) outstanding.push('Confirm support contact');
        if (cl && !cl.manual_flags?.tenant_admin_signoff) outstanding.push('Tenant admin sign-off');

        // ── Health factor breakdown (each 0-100) ──
        const factors = {
          adoption: adoptionScore,
          activity: clamp100(lastActivityDays == null ? 0 : 100 - lastActivityDays * 5),
          support: clamp100(100 - openIssues.length * 10),
          compliance: onboardingPct,
          workforce: clamp100((em.length > 0 ? 40 : 0) + (sh.length > 0 ? 30 : 0) + Math.min(30, tk.length)),
          inventory: clamp100(inv.length * 2),
          ai_usage: clamp100(ni.length * 10),
        };

        // ── Weighted composite health (0-100) ──
        const health = round2(
          factors.adoption * 0.25 +
          factors.activity * 0.20 +
          factors.support * 0.15 +
          factors.compliance * 0.15 +
          factors.workforce * 0.10 +
          factors.inventory * 0.075 +
          factors.ai_usage * 0.075
        );
        const healthTier = classifyHealth(health);

        // ── CSM derivation (last CS note author, else unassigned) ──
        const lastNote = notesForTenant.sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];
        const csmName = lastNote?.actor_name || 'Unassigned';

        // ── Renewal status ──
        const trialEnds = t.trial_ends_date;
        const renewalDate = trialEnds;
        const renewalDays = daysSince(trialEnds); // negative = future
        let renewalStatus = 'stable';
        if (!trialEnds) renewalStatus = 'no_date';
        else if (renewalDays != null && renewalDays >= 0) renewalStatus = 'overdue';
        else if (renewalDays != null && renewalDays >= -14) renewalStatus = 'due_soon';
        else if (renewalDays != null && renewalDays >= -30) renewalStatus = 'upcoming';

        // ── DAU/WAU proxies (from last activity recency) ──
        const dau = lastActivityDays != null && lastActivityDays <= 1;
        const wau = lastActivityDays != null && lastActivityDays <= 7;

        return {
          tenant_id: tid, name: t.name, status: t.status, plan: t.subscription_plan,
          industry: t.industry, is_pilot_tenant: !!t.is_pilot_tenant, is_sandbox: !!t.is_sandbox,
          trial_ends_date: t.trial_ends_date, contact_email: t.contact_email, contact_name: t.contact_name,
          created_date: t.created_date,
          health, health_tier: healthTier, health_factors: factors,
          onboarding_pct: onboardingPct,
          adoption: { modules_used: modulesUsed, adoption_score: adoptionScore, inventory: inv.length, sales: sl.length, production: bt.length, shifts: sh.length, tasks: tk.length, employees: em.length, reconciliations: rc.length, nexus_insights: ni.length, module_flags: moduleFlags },
          last_activity: lastActivity, last_activity_days: lastActivityDays,
          dau, wau,
          outstanding_setup_tasks: outstanding,
          training: { modules_total: trainingModules.length, modules_published: trainingApproved },
          feedback: { total: is.length, open: openIssues.length, support_tickets: supportTickets, escalations, sentiment, avg_resolution_days: avgResolutionDays },
          finance_failures: fq.length,
          milestones, milestones_achieved: milestonesAchieved, milestones_total: milestones.length,
          csm_name: csmName,
          renewal_date: renewalDate, renewal_status: renewalStatus, renewal_days: renewalDays,
          checklist: cl ? { pilot_owner_confirmed: !!cl.manual_flags?.pilot_owner_confirmed, support_contact_confirmed: !!cl.manual_flags?.support_contact_confirmed, tenant_admin_signoff: !!cl.manual_flags?.tenant_admin_signoff } : null,
        };
      });

      // ── Deterministic AI recommendations (no LLM — evidence rules) ──
      const recommendations = [];
      for (const c of customers) {
        if (c.health_tier === 'critical' || c.health_tier === 'at_risk') {
          recommendations.push({ key: `followup-${c.tenant_id}`, type: 'follow_up', tenant_id: c.tenant_id, tenant_name: c.name, title: `${c.name} needs immediate follow-up`, detail: `Health score ${c.health}/100 (${c.health_tier}). Schedule a success review.`, severity: 'critical', category: 'Retention' });
        }
        if (c.adoption.modules_used <= 2) {
          recommendations.push({ key: `low-adoption-${c.tenant_id}`, type: 'low_adoption', tenant_id: c.tenant_id, tenant_name: c.name, title: `Low product adoption — ${c.name}`, detail: `Only ${c.adoption.modules_used}/8 modules in use. Recommend onboarding training session.`, severity: 'high', category: 'Adoption' });
        }
        if (c.checklist && !c.checklist.tenant_admin_signoff) {
          recommendations.push({ key: `compliance-${c.tenant_id}`, type: 'compliance_risk', tenant_id: c.tenant_id, tenant_name: c.name, title: `Compliance sign-off pending — ${c.name}`, detail: `Tenant admin has not signed off on pilot readiness. Compliance risk for go-live.`, severity: 'high', category: 'Compliance' });
        }
        if (c.feedback.escalations > 0) {
          recommendations.push({ key: `escalation-${c.tenant_id}`, type: 'escalation', tenant_id: c.tenant_id, tenant_name: c.name, title: `${c.feedback.escalations} critical ticket(s) — ${c.name}`, detail: `Open critical-severity support tickets require escalation.`, severity: 'critical', category: 'Support' });
        }
        if (c.adoption.nexus_insights === 0) {
          recommendations.push({ key: `ai-underutilized-${c.tenant_id}`, type: 'ai_usage', tenant_id: c.tenant_id, tenant_name: c.name, title: `Orbit Nexus underutilized — ${c.name}`, detail: `No Nexus insights generated. Recommend a Nexus demo to showcase AI value.`, severity: 'low', category: 'AI' });
        }
        if (c.adoption.modules_used >= 6 && c.is_pilot_tenant) {
          recommendations.push({ key: `upsell-${c.tenant_id}`, type: 'upsell', tenant_id: c.tenant_id, tenant_name: c.name, title: `Upsell opportunity — ${c.name}`, detail: `High adoption (${c.adoption.modules_used}/8 modules). Ready for paid plan conversion.`, severity: 'medium', category: 'Revenue' });
        }
        if (c.training.modules_published === 0 && c.adoption.modules_used > 0) {
          recommendations.push({ key: `training-${c.tenant_id}`, type: 'training', tenant_id: c.tenant_id, tenant_name: c.name, title: `Training recommended — ${c.name}`, detail: `No training modules published yet. Publish role-specific training to drive adoption.`, severity: 'low', category: 'Training' });
        }
        if (c.renewal_status === 'due_soon' || c.renewal_status === 'overdue') {
          recommendations.push({ key: `renewal-${c.tenant_id}`, type: 'renewal', tenant_id: c.tenant_id, tenant_name: c.name, title: `Renewal follow-up — ${c.name}`, detail: `Trial/renewal ${c.renewal_status === 'overdue' ? 'overdue' : 'due within 14 days'}. Contact tenant admin to confirm continuation.`, severity: 'high', category: 'Retention' });
        }
      }

      // ── Portfolio rollup ──
      const tiers = {
        excellent: customers.filter(c => c.health_tier === 'excellent').length,
        healthy: customers.filter(c => c.health_tier === 'healthy').length,
        monitor: customers.filter(c => c.health_tier === 'monitor').length,
        at_risk: customers.filter(c => c.health_tier === 'at_risk').length,
        critical: customers.filter(c => c.health_tier === 'critical').length,
      };
      const upcomingMilestones = customers.reduce((sum, c) => sum + (c.milestones_total - c.milestones_achieved), 0);
      const renewals = {
        overdue: customers.filter(c => c.renewal_status === 'overdue').length,
        due_soon: customers.filter(c => c.renewal_status === 'due_soon').length,
        upcoming: customers.filter(c => c.renewal_status === 'upcoming').length,
      };
      const rollup = {
        total_customers: customers.length,
        active_customers: customers.filter(c => c.status === 'active').length,
        at_risk_customers: tiers.at_risk + tiers.critical,
        avg_health: customers.length ? round2(customers.reduce((s, c) => s + c.health, 0) / customers.length) : 0,
        avg_onboarding: customers.length ? round2(customers.reduce((s, c) => s + c.onboarding_pct, 0) / customers.length) : 0,
        avg_adoption_score: customers.length ? round2(customers.reduce((s, c) => s + c.adoption.adoption_score, 0) / customers.length) : 0,
        total_open_support: customers.reduce((s, c) => s + c.feedback.support_tickets, 0),
        total_escalations: customers.reduce((s, c) => s + c.feedback.escalations, 0),
        avg_resolution_days: customers.length ? round2(customers.filter(c => c.feedback.avg_resolution_days != null).reduce((s, c) => s + c.feedback.avg_resolution_days, 0) / Math.max(1, customers.filter(c => c.feedback.avg_resolution_days != null).length)) : 0,
        upcoming_milestones: upcomingMilestones,
        renewals,
        tiers,
        total_converted: customers.filter(c => c.milestones.find(m => m.key === 'converted_to_paid')?.achieved).length,
        dau: customers.filter(c => c.dau).length,
        wau: customers.filter(c => c.wau).length,
        deployments: audits.length,
      };

      return Response.json({
        app_version: APP_VERSION, rule_version: RULE_VERSION, generated_at: new Date().toISOString(),
        rollup, customers, recommendations,
        deterministic_note: 'Health is a deterministic weighted sum of adoption, activity, support, compliance, workforce, inventory, and AI usage factors. Recommendations are evidence-based rules — no LLM synthesis.',
      });
    }

    if (action === 'tenant_detail') {
      const tid = body.tenant_id;
      if (!tid) return Response.json({ error: 'tenant_id required' }, { status: 400 });
      const [tenants, issues, audits, csNotes] = await Promise.all([
        E.Tenant.filter({ id: tid }).catch(() => []),
        E.IssueLog.filter({ tenant_id: tid }, '-created_date', 50).catch(() => []),
        E.AuditLog.filter({ tenant_id: tid }, '-created_date', 50).catch(() => []),
        E.AuditLog.filter({ tenant_id: tid, action_type: 'customer_success_note' }, '-created_date', 50).catch(() => []),
      ]);
      const t = tenants[0];
      if (!t) return Response.json({ error: 'Tenant not found' }, { status: 404 });

      // ── Unified timeline (merge feedback + audit + CS notes, sort by date desc) ──
      const timeline = [];
      for (const i of issues) {
        timeline.push({ id: `fb-${i.id}`, type: 'feedback', title: i.title, detail: `${i.issue_type} · ${i.severity} · ${i.ai_sentiment || '—'}`, actor_name: i.reported_by_name, date: i.created_date, icon: 'feedback' });
      }
      for (const a of audits) {
        timeline.push({ id: `audit-${a.id}`, type: 'activity', title: a.action_type, detail: a.details, actor_name: a.actor_name, date: a.created_date, icon: 'activity' });
      }
      for (const n of csNotes) {
        timeline.push({ id: `note-${n.id}`, type: 'note', title: 'Customer Success Note', detail: n.details, actor_name: n.actor_name, date: n.created_date, icon: 'note' });
      }
      timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      return Response.json({
        tenant: { id: t.id, name: t.name, status: t.status, plan: t.subscription_plan, industry: t.industry, contact_email: t.contact_email, contact_name: t.contact_name, trial_ends_date: t.trial_ends_date, created_date: t.created_date },
        timeline: timeline.slice(0, 100),
        recent_feedback: issues.map(i => ({ id: i.id, title: i.title, type: i.issue_type, severity: i.severity, status: i.workflow_status, sentiment: i.ai_sentiment, ai_summary: i.ai_summary, created_date: i.created_date, resolved_date: i.resolved_date })),
        recent_activity: audits.map(a => ({ id: a.id, action_type: a.action_type, details: a.details, actor_name: a.actor_name, created_date: a.created_date })),
        notes: csNotes.map(n => ({ id: n.id, actor_name: n.actor_name, actor_role: n.actor_role, details: n.details, created_date: n.created_date })),
      });
    }

    if (action === 'add_note') {
      const { tenant_id, note, priority, tags } = body;
      if (!tenant_id || !note) return Response.json({ error: 'tenant_id and note required' }, { status: 400 });
      const me = user;
      const tagLabel = tags?.length ? ` [${tags.join(', ')}]` : '';
      const priorityLabel = priority ? `[${priority}] ` : '';
      await E.AuditLog.create({
        tenant_id: tenant_id, actor_id: me.id, actor_name: me.full_name || me.email, actor_role: me.role,
        action_type: 'customer_success_note', module: 'system', target_entity: 'Tenant', target_record_id: tenant_id,
        details: `${priorityLabel}${note}${tagLabel}`,
      }).catch(() => null);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[customerSuccess] fatal:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});