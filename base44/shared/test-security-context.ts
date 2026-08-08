// ============================================================
// ORBITAN TEST LAB — TypeScript Re-export Shim
// Build #28.2P-R.0R.3
//
// The canonical implementation lives in test-security-context.js
// (pure JavaScript ESM, importable by both Deno functions AND
// Node.js test runners). This .ts file re-exports from the .js
// module so Deno function imports resolve without changes.
//
// Do NOT add logic here — all canonical logic lives in the .js file.
// ============================================================
export * from './test-security-context.js';