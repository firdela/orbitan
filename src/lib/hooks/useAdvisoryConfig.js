// ============================================================
// ORBITAN — useAdvisoryConfig Hook
// Registry-Driven Advisory Config Fetcher with Static Fallback
//
// Fetches advisory rules from the ActivationRegistry via the
// resolveAdvisoryConfig backend function. If the registry has
// no advisory_config for the given industry, falls back to the
// static INDUSTRY_ADVISOR_RULES in blueprint-registry.js.
//
// This makes the platform truly registry-driven: adding a new
// industry = one ActivationRegistry record with advisory_config.
// The frontend evaluation engine reads it dynamically.
//
// Exit-Ready: the hook abstracts the data source. Swapping
// the backend for a different API requires only this file.
// ============================================================

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { INDUSTRY_ADVISOR_RULES } from '@/lib/onboarding/blueprint-registry';

/**
 * Fetch advisory config for an industry from the ActivationRegistry.
 * Falls back to static INDUSTRY_ADVISORY_RULES if the registry
 * has no advisory_config for this industry.
 *
 * @param {string} industry - The Tenant.industry enum value
 * @returns {{ config: object|null, loading: boolean, source: 'registry'|'static'|null }}
 */
export function useAdvisoryConfig(industry) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  useEffect(() => {
    if (!industry) {
      setConfig(null);
      setLoading(false);
      setSource(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    base44.functions
      .invoke('resolveAdvisoryConfig', { industry })
      .then((res) => {
        if (cancelled) return;
        const advisoryConfig = res.data?.advisory_config;
        if (advisoryConfig) {
          // Merge the industry key so evaluation functions can use it
          setConfig({ ...advisoryConfig, industry });
          setSource('registry');
        } else {
          // Fallback to static
          setConfig(INDUSTRY_ADVISOR_RULES[industry] || null);
          setSource('static');
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to static on error
        setConfig(INDUSTRY_ADVISOR_RULES[industry] || null);
        setSource('static');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [industry]);

  return { config, loading, source };
}