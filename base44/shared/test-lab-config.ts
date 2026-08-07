// ============================================================
// ORBITAN TEST LAB — TypeScript Re-export Shim (Build #28.2P-R.0R)
//
// The canonical configuration lives in test-lab-config.js (pure
// JavaScript ESM, importable by both Deno functions AND Node.js
// test runners). This .ts file re-exports from the .js module so
// existing Deno function imports (from '../../shared/test-lab-config.ts')
// continue to resolve without changes.
//
// Do NOT add logic here — all canonical logic lives in the .js file.
// ============================================================
export * from './test-lab-config.js';