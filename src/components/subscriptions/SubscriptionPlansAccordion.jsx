// ============================================================
// ORBITAN — Subscription Plans Accordion
// Expandable plan cards with full module/pack drill-down
// and Purchase / Upgrade CTA per tier.
// EXIT-READY: Pure React + shadcn/ui. Zero platform deps.
// ============================================================

import React, { useState } from 'react';
import { SUBSCRIPTION_PLANS, MODULES, INDUSTRY_PACKS } from '@/lib/orbitan-config';
import { PlanBadge } from '@/components/shared/PackBadge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, CheckCircle2, Lock, Star, Zap, Package,
  Users, Layers, Shield, TrendingUp, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PLAN_META = {
  orbitan_starter: {
    price: 'S$49',
    period: '/mo',
    gradient: 'from-[#3B82F6] to-[#1D4ED8]',
    highlight: false,
    cta: 'Start Free Trial',
    features: [
      'Single outlet',
      'Up to 10 employees',
      'Core Workforce, Tasks & Reporting',
      'Email support',
    ],
    locked_features: ['Industry Packs', 'AI Suite', 'Finance Integration', 'Multi-outlet'],
  },
  orbitan_growth: {
    price: 'S$149',
    period: '/mo',
    gradient: 'from-[#34D399] to-[#059669]',
    highlight: false,
    cta: 'Upgrade to Growth',
    features: [
      'Multiple outlets',
      'Up to 50 employees',
      '1 Industry Pack included',
      'Standard AI features',
      'Priority email support',
    ],
    locked_features: ['Multiple Packs', 'AI Studio', 'Finance Integration (Xero)', 'Orbit Shield™ Guardian'],
  },
  orbitan_business: {
    price: 'S$399',
    period: '/mo',
    gradient: 'from-[#8B5CF6] to-[#6D28D9]',
    highlight: true,
    cta: 'Upgrade to Business',
    features: [
      'Multi-site operations',
      'Up to 250 employees',
      'Multiple Industry Packs',
      'Full AI Studio',
      'Xero / Finance Integration',
      'Dedicated account manager',
    ],
    locked_features: ['Unlimited employees', 'Orbit Shield™ Guardian Mode', 'SSO / MFA', 'Custom SLAs'],
  },
  orbitan_enterprise: {
    price: 'Custom',
    period: '',
    gradient: 'from-[#374151] to-[#111827]',
    highlight: false,
    accent: '#D4AF37',
    cta: 'Contact Sales',
    features: [
      'Unlimited outlets & employees',
      'All Industry Packs',
      'All modules — current & future',
      'Orbit Shield™ Guardian Mode',
      'SSO, MFA & RBAC',
      'Custom SLAs & dedicated CSM',
      'Investor-grade audit reports',
    ],
    locked_features: [],
  },
};

