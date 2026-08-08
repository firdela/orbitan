// ============================================================
// ORBITANOS — Access Engine :: Permission Packs (ADR-0051)
// Architecture Version 1.0 (Frozen)
// Canonical backend-accessible version. Frontend re-exports.
// Pure, dependency-free. Exit-Ready.
// ============================================================

export const PERMISSION_PACKS_VERSION = '1.0.0';

export const PERMISSION_KEYS = Object.freeze({
  INVENTORY_READ: 'inventoryitem.read', INVENTORY_CREATE: 'inventoryitem.create',
  INVENTORY_UPDATE: 'inventoryitem.update', INVENTORY_DELETE: 'inventoryitem.delete',
  INVENTORY_ADJUST: 'inventoryitem.adjust', STOCKCOUNT_READ: 'stockcount.read',
  STOCKCOUNT_CREATE: 'stockcount.create', STOCKCOUNT_REVIEW: 'stockcount.review',
  PURCHASEORDER_READ: 'purchaseorder.read', PURCHASEORDER_CREATE: 'purchaseorder.create',
  PURCHASEORDER_UPDATE: 'purchaseorder.update', PURCHASEORDER_APPROVE: 'purchaseorder.approve',
  PURCHASEORDER_RECEIVE: 'purchaseorder.receive',
  SALESINVOICE_READ: 'salesinvoice.read', SALESINVOICE_CREATE: 'salesinvoice.create',
  SALESINVOICE_UPDATE: 'salesinvoice.update', RECONCILIATION_CREATE: 'reconciliation.create',
  EXPENSE_READ: 'expenserecord.read', EXPENSE_CREATE: 'expenserecord.create',
  EXPENSE_APPROVE: 'expenserecord.approve', WALLET_READ: 'wallet.read',
  FINANCESYNC_MANAGE: 'financesync.manage',
  EMPLOYEE_READ: 'employee.read', EMPLOYEE_READ_SELF: 'employee.read.self',
  EMPLOYEE_CREATE: 'employee.create', EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_DELETE: 'employee.delete', SHIFT_READ: 'shift.read',
  SHIFT_READ_SELF: 'shift.read.self', SHIFT_CREATE: 'shift.create',
  SHIFT_UPDATE: 'shift.update', SHIFT_ASSIGN: 'shift.assign',
  CLOCK_MANAGE: 'clockrecord.manage',
  TASK_READ: 'task.read', TASK_READ_SELF: 'task.read.self',
  TASK_UPDATE_SELF: 'task.update.self', TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update', TASK_ASSIGN: 'task.assign',
  TASK_VERIFY: 'task.verify', TASK_DELETE: 'task.delete',
  COMPLIANCE_READ: 'compliancerecord.read', COMPLIANCE_READ_SELF: 'compliancerecord.read.self',
  COMPLIANCE_CREATE: 'compliancerecord.create', COMPLIANCE_UPDATE: 'compliancerecord.update',
  COMPLIANCE_SIGN: 'compliancerecord.sign', FOODSAFETY_CREATE: 'foodsafetylog.create',
  SCHEDULING_READ: 'scheduling.read', REPORTS_READ: 'reports.read',
  AUDITLOG_READ: 'auditlog.read', OUTLET_UPDATE: 'outlet.update',
  COMPANY_UPDATE: 'company.update', TENANT_UPDATE: 'tenant.update',
});

