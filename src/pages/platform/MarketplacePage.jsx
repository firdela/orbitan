// ============================================================
// ORBITAN MARKETPLACE — Module & Pack Store
// The "Reach" principle of the 6R Framework.
// Browse and activate modules, industry packs, integrations.
// ============================================================

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import OrbitanLoader from '@/components/brand/OrbitanLoader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Star, Zap, Shield, BarChart2, Users, Package,
  Layers, Globe, Cpu, Search, CheckCircle2, Lock,
  Wallet, TrendingUp, Leaf, RefreshCw, CreditCard,
  Award, BookOpen, MessageSquare, Calendar, ClipboardList,
  Activity, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const NAV = [
  { href: '/leader-org', icon: BarChart2, label: 'Platform Console' },
  { href: '/platform/wallet', icon: Wallet, label: 'Wallet & Credits' },
  { href: '/platform/marketplace', icon: Star, label: 'Marketplace' },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'core_module', label: 'Core Modules' },
  { key: 'industry_pack', label: 'Industry Packs' },
  { key: 'ai_feature', label: 'AI Features' },
  { key: 'integration', label: 'Integrations' },
  { key: 'compliance_tool', label: 'Compliance' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'premium_add_on', label: 'Premium Add-Ons' },
];

// Principle → colour
const PRINCIPLE_COLORS = {
  renew:    '#3B82F6',
  relate:   '#10B981',
  respond:  '#F97316',
  refine:   '#8B5CF6',
  regulate: '#D4AF37',
  reach:    '#06B6D4',
};