function PlanCard({ planKey, tenantCount, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const plan = SUBSCRIPTION_PLANS[planKey];
  const meta = PLAN_META[planKey];
  if (!plan || !meta) return null;

  const isEnterprise = planKey === 'orbitan_enterprise';
  const includedModules = plan.allowed_modules.includes('all')
    ? Object.values(MODULES)
    : Object.values(MODULES).filter(m => plan.allowed_modules.includes(m.key));

  const availablePacks = Object.values(INDUSTRY_PACKS).filter(p => p.launch_tenants.length > 0);

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-shadow',
      meta.highlight ? 'border-[#7C3AED]/50 shadow-lg shadow-purple-100' : 'border-border',
      isEnterprise && 'border-[#D4AF37]/30'
    )}>
      {/* Plan Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left"
      >
        <div className={cn('p-5 bg-gradient-to-r text-white', meta.gradient)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {meta.highlight && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full mb-2">
                  <Star className="w-3 h-3 text-yellow-300" /> MOST POPULAR
                </div>
              )}
              {isEnterprise && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold mb-2" style={{ color: '#D4AF37' }}>
                  <Star className="w-3 h-3" /> FLAGSHIP
                </div>
              )}
              <p className="font-display font-bold text-lg">{plan.name}</p>
              <p className="text-white/70 text-xs mt-0.5">{plan.suitable_for}</p>
            </div>
            <div className="text-right ml-4">
              <p className="font-display font-bold text-2xl">
                {meta.price}<span className="text-sm font-normal text-white/70">{meta.period}</span>
              </p>
              {tenantCount > 0 && (
                <p className="text-[10px] text-white/60 mt-0.5">{tenantCount} active tenant{tenantCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3 text-white/80 text-xs">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {plan.max_employees ?? 'Unlimited'} employees</span>
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> {plan.allowed_modules.includes('all') ? 'All modules' : `${plan.allowed_modules.length} modules`}</span>
            </div>
            <div className={cn('transition-transform duration-200', expanded && 'rotate-180')}>
              <ChevronDown className="w-5 h-5 text-white/70" />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="bg-card p-5 space-y-5">

          {/* What's Included */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">What's Included</p>
            <div className="space-y-1.5">
              {meta.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Included Modules */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Modules
            </p>
            <div className="flex flex-wrap gap-1.5">
              {includedModules.map(m => (
                <span key={m.key} className="text-[11px] font-medium bg-orbitan-blue-light text-orbitan-blue px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {m.name}
                </span>
              ))}
            </div>
          </div>

          {/* Industry Packs Access */}
          {(planKey === 'orbitan_growth' || planKey === 'orbitan_business' || planKey === 'orbitan_enterprise') && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Industry Pack Access
              </p>
              <div className="flex flex-wrap gap-1.5">
                {planKey === 'orbitan_growth' && (
                  <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">1 Pack of your choice</span>
                )}
                {(planKey === 'orbitan_business' || planKey === 'orbitan_enterprise') && availablePacks.map(p => (
                  <span key={p.key} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ background: p.color_hex + '18', color: p.color_hex, border: `1px solid ${p.color_hex}35` }}>
                    {p.name}
                  </span>
                ))}
                {planKey === 'orbitan_enterprise' && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">+ All future packs</span>
                )}
              </div>
            </div>
          )}

          {/* Locked Features */}
          {meta.locked_features.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Unlock on higher plan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {meta.locked_features.map(f => (
                  <span key={f} className="text-[11px] bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center gap-1 opacity-60">
                    <Lock className="w-2.5 h-2.5" /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
            {isEnterprise ? (
              <>
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-[#374151] to-[#111827] hover:opacity-90 text-white"
                  onClick={() => onAction(planKey, 'contact_sales')}
                >
                  <MessageSquare className="w-4 h-4" /> Contact Sales
                </Button>
                <Button variant="outline" className="flex-1 gap-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  onClick={() => onAction(planKey, 'request_demo')}>
                  <Star className="w-4 h-4" /> Request Demo
                </Button>
              </>
            ) : (
              <Button
                className={cn('w-full gap-2 text-white bg-gradient-to-r', meta.gradient, 'hover:opacity-90')}
                onClick={() => onAction(planKey, 'upgrade')}
              >
                <TrendingUp className="w-4 h-4" /> {meta.cta}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPlansAccordion({ tenants = [] }) {
  const [actionFeedback, setActionFeedback] = useState(null);

  const handleAction = (planKey, actionType) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    setActionFeedback({
      plan: plan.name,
      action: actionType === 'contact_sales' ? 'Sales team notified' :
              actionType === 'request_demo' ? 'Demo request sent' :
              'Upgrade initiated',
    });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="font-heading font-semibold text-lg mb-1">Subscription Tiers</h2>
        <p className="text-sm text-muted-foreground">Click any plan to expand and see full module access, included packs, and upgrade options.</p>
      </div>

      {actionFeedback && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span><strong>{actionFeedback.plan}:</strong> {actionFeedback.action}. Our team will be in touch shortly.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(SUBSCRIPTION_PLANS).map(planKey => (
          <PlanCard
            key={planKey}
            planKey={planKey}
            tenantCount={tenants.filter(t => t.subscription_plan === planKey).length}
            onAction={handleAction}
          />
        ))}
      </div>

      {/* Architecture note */}
      <div className="bg-muted rounded-xl p-4 mt-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Exit-Ready Architecture:</span>{' '}
          All subscription enforcement is driven by <code className="bg-card px-1.5 py-0.5 rounded font-mono">lib/orbitan-config.js</code> — pure JS, zero platform dependencies, portable to any backend stack.
        </p>
      </div>
    </div>
  );
}