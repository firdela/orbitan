// ============================================================
// ORBITAN — CurrencyContext
// Global currency preference with per-tenant defaults.
// Reach Principle: multi-currency, multi-country scaling.
//
// EXIT-READY: Pure React Context — zero platform dependencies.
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const SUPPORTED_CURRENCIES = [
  { code: 'SGD', label: 'SGD', symbol: 'S$', flag: '🇸🇬' },
  { code: 'MYR', label: 'MYR', symbol: 'RM',  flag: '🇲🇾' },
  { code: 'USD', label: 'USD', symbol: 'US$', flag: '🇺🇸' },
  { code: 'GBP', label: 'GBP', symbol: '£',   flag: '🇬🇧' },
  { code: 'EUR', label: 'EUR', symbol: '€',   flag: '🇪🇺' },
];

// Approximate display-only rates (base: SGD)
// For production, replace with a live FX API call
export const FX_RATES = {
  SGD: 1.0,
  MYR: 3.48,
  USD: 0.74,
  GBP: 0.58,
  EUR: 0.68,
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children, tenantDefaultCurrency = 'SGD' }) {
  const [activeCurrency, setActiveCurrency] = useState(tenantDefaultCurrency);

  // When the tenant default changes (e.g. user switches tenant), reset to that tenant's default
  useEffect(() => {
    setActiveCurrency(tenantDefaultCurrency);
  }, [tenantDefaultCurrency]);

  const currencyConfig = SUPPORTED_CURRENCIES.find(c => c.code === activeCurrency)
    || SUPPORTED_CURRENCIES[0];

  /**
   * Convert a base SGD amount to the active currency for display.
   * @param {number} sgdAmount - Base amount in SGD
   * @returns {string} formatted string e.g. "RM 124.80"
   */
  const formatAmount = useCallback((sgdAmount, options = {}) => {
    if (sgdAmount == null || isNaN(sgdAmount)) return '—';
    const rate = FX_RATES[activeCurrency] || 1;
    const converted = sgdAmount * rate;
    const { decimals = 2, showSymbol = true } = options;
    const formatted = converted.toLocaleString('en-SG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return showSymbol ? `${currencyConfig.symbol} ${formatted}` : formatted;
  }, [activeCurrency, currencyConfig]);

  const switchCurrency = useCallback((code) => {
    if (SUPPORTED_CURRENCIES.find(c => c.code === code)) {
      setActiveCurrency(code);
    }
  }, []);

  return (
    <CurrencyContext.Provider value={{
      activeCurrency,
      currencyConfig,
      switchCurrency,
      formatAmount,
      fxRate: FX_RATES[activeCurrency] || 1,
      supportedCurrencies: SUPPORTED_CURRENCIES,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

export default CurrencyContext;