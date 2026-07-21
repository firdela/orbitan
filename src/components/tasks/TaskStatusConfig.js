// OrbitanOS Task Lifecycle — shared status config (frontend mirror of the
// taskController transition matrix). Pure data, no platform deps. Exit-Ready.

export const TASK_STATUS_LABELS = {
  draft: 'Draft',
  assigned: 'Assigned',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  submitted_for_review: 'Submitted for Review',
  changes_required: 'Changes Required',
  completed: 'Completed',
  verified: 'Verified',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export const TASK_STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground border-border',
  assigned: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100',
  acknowledged: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100',
  in_progress: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100',
  blocked: 'bg-orbitan-red-light text-orbitan-red border-red-100',
  submitted_for_review: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100',
  changes_required: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100',
  completed: 'bg-orbitan-green-light text-orbitan-green border-green-100',
  verified: 'bg-orbitan-green-light text-orbitan-green border-green-100',
  cancelled: 'bg-muted text-muted-foreground border-border',
  archived: 'bg-muted text-muted-foreground border-border',
};

export const PRIORITY_COLORS = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-orbitan-blue-light text-orbitan-blue',
  high: 'bg-orbitan-amber-light text-orbitan-amber',
  urgent: 'bg-orbitan-red-light text-orbitan-red',
};

export const VERIFICATION_MODE_LABELS = {
  none: 'No verification required',
  self: 'Self-verification',
  manager: 'Manager verification',
  approval_gated: 'Governed approval gate',
};

// Human-readable labels for transition action buttons
export const TRANSITION_ACTION_LABELS = {
  draft_assigned: 'Assign Task',
  draft_cancelled: 'Cancel Task',
  assigned_acknowledged: 'Acknowledge',
  assigned_in_progress: 'Start Work',
  assigned_cancelled: 'Cancel Task',
  acknowledged_in_progress: 'Start Work',
  acknowledged_cancelled: 'Cancel Task',
  in_progress_blocked: 'Report Blocker',
  in_progress_submitted_for_review: 'Submit for Review',
  in_progress_completed: 'Mark Complete',
  in_progress_cancelled: 'Cancel Task',
  blocked_in_progress: 'Resolve Blocker',
  blocked_cancelled: 'Cancel Task',
  submitted_for_review_verified: 'Verify & Approve',
  submitted_for_review_changes_required: 'Request Changes',
  submitted_for_review_cancelled: 'Cancel Task',
  changes_required_in_progress: 'Resume Work',
  changes_required_cancelled: 'Cancel Task',
  completed_archived: 'Archive Task',
  completed_cancelled: 'Cancel Task',
  verified_archived: 'Archive Task',
};

export function statusLabel(status) {
  return TASK_STATUS_LABELS[status] || status;
}

export function transitionLabel(source, target) {
  return TRANSITION_ACTION_LABELS[`${source}_${target}`] || TASK_STATUS_LABELS[target] || target;
}