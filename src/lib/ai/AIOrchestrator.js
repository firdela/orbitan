// ============================================================
// ORBITAN AI ORCHESTRATOR — Model-Agnostic AI Service Layer
// Created by Muhammad Firdaus Bin Ismail
// © 2024–2026 Orbitan & OrbitanOS. All Rights Reserved.
//
// EXIT-READY: This is a pure JS service layer. It wraps any
// LLM endpoint. To migrate: update MODEL_PROVIDERS map only.
// Zero UI dependency. Works in any JS/TS environment.
// ============================================================

import { OPERATING_CYCLE, INDUSTRY_PACKS, PLATFORM_IDENTITY } from '@/lib/orbitan-config';

// ── Model Registry ───────────────────────────────────────────
// To add a new LLM provider: add an entry here. Nothing else changes.
export const AI_MODELS = {
  // Default — fast, cost-efficient, everyday tasks
  default: {
    key: 'default',
    label: 'OrbitanOS AI (Standard)',
    provider_model: 'automatic',
    description: 'Balanced speed and quality for standard documents',
    credit_cost: 'standard',
    suitable_for: ['shift_brief', 'training_module', 'compliance_checklist'],
  },
  // Deep Reasoning — complex SOPs, policies, compliance
  deep: {
    key: 'deep',
    provider_model: 'claude_sonnet_4_6',
    label: 'OrbitanOS AI (Deep Reasoning)',
    description: 'High-quality output for complex SOPs and regulated policies',
    credit_cost: 'premium',
    suitable_for: ['sop', 'policy', 'incident_report'],
  },
  // Speed — brief summaries, short briefs
  fast: {
    key: 'fast',
    provider_model: 'gemini_3_flash',
    label: 'OrbitanOS AI (Fast)',
    description: 'Ultra-fast for shift briefs and simple training tips',
    credit_cost: 'low',
    suitable_for: ['shift_brief', 'training_module'],
  },
};

// ── Industry Context Injectors ───────────────────────────────
// Each industry has a tailored system-level context string.
// EXIT-READY: These are pure strings — not tied to any platform.

const INDUSTRY_SYSTEM_CONTEXT = {
  food_beverage: `You are an expert F&B operations manager with deep knowledge of Singapore food safety regulations (SFA/NEA standards), HACCP principles, and kitchen workflow optimisation. You write documents for small-to-medium restaurant and hawker operations. Your tone is clear, direct, and practical.`,

  recycling_sustainability: `You are an expert sustainability operations manager with deep knowledge of Singapore's NEA waste management regulations, ISO 14001 environmental standards, and circular economy practices. You write documents for recycling, material recovery, and sustainability operations. Your tone is precise, compliance-focused, and impact-driven.`,

  retail: `You are an expert retail operations manager with deep knowledge of Singapore consumer goods regulations, POS workflows, upcycled goods practices, and sustainable retail. You write documents for second-hand and upcycled clothing operations. Your tone is friendly, customer-oriented, and operationally crisp.`,

  healthcare: `You are a healthcare operations expert with knowledge of MOH/HSA Singapore regulations, clinical workflows, infection control, and patient safety. Your tone is highly precise, regulatory, and safety-first.`,

  education: `You are an education operations specialist with knowledge of MOE Singapore policies, safeguarding frameworks, and campus management workflows. Your tone is structured, inclusive, and policy-aligned.`,

  logistics: `You are a logistics operations manager with deep knowledge of LTA Singapore transport regulations, fleet management, and supply chain workflows. Your tone is operational, systematic, and safety-conscious.`,

  other: `You are an expert operations manager writing operational documents for a Singapore-based SME. Your tone is clear, professional, and practical.`,
};

// ── Prompt Template Builders ─────────────────────────────────

