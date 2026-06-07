import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import OrbitanLoader from '@/components/brand/OrbitanLoader'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TenantProvider } from '@/lib/use-tenant.jsx';
import { GlobalOutletProvider } from '@/lib/GlobalOutletContext';

// Page imports
import LeaderOrg from '@/pages/LeaderOrg';
import CompanyDashboard from '@/pages/CompanyDashboard';
import OutletDashboard from '@/pages/OutletDashboard';
import WorkerPortal from '@/pages/WorkerPortal';
import InventoryPage from '@/pages/outlet/InventoryPage';
import ProcurementPage from '@/pages/outlet/ProcurementPage';
import SchedulingPage from '@/pages/outlet/SchedulingPage';
import SalesPage from '@/pages/outlet/SalesPage';
import TasksPage from '@/pages/outlet/TasksPage';
import WorkforcePage from '@/pages/outlet/WorkforcePage';
import CompliancePage from '@/pages/outlet/CompliancePage';
import ReportsPage from '@/pages/outlet/ReportsPage';

// Tenant 1 — F&B Pack (Taqueria Pte Ltd / La Birria Tacos)
import FnBDashboard from '@/pages/tenant1/FnBDashboard';
import FnBInventory from '@/pages/tenant1/FnBInventory';
import FnBProcurement from '@/pages/tenant1/FnBProcurement';
import FnBSales from '@/pages/tenant1/FnBSales';
import FnBCompliance from '@/pages/tenant1/FnBCompliance';
import FnBXero from '@/pages/tenant1/FnBXero';
import FnBReporting from '@/pages/tenant1/FnBReporting';
import FnBScheduling from '@/pages/tenant1/FnBScheduling';
import FnBWorkforce from '@/pages/tenant1/FnBWorkforce';
import FnBTasks from '@/pages/tenant1/FnBTasks';
import FnBClockIn from '@/pages/tenant1/FnBClockIn';
import FnBReplenishment from '@/pages/tenant1/FnBReplenishment';

// Tenant 2 — Recycling & Sustainability Pack (Renewed Resources)
import T2Dashboard from '@/pages/tenant2/T2Dashboard';
import T2Collections from '@/pages/tenant2/T2Collections';
import T2Inventory from '@/pages/tenant2/T2Inventory';
import T2Procurement from '@/pages/tenant2/T2Procurement';
import T2Workforce from '@/pages/tenant2/T2Workforce';
import T2Tasks from '@/pages/tenant2/T2Tasks';
import T2Compliance from '@/pages/tenant2/T2Compliance';
import T2Reporting from '@/pages/tenant2/T2Reporting';

// Workforce — Timesheet Manager (shared across tenants)
import TimesheetManager from '@/pages/workforce/TimesheetManager';

// AI Suite
import AIStudio from '@/pages/ai/AIStudio';

// Platform — Revenue Engine
import WalletPage from '@/pages/platform/WalletPage';
import MarketplacePage from '@/pages/platform/MarketplacePage';

// Tenant 3 — Retail Pack (Reused Clothing)
import T3Dashboard from '@/pages/tenant3/T3Dashboard';
import T3Catalog from '@/pages/tenant3/T3Catalog';
import T3Inventory from '@/pages/tenant3/T3Inventory';
import T3Sales from '@/pages/tenant3/T3Sales';
import T3Customers from '@/pages/tenant3/T3Customers';
import T3Workforce from '@/pages/tenant3/T3Workforce';
import T3Tasks from '@/pages/tenant3/T3Tasks';
import T3Reporting from '@/pages/tenant3/T3Reporting';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Default: redirect to leader-org console */}
      <Route path="/" element={<Navigate to="/leader-org" replace />} />

      {/* Platform Owner Console */}
      <Route path="/leader-org" element={<LeaderOrg />} />

      {/* Tenant / Company */}
      <Route path="/company" element={<CompanyDashboard />} />

      {/* Outlet */}
      <Route path="/outlet" element={<OutletDashboard />} />
      <Route path="/outlet/inventory" element={<InventoryPage />} />
      <Route path="/outlet/procurement" element={<ProcurementPage />} />
      <Route path="/outlet/scheduling" element={<SchedulingPage />} />
      <Route path="/outlet/sales" element={<SalesPage />} />
      <Route path="/outlet/tasks" element={<TasksPage />} />
      <Route path="/outlet/workforce" element={<WorkforcePage />} />
      <Route path="/outlet/compliance" element={<CompliancePage />} />
      <Route path="/outlet/reports" element={<ReportsPage />} />

      {/* Tenant 1 — F&B Pack (Taqueria / La Birria Tacos) */}
      <Route path="/t1/dashboard" element={<FnBDashboard />} />
      <Route path="/t1/inventory" element={<FnBInventory />} />
      <Route path="/t1/procurement" element={<FnBProcurement />} />
      <Route path="/t1/sales" element={<FnBSales />} />
      <Route path="/t1/compliance" element={<FnBCompliance />} />
      <Route path="/t1/xero" element={<FnBXero />} />
      <Route path="/t1/reporting" element={<FnBReporting />} />
      <Route path="/t1/scheduling" element={<FnBScheduling />} />
      <Route path="/t1/workforce" element={<FnBWorkforce />} />
      <Route path="/t1/tasks" element={<FnBTasks />} />
      <Route path="/t1/clockin" element={<FnBClockIn />} />
      <Route path="/t1/replenishment" element={<FnBReplenishment />} />
      <Route path="/t1/timesheets" element={<TimesheetManager />} />

      {/* Worker Portal */}
      {/* Tenant 2 — Recycling & Sustainability (Renewed Resources) */}
      <Route path="/t2/dashboard" element={<T2Dashboard />} />
      <Route path="/t2/collections" element={<T2Collections />} />
      <Route path="/t2/inventory" element={<T2Inventory />} />
      <Route path="/t2/procurement" element={<T2Procurement />} />
      <Route path="/t2/workforce" element={<T2Workforce />} />
      <Route path="/t2/tasks" element={<T2Tasks />} />
      <Route path="/t2/compliance" element={<T2Compliance />} />
      <Route path="/t2/reporting" element={<T2Reporting />} />

      {/* Tenant 3 — Retail Pack (Reused Clothing) */}
      <Route path="/t3/dashboard" element={<T3Dashboard />} />
      <Route path="/t3/catalog" element={<T3Catalog />} />
      <Route path="/t3/inventory" element={<T3Inventory />} />
      <Route path="/t3/sales" element={<T3Sales />} />
      <Route path="/t3/customers" element={<T3Customers />} />
      <Route path="/t3/workforce" element={<T3Workforce />} />
      <Route path="/t3/tasks" element={<T3Tasks />} />
      <Route path="/t3/reporting" element={<T3Reporting />} />

      {/* AI Suite — accessible from all tenants */}
      <Route path="/t1/ai-studio" element={<AIStudio tenantSlug="t1" />} />
      <Route path="/t2/ai-studio" element={<AIStudio tenantSlug="t2" />} />
      <Route path="/t3/ai-studio" element={<AIStudio tenantSlug="t3" />} />

      {/* Platform — Revenue Engine */}
      <Route path="/platform/wallet" element={<WalletPage />} />
      <Route path="/platform/marketplace" element={<MarketplacePage />} />

      {/* Worker Portal */}
      <Route path="/worker" element={<WorkerPortal />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TenantProvider>
        <GlobalOutletProvider>
        <Router>
            <AuthenticatedApp />
          </Router>
          </GlobalOutletProvider>
          <Toaster />
        </TenantProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;