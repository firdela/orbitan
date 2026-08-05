import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import OrbitanWordmark from '@/components/brand/OrbitanWordmark';
import { Check, Loader2, ArrowLeft, Shield, Zap, Building2, Rocket } from 'lucide-react';

const PLANS = [
  {
    key: 'orbitan_free',
    name: 'Orbitan Free',
    price: 'Free',
    period: 'forever',
    description: 'Small businesses, startups, side hustles',
    features: [
      'Up to 3 employees',
      'Basic attendance',
      'Basic tasks',
      'Basic training',
      '1 outlet',
      'Limited storage',
    ],
    gradient: 'from-[#94A3B8] to-[#475569]',
    icon: Rocket,
    isFree: true,
  },
  {
    key: 'orbitan_starter',
    name: 'OrbitanOS Starter',
    price: 'S$49',
    period: '/month',
    description: 'Small businesses — single outlet',
    features: [
      'Up to 10 employees',
      'Core Workforce Package',
      'Single outlet',
      'Standard modules',
      'Community support',
      '14-day free trial',
    ],
    gradient: 'from-[#3B82F6] to-[#1D4ED8]',
    icon: Shield,
  },
  {
    key: 'orbitan_growth',
    name: 'OrbitanOS Growth',
    price: 'S$149',
    period: '/month',
    description: 'Growing businesses — multiple outlets',
    features: [
      'Up to 50 employees',
      'Core Workforce Package',
      'One Industry Pack',
      'Standard AI features',
      'Multiple outlets',
      '14-day free trial',
    ],
    gradient: 'from-[#34D399] to-[#059669]',
    icon: Zap,
  },
  {
    key: 'orbitan_business',
    name: 'OrbitanOS Business',
    price: 'S$399',
    period: '/month',
    description: 'Established organisations — multi-site operations',
    features: [
      'Up to 250 employees',
      'Core Workforce Package',
      'Multiple Industry Packs',
      'Advanced reporting',
      'AI Suite access',
      'Priority support',
      '14-day free trial',
    ],
    gradient: 'from-[#8B5CF6] to-[#6D28D9]',
    icon: Building2,
    highlighted: true,
  },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const preselectedPlan = searchParams.get('plan');
  const tenantId = searchParams.get('tenant_id') || '';
  const tenantName = searchParams.get('tenant_name') || '';

  const handleCheckout = async (planKey) => {
    setError(null);

    // Free plan — no Stripe checkout, redirect to onboarding
    const plan = PLANS.find(p => p.key === planKey);
    if (plan?.isFree) {
      navigate('/onboarding');
      return;
    }

    // Block checkout if running inside an iframe (Stripe requires full-page redirect)
    if (window.self !== window.top) {
      setError('Checkout only works from a published app. Please open Orbitan in a new tab to subscribe.');
      return;
    }

    setLoading(planKey);
    try {
      const response = await base44.functions.invoke('stripeCheckout', {
        plan_key: planKey,
        tenant_id: tenantId,
        tenant_name: tenantName,
      });
      const checkoutUrl = response.data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setError(err.response?.data?.error || err.message || 'Unable to start checkout. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-border/60 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <OrbitanWordmark size="sm" variant="dark" showOS />
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Page heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
            <Shield className="w-4 h-4" />
            Pilot Mode Active
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Choose Your Orbitan Plan
          </h1>
          <p className="mt-3 text-muted-foreground text-lg max-w-2xl mx-auto">
            OrbitanOS is currently in pilot mode. Public subscriptions will be available soon.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-center">
          <strong>Pilot Phase:</strong> We're currently onboarding select pilot tenants.
          If you'd like early access, please <Link to="/contact/interest?type=orbitanos_pilot" className="underline font-semibold">request access</Link>.
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loading === plan.key;
            const isPreselected = preselectedPlan === plan.key;

            return (
              <Card
                key={plan.key}
                className={`relative overflow-hidden card-elevated ${
                  plan.highlighted ? 'ring-2 ring-primary shadow-lg' : ''
                } ${isPreselected ? 'ring-2 ring-emerald-500' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {/* Gradient header */}
                <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white`}>
                  <Icon className="w-8 h-8 mb-3 opacity-90" />
                  <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
                  <p className="text-sm text-white/80 mt-1">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-white/70">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    disabled
                    className={`w-full mt-6 h-11 opacity-60 cursor-not-allowed ${
                      plan.highlighted
                        ? 'bg-primary'
                        : 'bg-foreground'
                    }`}
                  >
                    Coming Soon
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-3">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Secure payment via Stripe. Cancel anytime.
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Enterprise CTA */}
        <div className="max-w-3xl mx-auto mt-8 p-6 rounded-xl bg-slate-900 text-white text-center">
          <h3 className="font-heading text-lg font-semibold">OrbitanOS Enterprise</h3>
          <p className="text-sm text-white/70 mt-1 mb-2">
            Unlimited scale, custom SLAs, white-labelling, and dedicated support.
          </p>
          <p className="text-sm text-marketing-gold font-semibold mb-4">Starting from S$1,999/month</p>
          <a href="mailto:sales@orbitan.net">
            <Button variant="outline" className="border-marketing-gold/40 text-marketing-gold hover:bg-marketing-gold/10">
              Contact Sales
            </Button>
          </a>
        </div>

        {/* Trust indicators */}
        <div className="text-center mt-12 text-xs text-muted-foreground">
          <p>Prices in SGD. Billed monthly. 14-day free trial — no charge until trial ends.</p>
        </div>
      </main>
    </div>
  );
}