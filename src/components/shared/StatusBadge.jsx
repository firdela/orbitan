import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  // Generic
  active: { label: 'Active', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  inactive: { label: 'Inactive', classes: 'bg-muted text-muted-foreground border-border' },
  // Tenant
  onboarding: { label: 'Onboarding', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  suspended: { label: 'Suspended', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  trial: { label: 'Trial', classes: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100' },
  cancelled: { label: 'Cancelled', classes: 'bg-muted text-muted-foreground border-border' },
  // PO
  draft: { label: 'Draft', classes: 'bg-muted text-muted-foreground border-border' },
  pending_approval: { label: 'Pending Approval', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  approved: { label: 'Approved', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100' },
  sent: { label: 'Sent', classes: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100' },
  partially_received: { label: 'Partial', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  received: { label: 'Received', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  // Invoice
  paid: { label: 'Paid', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  pending: { label: 'Pending', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  overdue: { label: 'Overdue', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  // Shift
  scheduled: { label: 'Scheduled', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100' },
  confirmed: { label: 'Confirmed', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  in_progress: { label: 'In Progress', classes: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100' },
  completed: { label: 'Completed', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  absent: { label: 'Absent', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  // Task
  'in-progress': { label: 'In Progress', classes: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100' },
  // Compliance
  submitted: { label: 'Submitted', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100' },
  in_review: { label: 'In Review', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  rejected: { label: 'Rejected', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  flagged: { label: 'Flagged', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  // Xero
  not_synced: { label: 'Not Synced', classes: 'bg-muted text-muted-foreground border-border' },
  synced: { label: 'Synced', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  error: { label: 'Sync Error', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  // Shift Trades
  denied: { label: 'Denied', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  cancelled: { label: 'Cancelled', classes: 'bg-muted text-muted-foreground border-border' },
  expired: { label: 'Expired', classes: 'bg-muted text-muted-foreground border-border' },
  // Expenses
  reimbursed: { label: 'Reimbursed', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  // Stock Count
  counted: { label: 'Counted', classes: 'bg-orbitan-blue-light text-orbitan-blue border-blue-100' },
  reviewed: { label: 'Reviewed', classes: 'bg-orbitan-purple-light text-orbitan-purple border-purple-100' },
  adjusted: { label: 'Adjusted', classes: 'bg-orbitan-green-light text-orbitan-green border-green-100' },
  flagged: { label: 'Flagged', classes: 'bg-orbitan-red-light text-orbitan-red border-red-100' },
  // Client
  prospective: { label: 'Prospective', classes: 'bg-orbitan-amber-light text-orbitan-amber border-amber-100' },
  archived: { label: 'Archived', classes: 'bg-muted text-muted-foreground border-border' },
};

export default function StatusBadge({ status, label, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || { label: label || status, classes: 'bg-muted text-muted-foreground border-border' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.classes} ${sizeClass}`}>
      {config.label}
    </span>
  );
}