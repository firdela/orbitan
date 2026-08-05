// ============================================================
// ORBITANOS — Safety Hub Configuration (Build #28.2K)
// ------------------------------------------------------------
// Industry-aware and role-aware safety module visibility.
// Determines which safety modules appear for a given worker
// based on their tenant's industry pack, role, and permissions.
//
// Pure JS — zero React imports — safe for tests.
// ============================================================

export const SAFETY_MODULES = {
  food_safety_log: {
    id: 'food_safety_log',
    label: 'Food Safety Log',
    description: 'Temperature checks, hygiene logs, allergen controls',
    icon: 'Utensils',
    industries: ['food_beverage'],
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
  compliance_centre: {
    id: 'compliance_centre',
    label: 'Compliance Centre',
    description: 'Audits, requirements, and compliance records',
    icon: 'Shield',
    industries: null, // all industries
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
  incident_report: {
    id: 'incident_report',
    label: 'Incident & Hazard Reporting',
    description: 'Report hazards, incidents, near-misses, injuries',
    icon: 'AlertTriangle',
    industries: null,
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
  my_safety_reports: {
    id: 'my_safety_reports',
    label: 'My Safety Reports',
    description: 'Track the status of your submitted safety reports',
    icon: 'FileText',
    industries: null,
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
  emergency_info: {
    id: 'emergency_info',
    label: 'Emergency Information',
    description: 'Emergency contacts, evacuation, assembly points',
    icon: 'Siren',
    industries: null,
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
  training_certifications: {
    id: 'training_certifications',
    label: 'Training & Certifications',
    description: 'Your safety certifications and expiry tracking',
    icon: 'GraduationCap',
    industries: null,
    roles: ['worker', 'supervisor', 'outlet_manager', 'tenant_admin'],
  },
};

/**
 * Maps Orbitan industry keys to safety-relevant industries.
 */
const INDUSTRY_SAFETY_MAP = {
  food_beverage: ['food_safety_log', 'compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  recycling_sustainability: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  retail: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  healthcare: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  education: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  logistics: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  events_activations: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  technology_software: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  facilities_management: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
  other: ['compliance_centre', 'incident_report', 'my_safety_reports', 'emergency_info', 'training_certifications'],
};

/**
 * Returns the list of safety module IDs visible for a given industry.
 * @param {string} industry — tenant industry key
 * @returns {array} module IDs
 */
export function getSafetyModulesForIndustry(industry) {
  return INDUSTRY_SAFETY_MAP[industry] || INDUSTRY_SAFETY_MAP.other;
}

/**
 * Returns the full safety module objects visible for a worker.
 * @param {object} params — { industry, role }
 * @returns {array} safety module objects
 */
export function getVisibleSafetyModules({ industry, role } = {}) {
  const moduleIds = getSafetyModulesForIndustry(industry);
  return moduleIds
    .map(id => SAFETY_MODULES[id])
    .filter(Boolean)
    .filter(mod => !mod.roles || mod.roles.includes(role));
}

/**
 * Returns whether a specific safety module is visible.
 * @param {string} moduleId
 * @param {object} params — { industry, role }
 * @returns {boolean}
 */
export function isSafetyModuleVisible(moduleId, { industry, role } = {}) {
  const visible = getVisibleSafetyModules({ industry, role });
  return visible.some(m => m.id === moduleId);
}