export const PERMISSION_PACKS = Object.freeze({
  'Workforce.Basic': [PERMISSION_KEYS.EMPLOYEE_READ_SELF, PERMISSION_KEYS.SHIFT_READ_SELF, PERMISSION_KEYS.CLOCK_MANAGE],
  'Clock.Manage': [PERMISSION_KEYS.CLOCK_MANAGE],
  'Workforce.Read': [PERMISSION_KEYS.EMPLOYEE_READ, PERMISSION_KEYS.SHIFT_READ],
  'Workforce.Manage': [PERMISSION_KEYS.EMPLOYEE_READ, PERMISSION_KEYS.EMPLOYEE_CREATE, PERMISSION_KEYS.EMPLOYEE_UPDATE, PERMISSION_KEYS.EMPLOYEE_DELETE, PERMISSION_KEYS.SHIFT_READ, PERMISSION_KEYS.SHIFT_CREATE, PERMISSION_KEYS.SHIFT_UPDATE, PERMISSION_KEYS.SHIFT_ASSIGN],
  'Inventory.Read': [PERMISSION_KEYS.INVENTORY_READ, PERMISSION_KEYS.STOCKCOUNT_READ],
  'Inventory.Adjust': [PERMISSION_KEYS.INVENTORY_READ, PERMISSION_KEYS.INVENTORY_ADJUST, PERMISSION_KEYS.STOCKCOUNT_CREATE],
  'Inventory.Manage': [PERMISSION_KEYS.INVENTORY_READ, PERMISSION_KEYS.INVENTORY_CREATE, PERMISSION_KEYS.INVENTORY_UPDATE, PERMISSION_KEYS.INVENTORY_DELETE, PERMISSION_KEYS.INVENTORY_ADJUST, PERMISSION_KEYS.STOCKCOUNT_CREATE, PERMISSION_KEYS.STOCKCOUNT_REVIEW],
  'Procurement.Read': [PERMISSION_KEYS.PURCHASEORDER_READ],
  'Procurement.Manage': [PERMISSION_KEYS.PURCHASEORDER_READ, PERMISSION_KEYS.PURCHASEORDER_CREATE, PERMISSION_KEYS.PURCHASEORDER_UPDATE, PERMISSION_KEYS.PURCHASEORDER_APPROVE, PERMISSION_KEYS.PURCHASEORDER_RECEIVE],
  'Sales.Read': [PERMISSION_KEYS.SALESINVOICE_READ],
  'Sales.Manage': [PERMISSION_KEYS.SALESINVOICE_READ, PERMISSION_KEYS.SALESINVOICE_CREATE, PERMISSION_KEYS.SALESINVOICE_UPDATE, PERMISSION_KEYS.RECONCILIATION_CREATE],
  'Finance.Readonly': [PERMISSION_KEYS.EXPENSE_READ, PERMISSION_KEYS.WALLET_READ, PERMISSION_KEYS.REPORTS_READ],
  'Finance.Manage': [PERMISSION_KEYS.EXPENSE_READ, PERMISSION_KEYS.EXPENSE_CREATE, PERMISSION_KEYS.EXPENSE_APPROVE, PERMISSION_KEYS.WALLET_READ, PERMISSION_KEYS.PURCHASEORDER_APPROVE, PERMISSION_KEYS.FINANCESYNC_MANAGE],
  'Compliance.Basic': [PERMISSION_KEYS.COMPLIANCE_READ_SELF, PERMISSION_KEYS.FOODSAFETY_CREATE],
  'Compliance.Manage': [PERMISSION_KEYS.COMPLIANCE_READ, PERMISSION_KEYS.COMPLIANCE_CREATE, PERMISSION_KEYS.COMPLIANCE_UPDATE, PERMISSION_KEYS.COMPLIANCE_SIGN, PERMISSION_KEYS.FOODSAFETY_CREATE],
  'Scheduling.Read': [PERMISSION_KEYS.SHIFT_READ, PERMISSION_KEYS.SHIFT_READ_SELF, PERMISSION_KEYS.SCHEDULING_READ],
  'Scheduling.Manage': [PERMISSION_KEYS.SHIFT_READ, PERMISSION_KEYS.SHIFT_CREATE, PERMISSION_KEYS.SHIFT_UPDATE, PERMISSION_KEYS.SHIFT_ASSIGN],
  'Tasks.Read': [PERMISSION_KEYS.TASK_READ, PERMISSION_KEYS.TASK_READ_SELF],
  'Tasks.UpdateOwn': [PERMISSION_KEYS.TASK_UPDATE_SELF],
  'Tasks.Manage': [PERMISSION_KEYS.TASK_READ, PERMISSION_KEYS.TASK_CREATE, PERMISSION_KEYS.TASK_UPDATE, PERMISSION_KEYS.TASK_ASSIGN, PERMISSION_KEYS.TASK_VERIFY, PERMISSION_KEYS.TASK_DELETE],
  'Reports.Read': [PERMISSION_KEYS.REPORTS_READ, PERMISSION_KEYS.AUDITLOG_READ],
  'Settings.Manage': [PERMISSION_KEYS.OUTLET_UPDATE, PERMISSION_KEYS.COMPANY_UPDATE, PERMISSION_KEYS.TENANT_UPDATE],
});

export const ROLE_PACKS = Object.freeze({
  tenant_admin: ['Workforce.Manage', 'Inventory.Manage', 'Procurement.Manage', 'Sales.Manage', 'Finance.Manage', 'Compliance.Manage', 'Scheduling.Manage', 'Tasks.Manage', 'Reports.Read', 'Settings.Manage'],
  client_manager: ['Workforce.Read', 'Inventory.Read', 'Sales.Manage', 'Reports.Read'],
  outlet_manager: ['Workforce.Manage', 'Inventory.Manage', 'Procurement.Manage', 'Sales.Manage', 'Scheduling.Manage', 'Tasks.Manage', 'Compliance.Manage', 'Reports.Read'],
  supervisor: ['Workforce.Basic', 'Inventory.Read', 'Inventory.Adjust', 'Tasks.Manage', 'Scheduling.Read', 'Compliance.Basic'],
  worker: ['Tasks.Read', 'Tasks.UpdateOwn', 'Scheduling.Read', 'Clock.Manage', 'Compliance.Basic'],
});

export function permissionsForRole(role) {
  const packs = ROLE_PACKS[role] || [];
  const set = new Set();
  for (const packKey of packs) {
    const keys = PERMISSION_PACKS[packKey] || [];
    for (const k of keys) set.add(k);
  }
  return Array.from(set);
}

export function withPack(registry, packKey, permissionKeys) {
  return Object.freeze({ ...registry, [packKey]: permissionKeys });
}