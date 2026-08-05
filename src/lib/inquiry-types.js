// ============================================================
// ORBITANOS — Canonical Public Inquiry Type Configuration
// Build #28.2I
//
// Single source of truth for inquiry types, CTA-to-route mapping,
// and canonical email routing responsibilities.
//
// Exit-Ready: pure data, zero framework dependencies.
// ============================================================

/**
 * INQUIRY_TYPES — Canonical inquiry type definitions.
 * Each CTA on the public site maps to exactly one inquiry type.
 */
export const INQUIRY_TYPES = {
  orbitanos_pilot: {
    key: 'orbitanos_pilot',
    label: 'OrbitanOS Pilot',
    product: 'orbitanos',
    description: 'Request pilot access to OrbitanOS for your organisation.',
    heading: 'Request OrbitanOS Pilot Access',
    subheading: 'Join the OrbitanOS pilot programme. We work with selected organisations to validate real operational workflows before wider launch.',
    ctaLabel: 'Request Pilot Access',
    route: '/contact/interest?type=orbitanos_pilot',
  },
  orbit_nexus_interest: {
    key: 'orbit_nexus_interest',
    label: 'Orbit Nexus Interest',
    product: 'orbit_nexus',
    description: 'Register your interest in Orbit Nexus standalone.',
    heading: 'Register Interest in Orbit Nexus',
    subheading: 'Orbit Nexus is in active development. Register your interest to be notified when pilot enrolment opens.',
    ctaLabel: 'Register Interest',
    route: '/contact/interest?type=orbit_nexus_interest',
  },
  orbit_nexus_waitlist: {
    key: 'orbit_nexus_waitlist',
    label: 'Orbit Nexus Waitlist',
    product: 'orbit_nexus',
    description: 'Join the waitlist for Orbit Nexus pilot enrolment.',
    heading: 'Join the Orbit Nexus Waitlist',
    subheading: 'Be among the first to access Orbit Nexus when pilot enrolment opens. No commitment — just early access.',
    ctaLabel: 'Join the Waitlist',
    route: '/contact/interest?type=orbit_nexus_waitlist',
  },
  enterprise_pilot: {
    key: 'enterprise_pilot',
    label: 'Enterprise Pilot',
    product: 'enterprise',
    description: 'Request an enterprise pilot with dedicated support.',
    heading: 'Enterprise Pilot Access',
    subheading: 'For large organisations and multi-entity enterprises. Tell us about your requirements and we will arrange a dedicated consultation.',
    ctaLabel: 'Enterprise Pilot Access',
    route: '/contact/interest?type=enterprise_pilot',
  },
};

/**
 * CTA_LABEL_MAP — Maps CTA button labels to their canonical inquiry type.
 * Used to ensure consistent routing across all landing/pricing pages.
 */
export const CTA_LABEL_MAP = {
  'Request Pilot Access': INQUIRY_TYPES.orbitanos_pilot,
  'Register Interest': INQUIRY_TYPES.orbit_nexus_interest,
  'Join the Waitlist': INQUIRY_TYPES.orbit_nexus_waitlist,
  'Enterprise Pilot Access': INQUIRY_TYPES.enterprise_pilot,
};

/**
 * Gets the inquiry route for a given CTA label.
 * Falls back to the generic inquiry page if no specific match.
 */
export function getInquiryRoute(ctaLabel) {
  const match = CTA_LABEL_MAP[ctaLabel];
  if (match) return match.route;
  return '/contact/interest';
}

/**
 * Gets the inquiry type config by key.
 */
export function getInquiryType(typeKey) {
  return INQUIRY_TYPES[typeKey] || null;
}

/**
 * ORGANISATION_SIZES — Human-readable options for the organisation size field.
 */
export const ORGANISATION_SIZES = [
  { value: 'solo', label: 'Just me (solo)' },
  { value: '2_10', label: '2–10 people' },
  { value: '11_50', label: '11–50 people' },
  { value: '51_200', label: '51–200 people' },
  { value: '201_500', label: '201–500 people' },
  { value: '500_plus', label: '500+ people' },
];

/**
 * ORBITANOS_MODULES — Module options for OrbitanOS Pilot inquiries.
 */
export const ORBITANOS_MODULES = [
  'Workforce & Attendance',
  'Scheduling',
  'Inventory',
  'Procurement',
  'Sales & Invoicing',
  'Compliance',
  'Finance Integration (Xero)',
  'Reporting & Analytics',
  'Production (F&B)',
];

/**
 * CONTACT_METHODS — Preferred contact method options.
 */
export const CONTACT_METHODS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

/**
 * CONSENT_TEXT — The consent acknowledgement text shown on the form.
 * Versioned so consent_metadata can record which version was accepted.
 */
export const CONSENT_TEXT = 'I agree to be contacted by Orbitan about my inquiry and accept the Orbitan Privacy Policy. I understand my information will be used solely for the purpose of evaluating my inquiry.';
export const CONSENT_VERSION = '2026-08-05-v1';