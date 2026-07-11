import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useModuleAccess — Access Control Layer hook for OrbitanOS.
 *
 * Checks ModuleAccessPolicy records to determine if the current user
 * can view, create, update, or delete within a specific module.
 *
 * Usage:
 *   const { can, loading, policies } = useModuleAccess('inventory');
 *   if (can('create')) { render create button }
 */

const ROLE_HIERARCHY = {
  admin: 99,
  tenant_admin: 5,
  client_manager: 4,
  outlet_manager: 3,
  supervisor: 2,
  worker: 1,
};

export function useModuleAccess(moduleKey) {
  const [policies, setPolicies] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [me, policyData] = await Promise.all([
          base44.auth.me(),
          base44.entities.ModuleAccessPolicy.filter({ module_key: moduleKey, is_active: true }, '-created_date', 50),
        ]);
        if (!mounted) return;
        setUser(me);
        setPolicies(policyData || []);
      } catch {
        if (!mounted) return;
        setPolicies([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [moduleKey]);

  const can = useCallback((action) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    const role = user.role;
    const matchingPolicies = policies.filter(p => p.role === role);

    if (matchingPolicies.length === 0) {
      // No explicit policy — default by role hierarchy
      const level = ROLE_HIERARCHY[role] || 0;
      if (level >= 3) return action !== 'delete';
      if (level >= 2) return action === 'view' || action === 'create';
      return action === 'view';
    }

    const policy = matchingPolicies[0];
    switch (action) {
      case 'view': return policy.can_view !== false;
      case 'create': return policy.can_create === true;
      case 'update': return policy.can_update === true;
      case 'delete': return policy.can_delete === true;
      default: return false;
    }
  }, [user, policies]);

  const canView = useCallback(() => can('view'), [can]);
  const canCreate = useCallback(() => can('create'), [can]);
  const canUpdate = useCallback(() => can('update'), [can]);
  const canDelete = useCallback(() => can('delete'), [can]);

  return { can, canView, canCreate, canUpdate, canDelete, loading, policies, user };
}

export default useModuleAccess;