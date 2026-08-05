// ============================================================
// ORBITANOS — Public Inquiry Form (Build #28.2I)
// Canonical commercial inquiry form for all public CTAs.
// Route: /contact/interest?type=<inquiry_type>
// Accessible without authentication.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthAlert from '@/components/auth/AuthAlert';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { LOGO_ASSETS } from '@/lib/orbitan-identity';
import { PLATFORM_IDENTITY, getRoutingEmail } from '@/lib/orbitan-config';
import {
  INQUIRY_TYPES, ORGANISATION_SIZES, ORBITANOS_MODULES, CONTACT_METHODS,
  CONSENT_TEXT, getInquiryType,
} from '@/lib/inquiry-types';
import { ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PublicInquiry() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeKey = searchParams.get('type') || 'orbitanos_pilot';
  const inquiryType = getInquiryType(typeKey) || INQUIRY_TYPES.orbitanos_pilot;

  const [formData, setFormData] = useState({
    full_name: '', work_email: '', phone: '', organisation_name: '',
    organisation_size: '', industry: '', country: 'Singapore',
    estimated_users: '', locations_count: '', use_case: '',
    preferred_contact_method: 'email', desired_timeframe: '',
    modules_of_interest: [], integration_requirements: '',
    security_requirements: '', deployment_preference: '',
    consent_accepted: false,
    // Honeypot — hidden field that bots fill but humans don't
    company_website: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [serverError, setServerError] = useState(null);
  const errorAlertRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleModule = (module) => {
    setFormData(prev => {
      const current = prev.modules_of_interest || [];
      const updated = current.includes(module)
        ? current.filter(m => m !== module)
        : [...current, module];
      return { ...prev, modules_of_interest: updated };
    });
  };

  const validate = () => {
    const e = {};
    if (!formData.full_name.trim()) e.full_name = 'Full name is required.';
    if (!formData.work_email.trim()) {
      e.work_email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.work_email)) {
      e.work_email = 'Please enter a valid email address.';
    }
    if (!formData.organisation_name.trim()) e.organisation_name = 'Organisation name is required.';
    if (!formData.country.trim()) e.country = 'Country is required.';
    if (!formData.consent_accepted) e.consent = 'You must accept the consent to submit.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError(null);

    if (!validate()) {
      errorAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('submitInquiry', {
        ...formData,
        inquiry_type: inquiryType.key,
        source_path: window.location.pathname,
        source_cta: inquiryType.ctaLabel,
      });

      if (response?.data?.success) {
        setSuccess({
          referenceCode: response.data.reference_code,
          message: response.data.message,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errs = response?.data?.errors;
        if (Array.isArray(errs) && errs.length > 0) {
          setServerError(errs.join(' '));
        } else {
          setServerError('We could not submit your inquiry. Please try again.');
        }
      }
    } catch (err) {
      setServerError('A network error occurred. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success State ──
  if (success) {
    return (
      <div className="min-h-screen bg-marketing-bg text-white flex flex-col">
        <nav className="px-6 h-16 flex items-center justify-between border-b border-white/[0.06]">
          <Link to="/"><OrbitanWordmark size="sm" variant="light" showOS={false} /></Link>
        </nav>
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="max-w-lg w-full text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-3">Inquiry Received</h1>
            <p className="text-slate-300 text-sm mb-6">{success.message}</p>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 mb-8">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Your Reference ID</p>
              <p className="text-lg font-mono font-bold text-marketing-gold">{success.referenceCode}</p>
            </div>
            <p className="text-xs text-slate-500 mb-8">
              Please keep this reference for any follow-up correspondence.
              For general questions, contact us at{' '}
              <a href={`mailto:${getRoutingEmail('general_contact')}`} className="text-marketing-blue underline">
                {getRoutingEmail('general_contact')}
              </a>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 h-11 px-6">
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </Button>
              </Link>
              <Link to={`/#${inquiryType.product === 'orbit_nexus' ? 'nexus' : 'plans'}`}>
                <Button className="bg-marketing-blue hover:bg-marketing-blue/90 text-white h-11 px-6">
                  Explore {inquiryType.product === 'orbit_nexus' ? 'Orbit Nexus' : 'OrbitanOS'}
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <footer className="py-6 px-6 border-t border-white/[0.05] text-center">
          <p className="text-xs text-slate-500">{PLATFORM_IDENTITY.copyright}</p>
        </footer>
      </div>
    );
  }

  // ── Form State ──
  const isOrbitanOS = inquiryType.key === 'orbitanos_pilot';
  const isEnterprise = inquiryType.key === 'enterprise_pilot';
  const isNexus = inquiryType.key === 'orbit_nexus_interest' || inquiryType.key === 'orbit_nexus_waitlist';

  return (
    <div className="min-h-screen bg-marketing-bg text-white flex flex-col">
      {/* Nav */}
      <nav className="px-6 h-16 flex items-center justify-between border-b border-white/[0.06]">
        <Link to="/" className="flex items-center gap-2.5">
          <OrbitanWordmark size="sm" variant="light" showOS={false} />
        </Link>
        <Link to="/" className="text-xs text-slate-300 hover:text-white transition-colors">
          ← Back to Home
        </Link>
      </nav>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={LOGO_ASSETS.mark} alt="Orbitan" className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">{inquiryType.heading}</h1>
            <p className="text-slate-300 text-sm max-w-md mx-auto">{inquiryType.subheading}</p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-5" noValidate>
            {serverError && (
              <div ref={errorAlertRef}>
                <AuthAlert variant="error" message={serverError} />
              </div>
            )}

            {/* Honeypot — hidden from humans */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="company_website">Website (leave empty)</label>
              <input
                id="company_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formData.company_website}
                onChange={(e) => updateField('company_website', e.target.value)}
              />
            </div>

            {/* Full Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-slate-200">Full Name *</Label>
                <Input
                  id="full_name"
                  ref={firstFieldRef}
                  value={formData.full_name}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  aria-invalid={!!errors.full_name}
                  aria-describedby={errors.full_name ? 'full_name-error' : undefined}
                />
                {errors.full_name && <p id="full_name-error" className="text-xs text-red-400">{errors.full_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work_email" className="text-slate-200">Work Email *</Label>
                <Input
                  id="work_email"
                  type="email"
                  value={formData.work_email}
                  onChange={(e) => updateField('work_email', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="jane@company.com"
                  autoComplete="email"
                  aria-invalid={!!errors.work_email}
                  aria-describedby={errors.work_email ? 'work_email-error' : undefined}
                />
                {errors.work_email && <p id="work_email-error" className="text-xs text-red-400">{errors.work_email}</p>}
              </div>
            </div>

            {/* Organisation + Country */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="organisation_name" className="text-slate-200">Organisation / Business *</Label>
                <Input
                  id="organisation_name"
                  value={formData.organisation_name}
                  onChange={(e) => updateField('organisation_name', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="Acme Pte Ltd"
                  aria-invalid={!!errors.organisation_name}
                  aria-describedby={errors.organisation_name ? 'org-error' : undefined}
                />
                {errors.organisation_name && <p id="org-error" className="text-xs text-red-400">{errors.organisation_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-slate-200">Country / Market *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="Singapore"
                  aria-invalid={!!errors.country}
                />
                {errors.country && <p className="text-xs text-red-400">{errors.country}</p>}
              </div>
            </div>

            {/* Org Size + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="org_size" className="text-slate-200">Organisation Size</Label>
                <Select value={formData.organisation_size} onValueChange={(v) => updateField('organisation_size', v)}>
                  <SelectTrigger id="org_size" className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANISATION_SIZES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-200">Phone <span className="text-slate-500">(optional)</span></Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="+65 9123 4567"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Industry + Preferred Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="industry" className="text-slate-200">Industry <span className="text-slate-500">(optional)</span></Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                  placeholder="Food & Beverage, Retail, etc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_method" className="text-slate-200">Preferred Contact</Label>
                <Select value={formData.preferred_contact_method} onValueChange={(v) => updateField('preferred_contact_method', v)}>
                  <SelectTrigger id="contact_method" className="bg-white/[0.05] border-white/[0.1] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Use Case / Message */}
            <div className="space-y-1.5">
              <Label htmlFor="use_case" className="text-slate-200">
                {isNexus ? 'AI Use Cases / Intended Use' : isEnterprise ? 'Tell Us About Your Requirements' : 'Operational Challenges / Intended Use'}
              </Label>
              <Textarea
                id="use_case"
                value={formData.use_case}
                onChange={(e) => updateField('use_case', e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 min-h-[100px]"
                placeholder={isNexus
                  ? 'What AI capabilities are you looking for? RAG, agents, OCR, etc.'
                  : isEnterprise
                  ? 'Describe your operational challenges, security needs, and integration requirements.'
                  : 'What operational challenges are you facing? What workflows do you want to improve?'}
                maxLength={2000}
              />
            </div>

            {/* Conditional: OrbitanOS Pilot — Modules + Locations */}
            {(isOrbitanOS || isEnterprise) && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-200">Modules of Interest <span className="text-slate-500">(optional)</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORBITANOS_MODULES.map(m => (
                      <label key={m} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <Checkbox
                          checked={formData.modules_of_interest?.includes(m) || false}
                          onCheckedChange={() => toggleModule(m)}
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="locations_count" className="text-slate-200">Number of Outlets / Locations <span className="text-slate-500">(optional)</span></Label>
                    <Input
                      id="locations_count"
                      type="number"
                      min="1"
                      value={formData.locations_count}
                      onChange={(e) => updateField('locations_count', parseInt(e.target.value) || '')}
                      className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desired_timeframe" className="text-slate-200">Desired Pilot Timeframe <span className="text-slate-500">(optional)</span></Label>
                    <Input
                      id="desired_timeframe"
                      value={formData.desired_timeframe}
                      onChange={(e) => updateField('desired_timeframe', e.target.value)}
                      className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                      placeholder="e.g. Next 1–2 months"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Conditional: Nexus / Enterprise — Integration Requirements */}
            {(isNexus || isEnterprise) && (
              <div className="space-y-1.5">
                <Label htmlFor="integration_requirements" className="text-slate-200">Integration Requirements <span className="text-slate-500">(optional)</span></Label>
                <Textarea
                  id="integration_requirements"
                  value={formData.integration_requirements}
                  onChange={(e) => updateField('integration_requirements', e.target.value)}
                  className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 min-h-[80px]"
                  placeholder="e.g. Xero, Stripe, Slack, Google Workspace, custom APIs"
                  maxLength={2000}
                />
              </div>
            )}

            {/* Conditional: Enterprise — Security + Deployment */}
            {isEnterprise && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="security_requirements" className="text-slate-200">Security Requirements <span className="text-slate-500">(optional)</span></Label>
                  <Textarea
                    id="security_requirements"
                    value={formData.security_requirements}
                    onChange={(e) => updateField('security_requirements', e.target.value)}
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500 min-h-[80px]"
                    placeholder="e.g. SOC 2, ISO 27001, data residency"
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deployment_preference" className="text-slate-200">Deployment Preference <span className="text-slate-500">(optional)</span></Label>
                  <Input
                    id="deployment_preference"
                    value={formData.deployment_preference}
                    onChange={(e) => updateField('deployment_preference', e.target.value)}
                    className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-slate-500"
                    placeholder="e.g. Cloud, on-premise, hybrid"
                  />
                </div>
              </div>
            )}

            {/* Consent */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  id="consent"
                  checked={formData.consent_accepted}
                  onCheckedChange={(v) => updateField('consent_accepted', !!v)}
                  className="mt-0.5"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  {CONSENT_TEXT}
                </span>
              </label>
              {errors.consent && <p className="text-xs text-red-400">{errors.consent}</p>}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-marketing-blue hover:bg-marketing-blue/90 text-white font-semibold gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <>{inquiryType.ctaLabel} <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            We respect your privacy. Your information is used solely to evaluate your inquiry.
          </p>
        </div>
      </main>

      <footer className="py-6 px-6 border-t border-white/[0.05] text-center">
        <p className="text-xs text-slate-500">{PLATFORM_IDENTITY.copyright}</p>
      </footer>
    </div>
  );
}