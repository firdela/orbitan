import React from 'react';
import { useModuleAccess } from '@/lib/hooks/useModuleAccess';

/**
 * AccessGuard — Declarative least-privilege render gate (ADR-0031).
 *
 * Conditionally renders children based on the current user's
 * ModuleAccessPolicy for the given module + action.
 *
 * Usage:
 *   <AccessGuard module="procurement" action="create">
 *     <Button onClick={handleCreate}>New PO</Button>
 *   </AccessGuard>
 *
 * To avoid repeated policy fetches when many guards share a module,
 * call `useModuleAccess(module)` once at the page level and pass the
 * returned `can` function via the `can` prop instead of `module`/`action`.
 */
export default function AccessGuard({
  module,
  action,
  can,
  fallback = null,
  children,
}) {
  const hook = useModuleAccess(module);
  const canFn = can || hook.can;
  const allowed = canFn(action);

  if (!allowed) return fallback;
  return <>{children}</>;
}