// ============================================================
// Frontend re-export of canonical production exclusion helpers.
// Canonical source: base44/shared/test-lab-config.js
//
// This shim lets frontend components import from '@/lib/test-lab-exclusion'
// while the canonical logic lives in ONE place: base44/shared/test-lab-config.js.
// ============================================================

export {
  isProductionRecord,
  productionExclusionQuery,
  productionExclusionFilter,
  containsTestRecords,
} from '../../base44/shared/test-lab-config.js';