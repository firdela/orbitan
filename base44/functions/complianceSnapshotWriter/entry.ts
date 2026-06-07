import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled daily function — writes ComplianceSnapshot records for all tenants/outlets.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().split('T')[0];

    // Fetch all compliance records
    const allRecords = await base44.asServiceRole.entities.ComplianceRecord.list('-created_date', 500);

    // Group by tenant_id + outlet_id
    const groupMap = {};
    for (const r of allRecords) {
      const key = `${r.tenant_id}::${r.outlet_id || 'all'}`;
      if (!groupMap[key]) {
        groupMap[key] = { tenant_id: r.tenant_id, outlet_id: r.outlet_id || null, records: [] };
      }
      groupMap[key].records.push(r);
    }

    const snapshots = [];

    for (const group of Object.values(groupMap)) {
      const { tenant_id, outlet_id, records } = group;
      const total = records.length;
      const approved = records.filter(r => r.status === 'approved').length;
      const pending = records.filter(r => r.status === 'pending').length;
      const inReview = records.filter(r => r.status === 'in_review').length;
      const submitted = records.filter(r => r.status === 'submitted').length;
      const rejected = records.filter(r => r.status === 'rejected').length;
      const overdue = records.filter(r => r.status === 'overdue').length;

      const complianceScore = total > 0 ? Math.round((approved / total) * 100) : 100;
      let riskLevel = 'green';
      if (complianceScore < 50) riskLevel = 'critical';
      else if (complianceScore < 70) riskLevel = 'red';
      else if (complianceScore < 90) riskLevel = 'amber';

      // Category breakdown
      const categoryBreakdown = {};
      for (const r of records) {
        const cat = r.category || 'other';
        if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { approved: 0, rejected: 0, overdue: 0, pending: 0 };
        categoryBreakdown[cat][r.status] = (categoryBreakdown[cat][r.status] || 0) + 1;
      }

      const snapshot = await base44.asServiceRole.entities.ComplianceSnapshot.create({
        tenant_id,
        outlet_id,
        snapshot_date: today,
        snapshot_type: 'daily_scheduled',
        total_records: total,
        approved_count: approved,
        pending_count: pending + submitted,
        in_review_count: inReview,
        rejected_count: rejected,
        overdue_count: overdue,
        compliance_score: complianceScore,
        risk_level: riskLevel,
        category_breakdown: categoryBreakdown,
        financial_exposure_sgd: 0,
        write_offs_triggered: 0,
        escalations_triggered: overdue > 0 ? 1 : 0,
        sops_generated: 0,
      });

      snapshots.push({ tenant_id, outlet_id, compliance_score: complianceScore, risk_level: riskLevel });
    }

    return Response.json({
      success: true,
      snapshots_written: snapshots.length,
      snapshot_date: today,
      snapshots,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});