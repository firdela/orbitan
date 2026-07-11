import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useNexusAI — Reusable hook for all OrbitanOS modules to invoke Orbit Nexus intelligence.
 *
 * Architectural principle (ADR-0017): OrbitanOS modules work FULLY without AI.
 * AI is an optional enhancement layer — like ServiceNow's contextual AI assist.
 *
 * When the Kill Switch is off (SystemSettings.nexus_ai_enabled = false), this hook
 * returns { ai_available: false } instead of throwing. The calling page decides
 * whether to hide the AI feature or show a "AI disabled" notice — the core
 * workflow continues uninterrupted.
 *
 * Usage:
 *   const { invoke, loading, error } = useNexusAI();
 *   const result = await invoke('sop_gen', { module: 'inventory', industry: 'fnb' });
 *   if (!result.ai_available) { // AI is off — continue without it }
 *   else { // Use result.data }
 */
export function useNexusAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invoke = useCallback(async (serviceKey, payload = {}, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('nexus', {
        service_key: serviceKey,
        payload,
        tenant_id: options.tenant_id || undefined,
        outlet_id: options.outlet_id || undefined,
      });

      const data = response.data;

      // ── Graceful Degradation: AI Kill Switch is OFF ──
      // The core module continues to function. The AI-augmented feature
      // simply doesn't appear. No error, no crash, no broken workflow.
      if (data?.ai_disabled) {
        return {
          ai_available: false,
          data: null,
          message: data.message || 'AI intelligence is currently disabled.',
        };
      }

      // ── Insufficient credits — AI available but tenant ran out ──
      if (data?.upgrade_required) {
        return {
          ai_available: false,
          data: null,
          message: 'Insufficient Orbitan Credits. Top up to use AI features.',
          upgrade_required: true,
          credits_required: data.credits_required,
        };
      }

      // ── Shield governance block — AI denied by policy ──
      if (data?.error && data?.shield_response) {
        return {
          ai_available: false,
          data: null,
          message: 'AI request blocked by Orbit Shield governance policy.',
          shield_blocked: true,
        };
      }

      // ── Success — AI response ready ──
      return {
        ai_available: true,
        data: data?.data,
        credits_consumed: data?.credits_consumed,
        model_used: data?.model_used,
        latency_ms: data?.latency_ms,
      };
    } catch (err) {
      // Network/infra error — degrade gracefully, don't break the page
      const msg = err?.response?.data?.error || err.message || 'AI service unavailable';
      setError(msg);
      return {
        ai_available: false,
        data: null,
        message: msg,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return { invoke, loading, error };
}