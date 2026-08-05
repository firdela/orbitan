// ============================================================
// ORBITAN AI OPERATING LAYER — Provider Adapter Interface (Build #28.2M)
//
// Standard provider-neutral adapter contract for AI providers.
// Accommodates OpenAI, Anthropic, Google Gemini, approved hosted
// open-source models, and future providers.
//
// This module defines the adapter SHAPE only. Live adapters are
// Phase 2 (when external credentials are available). The platform
// currently routes all AI through base44.integrations.Core.InvokeLLM
// (platform_builtin provider), which already abstracts provider
// selection server-side.
//
// Pure JS — zero React imports — safe for tests and backend functions.
// ============================================================

/**
 * Supported provider identifiers.
 */
const PROVIDERS = {
  GOOGLE: 'google',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OPEN_SOURCE_HOSTED: 'open_source_hosted',
  PLATFORM_BUILTIN: 'platform_builtin',
  OTHER: 'other',
};

/**
 * Provider adapter shape contract.
 * Each provider adapter must implement this interface.
 */
const PROVIDER_ADAPTER_CONTRACT = {
  provider_id: 'string',
  supported_capabilities: 'string[]',
  request_transform: 'function(payload) -> provider_request',
  response_normalise: 'function(provider_response) -> normalised_response',
  streaming_support: 'boolean',
  timeout_ms: 'number',
  retry_eligible: 'boolean',
  usage_extraction: 'function(provider_response) -> { input_tokens, output_tokens, total_tokens }',
  cost_calculation: 'function(usage, model) -> { estimated_cost_sgd }',
  error_classification: 'function(error) -> { type, retryable, user_message }',
  health_status: 'function() -> { healthy, last_checked, details }',
  region: 'string',
  retention_classification: 'string',
};

/**
 * Registry of known providers and their configuration status.
 * live adapters require external credentials (Phase 2).
 */
const PROVIDER_REGISTRY = {
  [PROVIDERS.PLATFORM_BUILTIN]: {
    provider_id: PROVIDERS.PLATFORM_BUILTIN,
    display_name: 'Base44 Platform (Built-in)',
    status: 'configured',
    description: 'Platform-native AI integration via InvokeLLM. No external credentials required. Provider selection is handled server-side by the platform.',
    streaming_support: false,
    region: 'platform_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.GOOGLE]: {
    provider_id: PROVIDERS.GOOGLE,
    display_name: 'Google AI (Gemini)',
    status: 'unconfigured',
    description: 'Google Gemini models. Requires Google AI credentials. Currently accessed via platform_builtin InvokeLLM.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.OPENAI]: {
    provider_id: PROVIDERS.OPENAI,
    display_name: 'OpenAI',
    status: 'unconfigured',
    description: 'OpenAI GPT models. Requires OpenAI credentials. Currently accessed via platform_builtin InvokeLLM.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'short_term',
  },
  [PROVIDERS.ANTHROPIC]: {
    provider_id: PROVIDERS.ANTHROPIC,
    display_name: 'Anthropic (Claude)',
    status: 'unconfigured',
    description: 'Anthropic Claude models. Requires Anthropic credentials. Currently accessed via platform_builtin InvokeLLM.',
    streaming_support: true,
    region: 'provider_managed',
    retention_classification: 'no_retention',
  },
  [PROVIDERS.OPEN_SOURCE_HOSTED]: {
    provider_id: PROVIDERS.OPEN_SOURCE_HOSTED,
    display_name: 'Hosted Open-Source Models',
    status: 'unconfigured',
    description: 'Self-hosted or approved hosted open-source models. Requires custom endpoint configuration.',
    streaming_support: true,
    region: 'configurable',
    retention_classification: 'enterprise_isolated',
  },
};

/**
 * Error classification types for provider errors.
 */
const ERROR_TYPES = {
  PROVIDER_TIMEOUT: 'provider_timeout',
  PROVIDER_ERROR: 'provider_error',
  RATE_LIMITED: 'rate_limited',
  AUTH_INVALID: 'auth_invalid',
  MODEL_UNAVAILABLE: 'model_unavailable',
  NETWORK_ERROR: 'network_error',
  UNKNOWN: 'unknown',
};

/**
 * Classifies a provider error into a structured type.
 * @param {Error|object} error
 * @returns {{ type: string, retryable: boolean, user_message: string }}
 */
function classifyProviderError(error) {
  const msg = (error?.message || error?.toString() || '').toLowerCase();

  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { type: ERROR_TYPES.PROVIDER_TIMEOUT, retryable: true, user_message: 'The AI provider took too long to respond. Please try again.' };
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('quota')) {
    return { type: ERROR_TYPES.RATE_LIMITED, retryable: true, user_message: 'AI request rate limit reached. Please try again in a moment.' };
  }
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('auth') || msg.includes('api key')) {
    return { type: ERROR_TYPES.AUTH_INVALID, retryable: false, user_message: 'AI provider authentication failed. Contact your administrator.' };
  }
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('unavailable') || msg.includes('deprecated'))) {
    return { type: ERROR_TYPES.MODEL_UNAVAILABLE, retryable: false, user_message: 'The requested AI model is not available.' };
  }
  if (msg.includes('network') || msg.includes('econnreset') || msg.includes('enotfound')) {
    return { type: ERROR_TYPES.NETWORK_ERROR, retryable: true, user_message: 'Network error connecting to AI provider. Please try again.' };
  }

  return { type: ERROR_TYPES.UNKNOWN, retryable: false, user_message: 'An unexpected AI error occurred. Please try again.' };
}

/**
 * Gets the list of configured providers.
 */
function getConfiguredProviders() {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.status === 'configured');
}

/**
 * Checks if a provider is configured.
 */
function isProviderConfigured(providerId) {
  const provider = PROVIDER_REGISTRY[providerId];
  return provider && provider.status === 'configured';
}

export {
  PROVIDERS,
  PROVIDER_ADAPTER_CONTRACT,
  PROVIDER_REGISTRY,
  ERROR_TYPES,
  classifyProviderError,
  getConfiguredProviders,
  isProviderConfigured,
};