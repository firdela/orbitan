// ============================================================
// ORBITANOS — Access Engine :: Clock (Milestone 3.1)
// Architecture Version 1.0 (Frozen)
//
// Injectable time abstraction. Decouples all temporal authorization
// logic (effective_from / effective_until windows on role assignments)
// from wall-clock time, so the engine is fully deterministic under
// test. Pure, dependency-free. Exit-Ready.
// ============================================================

export const CLOCK_VERSION = '1.0.0';

/** Production clock — reads the host wall clock. */
export function createSystemClock() {
  return Object.freeze({
    name: 'SystemClock',
    version: CLOCK_VERSION,
    now() { return new Date(); },
    nowIso() { return new Date().toISOString(); },
  });
}

/**
 * Deterministic clock for tests. Frozen at the supplied instant.
 * Accepts an ISO string or Date. Returns fresh Date copies so callers
 * cannot mutate the frozen instant.
 */
export function createFixedClock(isoOrDate) {
  const base = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const ts = base.getTime();
  return Object.freeze({
    name: 'FixedClock',
    version: CLOCK_VERSION,
    now() { return new Date(ts); },
    nowIso() { return new Date(ts).toISOString(); },
  });
}