// ============================================================
// ORBITAN AI OPERATING LAYER — Autonomy Levels (Build #28.2M)
//
// Canonical autonomy classification for all AI agents and capabilities.
// New agents and skills default to the lowest appropriate level.
// L3 is technically restricted and cannot autonomously perform
// sensitive actions.
//
// Pure JS — zero React imports — safe for tests and backend functions.
// ============================================================

/**
 * Autonomy Level 0 — Answer
 * The AI provides information, answers, or explanations.
 * No actions are taken. No state is changed.
 */
const L0_ANSWER = 'L0_answer';

/**
 * Autonomy Level 1 — Recommend
 * The AI suggests actions but does not perform them.
 * All proposed actions require explicit human confirmation.
 */
const L1_RECOMMEND = 'L1_recommend';

/**
 * Autonomy Level 2 — Draft
 * The AI creates draft content, documents, or configurations.
 * Drafts are saved but NOT published/activated without human review.
 */
const L2_DRAFT = 'L2_draft';

/**
 * Autonomy Level 3 — Execute
 * The AI performs actions that change state.
 * RESTRICTED: cannot autonomously perform sensitive actions.
 */
const L3_EXECUTE = 'L3_execute';

const AUTONOMY_LEVELS = {
  [L0_ANSWER]: { level: 0, label: 'Answer', description: 'Provides information. No actions taken.' },
  [L1_RECOMMEND]: { level: 1, label: 'Recommend', description: 'Suggests actions. Requires human confirmation.' },
  [L2_DRAFT]: { level: 2, label: 'Draft', description: 'Creates drafts. Not published without review.' },
  [L3_EXECUTE]: { level: 3, label: 'Execute', description: 'Performs actions. Restricted for sensitive operations.' },
};

/**
 * Actions that L3 agents CANNOT perform autonomously.
 * These require explicit human approval and applicable policy checks.
 */
const L3_PROHIBITED_ACTIONS = [
  'payment',
  'payroll_change',
  'employee_status_change',
  'access_permission_change',
  'destructive_database_change',
  'external_publication',
  'legal_contractual_commitment',
  'customer_data_export',
  'production_configuration_change',
];

/**
 * Safe user-facing provenance states for AI-generated outputs.
 */
const PROVENANCE_STATES = {
  ai_generated: { label: 'AI-Generated', description: 'Output generated entirely by AI.' },
  ai_assisted: { label: 'AI-Assisted', description: 'AI generated a draft that a human edited.' },
  human_reviewed: { label: 'Human-Reviewed', description: 'AI output reviewed and approved by a human.' },
  awaiting_review: { label: 'Awaiting Review', description: 'AI output pending human review.' },
  executed_after_approval: { label: 'Executed After Approval', description: 'AI action executed after explicit human approval.' },
};

/**
 * Checks if an autonomy level allows a given action autonomously.
 * @param {string} autonomyLevel - L0_ANSWER, L1_RECOMMEND, L2_DRAFT, L3_EXECUTE
 * @param {string} actionType - The action being checked
 * @returns {{ allowed: boolean, requiresApproval: boolean, reason: string }}
 */
function canPerformAction(autonomyLevel, actionType) {
  if (!autonomyLevel || !AUTONOMY_LEVELS[autonomyLevel]) {
    return { allowed: false, requiresApproval: true, reason: 'Unknown autonomy level — deny by default' };
  }

  const level = AUTONOMY_LEVELS[autonomyLevel].level;

  // L0 and L1 never perform actions autonomously
  if (level <= 1) {
    return { allowed: false, requiresApproval: true, reason: `${AUTONOMY_LEVELS[autonomyLevel].label} autonomy cannot perform actions autonomously` };
  }

  // L2 can create drafts but not publish/activate
  if (level === 2 && actionType && actionType.includes('publish')) {
    return { allowed: false, requiresApproval: true, reason: 'L2 Draft autonomy cannot publish without human review' };
  }

  // L3 checks prohibited actions
  if (level === 3) {
    if (L3_PROHIBITED_ACTIONS.includes(actionType)) {
      return { allowed: false, requiresApproval: true, reason: `L3 Execute autonomy is prohibited from performing: ${actionType}` };
    }
    return { allowed: true, requiresApproval: false, reason: 'L3 Execute autonomy permitted for this action' };
  }

  return { allowed: true, requiresApproval: false, reason: 'Action permitted' };
}

/**
 * Gets the default autonomy level for a new agent.
 * Always returns L0 (lowest appropriate).
 */
function getDefaultAutonomy() {
  return L0_ANSWER;
}

/**
 * Validates that an autonomy level string is valid.
 */
function isValidAutonomyLevel(level) {
  return Object.keys(AUTONOMY_LEVELS).includes(level);
}

export {
  L0_ANSWER,
  L1_RECOMMEND,
  L2_DRAFT,
  L3_EXECUTE,
  AUTONOMY_LEVELS,
  L3_PROHIBITED_ACTIONS,
  PROVENANCE_STATES,
  canPerformAction,
  getDefaultAutonomy,
  isValidAutonomyLevel,
};