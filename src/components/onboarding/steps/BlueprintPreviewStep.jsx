import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, ClipboardList, FileText, Loader2, Info,
  CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Blueprint Preview — fetches the live ActivationRegistry record for the
// selected industry and renders exactly what OrbitanOS will provision:
// compliance templates, setup tasks, and AI documents. This gives the
// founder transparency before committing to activation (Regulate principle).
//
// Registry-Driven: works for any industry in ActivationRegistry. No hardcoded
// industry logic. Adding a new pack = the preview adapts automatically.
export default function BlueprintPreviewStep({ data }) {
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const industry = data.industry;
  const packKey = data.packKey;

  useEffect(() => {
    if (!industry) {
      setRegistry(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    base44.entities.ActivationRegistry
      .filter({ industry, is_active: true })
      .then((records) => {
        if (cancelled) return;
        // Prefer the pack matching the selected packKey, else first active
        const match =
          records.find((r) => r.pack_key === packKey) || records[0] || null;
        setRegistry(match);
        setError(!match);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [industry, packKey]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-3" />
        <p className="text-slate-500 text-xs">Resolving your industry blueprint…</p>
      </div>
    );
  }

  // ── No registry found — fallback informational state ──
  if (error || !registry) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold text-white mb-1.5">Blueprint preview</h2>
          <p className="text-slate-400 text-sm">
            We couldn't resolve a dedicated industry pack. Your workspace will still provision with
            the default foundation blueprint.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-xs leading-relaxed">
            A default set of setup tasks and a compliance foundation will be created. You can
            configure industry-specific compliance templates and SOPs after activation.
          </p>
        </div>
      </div>
    );
  }

  const blueprint = registry.blueprint || {};
  const compliance = blueprint.compliance || [];
  const tasks = blueprint.tasks || [];
  const aiDocuments = registry.ai_documents || [];
  const governanceDomain = registry.governance_domain;
  const packName = registry.pack_name;
  const packColor = registry.advisory_config?.color_hex || '#2563EB';

  const Card = ({ icon: Icon, title, count, items, accent }) =>
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <span className="text-[11px] tracking-[0.12em] uppercase text-slate-500 font-bold">
          {title}
        </span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono">{count}</span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <CheckCircle2
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                style={{ color: accent }}
              />
              <span className="leading-tight">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-600 italic">None for this pack.</p>
      )}
    </div>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-white mb-1.5">
          Your {packName} blueprint
        </h2>
        <p className="text-slate-400 text-sm">
          Here's exactly what OrbitanOS will provision for your workspace on activation — driven
          by your industry's Activation Registry. Review before you commit.
        </p>
      </div>

      {/* Governance Domain banner */}
      {governanceDomain && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-3.5 mb-5"
        >
          <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-white font-semibold">Shield™ Governance:</span> This workspace
            binds to the <code className="text-blue-300 font-mono">{governanceDomain}</code> policy
            domain. Governance thresholds and audit rules will activate automatically.
          </p>
        </motion.div>
      )}

      {/* Blueprint cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <Card
          icon={Shield}
          title="Compliance Records"
          count={compliance.length}
          items={compliance.map((c) => c.title || c.type)}
          accent="#DC2626"
        />
        <Card
          icon={ClipboardList}
          title="Setup Tasks"
          count={tasks.length}
          items={tasks.map((t) => t.title)}
          accent="#F97316"
        />
        <Card
          icon={FileText}
          title="AI Documents"
          count={aiDocuments.length}
          items={aiDocuments.map((d) => d.title)}
          accent="#7C3AED"
        />
      </div>

      {/* Summary footer */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
        <Layers className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-white font-semibold">Total provisioned:</span>{" "}
          {compliance.length + tasks.length + aiDocuments.length} records — compliance checklists,
          operational tasks, and AI-generated SOPs. Plus your full Company → Brand → Outlet
          hierarchy and Orbitan Wallet. All actions are audit-logged on an exit-ready trail.
        </p>
      </div>

      {/* Fallback note if no blueprint content */}
      {compliance.length === 0 && tasks.length === 0 && aiDocuments.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3.5 mt-4">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            This industry pack has no seeded blueprint content yet. A default foundation (2 setup
            tasks) will be provisioned. You can add industry-specific compliance templates after
            activation.
          </p>
        </div>
      )}
    </div>
  );
}