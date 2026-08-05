import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// ============================================================
// submitInquiry — Public Commercial Inquiry Submission
// Build #28.2I
//
// Receives form data from the /contact/interest public page.
// Validates, sanitises, generates a reference code, persists
// the record, and sends an internal notification email to
// platform admins.
//
// Email limitation: Base44 SendEmail only reaches registered app
// users. External routing (sales@orbitan.net) requires external
// email configuration (Cloudflare/Resend). The internal
// notification is sent to the first registered admin user so
// staff are alerted. The applicant acknowledgement is shown
// on-screen with the reference code — no external email is
// sent to the applicant (who is not a registered user).
// ============================================================

const INQUIRY_TYPES = ['orbitanos_pilot', 'orbit_nexus_interest', 'orbit_nexus_waitlist', 'enterprise_pilot'];
const ORG_SIZES = ['solo', '2_10', '11_50', '51_200', '201_500', '500_plus'];
const MAX_FIELD_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 20;

function sanitizeString(str, maxLength = MAX_FIELD_LENGTH) {
  if (typeof str !== 'string') return '';
  // Strip HTML tags and scripts to prevent injection
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  // Basic work-email validation — must have @ and a domain with a TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isHoneypotTriggered(body) {
  // Honeypot field — if "company_website" is filled, it's a bot
  return !!(body && body.company_website);
}

function validatePayload(body) {
  const errors = [];

  if (!body) {
    return { valid: false, errors: ['No data provided.'] };
  }

  // Honeypot check
  if (isHoneypotTriggered(body)) {
    // Silently accept but don't persist — pretend success to fool bots
    return { valid: false, errors: ['honeypot'], silent: true };
  }

  const fullName = sanitizeString(body.full_name, 200);
  if (!fullName) errors.push('Full name is required.');

  const workEmail = sanitizeString(body.work_email, 254).toLowerCase();
  if (!workEmail) {
    errors.push('Work email is required.');
  } else if (!isValidEmail(workEmail)) {
    errors.push('A valid work email address is required.');
  }

  const orgName = sanitizeString(body.organisation_name, 200);
  if (!orgName) errors.push('Organisation or business name is required.');

  const country = sanitizeString(body.country, 100);
  if (!country) errors.push('Country or market is required.');

  const orgSize = sanitizeString(body.organisation_size, 20);
  if (orgSize && !ORG_SIZES.includes(orgSize)) {
    errors.push('Invalid organisation size.');
  }

  const inquiryType = sanitizeString(body.inquiry_type, 50);
  if (!inquiryType) {
    errors.push('Inquiry type is required.');
  } else if (!INQUIRY_TYPES.includes(inquiryType)) {
    errors.push('Invalid inquiry type.');
  }

  if (!body.consent_accepted) {
    errors.push('You must accept the consent acknowledgement to submit.');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      full_name: fullName,
      work_email: workEmail,
      phone: sanitizeString(body.phone, 30),
      organisation_name: orgName,
      organisation_size: orgSize,
      industry: sanitizeString(body.industry, 100),
      country,
      estimated_users: typeof body.estimated_users === 'number' ? body.estimated_users : undefined,
      locations_count: typeof body.locations_count === 'number' ? body.locations_count : undefined,
      use_case: sanitizeString(body.use_case || body.message, 2000),
      preferred_contact_method: sanitizeString(body.preferred_contact_method, 10) || 'email',
      desired_timeframe: sanitizeString(body.desired_timeframe, 200),
      modules_of_interest: Array.isArray(body.modules_of_interest)
        ? body.modules_of_interest.slice(0, MAX_ARRAY_ITEMS).map(m => sanitizeString(m, 100))
        : [],
      integration_requirements: sanitizeString(body.integration_requirements, 2000),
      security_requirements: sanitizeString(body.security_requirements, 2000),
      deployment_preference: sanitizeString(body.deployment_preference, 200),
      inquiry_type: inquiryType,
      source_path: sanitizeString(body.source_path, 500),
      source_cta: sanitizeString(body.source_cta, 100),
      consent_accepted: !!body.consent_accepted,
    },
  };
}

function generateReferenceCode() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  const time = Date.now().toString().slice(-4);
  return `INQ-${year}-${time}${random}`;
}

function getProductForType(inquiryType) {
  const map = {
    orbitanos_pilot: 'orbitanos',
    orbit_nexus_interest: 'orbit_nexus',
    orbit_nexus_waitlist: 'orbit_nexus',
    enterprise_pilot: 'enterprise',
  };
  return map[inquiryType] || 'orbitanos';
}

export default async function(req) {
  try {
    const body = await req.json();
    const result = validatePayload(body);

    // Honeypot — pretend success without persisting
    if (result.silent) {
      return Response.json({
        success: true,
        reference_code: generateReferenceCode(),
        message: 'Your inquiry has been received.',
      });
    }

    if (!result.valid) {
      return Response.json(
        { success: false, errors: result.errors },
        { status: 400 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Get the submitting user if authenticated (optional — public submissions allowed)
    let userId = null;
    try {
      const user = await base44.auth.me();
      if (user) userId = user.id;
    } catch { /* anonymous submission — fine */ }

    const referenceCode = generateReferenceCode();
    const product = getProductForType(result.data.inquiry_type);

    const inquiryRecord = {
      ...result.data,
      reference_code: referenceCode,
      product,
      status: 'new',
      assigned_queue: 'sales',
      submitted_by_user_id: userId,
      consent_metadata: result.data.consent_accepted
        ? {
            accepted_at: new Date().toISOString(),
            consent_version: '2026-08-05-v1',
          }
        : null,
    };

    // Persist the inquiry using service role (public submission, no user auth required)
    await base44.asServiceRole.entities.PublicInquiry.create(inquiryRecord);

    // Send internal notification email to platform admins
    // Base44 SendEmail only reaches registered app users.
    // External routing to sales@orbitan.net requires external email configuration.
    try {
      const admins = await base44.asServiceRole.entities.User.list('-created_date', 10);
      const adminEmails = (admins || [])
        .filter(a => a.email && a.role === 'admin')
        .map(a => a.email);

      if (adminEmails.length > 0) {
        const notificationBody = [
          `New ${result.data.inquiry_type.replace(/_/g, ' ')} inquiry received.`,
          ``,
          `Reference: ${referenceCode}`,
          `Name: ${result.data.full_name}`,
          `Email: ${result.data.work_email}`,
          `Organisation: ${result.data.organisation_name}`,
          `Country: ${result.data.country}`,
          result.data.organisation_size ? `Org Size: ${result.data.organisation_size}` : '',
          result.data.use_case ? `Use Case: ${result.data.use_case}` : '',
          ``,
          `Review in the Orbitan admin inquiry queue.`,
          ``,
          `Note: Canonical routing target is sales@orbitan.net.`,
          `External email routing requires Cloudflare/Resend configuration.`,
        ].filter(Boolean).join('\n');

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmails[0],
          subject: `[${referenceCode}] New ${product} Inquiry — ${result.data.full_name}`,
          body: notificationBody,
          from_name: 'Orbitan Inquiry System',
        });
      }
    } catch (emailErr) {
      // Email failure is non-critical — the inquiry is already persisted.
      // Staff will see it in the admin queue regardless.
      console.error('[submitInquiry] Internal notification email failed:', emailErr?.message || emailErr);
    }

    return Response.json({
      success: true,
      reference_code: referenceCode,
      message: 'Your inquiry has been received. Our team will review it and contact you soon.',
    });
  } catch (error) {
    console.error('[submitInquiry] Unexpected error:', error?.message || error);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}