const MODULES_CATALOG = [
  // Core
  { slug: 'workforce', name: 'Workforce Management', category: 'core_module', principle: 'relate', icon: Users, color: '#10B981', price_credits: 0, is_free: true, is_featured: true, min_plan: 'orbitan_starter', description: 'Employee records, attendance, and team management.', installs: 3, rating: 4.9, feature_list: ['Employee profiles', 'Role management', 'Attendance tracking', 'Multi-outlet support'] },
  { slug: 'scheduling', name: 'Smart Scheduling', category: 'core_module', principle: 'respond', icon: Calendar, color: '#F97316', price_credits: 0, is_free: true, is_featured: true, min_plan: 'orbitan_starter', description: 'Drag-and-drop shift planner with overtime alerts.', installs: 3, rating: 4.8, feature_list: ['Weekly calendar view', 'Overtime detection', 'Shift templates', 'Staff notifications'] },
  { slug: 'tasks', name: 'Task Manager', category: 'core_module', principle: 'respond', icon: ClipboardList, color: '#F97316', price_credits: 0, is_free: true, min_plan: 'orbitan_starter', description: 'Assign, track, and close operational tasks.', installs: 3, rating: 4.7, feature_list: ['Priority levels', 'Assignment workflow', 'Progress tracking', 'Due date alerts'] },
  { slug: 'compliance', name: 'Compliance Centre', category: 'compliance_tool', principle: 'regulate', icon: Shield, color: '#D4AF37', price_credits: 0, is_free: true, is_featured: true, min_plan: 'orbitan_growth', description: 'Regulatory tracking, compliance health scoring, and automated alerts.', installs: 3, rating: 4.9, feature_list: ['Health score dashboard', 'Automated alerts', 'Document uploads', 'Category breakdown'] },
  // AI
  { slug: 'ai_studio', name: 'AI Studio', category: 'ai_feature', principle: 'refine', icon: Cpu, color: '#8B5CF6', price_credits: 20, is_free: false, is_featured: true, is_new: true, min_plan: 'orbitan_growth', description: 'Generate SOPs, training modules, and compliance documents with AI.', installs: 2, rating: 4.9, feature_list: ['SOP generation', 'Training modules', 'Policy drafting', 'Compliance checklists', 'Manager review workflow'] },
  { slug: 'ai_insights', name: 'AI Workforce Insights', category: 'ai_feature', principle: 'refine', icon: TrendingUp, color: '#8B5CF6', price_credits: 15, is_free: false, is_new: true, min_plan: 'orbitan_business', description: 'Predictive analytics for labour cost, turnover risk, and performance.', installs: 1, rating: 5.0, feature_list: ['Labour cost predictions', 'Turnover risk alerts', 'Performance scoring', 'Department benchmarks'] },
  // Industry Packs
  { slug: 'fnb_pack', name: 'F&B Pack', category: 'industry_pack', principle: 'reach', icon: Package, color: '#F97316', price_credits: 0, is_free: true, is_featured: true, min_plan: 'orbitan_growth', description: 'Complete restaurant & cafe operations suite.', installs: 1, rating: 4.9, feature_list: ['Inventory management', 'COGS tracking', 'Food safety logs', 'Sales & invoicing', 'Xero integration', 'Recipe management'] },
  { slug: 'recycling_pack', name: 'Sustainability Pack', category: 'industry_pack', principle: 'reach', icon: Leaf, color: '#16A34A', price_credits: 0, is_free: true, is_featured: true, min_plan: 'orbitan_growth', description: 'Recycling collection tracking and sustainability impact reporting.', installs: 1, rating: 4.8, feature_list: ['Material collection tracking', 'CO2 impact metrics', 'Processing workflows', 'Partner management', 'Sustainability reports'] },
  { slug: 'retail_pack', name: 'Retail Pack', category: 'industry_pack', principle: 'reach', icon: Star, color: '#22C55E', price_credits: 0, is_free: true, min_plan: 'orbitan_growth', description: 'Product catalog, POS-ready inventory, and customer management.', installs: 1, rating: 4.7, feature_list: ['Product catalog', 'Condition grading', 'Customer profiles', 'Loyalty tracking', 'POS readiness'] },
  // Integrations
  { slug: 'xero', name: 'Xero Integration', category: 'integration', principle: 'regulate', icon: CreditCard, color: '#00B4D8', price_credits: 30, is_free: false, is_featured: true, min_plan: 'orbitan_growth', description: 'Automated sync of invoices, bills, and journals to Xero.', installs: 1, rating: 4.8, feature_list: ['Invoice sync', 'Bill automation', 'Journal entries', 'Chart of accounts mapping', 'Reconciliation'] },
  // Analytics
  { slug: 'advanced_reporting', name: 'Advanced Reporting', category: 'analytics', principle: 'refine', icon: BarChart2, color: '#8B5CF6', price_credits: 10, is_free: false, min_plan: 'orbitan_growth', description: 'Executive dashboards, custom reports, and scheduled exports.', installs: 2, rating: 4.6, feature_list: ['Executive dashboards', 'Custom date ranges', 'CSV & PDF exports', 'Scheduled reports'] },
  // Premium
  { slug: 'orbitan_shield', name: 'Orbitan Shield™', category: 'premium_add_on', principle: 'regulate', icon: Shield, color: '#D4AF37', price_credits: 50, is_free: false, is_featured: true, is_new: true, min_plan: 'orbitan_enterprise', description: 'Enterprise-grade security: SSO, MFA, audit logs, data retention controls.', installs: 0, rating: 5.0, feature_list: ['SSO / SAML', 'MFA enforcement', 'Full audit logs', 'Data retention policies', 'Security dashboard', 'IP whitelisting'] },
  { slug: 'knowledge_base', name: 'Knowledge Base', category: 'core_module', principle: 'renew', icon: BookOpen, color: '#3B82F6', price_credits: 10, is_free: false, is_new: true, min_plan: 'orbitan_growth', description: 'Centralised SOP library and team knowledge repository.', installs: 0, rating: 4.7, feature_list: ['SOP library', 'Version control', 'Role-based access', 'Full-text search'] },
  { slug: 'announcements', name: 'Team Announcements', category: 'core_module', principle: 'relate', icon: MessageSquare, color: '#10B981', price_credits: 5, is_free: false, min_plan: 'orbitan_starter', description: 'Push announcements and updates to your entire workforce.', installs: 0, rating: 4.5, feature_list: ['Targeted broadcasts', 'Read receipts', 'Priority levels', 'Mobile-ready'] },
];