export const PromptBuilder = {

  /**
   * Build a system prompt that injects full Orbitan + Industry context.
   * This is what makes AI output "OrbitanOS-aware" and industry-specific.
   */
  systemPrompt(industry) {
    const industryCtx = INDUSTRY_SYSTEM_CONTEXT[industry] || INDUSTRY_SYSTEM_CONTEXT.other;
    return `You are writing on behalf of ${PLATFORM_IDENTITY.platform} — ${PLATFORM_IDENTITY.tagline}

${industryCtx}

Output Format Rules:
- Write in clear, structured Markdown
- Use headings (##), numbered lists, and tables where appropriate
- Do NOT include meta-commentary like "Here is your SOP" — start directly with the document
- End with a "Review Checklist" section listing the top 3 things a manager should verify
- Be specific and actionable. No generic filler.`;
  },

  /**
   * SOP Generator — transforms compliance/task context into a full SOP document
   */
  sopPrompt({ title, complianceRecord, tasks, tenantName, industry, outletName }) {
    const taskList = tasks?.map(t => `- ${t.title} (Priority: ${t.priority}, Status: ${t.status})`).join('\n') || 'No specific tasks provided.';
    const complianceCtx = complianceRecord
      ? `Related Compliance Record: "${complianceRecord.title}" (Type: ${complianceRecord.type}, Category: ${complianceRecord.category}, Status: ${complianceRecord.status})`
      : 'No specific compliance record linked.';

    return `Generate a comprehensive Standard Operating Procedure (SOP) for the following:

**Organisation:** ${tenantName}${outletName ? ` — ${outletName}` : ''}
**SOP Title:** ${title}
**${complianceCtx}**

**Related Operational Tasks:**
${taskList}

The SOP must include:
1. Purpose & Scope
2. Responsibilities (who does what, by role)
3. Step-by-Step Procedure (numbered, with timing where relevant)
4. Safety & Compliance Notes (specific to ${INDUSTRY_SYSTEM_CONTEXT[industry] ? industry.replace('_', ' ') : 'operations'})
5. Escalation Protocol (what to do if something goes wrong)
6. Review Frequency
7. Review Checklist (3 items for manager sign-off)`;
  },

  /**
   * Training Module Generator — creates personalised training from operational patterns
   */
  trainingPrompt({ title, auditEvents, clockSummary, employees, tenantName, industry }) {
    const auditCtx = auditEvents?.slice(0, 10).map(e =>
      `- [${e.module?.toUpperCase()}] ${e.action_type} by ${e.actor_name || 'staff'}`
    ).join('\n') || 'No recent audit events provided.';

    const performanceCtx = clockSummary
      ? `Recent Workforce Performance: Avg productivity score: ${clockSummary.avgProductivity || 'N/A'}%, Tasks assigned: ${clockSummary.totalTasksAssigned || 0}, Tasks completed: ${clockSummary.totalTasksCompleted || 0}`
      : 'No performance data provided.';

    const employeeCtx = employees?.length
      ? `Target Audience: ${employees.map(e => e.full_name || e).join(', ')}`
      : 'Target Audience: All operational staff';

    return `Generate a structured Training Module for the following:

**Organisation:** ${tenantName}
**Training Title:** ${title}
**${employeeCtx}**
**${performanceCtx}**

**Recent Operational Events (for contextual grounding):**
${auditCtx}

The Training Module must include:
1. Learning Objectives (3-5 specific, measurable outcomes)
2. Why This Matters (connect to real operational events above)
3. Core Content (3-5 sections with key knowledge/skills)
4. Practical Scenarios (2 real-world examples based on the context above)
5. Knowledge Check (5 questions — mix of multiple choice and open-ended)
6. Completion Criteria (what the learner must demonstrate)
7. Review Checklist (3 items for manager verification)`;
  },

  /**
   * Policy Generator — formal organisational policy
   */
  policyPrompt({ title, category, tenantName, industry }) {
    return `Generate a formal organisational policy document for the following:

**Organisation:** ${tenantName}
**Policy Title:** ${title}
**Policy Category:** ${category}

The Policy must include:
1. Policy Statement
2. Scope (who this applies to)
3. Policy Rules (numbered, precise)
4. Responsibilities (by role)
5. Non-Compliance Consequences
6. Effective Date & Review Date placeholders
7. Approval Section (Manager / Director signature lines)
8. Review Checklist (3 items for manager verification)`;
  },
};

// ── Model Selector ────────────────────────────────────────────
/**
 * Automatically selects the best model for a given document type.
 * Can be overridden by explicit user selection.
 */
export function selectModel(documentType, overrideKey = null) {
  if (overrideKey && AI_MODELS[overrideKey]) return AI_MODELS[overrideKey];

  // Auto-select based on document complexity
  if (['sop', 'policy', 'incident_report'].includes(documentType)) return AI_MODELS.deep;
  if (['shift_brief'].includes(documentType)) return AI_MODELS.fast;
  return AI_MODELS.default;
}

// ── Document Type Registry ────────────────────────────────────
export const DOCUMENT_TYPES = {
  sop: {
    key: 'sop',
    label: 'Standard Operating Procedure',
    principle: 'regulate',
    auto_publish_eligible: false,
    description: 'Step-by-step procedure for a specific operational task',
    icon: 'BookOpen',
  },
  training_module: {
    key: 'training_module',
    label: 'Training Module',
    principle: 'renew',
    auto_publish_eligible: true,
    description: 'Personalised training content derived from operational patterns',
    icon: 'GraduationCap',
  },
  policy: {
    key: 'policy',
    label: 'Organisational Policy',
    principle: 'regulate',
    auto_publish_eligible: false,
    description: 'Formal policy document for governance and compliance',
    icon: 'ScrollText',
  },
  shift_brief: {
    key: 'shift_brief',
    label: 'Shift Brief',
    principle: 'respond',
    auto_publish_eligible: true,
    description: 'Quick operational brief for an upcoming shift',
    icon: 'ClipboardList',
  },
  compliance_checklist: {
    key: 'compliance_checklist',
    label: 'Compliance Checklist',
    principle: 'regulate',
    auto_publish_eligible: false,
    description: 'Structured audit or compliance verification checklist',
    icon: 'ShieldCheck',
  },
};