// ============================================================
// ORBITAN — GlobalOutletContext
// Enterprise Orchestration Layer — "Reach" Principle
//
// Manages outlet scope across the entire OrbitanOS UI.
// ALL = enterprise-wide view (no filter applied)
// outlet_id = single-outlet scoped view
//
// EXIT-READY: Pure React Context — zero platform dependencies.
// To migrate: replace usages of getOutletFilter() with your
// own API query-parameter factory. No other code changes needed.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';

// Sentinel value for "all outlets" scope
export const SCOPE_ALL = 'ALL';

const GlobalOutletContext = createContext(null);

export function GlobalOutletProvider({ children, outlets: initialOutlets = [] }) {
  const [activeScope, setActiveScope] = useState(SCOPE_ALL);
  const [outlets, setOutlets] = useState(initialOutlets);

  // Returns a filter object safe to spread into any base44.entities.X.filter() call
  // If scope is ALL → empty object (no filter = all records returned)
  // If scope is outlet_id → { outlet_id: '...' }
  // EXIT-READY: replace this with your API query-param builder on migration
  const getOutletFilter = useCallback(() => {
    if (activeScope === SCOPE_ALL) return {};
    return { outlet_id: activeScope };
  }, [activeScope]);

  // Returns the active outlet object (or null for ALL)
  const activeOutlet = activeScope === SCOPE_ALL
    ? null
    : outlets.find(o => o.id === activeScope) || null;

  const isGlobalScope = activeScope === SCOPE_ALL;

  const switchToOutlet = useCallback((outletId) => {
    setActiveScope(outletId || SCOPE_ALL);
  }, []);

  const switchToGlobal = useCallback(() => {
    setActiveScope(SCOPE_ALL);
  }, []);

  return (
    <GlobalOutletContext.Provider value={{
      activeScope,
      activeOutlet,
      isGlobalScope,
      outlets,
      getOutletFilter,
      switchToOutlet,
      switchToGlobal,
      setOutlets,
    }}>
      {children}
    </GlobalOutletContext.Provider>
  );
}

export function useGlobalOutlet() {
  const ctx = useContext(GlobalOutletContext);
  if (!ctx) {
    throw new Error('useGlobalOutlet must be used inside GlobalOutletProvider');
  }
  return ctx;
}

export default GlobalOutletContext;