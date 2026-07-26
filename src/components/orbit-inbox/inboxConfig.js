import {
  CheckCheck, ListTodo, Clock, AtSign, Shield, Package, ShoppingCart,
  DollarSign, TrendingUp, Users, Calendar, UserPlus, Heart, FileCheck,
  Lock, Sparkles, RefreshCw, Settings,
} from 'lucide-react';

// Shared category + priority config for Orbit Inbox.
// Icons are lucide-react components (verified to exist).

export const CATEGORY_CONFIG = {
  approval: { label: 'Approvals', Icon: CheckCheck, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light' },
  assignment: { label: 'Assignments', Icon: ListTodo, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  reminder: { label: 'Reminders', Icon: Clock, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
  mention: { label: 'Mentions', Icon: AtSign, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  compliance: { label: 'Compliance', Icon: Shield, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light' },
  inventory: { label: 'Inventory', Icon: Package, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
  procurement: { label: 'Procurement', Icon: ShoppingCart, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  finance: { label: 'Finance', Icon: DollarSign, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  sales: { label: 'Sales', Icon: TrendingUp, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  workforce: { label: 'Workforce', Icon: Users, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light' },
  scheduling: { label: 'Scheduling', Icon: Calendar, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  onboarding: { label: 'Onboarding', Icon: UserPlus, color: 'text-orbitan-blue', bg: 'bg-orbitan-blue-light' },
  customer_success: { label: 'Customer Success', Icon: Heart, color: 'text-orbitan-green', bg: 'bg-orbitan-green-light' },
  audit: { label: 'Audit', Icon: FileCheck, color: 'text-orbitan-slate', bg: 'bg-muted' },
  security: { label: 'Security', Icon: Lock, color: 'text-orbitan-red', bg: 'bg-orbitan-red-light' },
  ai_insight: { label: 'AI Insights', Icon: Sparkles, color: 'text-orbitan-purple', bg: 'bg-orbitan-purple-light' },
  renewal: { label: 'Renewals', Icon: RefreshCw, color: 'text-orbitan-amber', bg: 'bg-orbitan-amber-light' },
  system: { label: 'System', Icon: Settings, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', classes: 'bg-orbitan-red-light text-orbitan-red-700 border-red-100' },
  important: { label: 'Important', classes: 'bg-orbitan-amber-light text-orbitan-amber-700 border-amber-100' },
  normal: { label: 'Normal', classes: 'bg-orbitan-blue-light text-orbitan-blue-700 border-blue-100' },
  informational: { label: 'Info', classes: 'bg-muted text-muted-foreground border-border' },
};

export const PRIORITY_RANK = { informational: 0, normal: 1, important: 2, critical: 3 };

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG);

export function getCategoryConfig(category) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;
}

export function getPriorityConfig(priority) {
  return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.informational;
}