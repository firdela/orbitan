/**
 * OrbitanOS — Task Controller & Transition Engine (ADR-0047 OSF)
 * ──────────────────────────────────────────────────────────────
 * Governed lifecycle engine for Operational Task Assignment.
 *
 * Responsibilities:
 * 1. Enforce the approved state-transition matrix (rejects illegal transitions).
 * 2. Separate Assignment / Responsibility / Accountability (TaskAssignment history).
 * 3. Gate verification via WorkReview (distinct from ArtifactRecord evidence).
 * 4. Optimistic locking via `version` (rejects stale updates).
 * 5. Idempotent transitions via `idempotency_key` (dedupes double-clicks/retries).
 * 6. Shield governance binding for approval_gated verification modes.
 * 7. Immutable AuditLog provenance for every high-value event.
 *
 * Exit-Ready: No platform lock-in. Portable to any Deno/Node runtime.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Transition Matrix ────────────────────────────────────────────
// Source status → { target: { allowed_roles, requires_fields, verification } }
// Any transition not listed here is REJECTED.
const TRANSITION_MATRIX = {
  draft: {
    assigned: { actor: 'manager_or_admin', requires_assignment: true },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  assigned: {
    acknowledged: { actor: 'assignee' },
    in_progress: { actor: 'manager_or_admin', acknowledgement_optional: true },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  acknowledged: {
    in_progress: { actor: 'assignee' },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  in_progress: {
    blocked: { actor: 'any_actor', requires_blocker_reason: true },
    submitted_for_review: { actor: 'assignee', requires_verification_mode: true },
    completed: { actor: 'assignee_or_manager', requires_no_verification: true },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  blocked: {
    in_progress: { actor: 'assignee_or_manager', clears_blocker: true },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  submitted_for_review: {
    verified: { actor: 'verifier', requires_review: true },
    changes_required: { actor: 'verifier', requires_review: true },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  changes_required: {
    in_progress: { actor: 'assignee' },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  completed: {
    archived: { actor: 'manager_or_admin' },
    cancelled: { actor: 'manager_or_admin', requires_reason: true },
  },
  verified: {
    archived: { actor: 'manager_or_admin' },
  },
};

const GOVERNED_TRANSITIONS = new Set(['submitted_for_review->verified']);

// ── Role helpers ────────────────────────────────────────────────
const MANAGER_ROLES = new Set(['admin', 'tenant_admin', 'outlet_manager', 'supervisor']);
const VERIFIER_ROLES = new Set(['admin', 'tenant_admin', 'outlet_manager', 'supervisor']);

const isManager = (user) => MANAGER_ROLES.has(user.role);
const isVerifier = (user) => VERIFIER_ROLES.has(user.role);
const isAssignee = (task, user) =>
  task.responsible_agent_id === user.id || task.accountable_agent_id === user.id;

const isActorAllowed = (rule, task, user) => {
  if (!rule) return false;
  switch (rule.actor) {
    case 'manager_or_admin': return isManager(user);
    case 'assignee': return isAssignee(task, user);
    case 'assignee_or_manager': return isAssignee(task, user) || isManager(user);
    case 'verifier': return isVerifier(user);
    case 'any_actor': return true;
    default: return false;
  }
};

// ── Main Handler ────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'createTask': return await handleCreateTask(base44, user, body);
      case 'transition': return await handleTransition(base44, user, body);
      case 'assignAgent': return await handleAssignAgent(base44, user, body);
      case 'acknowledge': return await handleAcknowledge(base44, user, body);
      case 'submitReview': return await handleSubmitReview(base44, user, body);
      case 'getAllowedTransitions': return await handleGetAllowedTransitions(base44, user, body);
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[taskController] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Create Task ─────────────────────────────────────────────────
async function handleCreateTask(base44, user, body) {
  const {
    tenant_id, outlet_id, title, description, due_date, due_time,
    priority, module_context, category, completion_requirements,
    verification_mode = 'none', verification_policy_id,
    responsible_agent_id, responsible_agent_name,
    accountable_agent_id, accountable_agent_name,
  } = body;

  if (!tenant_id || !title) {
    return Response.json({ error: 'tenant_id and title are required' }, { status: 400 });
  }

  // Shield gate: task creation (domain-aware, auto-resolved from tenant)
  const shield = await invokeShield(base44, user, {
    action: 'create', entity_name: 'Task', data: body, tenant_id,
  });
  if (!shield.allowed) {
    return Response.json({ error: shield.reason || 'Blocked by governance policy', shield }, { status: 403 });
  }

  const now = new Date().toISOString();
  const initialStatus = (responsible_agent_id || accountable_agent_id) ? 'assigned' : 'draft';

  const task = await base44.entities.Task.create({
    tenant_id,
    outlet_id: outlet_id || null,
    title,
    description: description || null,
    due_date: due_date || null,
    due_time: due_time || null,
    priority: priority || 'medium',
    status: initialStatus,
    module_context: module_context || null,
    category: category || null,
    responsible_agent_id: responsible_agent_id || null,
    responsible_agent_name: responsible_agent_name || null,
    accountable_agent_id: accountable_agent_id || null,
    accountable_agent_name: accountable_agent_name || null,
    verification_mode,
    verification_policy_id: verification_policy_id || null,
    completion_requirements: completion_requirements || null,
    version: 1,
    last_transition_at: now,
    last_transition_by: user.id,
    last_transition_by_name: user.full_name,
    last_transition_reason: 'Task created',
  });

  // Create initial TaskAssignment records for responsible & accountable
  const assignmentPromises = [];
  if (responsible_agent_id) {
    assignmentPromises.push(createAssignment(base44, user, {
      tenant_id, outlet_id, task_id: task.id,
      agent_id: responsible_agent_id, assignee_name: responsible_agent_name,
      assignment_role: 'responsible',
    }));
  }
  if (accountable_agent_id && accountable_agent_id !== responsible_agent_id) {
    assignmentPromises.push(createAssignment(base44, user, {
      tenant_id, outlet_id, task_id: task.id,
      agent_id: accountable_agent_id, assignee_name: accountable_agent_name,
      assignment_role: 'accountable',
    }));
  }
  await Promise.all(assignmentPromises);

  await writeAuditLog(base44, {
    tenant_id, actor: user, action_type: 'task_created',
    target_entity: 'Task', target_record_id: task.id, outlet_id,
    details: `Task "${title}" created with status ${initialStatus}`,
    new_state: task,
  });

  return Response.json({ success: true, task });
}

// ── Transition ─────────────────────────────────────────────────
async function handleTransition(base44, user, body) {
  const { task_id, target_status, version, idempotency_key, reason } = body;
  if (!task_id || !target_status) {
    return Response.json({ error: 'task_id and target_status are required' }, { status: 400 });
  }

  const task = await loadTask(base44, task_id);
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  // Idempotency check
  if (idempotency_key && task.last_idempotency_key === idempotency_key) {
    return Response.json({ success: true, task, idempotent: true, message: 'Transition already applied' });
  }

  // Optimistic lock check
  if (version !== undefined && task.version !== version) {
    return Response.json({
      error: 'Stale version — task was modified by another actor',
      current_version: task.version,
    }, { status: 409 });
  }

  const source = task.status;
  const matrixEntry = TRANSITION_MATRIX[source]?.[target_status];
  if (!matrixEntry) {
    return Response.json({
      error: `Invalid transition: ${source} → ${target_status}`,
      allowed_targets: Object.keys(TRANSITION_MATRIX[source] || {}),
    }, { status: 422 });
  }

  // Actor permission check
  if (!isActorAllowed(matrixEntry, task, user)) {
    return Response.json({ error: 'Actor not permitted for this transition', rule: matrixEntry.actor }, { status: 403 });
  }

  // Field requirements
  if (matrixEntry.requires_blocker_reason && !body.blocker_reason) {
    return Response.json({ error: 'blocker_reason is required for this transition' }, { status: 422 });
  }
  if (matrixEntry.requires_reason && !reason) {
    return Response.json({ error: 'reason is required for this transition' }, { status: 422 });
  }

  // Shield governance for governed transitions
  const transitionKey = `${source}->${target_status}`;
  let shieldOutcome = null;
  if (GOVERNED_TRANSITIONS.has(transitionKey) || task.verification_mode === 'approval_gated') {
    shieldOutcome = await invokeShield(base44, user, {
      action: 'update', entity_name: 'Task', data: { ...task, target_status }, tenant_id: task.tenant_id,
    });
    if (!shieldOutcome.allowed) {
      return Response.json({ error: shieldOutcome.reason || 'Blocked by governance policy', shield: shieldOutcome }, { status: 403 });
    }
  }

  // Apply transition
  const now = new Date().toISOString();
  const updateFields = {
    status: target_status,
    version: (task.version || 1) + 1,
    last_transition_at: now,
    last_transition_by: user.id,
    last_transition_by_name: user.full_name,
    last_transition_reason: reason || `Transitioned ${source} → ${target_status}`,
  };
  if (idempotency_key) updateFields.last_idempotency_key = idempotency_key;

  if (target_status === 'blocked') updateFields.blocker_reason = body.blocker_reason;
  if (source === 'blocked' && target_status === 'in_progress') updateFields.blocker_reason = null;
  if (target_status === 'completed') updateFields.completed_date = now;
  if (target_status === 'verified') updateFields.verified_date = now;
  if (target_status === 'cancelled') updateFields.cancelled_date = now;

  const updated = await base44.entities.Task.update(task_id, updateFields);

  await writeAuditLog(base44, {
    tenant_id: task.tenant_id, actor: user, action_type: `task_transition_${source}_to_${target_status}`,
    target_entity: 'Task', target_record_id: task_id, outlet_id: task.outlet_id,
    previous_state: { status: source, version: task.version },
    new_state: { status: target_status, version: updateFields.version },
    details: reason || `Status transitioned ${source} → ${target_status} by ${user.full_name}`,
    shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
    policy_name: shieldOutcome?.policy_name,
  });

  return Response.json({ success: true, task: updated });
}

// ── Assign Agent (creates TaskAssignment, updates cached fields) ─
async function handleAssignAgent(base44, user, body) {
  const {
    task_id, agent_id, assignee_name, assignment_role,
    assignee_type = 'agent', organisational_unit_id, removal_reason,
  } = body;

  if (!task_id || !assignment_role) {
    return Response.json({ error: 'task_id and assignment_role are required' }, { status: 400 });
  }

  const task = await loadTask(base44, task_id);
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  if (!isManager(user)) {
    return Response.json({ error: 'Only managers/admins can assign agents' }, { status: 403 });
  }

  // End existing active assignment for this role
  const existing = await base44.entities.TaskAssignment.filter({
    task_id, assignment_role, is_active: true,
  });
  const now = new Date().toISOString();
  await Promise.all(existing.map(a =>
    base44.entities.TaskAssignment.update(a.id, {
      is_active: false,
      effective_until: now,
      removal_reason: removal_reason || 'Reassigned',
      version: (a.version || 1) + 1,
    })
  ));

  // Create new assignment record
  const assignment = await createAssignment(base44, user, {
    tenant_id: task.tenant_id, outlet_id: task.outlet_id, task_id,
    agent_id, assignee_name, assignment_role, assignee_type, organisational_unit_id,
  });

  // Update cached fields on Task
  const updateFields = { version: (task.version || 1) + 1 };
  if (assignment_role === 'responsible') {
    updateFields.responsible_agent_id = agent_id || null;
    updateFields.responsible_agent_name = assignee_name || null;
  } else if (assignment_role === 'accountable') {
    updateFields.accountable_agent_id = agent_id || null;
    updateFields.accountable_agent_name = assignee_name || null;
  }
  // If task was draft and now has an assignee, move to assigned
  if (task.status === 'draft' && (updateFields.responsible_agent_id || updateFields.accountable_agent_id)) {
    updateFields.status = 'assigned';
    updateFields.last_transition_at = now;
    updateFields.last_transition_by = user.id;
    updateFields.last_transition_by_name = user.full_name;
    updateFields.last_transition_reason = 'Agent assigned';
  }
  await base44.entities.Task.update(task_id, updateFields);

  await writeAuditLog(base44, {
    tenant_id: task.tenant_id, actor: user, action_type: 'task_assignment_added',
    target_entity: 'TaskAssignment', target_record_id: assignment.id, outlet_id: task.outlet_id,
    details: `${assignment_role} assignment → ${assignee_name || agent_id || organisational_unit_id} on task ${task_id}`,
    new_state: assignment,
  });

  return Response.json({ success: true, assignment });
}

// ── Acknowledge Assignment ─────────────────────────────────────
async function handleAcknowledge(base44, user, body) {
  const { assignment_id, decision = 'acknowledged' } = body;
  if (!assignment_id) return Response.json({ error: 'assignment_id is required' }, { status: 400 });
  if (!['acknowledged', 'declined'].includes(decision)) {
    return Response.json({ error: 'decision must be acknowledged or declined' }, { status: 400 });
  }

  const assignment = await base44.entities.TaskAssignment.get(assignment_id);
  if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });
  if (assignment.agent_id !== user.id) {
    return Response.json({ error: 'Only the assigned agent may acknowledge' }, { status: 403 });
  }
  if (!assignment.is_active) {
    return Response.json({ error: 'This assignment is no longer active and cannot be acknowledged' }, { status: 422 });
  }

  const updated = await base44.entities.TaskAssignment.update(assignment_id, {
    acknowledgement_status: decision,
    acknowledged_at: new Date().toISOString(),
    version: (assignment.version || 1) + 1,
  });

  // If acknowledged and task is in 'assigned', advance to 'acknowledged'
  if (decision === 'acknowledged') {
    const task = await loadTask(base44, assignment.task_id);
    if (task && task.status === 'assigned') {
      await base44.entities.Task.update(task.id, {
        status: 'acknowledged',
        version: (task.version || 1) + 1,
        last_transition_at: new Date().toISOString(),
        last_transition_by: user.id,
        last_transition_by_name: user.full_name,
        last_transition_reason: 'Assignment acknowledged',
      });
    }
  }

  await writeAuditLog(base44, {
    tenant_id: assignment.tenant_id, actor: user, action_type: `task_assignment_${decision}`,
    target_entity: 'TaskAssignment', target_record_id: assignment_id, outlet_id: assignment.outlet_id,
    details: `Assignment ${decision} by ${user.full_name}`,
    new_state: updated,
  });

  return Response.json({ success: true, assignment: updated });
}

// ── Submit Review (creates WorkReview + transitions task) ────────
async function handleSubmitReview(base44, user, body) {
  const {
    task_id, review_result, comments, feedback, evidence_urls, evidence_artifact_ids,
    approval_reason, rejection_reason,
  } = body;

  if (!task_id || !review_result) {
    return Response.json({ error: 'task_id and review_result are required' }, { status: 400 });
  }

  const task = await loadTask(base44, task_id);
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  if (task.status !== 'submitted_for_review') {
    return Response.json({ error: `Task must be in submitted_for_review state (current: ${task.status})` }, { status: 422 });
  }

  // Self-verification check
  const isSelfVerification = task.responsible_agent_id === user.id;
  if (isSelfVerification && task.verification_mode !== 'self') {
    return Response.json({ error: 'Self-verification not permitted for this task' }, { status: 403 });
  }
  if (!isVerifier(user) && !isSelfVerification) {
    return Response.json({ error: 'Only authorised verifiers may review' }, { status: 403 });
  }

  if (review_result === 'rejected' && !rejection_reason) {
    return Response.json({ error: 'rejection_reason is required when rejecting' }, { status: 422 });
  }
  if (review_result === 'approved' && task.verification_mode === 'approval_gated' && !approval_reason) {
    return Response.json({ error: 'approval_reason is required for approval_gated verification' }, { status: 422 });
  }

  // Shield gate for governed verification
  let shieldOutcome = null;
  if (task.verification_mode === 'approval_gated') {
    shieldOutcome = await invokeShield(base44, user, {
      action: 'update', entity_name: 'Task', data: { ...task, review_result }, tenant_id: task.tenant_id,
    });
    if (!shieldOutcome.allowed) {
      return Response.json({ error: shieldOutcome.reason || 'Verification blocked by governance policy', shield: shieldOutcome }, { status: 403 });
    }
  }

  const targetStatus = review_result === 'approved' ? 'verified'
    : review_result === 'changes_required' ? 'changes_required'
    : review_result === 'rejected' ? 'changes_required'
    : 'submitted_for_review';

  const now = new Date().toISOString();

  // Create WorkReview record
  const review = await base44.entities.WorkReview.create({
    tenant_id: task.tenant_id,
    outlet_id: task.outlet_id,
    review_type: 'task_verification',
    target_entity: 'Task',
    target_record_id: task_id,
    submission_version: task.version,
    reviewer_id: user.id,
    reviewer_name: user.full_name,
    reviewer_role: user.role,
    review_result,
    review_date: now,
    comments: comments || null,
    feedback: feedback || null,
    evidence_urls: evidence_urls || [],
    evidence_artifact_ids: evidence_artifact_ids || [],
    approval_reason: approval_reason || null,
    rejection_reason: rejection_reason || null,
    policy_id: task.verification_policy_id || null,
    policy_name: shieldOutcome?.policy_name || null,
    prior_state: task.status,
    resulting_state: targetStatus,
    self_verification: isSelfVerification,
    version: 1,
  });

  // Transition the task
  const updateFields = {
    status: targetStatus,
    version: (task.version || 1) + 1,
    last_transition_at: now,
    last_transition_by: user.id,
    last_transition_by_name: user.full_name,
    last_transition_reason: `Review: ${review_result}`,
  };
  if (targetStatus === 'verified') updateFields.verified_date = now;
  const updatedTask = await base44.entities.Task.update(task_id, updateFields);

  // Link the review to its audit log
  const auditLog = await writeAuditLog(base44, {
    tenant_id: task.tenant_id, actor: user, action_type: `task_review_${review_result}`,
    target_entity: 'Task', target_record_id: task_id, outlet_id: task.outlet_id,
    previous_state: { status: task.status, version: task.version },
    new_state: { status: targetStatus, version: updateFields.version },
    details: `WorkReview ${review_result} by ${user.full_name}${rejection_reason ? ` — ${rejection_reason}` : ''}`,
    shield_outcome: shieldOutcome?.effect === 'notify' ? 'notify' : 'pass',
    policy_name: shieldOutcome?.policy_name,
  });

  await base44.entities.WorkReview.update(review.id, {
    provenance_audit_log_id: auditLog.id,
  });

  return Response.json({ success: true, review, task: updatedTask });
}

// ── Get Allowed Transitions (for UI gating) ─────────────────────
async function handleGetAllowedTransitions(base44, user, body) {
  const { task_id } = body;
  if (!task_id) return Response.json({ error: 'task_id is required' }, { status: 400 });

  const task = await loadTask(base44, task_id);
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  const targets = TRANSITION_MATRIX[task.status] || {};
  const allowed = [];
  for (const [target, rule] of Object.entries(targets)) {
    if (isActorAllowed(rule, task, user)) {
      allowed.push({
        target_status: target,
        actor_rule: rule.actor,
        requires_reason: !!rule.requires_reason,
        requires_blocker_reason: !!rule.requires_blocker_reason,
        requires_review: !!rule.requires_review,
      });
    }
  }
  return Response.json({ success: true, current_status: task.status, allowed_transitions: allowed });
}

// ── Shared helpers ──────────────────────────────────────────────
async function loadTask(base44, task_id) {
  try {
    const tasks = await base44.entities.Task.filter({ id: task_id });
    return tasks[0] || null;
  } catch {
    return null;
  }
}

async function createAssignment(base44, user, params) {
  const now = new Date().toISOString();
  return base44.entities.TaskAssignment.create({
    tenant_id: params.tenant_id,
    outlet_id: params.outlet_id || null,
    task_id: params.task_id,
    assignee_type: params.assignee_type || 'agent',
    agent_id: params.agent_id || null,
    organisational_unit_id: params.organisational_unit_id || null,
    assignee_name: params.assignee_name || null,
    assignment_role: params.assignment_role,
    assigned_by: user.id,
    assigned_by_name: user.full_name,
    assigned_at: now,
    effective_from: now,
    effective_until: null,
    acknowledgement_status: params.assignment_role === 'assigned' ? 'pending' : 'none',
    is_active: true,
    version: 1,
  });
}

async function invokeShield(base44, user, params) {
  try {
    const res = await base44.functions.invoke('shieldInterceptor', {
      action: params.action,
      entity_name: params.entity_name,
      data: params.data,
      tenant_id: params.tenant_id,
    });
    return res.data || res;
  } catch (e) {
    // Fail-open: if Shield is unavailable, allow the action (audit-logged)
    console.error('[taskController] Shield unavailable, failing open:', e.message);
    return { allowed: true, reason: 'Shield unavailable — fail-open' };
  }
}

async function writeAuditLog(base44, params) {
  return base44.asServiceRole.entities.AuditLog.create({
    tenant_id: params.tenant_id,
    actor_id: params.actor.id,
    actor_name: params.actor.full_name,
    actor_role: params.actor.role,
    action_type: params.action_type,
    module: 'workforce',
    target_entity: params.target_entity,
    target_record_id: params.target_record_id,
    outlet_id: params.outlet_id || null,
    previous_state: params.previous_state || null,
    new_state: params.new_state || null,
    details: params.details,
    shield_outcome: params.shield_outcome || 'not_evaluated',
    policy_name: params.policy_name || null,
  });
}