const PLAN_ORDER = ['orbitan_free', 'orbitan_starter', 'orbitan_growth', 'orbitan_business', 'orbitan_enterprise'];
const PLAN_LABELS = {
  orbitan_free: 'Free', orbitan_starter: 'Starter', orbitan_growth: 'Growth',
  orbitan_business: 'Business', orbitan_enterprise: 'Enterprise'
};

export default function MarketplacePage() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [featured, setFeatured] = useState(null);

  const filtered = MODULES_CATALOG.filter((m) => {
    const matchCat = category === 'all' || m.category === category;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AppShell
      navigation={NAV}
      title="Orbitan Marketplace"
    >
      <div className="p-6 max-w-7xl mx-auto">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#111827] via-[#1D4ED8] to-[#111827] rounded-2xl p-8 mb-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="absolute rounded-full border border-white"
                style={{ width: (i + 1) * 160, height: (i + 1) * 160, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            ))}
          </div>
          <div className="relative max-w-2xl">
            <Badge className="bg-white/10 text-white border-white/20 mb-3">Orbitan Marketplace</Badge>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Extend Your Platform</h1>
            <p className="text-blue-200 text-sm leading-relaxed mb-5">
              Unlock industry packs, AI features, integrations, and premium tools using Orbitan Credits.
              Every module is built on the 6R Framework — plug in what you need, when you need it.
            </p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search modules..."
                  className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                />
              </div>
              <Link to="/platform/wallet">
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1.5">
                  <Wallet className="w-4 h-4" />
                  My Wallet
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                category === cat.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-secondary-foreground border-border hover:bg-accent'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Module Detail Panel */}
        {featured && (
          <div className="mb-6 bg-card border border-primary/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: featured.color + '20' }}>
                <featured.icon className="w-7 h-7" style={{ color: featured.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-heading font-bold text-foreground text-lg">{featured.name}</h2>
                  {featured.is_new && <Badge className="text-[10px] bg-green-100 text-green-700">New</Badge>}
                  {featured.is_featured && <Badge className="text-[10px] bg-blue-100 text-blue-700">Featured</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{featured.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(featured.feature_list || []).map((f) => (
                    <span key={f} className="flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />{f}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" className="gap-2" style={{ background: featured.color }}>
                    <Zap className="w-4 h-4" />
                    {featured.is_free ? 'Activate Free' : `Activate for ${featured.price_credits} Credits`}
                  </Button>
                  <button onClick={() => setFeatured(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mod) => {
            const principleColor = PRINCIPLE_COLORS[mod.principle] || '#2563EB';
            return (
              <div
                key={mod.slug}
                onClick={() => setFeatured(featured?.slug === mod.slug ? null : mod)}
                className={cn(
                  'bg-card border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                  featured?.slug === mod.slug ? 'border-primary shadow-md' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: mod.color + '15' }}>
                    <mod.icon className="w-5 h-5" style={{ color: mod.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {mod.is_new && <Badge className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700">New</Badge>}
                    {mod.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500" />}
                    {mod.is_free
                      ? <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Free</span>
                      : <span className="text-[11px] font-bold text-foreground bg-secondary px-2 py-0.5 rounded-full">{mod.price_credits}cr</span>
                    }
                  </div>
                </div>

                <h3 className="font-heading font-semibold text-sm text-foreground mb-1">{mod.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{mod.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ color: principleColor, background: principleColor + '15' }}>
                      {mod.principle}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ★ {mod.rating} · {mod.installs} installs
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    {PLAN_LABELS[mod.min_plan] || 'Starter'}+
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground capitalize">{mod.category.replace('_', ' ')}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No modules match your search.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}