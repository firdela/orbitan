// ============================================================
// ORBIT MARKETPLACE — Module & Pack Store
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
  { slug: 'orbitan_shield', name: 'Orbit Shield™', category: 'premium_add_on', principle: 'regulate', icon: Shield, color: '#D4AF37', price_credits: 50, is_free: false, is_featured: true, is_new: true, min_plan: 'orbitan_enterprise', description: 'Enterprise-grade security: SSO, MFA, audit logs, data retention controls.', installs: 0, rating: 5.0, feature_list: ['SSO / SAML', 'MFA enforcement', 'Full audit logs', 'Data retention policies', 'Security dashboard', 'IP whitelisting'] },
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
      title="Orbit Marketplace"
    >
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Coming Soon — Marketplace is post-MVP ───────────────────
            Per the Orbitan MVP Build Philosophy: "Build less. Validate more."
            The Marketplace is explicitly in the "Avoid" list for Phase 1.
            This page will be activated after pilot validation.
        */}
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1D4ED8] to-[#111827] flex items-center justify-center mb-6 shadow-lg">
            <Star className="w-10 h-10 text-white" />
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">Coming Soon</Badge>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Orbit Marketplace</h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
            We're focused on delivering a rock-solid MVP for our pilot tenants first.
            The Marketplace — with industry packs, AI features, integrations, and premium
            add-ons — will open after pilot validation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm">
            {['Industry Packs', 'AI Features', 'Integrations', 'Premium Tools'].map((tag) => (
              <span key={tag} className="text-[11px] font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <Link to="/platform/wallet">
            <Button variant="outline" size="sm" className="mt-6 gap-1.5">
              <Wallet className="w-4 h-4" />
              View My Wallet
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}