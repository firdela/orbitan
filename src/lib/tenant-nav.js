// ============================================================
// ORBITANOS — Tenant Nav Factory
// EXIT-READY: Single place to change any tenant's navigation.
// Each page imports { T1_NAV, T1_TENANT } etc. — zero duplication.
// ============================================================

import {
  Package, ShoppingCart, FileText, Users, CheckSquare,
  Shield, BarChart2, Link2, Calendar, Clock, AlertTriangle,
  Recycle, Leaf, Shirt, Heart, Home
} from 'lucide-react';
import { Utensils } from 'lucide-react';
import { OrbitanEngine } from '@/lib/orbitan-engine';

// ── Shared icon maps ─────────────────────────────────────────
const T1_ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Calendar, Users,
  CheckSquare, Shield, BarChart2, Link2, Clock, AlertTriangle, Utensils,
};

const T2_ICON_MAP = {
  Home, Package, ShoppingCart, Users, CheckSquare,
  Shield, BarChart2, Recycle, Leaf, AlertTriangle,
};

const T3_ICON_MAP = {
  Home, Package, ShoppingCart, FileText, Users, CheckSquare,
  BarChart2, Leaf, Heart, Shirt, ShoppingBag: Package,
};

// ── Tenant stubs ─────────────────────────────────────────────
export const T1_TENANT = {
  name: 'Taqueria Pte Ltd',
  subscription_plan: 'orbitan_enterprise',
  enabled_modules: ['dashboard', 'inventory', 'procurement', 'sales', 'scheduling', 'replenishment', 'workforce', 'clockin', 'tasks', 'compliance', 'reporting', 'xero'],
  enabled_packs: ['core', 'fnb', 'finance', 'compliance'],
  brand: 'La Birria Tacos',
  outlet: 'North Bridge Rd',
};

export const T2_TENANT = {
  name: 'Renewed Resources Pte Ltd',
  subscription_plan: 'orbitan_business',
  enabled_modules: ['dashboard', 'collections', 'inventory', 'procurement', 'workforce', 'tasks', 'compliance', 'reporting'],
  enabled_packs: ['core', 'recycling', 'compliance'],
  brand: 'Renewed Resources',
  outlet: null,
};

export const T3_TENANT = {
  name: 'Renewed Fashion',
  subscription_plan: 'orbitan_business',
  enabled_modules: ['dashboard', 'catalog', 'inventory', 'sales', 'customers', 'workforce', 'tasks', 'reporting'],
  enabled_packs: ['core', 'retail'],
  brand: 'Renewed Fashion',
  outlet: null,
};

// ── Pre-built nav arrays (call once, reuse everywhere) ────────
export const T1_NAV = OrbitanEngine.for(T1_TENANT).buildNav('t1', T1_ICON_MAP);
export const T2_NAV = OrbitanEngine.for(T2_TENANT).buildNav('t2', T2_ICON_MAP);
export const T3_NAV = OrbitanEngine.for(T3_TENANT).buildNav('t3', T3_ICON_MAP);