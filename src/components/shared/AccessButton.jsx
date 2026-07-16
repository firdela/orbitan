import React from 'react';
import { Button } from '@/components/ui/button';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';

/**
 * AccessButton — Least-privilege Button wrapper (ADR-0031).
 *
 * Auto-disables (or hides) a Button when the current user lacks the
 * required ModuleAccessPolicy permission. Eliminates scattered inline
 * role-array checks (e.g. `['admin','tenant_admin'].includes(role)`).
 *
 * Props:
 *   module   — module key (e.g. 'procurement')
 *   action   — 'view' | 'create' | 'update' | 'delete'
 *   can      — optional pre-resolved `can` fn from a page-level useModuleAccess
 *   mode     — 'disable' (default) | 'hide'
 *   ...rest  — passed through to the underlying Button
 *
 * Usage (page-level hook to avoid per-button fetches):
 *   const { can } = useModuleAccess('procurement');
 *   <AccessButton can={can} action="update" onClick={approve}>Approve</AccessButton>
 */
export default function AccessButton({
  module,
  action,
  can,
  mode = 'disable',
  children,
  ...rest
}) {
  const hook = useModuleAccess(module);
  const canFn = can || hook.can;
  const allowed = canFn(action);

  if (!allowed && mode === 'hide') return null;

  return (
    <Button {...rest} disabled={!allowed || rest.disabled}>
      {children}
    </Button>
  );
}